// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title GeofenceRegistry
 * @notice On-chain registry for government and authority published safety boundaries & hazard zones.
 */
contract GeofenceRegistry is AccessControl {
    bytes32 public constant GEOFENCE_MANAGER_ROLE = keccak256("GEOFENCE_MANAGER_ROLE");

    enum ZoneSeverity { Low, Medium, High, Critical }

    struct GeofenceRecord {
        bytes32 geofenceHash;
        bytes32 nameHash;
        ZoneSeverity severity;
        bool active;
        uint256 createdAt;
        uint256 updatedAt;
        address registeredBy;
    }

    mapping(bytes32 => GeofenceRecord) private _geofences;
    bytes32[] private _geofenceKeys;

    event GeofenceRegistered(
        bytes32 indexed geofenceKey,
        bytes32 indexed geofenceHash,
        ZoneSeverity severity,
        address indexed authority
    );

    event GeofenceStatusToggled(
        bytes32 indexed geofenceKey,
        bool active,
        address indexed authority
    );

    constructor(address admin) {
        require(admin != address(0), "Invalid admin address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GEOFENCE_MANAGER_ROLE, admin);
    }

    /**
     * @notice Register a new geofence polygon hash on-chain.
     */
    function registerGeofence(
        bytes32 geofenceKey,
        bytes32 geofenceHash,
        bytes32 nameHash,
        ZoneSeverity severity
    ) external onlyRole(GEOFENCE_MANAGER_ROLE) {
        require(geofenceKey != bytes32(0), "Invalid geofence key");
        require(_geofences[geofenceKey].createdAt == 0, "Geofence key already exists");

        _geofences[geofenceKey] = GeofenceRecord({
            geofenceHash: geofenceHash,
            nameHash: nameHash,
            severity: severity,
            active: true,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            registeredBy: msg.sender
        });

        _geofenceKeys.push(geofenceKey);

        emit GeofenceRegistered(geofenceKey, geofenceHash, severity, msg.sender);
    }

    /**
     * @notice Toggle active state of a registered geofence (e.g. dynamic disaster zone clear).
     */
    function setGeofenceActive(
        bytes32 geofenceKey,
        bool active
    ) external onlyRole(GEOFENCE_MANAGER_ROLE) {
        require(_geofences[geofenceKey].createdAt > 0, "Geofence not found");

        _geofences[geofenceKey].active = active;
        _geofences[geofenceKey].updatedAt = block.timestamp;

        emit GeofenceStatusToggled(geofenceKey, active, msg.sender);
    }

    /**
     * @notice Get geofence details.
     */
    function getGeofence(bytes32 geofenceKey) external view returns (GeofenceRecord memory) {
        require(_geofences[geofenceKey].createdAt > 0, "Geofence not found");
        return _geofences[geofenceKey];
    }

    /**
     * @notice Total registered geofences count.
     */
    function totalGeofences() external view returns (uint256) {
        return _geofenceKeys.length;
    }
}
