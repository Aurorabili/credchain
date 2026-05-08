// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title ICredentialSBT
 * @notice Interface for credential-bound SBT (Soulbound Token) compliant with ERC721 + ERC5192
 */
interface ICredentialSBT {
    /// @notice Emitted when a credential SBT is minted
    event CredentialMinted(
        uint256 indexed tokenId,
        address indexed to,
        string businessType,
        string metadataCID
    );

    /// @notice Emitted when a credential is revoked
    event CredentialRevoked(uint256 indexed tokenId);

    /// @notice Mint a new credential SBT to `to`
    /// @param to Recipient address (must be KYC-verified)
    /// @param businessType Business classification for the credential
    /// @param metadataCID IPFS CID hash of the credential metadata JSON
    /// @return tokenId The minted token ID
    function mintCredential(
        address to,
        string calldata businessType,
        string calldata metadataCID
    ) external returns (uint256 tokenId);

    /// @notice Revoke a credential SBT (credential owner or account with revoke role)
    function revokeCredential(uint256 tokenId) external;

    /// @notice Check if a token exists
    function exists(uint256 tokenId) external view returns (bool);

    /// @notice Get the business type for a token
    function businessType(uint256 tokenId) external view returns (string memory);

    /// @notice Get the metadata CID (IPFS CID) for a token
    function metadataCID(uint256 tokenId) external view returns (string memory);

    /// @notice Check if a token has been revoked
    function isRevoked(uint256 tokenId) external view returns (bool);
}
