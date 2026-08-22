// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title IncidentRegistry
 * @notice Provides tamper-proof immutable audit records for emergency incidents, dispatch logs, and resolution hashes.
 * @dev Stores cryptographic hashes (SHA256/Keccak256) of incident payloads on-chain. No PII or raw GPS coordinates are exposed.
 */
contract IncidentRegistry is AccessControl, Pausable {
    bytes32 public constant RESPONDER_ROLE = keccak256("RESPONDER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    enum IncidentStatus { Reported, Verified, Dispatched, Resolved, Audited }

    struct IncidentRecord {
        bytes32 incidentHash;
        bytes32 locationHash;
        uint256 createdAt;
        uint256 updatedAt;
        IncidentStatus status;
        address reporter;
        address assignedResponder;
        bytes32 evidenceHash;
        bool isAudited;
    }

    // Mapping from incidentId string (as bytes32 key) to IncidentRecord
    mapping(bytes32 => IncidentRecord) private _incidents;
    // Track total incidents anchored
    uint256 public totalIncidents;

    // Events
    event IncidentAnchored(
        bytes32 indexed incidentIdKey,
        bytes32 indexed incidentHash,
        bytes32 locationHash,
        address indexed reporter,
        uint256 timestamp
    );

    event IncidentStatusUpdated(
        bytes32 indexed incidentIdKey,
        IncidentStatus status,
        address indexed updatedBy,
        uint256 timestamp
    );

    event EvidenceAppended(
        bytes32 indexed incidentIdKey,
        bytes32 evidenceHash,
        address indexed responder,
        uint256 timestamp
    );

    event IncidentAudited(
        bytes32 indexed incidentIdKey,
        address indexed auditor,
        uint256 timestamp
    );

    constructor(address admin) {
        require(admin != address(0), "Invalid admin address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RESPONDER_ROLE, admin);
        _grantRole(AUDITOR_ROLE, admin);
    }

    /**
     * @notice Anchor a new incident record on-chain.
     * @param incidentIdKey Keccak256 hash of the unique string incident ID.
     * @param incidentHash Cryptographic hash of the incident payload (SHA256/Keccak256 of details).
     * @param locationHash Masked spatial hash of initial incident location.
     */
    function anchorIncident(
        bytes32 incidentIdKey,
        bytes32 incidentHash,
        bytes32 locationHash
    ) external whenNotPaused {
        require(_incidents[incidentIdKey].createdAt == 0, "Incident already registered");
        require(incidentHash != bytes32(0), "Invalid incident hash");

        _incidents[incidentIdKey] = IncidentRecord({
            incidentHash: incidentHash,
            locationHash: locationHash,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            status: IncidentStatus.Reported,
            reporter: msg.sender,
            assignedResponder: address(0),
            evidenceHash: bytes32(0),
            isAudited: false
        });

        totalIncidents += 1;

        emit IncidentAnchored(incidentIdKey, incidentHash, locationHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Update incident status and assign responder.
     * @param incidentIdKey Keccak256 hash of the unique string incident ID.
     * @param newStatus New status in lifecycle.
     * @param responder Address of assigned responder (if any).
     */
    function updateIncidentStatus(
        bytes32 incidentIdKey,
        IncidentStatus newStatus,
        address responder
    ) external onlyRole(RESPONDER_ROLE) whenNotPaused {
        IncidentRecord storage record = _incidents[incidentIdKey];
        require(record.createdAt > 0, "Incident does not exist");

        record.status = newStatus;
        record.updatedAt = block.timestamp;
        if (responder != address(0)) {
            record.assignedResponder = responder;
        }

        emit IncidentStatusUpdated(incidentIdKey, newStatus, msg.sender, block.timestamp);
    }

    /**
     * @notice Append supplementary evidence hash (e.g. resolution report, bodycam logs).
     */
    function appendEvidence(
        bytes32 incidentIdKey,
        bytes32 evidenceHash
    ) external onlyRole(RESPONDER_ROLE) whenNotPaused {
        IncidentRecord storage record = _incidents[incidentIdKey];
        require(record.createdAt > 0, "Incident does not exist");
        require(evidenceHash != bytes32(0), "Invalid evidence hash");

        record.evidenceHash = evidenceHash;
        record.updatedAt = block.timestamp;

        emit EvidenceAppended(incidentIdKey, evidenceHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Audit and mark incident timeline verified on-chain.
     */
    function auditIncident(bytes32 incidentIdKey) external onlyRole(AUDITOR_ROLE) whenNotPaused {
        IncidentRecord storage record = _incidents[incidentIdKey];
        require(record.createdAt > 0, "Incident does not exist");
        require(!record.isAudited, "Already audited");

        record.isAudited = true;
        record.status = IncidentStatus.Audited;
        record.updatedAt = block.timestamp;

        emit IncidentAudited(incidentIdKey, msg.sender, block.timestamp);
    }

    /**
     * @notice Verify whether a given off-chain payload hash matches the on-chain recorded hash.
     */
    function verifyIncidentHash(
        bytes32 incidentIdKey,
        bytes32 computedHash
    ) external view returns (bool isValid, IncidentStatus status, uint256 timestamp, bool isAudited) {
        IncidentRecord memory record = _incidents[incidentIdKey];
        if (record.createdAt == 0) {
            return (false, IncidentStatus.Reported, 0, false);
        }
        bool matches = (record.incidentHash == computedHash);
        return (matches, record.status, record.createdAt, record.isAudited);
    }

    /**
     * @notice Retrieve incident details by key.
     */
    function getIncident(bytes32 incidentIdKey) external view returns (IncidentRecord memory) {
        require(_incidents[incidentIdKey].createdAt > 0, "Incident does not exist");
        return _incidents[incidentIdKey];
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
