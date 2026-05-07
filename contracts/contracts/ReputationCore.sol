// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import {IReputationCore} from "./IReputationCore.sol";
import {ICredentialSBT} from "./ICredentialSBT.sol";

/**
 * @title ReputationCore
 * @notice Implements the reputation system:
 *         - SBT score storage and voting
 *         - Account reputation via partial-accumulation (cached incremental updates)
 *         - Phi / Gamma operators per the CredChain reputation model
 *
 *         All formulas ref: docs/reputation.md
 */
contract ReputationCore is IReputationCore, AccessControl {
    bytes32 public constant KYC_ADMIN_ROLE = keccak256("KYC_ADMIN_ROLE");
    bytes32 public constant REPUTATION_ADMIN_ROLE =
        keccak256("REPUTATION_ADMIN_ROLE");

    // ─── System parameters (immutable after deployment) ───────────────
    int256 public immutable ALPHA;
    int256 public immutable S_MIN;
    int256 public immutable S_MAX;
    uint256 public immutable W_MAX;
    uint256 public immutable K; // slope of Phi
    int256 public immutable C_PHI; // cap of Phi

    // ─── External contract references ────────────────────────────────
    ICredentialSBT private immutable _sbtContract;

    /// @inheritdoc IReputationCore
    function sbtContract() external view returns (address) {
        return address(_sbtContract);
    }

    // ─── State ───────────────────────────────────────────────────────
    mapping(uint256 => int256) private _scores; // s_t: token score
    mapping(address => int256) private _reputations; // R_a: cached reputation
    mapping(address => bool) private _kycVerified;

    constructor(
        address admin,
        address sbtAddr,
        int256 alpha,
        int256 sMin,
        int256 sMax,
        uint256 wMax,
        uint256 k,
        int256 cPhi
    ) {
        require(sbtAddr != address(0), "ReputationCore: zero SBT address");
        require(sMax > sMin, "ReputationCore: invalid score range");
        require(wMax > 0, "ReputationCore: zero wMax");
        require(k > 0, "ReputationCore: zero k");
        require(cPhi > 0, "ReputationCore: zero cPhi");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(KYC_ADMIN_ROLE, admin);
        _grantRole(REPUTATION_ADMIN_ROLE, admin);

        _sbtContract = ICredentialSBT(sbtAddr);
        ALPHA = alpha;
        S_MIN = sMin;
        S_MAX = sMax;
        W_MAX = wMax;
        K = k;
        C_PHI = cPhi;
    }

    // ─── Core: Vote ──────────────────────────────────────────────────

    /// @inheritdoc IReputationCore
    function vote(uint256 tokenId, int8 direction) external {
        require(
            direction == 1 || direction == -1,
            "ReputationCore: direction must be +1 or -1"
        );
        require(_kycVerified[msg.sender], "ReputationCore: sender not KYC");

        require(
            _sbtContract.exists(tokenId),
            "ReputationCore: token does not exist"
        );
        require(
            !_sbtContract.isRevoked(tokenId),
            "ReputationCore: token revoked"
        );

        // Current values
        int256 oldScore = _scores[tokenId];
        uint256 weight = _weightOf(msg.sender);

        // Score delta
        int256 delta = ALPHA * int256(weight) * int256(direction);
        int256 newScore = _clamp(oldScore + delta, S_MIN, S_MAX);

        // Reputation delta for the token owner
        address owner = IERC721(address(_sbtContract)).ownerOf(tokenId);
        int256 oldPhi = phi(oldScore);
        int256 newPhi = phi(newScore);
        int256 repDelta = newPhi - oldPhi;

        // Apply updates
        _scores[tokenId] = newScore;
        _reputations[owner] = _reputations[owner] + repDelta;

        emit Voted(msg.sender, tokenId, direction, newScore, repDelta);
    }

    // ─── KYC ─────────────────────────────────────────────────────────

    /// @inheritdoc IReputationCore
    function setKYC(address account, bool verified) external onlyRole(KYC_ADMIN_ROLE) {
        require(account != address(0), "ReputationCore: zero address");
        _kycVerified[account] = verified;
        emit KYCUpdated(account, verified);
    }

    // ─── Phi operator ────────────────────────────────────────────────

    /// @inheritdoc IReputationCore
    function phi(int256 s) public view returns (int256) {
        if (s <= 0) return 0;
        int256 val = int256(K) * s;
        return val > C_PHI ? C_PHI : val;
    }

    // ─── View functions ──────────────────────────────────────────────

    /// @inheritdoc IReputationCore
    function getScore(uint256 tokenId) external view returns (int256) {
        return _scores[tokenId];
    }

    /// @inheritdoc IReputationCore
    function getReputation(address account) external view returns (int256) {
        return _reputations[account];
    }

    /// @inheritdoc IReputationCore
    function getWeight(address account) external view returns (uint256) {
        return _weightOf(account);
    }

    /// @inheritdoc IReputationCore
    function isKYCVerified(address account) external view returns (bool) {
        return _kycVerified[account];
    }

    // ─── Internal helpers ────────────────────────────────────────────

    function _weightOf(address account) internal view returns (uint256) {
        int256 r = _reputations[account];
        if (r <= 0) return 1; // minimum weight = 1
        uint256 ur = uint256(r);
        return ur > W_MAX ? W_MAX : ur;
    }

    function _clamp(int256 val, int256 lo, int256 hi) internal pure returns (int256) {
        if (val < lo) return lo;
        if (val > hi) return hi;
        return val;
    }
}
