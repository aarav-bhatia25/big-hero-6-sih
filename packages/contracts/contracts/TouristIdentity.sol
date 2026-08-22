// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @notice Stores revocable credential and incident hashes only - never personal data or live locations.
contract TouristIdentity is AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant RESPONDER_ROLE = keccak256("RESPONDER_ROLE");

    mapping(bytes32 => bool) public activeCredential;
    event CredentialStatusChanged(bytes32 indexed credentialHash, bool active);
    event IncidentAnchored(bytes32 indexed incidentHash, address indexed responder, uint256 timestamp);

    constructor(address admin) { _grantRole(DEFAULT_ADMIN_ROLE, admin); _grantRole(ISSUER_ROLE, admin); }
    function setCredentialStatus(bytes32 credentialHash, bool active) external onlyRole(ISSUER_ROLE) { activeCredential[credentialHash] = active; emit CredentialStatusChanged(credentialHash, active); }
    function anchorIncident(bytes32 incidentHash) external onlyRole(RESPONDER_ROLE) { emit IncidentAnchored(incidentHash, msg.sender, block.timestamp); }
}
