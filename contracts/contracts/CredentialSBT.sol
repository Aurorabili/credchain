// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IssuerRegistry} from "./IssuerRegistry.sol";
import {IERC5192} from "./IERC5192.sol";

contract CredentialSBT is ERC721, IERC5192, EIP712 {
    enum CredentialType {
        StandardCredential,
        InstitutionAuth
    }

    enum TrustStatus {
        SelfSigned,
        Trusted
    }

    enum SignerRole {
        Holder,
        Institution,
        Governance
    }

    struct CredentialMeta {
        string credentialId;
        string manifestCid;
        bytes32 manifestHash;
        uint32 fileCount;
        uint64 issuedAt;
        uint64 expiresAt;
        CredentialType credentialType;
        TrustStatus trustStatus;
        bool revoked;
    }

    struct VerifyResult {
        bool exists;
        bool revoked;
        bool expired;
        bool trusted;
        address holder;
        string manifestCid;
        uint32 fileCount;
        uint8 credentialType;
        uint8 trustStatus;
        uint32 signerCount;
        uint32 governanceSignerCount;
        uint32 institutionSignerCount;
    }

    struct CredentialAttestation {
        uint256 tokenId;
        string credentialId;
        bytes32 manifestHash;
        uint8 signerRole;
        uint256 institutionAuthTokenId;
        uint256 nonce;
        uint64 deadline;
    }

    bytes32 public constant CREDENTIAL_ATTESTATION_TYPEHASH = keccak256(
        "CredentialAttestation(uint256 tokenId,string credentialId,bytes32 manifestHash,uint8 signerRole,uint256 institutionAuthTokenId,uint256 nonce,uint64 deadline)"
    );

    event CredentialIssued(
        uint256 indexed tokenId,
        string indexed credentialId,
        address indexed holder,
        uint8 credentialType,
        uint8 trustStatus,
        string manifestCid,
        bytes32 manifestHash,
        uint32 fileCount,
        uint64 expiresAt,
        address primarySigner,
        uint8 primarySignerRole,
        uint256 primaryInstitutionAuthTokenId,
        uint64 signedAt
    );

    event CredentialAttestedBySig(
        uint256 indexed tokenId,
        address indexed signer,
        uint8 signerRole,
        uint256 institutionAuthTokenId,
        bytes32 attestationDigest,
        bytes32 manifestHash,
        uint64 signedAt
    );

    event CredentialRevoked(uint256 indexed tokenId, string reason, address indexed operator);

    IssuerRegistry public immutable issuerRegistry;

    uint256 private _nextTokenId = 1;
    mapping(uint256 => CredentialMeta) private _credentialByTokenId;
    mapping(string => uint256) private _tokenIdByCredentialId;
    mapping(uint256 => mapping(address => bool)) private _hasSigned;
    mapping(bytes32 => bool) private _usedAttestationDigest;
    mapping(uint256 => uint32) private _signerCountByTokenId;
    mapping(uint256 => uint32) private _governanceSignerCountByTokenId;
    mapping(uint256 => uint32) private _institutionSignerCountByTokenId;

    modifier onlyGov() {
        require(issuerRegistry.isGov(msg.sender), "gov only");
        _;
    }

    modifier onlyOwnerGovOrInstitution(uint256 tokenId) {
        bool isGov = issuerRegistry.isGov(msg.sender);
        bool isOwner = ownerOf(tokenId) == msg.sender;
        bool hasInstitution = _activeInstitutionAuthTokenOf(msg.sender) > 0;
        require(isGov || isOwner || hasInstitution, "not authorized");
        _;
    }

    constructor(address registryAddress)
        ERC721("CredChain Credential", "CCRED")
        EIP712("CredChain Credential Attestation", "1")
    {
        issuerRegistry = IssuerRegistry(registryAddress);
    }

    function locked(uint256 tokenId) public view returns (bool) {
        require(_exists(tokenId), "invalid tokenId");
        return true;
    }

    function selfIssueCredential(
        string calldata credentialId,
        string calldata manifestCid,
        bytes32 manifestHash,
        uint32 fileCount,
        uint64 expiresAt,
        uint256 institutionAuthTokenId
    ) external returns (uint256 tokenId) {
        require(bytes(credentialId).length > 0, "empty credentialId");
        require(bytes(manifestCid).length > 0, "empty manifestCid");
        require(fileCount > 0, "fileCount=0");
        require(_tokenIdByCredentialId[credentialId] == 0, "credential exists");

        (SignerRole signerRole, uint256 resolvedInstitutionTokenId) = _resolvePrimarySigner(msg.sender, institutionAuthTokenId);
        TrustStatus trustStatus = signerRole == SignerRole.Holder ? TrustStatus.SelfSigned : TrustStatus.Trusted;

        tokenId = _mintCredential(
            msg.sender,
            credentialId,
            manifestCid,
            manifestHash,
            fileCount,
            expiresAt,
            CredentialType.StandardCredential,
            trustStatus,
            msg.sender,
            signerRole,
            resolvedInstitutionTokenId
        );

        _registerSigner(tokenId, msg.sender, signerRole, resolvedInstitutionTokenId);
    }

    function issueInstitutionAuthCredential(
        address authorizedWallet,
        string calldata credentialId,
        string calldata manifestCid,
        bytes32 manifestHash,
        uint32 fileCount,
        uint64 expiresAt
    ) external onlyGov returns (uint256 tokenId) {
        require(authorizedWallet != address(0), "invalid holder");
        require(bytes(credentialId).length > 0, "empty credentialId");
        require(bytes(manifestCid).length > 0, "empty manifestCid");
        require(fileCount > 0, "fileCount=0");
        require(_tokenIdByCredentialId[credentialId] == 0, "credential exists");

        tokenId = _mintCredential(
            authorizedWallet,
            credentialId,
            manifestCid,
            manifestHash,
            fileCount,
            expiresAt,
            CredentialType.InstitutionAuth,
            TrustStatus.Trusted,
            msg.sender,
            SignerRole.Governance,
            0
        );

        _registerSigner(tokenId, msg.sender, SignerRole.Governance, 0);
    }

    function attestBySig(CredentialAttestation calldata payload, bytes calldata signature) external {
        require(payload.deadline >= block.timestamp, "attestation expired");
        require(_exists(payload.tokenId), "invalid tokenId");

        CredentialMeta storage meta = _credentialByTokenId[payload.tokenId];
        require(meta.credentialType == CredentialType.StandardCredential, "auth token cannot attest");
        require(!meta.revoked, "already revoked");
        require(meta.expiresAt == 0 || block.timestamp <= meta.expiresAt, "credential expired");
        require(
            keccak256(bytes(meta.credentialId)) == keccak256(bytes(payload.credentialId)),
            "credential mismatch"
        );
        require(meta.manifestHash == payload.manifestHash, "manifest mismatch");

        bytes32 digest = hashCredentialAttestation(payload);
        require(!_usedAttestationDigest[digest], "digest already used");

        address signer = ECDSA.recover(digest, signature);
        require(!_hasSigned[payload.tokenId][signer], "already attested");
        require(ownerOf(payload.tokenId) != signer, "holder already signed");

        (SignerRole signerRole, uint256 institutionAuthTokenId) = _resolveAttestor(
            signer,
            payload.signerRole,
            payload.institutionAuthTokenId
        );

        _registerSigner(payload.tokenId, signer, signerRole, institutionAuthTokenId);
        _usedAttestationDigest[digest] = true;
        meta.trustStatus = TrustStatus.Trusted;

        emit CredentialAttestedBySig(
            payload.tokenId,
            signer,
            uint8(signerRole),
            institutionAuthTokenId,
            digest,
            payload.manifestHash,
            uint64(block.timestamp)
        );
    }

    function hashCredentialAttestation(CredentialAttestation calldata payload) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                CREDENTIAL_ATTESTATION_TYPEHASH,
                payload.tokenId,
                keccak256(bytes(payload.credentialId)),
                payload.manifestHash,
                payload.signerRole,
                payload.institutionAuthTokenId,
                payload.nonce,
                payload.deadline
            )
        );

        return _hashTypedDataV4(structHash);
    }

    function isAttestationUsed(bytes32 digest) external view returns (bool) {
        return _usedAttestationDigest[digest];
    }

    function hasSigned(uint256 tokenId, address signer) external view returns (bool) {
        require(_exists(tokenId), "invalid tokenId");
        return _hasSigned[tokenId][signer];
    }

    function hasActiveInstitutionAuth(address account) external view returns (bool) {
        return _activeInstitutionAuthTokenOf(account) > 0;
    }

    function activeInstitutionAuthTokenOf(address account) external view returns (uint256) {
        return _activeInstitutionAuthTokenOf(account);
    }

    function activeInstitutionAuthTokensOf(address account) external view returns (uint256[] memory) {
        uint256 supply = _nextTokenId - 1;
        uint256[] memory temp = new uint256[](balanceOf(account));
        uint256 cursor;

        for (uint256 tokenId = 1; tokenId <= supply; tokenId++) {
            if (!_exists(tokenId)) continue;
            if (ownerOf(tokenId) != account) continue;
            if (!_isUsableInstitutionAuthToken(tokenId)) continue;

            temp[cursor] = tokenId;
            cursor += 1;
        }

        uint256[] memory tokenIds = new uint256[](cursor);
        for (uint256 index = 0; index < cursor; index++) {
            tokenIds[index] = temp[index];
        }

        return tokenIds;
    }

    function revokeCredential(uint256 tokenId, string calldata reason) external onlyOwnerGovOrInstitution(tokenId) {
        require(_exists(tokenId), "invalid tokenId");
        CredentialMeta storage meta = _credentialByTokenId[tokenId];
        require(!meta.revoked, "already revoked");

        meta.revoked = true;
        emit CredentialRevoked(tokenId, reason, msg.sender);
    }

    function tokenIdOfCredential(string calldata credentialId) external view returns (uint256) {
        return _tokenIdByCredentialId[credentialId];
    }

    function credentialMeta(uint256 tokenId) external view returns (CredentialMeta memory) {
        require(_exists(tokenId), "invalid tokenId");
        return _credentialByTokenId[tokenId];
    }

    function verifyByTokenId(uint256 tokenId) public view returns (VerifyResult memory) {
        if (!_exists(tokenId)) {
            return VerifyResult(false, false, false, false, address(0), "", 0, 0, 0, 0, 0, 0);
        }

        CredentialMeta memory meta = _credentialByTokenId[tokenId];
        bool expired = meta.expiresAt > 0 && block.timestamp > meta.expiresAt;

        return VerifyResult({
            exists: true,
            revoked: meta.revoked,
            expired: expired,
            trusted: meta.trustStatus == TrustStatus.Trusted,
            holder: ownerOf(tokenId),
            manifestCid: meta.manifestCid,
            fileCount: meta.fileCount,
            credentialType: uint8(meta.credentialType),
            trustStatus: uint8(meta.trustStatus),
            signerCount: _signerCountByTokenId[tokenId],
            governanceSignerCount: _governanceSignerCountByTokenId[tokenId],
            institutionSignerCount: _institutionSignerCountByTokenId[tokenId]
        });
    }

    function verifyByCredentialId(string calldata credentialId) external view returns (VerifyResult memory) {
        return verifyByTokenId(_tokenIdByCredentialId[credentialId]);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "invalid tokenId");
        CredentialMeta memory meta = _credentialByTokenId[tokenId];
        return string(abi.encodePacked("ipfs://", meta.manifestCid, "?tokenId=", Strings.toString(tokenId)));
    }

    function latestTokenId() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    function tokensOfOwner(address holder) external view returns (uint256[] memory) {
        uint256 supply = _nextTokenId - 1;
        uint256 balance = balanceOf(holder);
        uint256[] memory tokenIds = new uint256[](balance);
        uint256 cursor;

        for (uint256 tokenId = 1; tokenId <= supply; tokenId++) {
            if (_exists(tokenId) && ownerOf(tokenId) == holder) {
                tokenIds[cursor] = tokenId;
                cursor += 1;
                if (cursor == balance) break;
            }
        }

        return tokenIds;
    }

    function approve(address, uint256) public pure override {
        revert("SBT: approvals disabled");
    }

    function setApprovalForAll(address, bool) public pure override {
        revert("SBT: approvals disabled");
    }

    function _beforeTokenTransfer(address from, address to, uint256 firstTokenId, uint256 batchSize) internal override {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
        if (from != address(0) && to != address(0)) {
            revert("SBT: non-transferable");
        }
    }

    function _mintCredential(
        address holder,
        string memory credentialId,
        string memory manifestCid,
        bytes32 manifestHash,
        uint32 fileCount,
        uint64 expiresAt,
        CredentialType credentialType,
        TrustStatus trustStatus,
        address primarySigner,
        SignerRole primarySignerRole,
        uint256 primaryInstitutionAuthTokenId
    ) private returns (uint256 tokenId) {
        tokenId = _nextTokenId;
        _nextTokenId += 1;

        _safeMint(holder, tokenId);

        _credentialByTokenId[tokenId] = CredentialMeta({
            credentialId: credentialId,
            manifestCid: manifestCid,
            manifestHash: manifestHash,
            fileCount: fileCount,
            issuedAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            credentialType: credentialType,
            trustStatus: trustStatus,
            revoked: false
        });

        _tokenIdByCredentialId[credentialId] = tokenId;

        emit Locked(tokenId);
        emit CredentialIssued(
            tokenId,
            credentialId,
            holder,
            uint8(credentialType),
            uint8(trustStatus),
            manifestCid,
            manifestHash,
            fileCount,
            expiresAt,
            primarySigner,
            uint8(primarySignerRole),
            primaryInstitutionAuthTokenId,
            uint64(block.timestamp)
        );
    }

    function _registerSigner(
        uint256 tokenId,
        address signer,
        SignerRole signerRole,
        uint256 institutionAuthTokenId
    ) private {
        _hasSigned[tokenId][signer] = true;
        _signerCountByTokenId[tokenId] += 1;

        if (signerRole == SignerRole.Governance) {
            _governanceSignerCountByTokenId[tokenId] += 1;
        } else if (signerRole == SignerRole.Institution) {
            _institutionSignerCountByTokenId[tokenId] += 1;
        }

        if (institutionAuthTokenId > 0) {
            require(_isInstitutionAuthOwnedBy(signer, institutionAuthTokenId), "invalid institution auth");
        }
    }

    function _resolvePrimarySigner(address signer, uint256 institutionAuthTokenId) private view returns (SignerRole, uint256) {
        if (institutionAuthTokenId > 0) {
            require(_isInstitutionAuthOwnedBy(signer, institutionAuthTokenId), "invalid institution auth");
            return (SignerRole.Institution, institutionAuthTokenId);
        }

        if (issuerRegistry.isGov(signer)) {
            return (SignerRole.Governance, 0);
        }

        return (SignerRole.Holder, 0);
    }

    function _resolveAttestor(
        address signer,
        uint8 signerRole,
        uint256 institutionAuthTokenId
    ) private view returns (SignerRole, uint256) {
        if (signerRole == uint8(SignerRole.Governance)) {
            require(issuerRegistry.isGov(signer), "governance required");
            return (SignerRole.Governance, 0);
        }

        require(signerRole == uint8(SignerRole.Institution), "invalid signer role");
        require(_isInstitutionAuthOwnedBy(signer, institutionAuthTokenId), "invalid institution auth");
        return (SignerRole.Institution, institutionAuthTokenId);
    }

    function _isInstitutionAuthOwnedBy(address signer, uint256 institutionAuthTokenId) private view returns (bool) {
        if (!_exists(institutionAuthTokenId)) return false;
        if (ownerOf(institutionAuthTokenId) != signer) return false;
        return _isUsableInstitutionAuthToken(institutionAuthTokenId);
    }

    function _isUsableInstitutionAuthToken(uint256 tokenId) private view returns (bool) {
        CredentialMeta memory meta = _credentialByTokenId[tokenId];
        if (meta.credentialType != CredentialType.InstitutionAuth) return false;
        if (meta.revoked) return false;
        if (meta.expiresAt > 0 && block.timestamp > meta.expiresAt) return false;
        return true;
    }

    function _activeInstitutionAuthTokenOf(address signer) private view returns (uint256) {
        uint256 supply = _nextTokenId - 1;
        for (uint256 tokenId = supply; tokenId >= 1; tokenId--) {
            if (_exists(tokenId) && ownerOf(tokenId) == signer && _isUsableInstitutionAuthToken(tokenId)) {
                return tokenId;
            }
            if (tokenId == 1) break;
        }
        return 0;
    }
}
