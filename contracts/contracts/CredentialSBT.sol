// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC5192} from "./IERC5192.sol";
import {ICredentialSBT} from "./ICredentialSBT.sol";

/**
 * @title CredentialSBT
 * @notice ERC721 Soulbound Token for credentials, compliant with ERC5192 (non-transferable).
 *         Each token represents a verifiable credential with metadata stored on IPFS.
 */
contract CredentialSBT is
    ERC721,
    AccessControl,
    IERC5192,
    ICredentialSBT
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant REVOKER_ROLE = keccak256("REVOKER_ROLE");

    uint256 private _nextTokenId;

    mapping(uint256 => string) private _businessTypes;
    mapping(uint256 => string) private _metadataCIDs;
    mapping(uint256 => bool) private _revoked;

    constructor(address admin) ERC721("CredChain SBT", "CRED") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(REVOKER_ROLE, admin);
    }

    // ─── ERC5192 compliance ───────────────────────────────────────────

    /// @inheritdoc IERC5192
    function locked(uint256 tokenId) external view override returns (bool) {
        _requireOwned(tokenId);
        return true; // Always locked — soulbound
    }

    // ─── ICredentialSBT ───────────────────────────────────────────────

    /// @inheritdoc ICredentialSBT
    function mintCredential(
        address to,
        string calldata businessType_,
        string calldata metadataCID_
    ) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        require(to != address(0), "CredentialSBT: mint to zero");
        require(bytes(businessType_).length > 0, "CredentialSBT: empty business type");
        require(bytes(metadataCID_).length > 0, "CredentialSBT: empty metadata CID");

        tokenId = ++_nextTokenId;
        _safeMint(to, tokenId);
        _businessTypes[tokenId] = businessType_;
        _metadataCIDs[tokenId] = metadataCID_;

        emit CredentialMinted(tokenId, to, businessType_, metadataCID_);
        emit Locked(tokenId);
    }

    /// @inheritdoc ICredentialSBT
    function revokeCredential(uint256 tokenId) external onlyRole(REVOKER_ROLE) {
        _requireOwned(tokenId);
        require(!_revoked[tokenId], "CredentialSBT: already revoked");
        _revoked[tokenId] = true;
        emit CredentialRevoked(tokenId);
    }

    // ─── View helpers ─────────────────────────────────────────────────

    /// @inheritdoc ICredentialSBT
    function exists(uint256 tokenId) external view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    /// @inheritdoc ICredentialSBT
    function businessType(uint256 tokenId) external view returns (string memory) {
        _requireOwned(tokenId);
        return _businessTypes[tokenId];
    }

    /// @inheritdoc ICredentialSBT
    function metadataCID(uint256 tokenId) external view returns (string memory) {
        _requireOwned(tokenId);
        return _metadataCIDs[tokenId];
    }

    /// @inheritdoc ICredentialSBT
    function isRevoked(uint256 tokenId) external view returns (bool) {
        _requireOwned(tokenId);
        return _revoked[tokenId];
    }

    /// @notice Override tokenURI to return an IPFS gateway URL
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        string memory metadataCID_ = _metadataCIDs[tokenId];
        return string(abi.encodePacked("ipfs://", metadataCID_));
    }

    // ─── Transfers disabled (soulbound) ───────────────────────────────

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("CredentialSBT: token is soulbound");
        }
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, AccessControl) returns (bool) {
        return
            interfaceId == type(IERC5192).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
