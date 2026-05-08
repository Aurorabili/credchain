// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title IReputationCore
 * @notice Interface for the reputation calculation and voting system
 */
interface IReputationCore {
    /// @notice Emitted when a vote is cast on a credential SBT
    event Voted(
        address indexed voter,
        uint256 indexed tokenId,
        int8 direction,
        int256 newScore,
        int256 ownerReputationDelta
    );

    /// @notice Emitted when a KYC status is updated
    event KYCUpdated(address indexed account, bool verified);

    /// @notice Cast a vote on a credential SBT
    /// @param tokenId The token to vote on
    /// @param direction +1 for upvote, -1 for downvote
    function vote(uint256 tokenId, int8 direction) external;

    /// @notice Set KYC verification status for an account
    /// @param account The account to update
    /// @param verified Whether the account is verified
    function setKYC(address account, bool verified) external;

    /// @notice Get the current score of a token
    function getScore(uint256 tokenId) external view returns (int256);

    /// @notice Get the uncapped weighted vote sum of a token
    function getRawVoteSum(uint256 tokenId) external view returns (int256);

    /// @notice Get the total accumulated voter weight of a token
    function getWeightSum(uint256 tokenId) external view returns (uint256);

    /// @notice Get the number of unique voters who have voted on a token
    function getVoteCount(uint256 tokenId) external view returns (uint256);

    /// @notice Check whether an account has already voted on a token
    function hasVoted(uint256 tokenId, address account) external view returns (bool);

    /// @notice Get the current reputation of an account
    function getReputation(address account) external view returns (int256);

    /// @notice Compute the voting weight of an account
    function getWeight(address account) external view returns (uint256);

    /// @notice Get the Phi contribution value for a given score
    function phi(int256 score) external view returns (int256);

    /// @notice Get KYC status of an account
    function isKYCVerified(address account) external view returns (bool);

    /// @notice Get the SBT contract address
    function sbtContract() external view returns (address);
}
