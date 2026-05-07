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
        string credentialType,
        string metadataHash
    );

    /// @notice Emitted when a credential is revoked
    event CredentialRevoked(uint256 indexed tokenId);

    /// @notice Mint a new credential SBT to `to`
    /// @param to Recipient address (must be KYC-verified)
    /// @param credentialType Type identifier for the credential
    /// @param metadataHash IPFS CID hash of the credential metadata JSON
    /// @return tokenId The minted token ID
    function mintCredential(
        address to,
        string calldata credentialType,
        string calldata metadataHash
    ) external returns (uint256 tokenId);

    /// @notice Revoke a credential SBT (only admin or issuer)
    function revokeCredential(uint256 tokenId) external;

    /// @notice Check if a token exists
    function exists(uint256 tokenId) external view returns (bool);

    /// @notice Get the credential type for a token
    function credentialType(uint256 tokenId) external view returns (string memory);

    /// @notice Get the metadata hash (IPFS CID) for a token
    function metadataHash(uint256 tokenId) external view returns (string memory);

    /// @notice Check if a token has been revoked
    function isRevoked(uint256 tokenId) external view returns (bool);
}
