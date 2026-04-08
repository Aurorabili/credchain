// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract IssuerRegistry is AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant GOV_ROLE = keccak256("GOV_ROLE");

    event IssuerStatusChanged(address indexed issuer, bool active);

    mapping(address => bool) private _activeIssuers;

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOV_ROLE, admin);
    }

    function setIssuer(address issuer, bool active) external onlyRole(GOV_ROLE) {
        _activeIssuers[issuer] = active;
        if (active) {
            _grantRole(ISSUER_ROLE, issuer);
        } else {
            _revokeRole(ISSUER_ROLE, issuer);
        }
        emit IssuerStatusChanged(issuer, active);
    }

    function isActiveIssuer(address issuer) external view returns (bool) {
        return _activeIssuers[issuer] && hasRole(ISSUER_ROLE, issuer);
    }

    function isGov(address account) external view returns (bool) {
        return hasRole(GOV_ROLE, account);
    }
}
