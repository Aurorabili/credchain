// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title IERC5192
 * @notice Minimal interface for ERC5192 (Soulbound Token) standard.
 */
interface IERC5192 {
    /// @notice Emitted when the locking status of a token is changed to locked
    event Locked(uint256 indexed tokenId);

    /// @notice Returns the locking status of a token
    function locked(uint256 tokenId) external view returns (bool);
}
