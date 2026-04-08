// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IssuerRegistry} from "./IssuerRegistry.sol";
import {IERC5192} from "./IERC5192.sol";

contract CredentialSBT is ERC721, IERC5192 {
    enum IssueStatus {
        SelfSigned,
        VerifiedByIssuers
    }

    struct CredentialMeta {
        string credentialId;
        string manifestCid;
        bytes32 manifestHash;
        uint32 fileCount;
        uint64 issuedAt;
        uint64 expiresAt;
        IssueStatus issueStatus;
        bool revoked;
    }

    struct VerifyResult {
        bool exists;
        bool revoked;
        bool expired;
        address holder;
        string manifestCid;
        uint32 fileCount;
        uint8 issueStatus;
        uint32 issuerCount;
    }

    event CredentialSelfIssued(
        uint256 indexed tokenId,
        string indexed credentialId,
        address indexed holder,
        string manifestCid,
        bytes32 manifestHash,
        uint32 fileCount,
        uint64 expiresAt
    );

    event CredentialAttested(uint256 indexed tokenId, address indexed issuer, uint32 issuerCount);
    event CredentialRevoked(uint256 indexed tokenId, string reason, address indexed operator);

    IssuerRegistry public immutable issuerRegistry;

    uint256 private _nextTokenId = 1;
    mapping(uint256 => CredentialMeta) private _credentialByTokenId;
    mapping(string => uint256) private _tokenIdByCredentialId;
    mapping(uint256 => address[]) private _issuersByTokenId;
    mapping(uint256 => mapping(address => bool)) private _hasAttested;

    modifier onlyOwnerGovOrIssuer(uint256 tokenId) {
        bool isGov = issuerRegistry.isGov(msg.sender);
        bool isOwner = ownerOf(tokenId) == msg.sender;
        bool isIssuer = issuerRegistry.isActiveIssuer(msg.sender);
        require(isGov || isOwner || isIssuer, "not authorized");
        _;
    }

    constructor(address registryAddress) ERC721("CredChain Credential", "CCRED") {
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
        uint64 expiresAt
    ) external returns (uint256 tokenId) {
        require(bytes(credentialId).length > 0, "empty credentialId");
        require(bytes(manifestCid).length > 0, "empty manifestCid");
        require(fileCount > 0, "fileCount=0");
        require(_tokenIdByCredentialId[credentialId] == 0, "credential exists");

        address holder = msg.sender;
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
            issueStatus: IssueStatus.SelfSigned,
            revoked: false
        });

        _tokenIdByCredentialId[credentialId] = tokenId;
        _issuersByTokenId[tokenId].push(holder);
        _hasAttested[tokenId][holder] = true;

        emit Locked(tokenId);
        emit CredentialSelfIssued(
            tokenId,
            credentialId,
            holder,
            manifestCid,
            manifestHash,
            fileCount,
            expiresAt
        );
    }

    function attestCredential(uint256 tokenId) external {
        require(_exists(tokenId), "invalid tokenId");
        require(issuerRegistry.isActiveIssuer(msg.sender), "issuer inactive");
        require(!_credentialByTokenId[tokenId].revoked, "already revoked");
        require(!_hasAttested[tokenId][msg.sender], "already attested");

        _hasAttested[tokenId][msg.sender] = true;
        _issuersByTokenId[tokenId].push(msg.sender);

        if (_issuersByTokenId[tokenId].length > 1) {
            _credentialByTokenId[tokenId].issueStatus = IssueStatus.VerifiedByIssuers;
        }

        emit CredentialAttested(tokenId, msg.sender, uint32(_issuersByTokenId[tokenId].length));
    }

    function revokeCredential(uint256 tokenId, string calldata reason) external onlyOwnerGovOrIssuer(tokenId) {
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
            return VerifyResult(false, false, false, address(0), "", 0, 0, 0);
        }

        CredentialMeta memory meta = _credentialByTokenId[tokenId];
        bool expired = meta.expiresAt > 0 && block.timestamp > meta.expiresAt;

        return VerifyResult({
            exists: true,
            revoked: meta.revoked,
            expired: expired,
            holder: ownerOf(tokenId),
            manifestCid: meta.manifestCid,
            fileCount: meta.fileCount,
            issueStatus: uint8(meta.issueStatus),
            issuerCount: uint32(_issuersByTokenId[tokenId].length)
        });
    }

    function verifyByCredentialId(string calldata credentialId) external view returns (VerifyResult memory) {
        uint256 tokenId = _tokenIdByCredentialId[credentialId];
        return verifyByTokenId(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "invalid tokenId");
        CredentialMeta memory meta = _credentialByTokenId[tokenId];
        return string(abi.encodePacked("ipfs://", meta.manifestCid, "?tokenId=", Strings.toString(tokenId)));
    }

    function credentialIssuers(uint256 tokenId) external view returns (address[] memory) {
        require(_exists(tokenId), "invalid tokenId");
        return _issuersByTokenId[tokenId];
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
                if (cursor == balance) {
                    break;
                }
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
}
