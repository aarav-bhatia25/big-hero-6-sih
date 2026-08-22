// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title TouristIdentityRegistry
 * @notice On-chain registry for tourist verifiable credentials and digital pass revocations.
 * @dev Preserves privacy by storing only cryptographic hashes and verification metadata (no PII).
 */
contract TouristIdentityRegistry is AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    enum CredentialState { Inexistent, Active, Suspended, Revoked, Expired }

    struct CredentialInfo {
        bytes32 credentialHash;
        uint64 issuedAt;
        uint64 expiresAt;
        CredentialState state;
        address issuer;
    }

    mapping(bytes32 => CredentialInfo) private _credentials;
    uint256 public totalIssuedCredentials;

    event CredentialRegistered(
        bytes32 indexed credentialHash,
        address indexed issuer,
        uint64 issuedAt,
        uint64 expiresAt
    );

    event CredentialStateUpdated(
        bytes32 indexed credentialHash,
        CredentialState newState,
        address indexed updatedBy
    );

    constructor(address admin) {
        require(admin != address(0), "Invalid admin address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE, admin);
        _grantRole(VERIFIER_ROLE, admin);
    }

    /**
     * @notice Register a new tourist digital credential hash on-chain.
     * @param credentialHash Keccak256 hash of W3C/DID verifiable credential.
     * @param expiresAt Unix timestamp when credential expires.
     */
    function registerCredential(
        bytes32 credentialHash,
        uint64 expiresAt
    ) external onlyRole(ISSUER_ROLE) {
        require(credentialHash != bytes32(0), "Invalid credential hash");
        require(
            _credentials[credentialHash].state == CredentialState.Inexistent,
            "Credential already registered"
        );
        require(expiresAt > block.timestamp, "Expiration must be in future");

        _credentials[credentialHash] = CredentialInfo({
            credentialHash: credentialHash,
            issuedAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            state: CredentialState.Active,
            issuer: msg.sender
        });

        totalIssuedCredentials += 1;

        emit CredentialRegistered(credentialHash, msg.sender, uint64(block.timestamp), expiresAt);
    }

    /**
     * @notice Update status of registered credential (e.g. Suspend or Revoke).
     */
    function updateCredentialState(
        bytes32 credentialHash,
        CredentialState newState
    ) external onlyRole(ISSUER_ROLE) {
        require(_credentials[credentialHash].issuedAt > 0, "Credential not found");
        require(newState != CredentialState.Inexistent, "Invalid state");

        _credentials[credentialHash].state = newState;

        emit CredentialStateUpdated(credentialHash, newState, msg.sender);
    }

    /**
     * @notice Verify if a credential is valid and active.
     */
    function verifyCredential(
        bytes32 credentialHash
    ) external view returns (bool isValid, CredentialState currentState, uint64 expiresAt) {
        CredentialInfo memory info = _credentials[credentialHash];
        if (info.issuedAt == 0) {
            return (false, CredentialState.Inexistent, 0);
        }

        if (block.timestamp > info.expiresAt && info.state == CredentialState.Active) {
            return (false, CredentialState.Expired, info.expiresAt);
        }

        bool active = (info.state == CredentialState.Active);
        return (active, info.state, info.expiresAt);
    }

    /**
     * @notice Retrieve credential details by hash.
     */
    function getCredential(bytes32 credentialHash) external view returns (CredentialInfo memory) {
        require(_credentials[credentialHash].issuedAt > 0, "Credential not found");
        return _credentials[credentialHash];
    }
}
