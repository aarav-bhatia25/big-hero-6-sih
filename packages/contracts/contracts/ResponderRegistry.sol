// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ResponderRegistry
 * @notice On-chain directory for verifying accredited emergency responder units and dispatch authorizations.
 */
contract ResponderRegistry is AccessControl {
    bytes32 public constant DISPATCH_ADMIN_ROLE = keccak256("DISPATCH_ADMIN_ROLE");

    enum UnitStatus { Available, Dispatched, OffDuty, Suspended }

    struct ResponderUnit {
        bytes32 responderIdKey;
        bytes32 badgeHash;
        bytes32 departmentHash;
        address walletAddress;
        UnitStatus status;
        bool isVerified;
        uint256 registeredAt;
    }

    mapping(bytes32 => ResponderUnit) private _responders;
    mapping(address => bytes32) private _addressToResponderKey;

    event ResponderRegistered(
        bytes32 indexed responderIdKey,
        bytes32 indexed departmentHash,
        address indexed walletAddress
    );

    event ResponderStatusUpdated(
        bytes32 indexed responderIdKey,
        UnitStatus newStatus,
        uint256 timestamp
    );

    constructor(address admin) {
        require(admin != address(0), "Invalid admin address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(DISPATCH_ADMIN_ROLE, admin);
    }

    /**
     * @notice Register an accredited emergency response unit on-chain.
     */
    function registerResponder(
        bytes32 responderIdKey,
        bytes32 badgeHash,
        bytes32 departmentHash,
        address walletAddress
    ) external onlyRole(DISPATCH_ADMIN_ROLE) {
        require(responderIdKey != bytes32(0), "Invalid responder key");
        require(walletAddress != address(0), "Invalid wallet address");
        require(_responders[responderIdKey].registeredAt == 0, "Responder already registered");

        _responders[responderIdKey] = ResponderUnit({
            responderIdKey: responderIdKey,
            badgeHash: badgeHash,
            departmentHash: departmentHash,
            walletAddress: walletAddress,
            status: UnitStatus.Available,
            isVerified: true,
            registeredAt: block.timestamp
        });

        _addressToResponderKey[walletAddress] = responderIdKey;

        emit ResponderRegistered(responderIdKey, departmentHash, walletAddress);
    }

    /**
     * @notice Update status of a responder unit.
     */
    function setResponderStatus(
        bytes32 responderIdKey,
        UnitStatus newStatus
    ) external {
        ResponderUnit storage unit = _responders[responderIdKey];
        require(unit.registeredAt > 0, "Responder not found");
        require(
            hasRole(DISPATCH_ADMIN_ROLE, msg.sender) || unit.walletAddress == msg.sender,
            "Not authorized to update status"
        );

        unit.status = newStatus;

        emit ResponderStatusUpdated(responderIdKey, newStatus, block.timestamp);
    }

    /**
     * @notice Verify if a responder unit address is verified and active.
     */
    function verifyResponderAddress(
        address walletAddress
    ) external view returns (bool isVerified, bytes32 responderIdKey, UnitStatus status) {
        bytes32 key = _addressToResponderKey[walletAddress];
        if (key == bytes32(0)) {
            return (false, bytes32(0), UnitStatus.OffDuty);
        }
        ResponderUnit memory unit = _responders[key];
        return (unit.isVerified, key, unit.status);
    }

    /**
     * @notice Get responder unit details by key.
     */
    function getResponder(bytes32 responderIdKey) external view returns (ResponderUnit memory) {
        require(_responders[responderIdKey].registeredAt > 0, "Responder not found");
        return _responders[responderIdKey];
    }
}
