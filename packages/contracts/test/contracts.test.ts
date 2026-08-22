import { expect } from "chai";
import { ethers } from "hardhat";

describe("Tourist Safety Platform Smart Contracts", function () {
  let admin: any;
  let responder: any;
  let auditor: any;
  let user: any;

  let incidentRegistry: any;
  let touristIdentityRegistry: any;
  let geofenceRegistry: any;
  let responderRegistry: any;

  beforeEach(async function () {
    [admin, responder, auditor, user] = await ethers.getSigners();

    // Deploy IncidentRegistry
    const IncidentRegistryFactory = await ethers.getContractFactory("IncidentRegistry");
    incidentRegistry = await IncidentRegistryFactory.deploy(admin.address);
    await incidentRegistry.waitForDeployment();

    // Deploy TouristIdentityRegistry
    const IdentityFactory = await ethers.getContractFactory("TouristIdentityRegistry");
    touristIdentityRegistry = await IdentityFactory.deploy(admin.address);
    await touristIdentityRegistry.waitForDeployment();

    // Deploy GeofenceRegistry
    const GeofenceFactory = await ethers.getContractFactory("GeofenceRegistry");
    geofenceRegistry = await GeofenceFactory.deploy(admin.address);
    await geofenceRegistry.waitForDeployment();

    // Deploy ResponderRegistry
    const ResponderFactory = await ethers.getContractFactory("ResponderRegistry");
    responderRegistry = await ResponderFactory.deploy(admin.address);
    await responderRegistry.waitForDeployment();
  });

  describe("IncidentRegistry", function () {
    it("should anchor a new incident and verify hash", async function () {
      const incidentIdKey = ethers.keccak256(ethers.toUtf8Bytes("INC-2026-001"));
      const incidentHash = ethers.keccak256(ethers.toUtf8Bytes("payload:SOS:lat26.91:lng75.78"));
      const locationHash = ethers.keccak256(ethers.toUtf8Bytes("jaipur:pinkcity"));

      const tx = await incidentRegistry.connect(user).anchorIncident(incidentIdKey, incidentHash, locationHash);
      await tx.wait();

      const [isValid, status, timestamp, isAudited] = await incidentRegistry.verifyIncidentHash(incidentIdKey, incidentHash);
      expect(isValid).to.be.true;
      expect(status).to.equal(0); // Reported
      expect(isAudited).to.be.false;
      expect(timestamp).to.be.gt(0);
    });

    it("should allow responder role to update status and evidence", async function () {
      const RESPONDER_ROLE = await incidentRegistry.RESPONDER_ROLE();
      await incidentRegistry.grantRole(RESPONDER_ROLE, responder.address);

      const incidentIdKey = ethers.keccak256(ethers.toUtf8Bytes("INC-2026-002"));
      const incidentHash = ethers.keccak256(ethers.toUtf8Bytes("payload:SOS:002"));
      const locationHash = ethers.keccak256(ethers.toUtf8Bytes("location:002"));

      await incidentRegistry.anchorIncident(incidentIdKey, incidentHash, locationHash);

      const updateTx = await incidentRegistry.connect(responder).updateIncidentStatus(incidentIdKey, 3, responder.address);
      await updateTx.wait();

      const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes("resolution:report:cleared"));
      const evTx = await incidentRegistry.connect(responder).appendEvidence(incidentIdKey, evidenceHash);
      await evTx.wait();

      const record = await incidentRegistry.getIncident(incidentIdKey);
      expect(record.status).to.equal(3); // Resolved
      expect(record.assignedResponder).to.equal(responder.address);
      expect(record.evidenceHash).to.equal(evidenceHash);
    });
  });

  describe("TouristIdentityRegistry", function () {
    it("should register and verify a valid tourist digital credential", async function () {
      const credHash = ethers.keccak256(ethers.toUtf8Bytes("did:tourist:DTI-IND-101"));
      const expiresAt = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now

      await touristIdentityRegistry.registerCredential(credHash, expiresAt);

      const [isValid, state, exp] = await touristIdentityRegistry.verifyCredential(credHash);
      expect(isValid).to.be.true;
      expect(state).to.equal(1); // Active
    });

    it("should suspend or revoke credentials", async function () {
      const credHash = ethers.keccak256(ethers.toUtf8Bytes("did:tourist:DTI-IND-102"));
      const expiresAt = Math.floor(Date.now() / 1000) + 86400;

      await touristIdentityRegistry.registerCredential(credHash, expiresAt);
      await touristIdentityRegistry.updateCredentialState(credHash, 3); // Revoked

      const [isValid, state] = await touristIdentityRegistry.verifyCredential(credHash);
      expect(isValid).to.be.false;
      expect(state).to.equal(3); // Revoked
    });
  });

  describe("GeofenceRegistry", function () {
    it("should register and toggle geofences", async function () {
      const gKey = ethers.keccak256(ethers.toUtf8Bytes("GEO-JAIPUR-RESTRICTED"));
      const gHash = ethers.keccak256(ethers.toUtf8Bytes("polygon:coordinates:..."));
      const nameHash = ethers.keccak256(ethers.toUtf8Bytes("Amer Fort High Risk Zone"));

      await geofenceRegistry.registerGeofence(gKey, gHash, nameHash, 2); // High severity
      expect(await geofenceRegistry.totalGeofences()).to.equal(1);

      const record = await geofenceRegistry.getGeofence(gKey);
      expect(record.active).to.be.true;

      await geofenceRegistry.setGeofenceActive(gKey, false);
      const updatedRecord = await geofenceRegistry.getGeofence(gKey);
      expect(updatedRecord.active).to.be.false;
    });
  });

  describe("ResponderRegistry", function () {
    it("should register emergency responder unit and verify wallet address", async function () {
      const responderKey = ethers.keccak256(ethers.toUtf8Bytes("RESP-POLICE-01"));
      const badgeHash = ethers.keccak256(ethers.toUtf8Bytes("BADGE-7890"));
      const deptHash = ethers.keccak256(ethers.toUtf8Bytes("Jaipur City Police"));

      await responderRegistry.registerResponder(responderKey, badgeHash, deptHash, responder.address);

      const [isVerified, key, status] = await responderRegistry.verifyResponderAddress(responder.address);
      expect(isVerified).to.be.true;
      expect(key).to.equal(responderKey);
      expect(status).to.equal(0); // Available
    });
  });
});
