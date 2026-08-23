import { ethers } from 'ethers';

const ABI = [
  'function anchorIncident(bytes32 incidentIdKey, bytes32 incidentHash, bytes32 locationHash) external',
  'function verifyIncidentHash(bytes32 incidentIdKey, bytes32 computedHash) external view returns (bool isValid, uint8 status, uint256 timestamp, bool isAudited)',
];

const RPC = process.env.CHAIN_RPC_URL;
const ADDRESS = process.env.INCIDENT_REGISTRY_ADDRESS;
const KEY = process.env.ANCHOR_PRIVATE_KEY;

export const isIncidentChainConfigured = Boolean(RPC && ADDRESS && KEY);
export const isIncidentChainReadable = Boolean(RPC && ADDRESS);

export type EvidenceAnchor = {
  payloadHash: string;
  incidentKey: string;
  locationHash: string;
  txHash: string;
  blockNumber: number;
  chainId: number;
  anchoredAt: string;
  alreadyAnchored?: boolean;
};

/**
 * Derives a stable, privacy-safe commitment. It intentionally excludes names,
 * contact data, full GPS coordinates, raw witness statements, and attachments.
 * Only the hashes and a coarse (~1 km) location grid reach the public ledger.
 */
export function createEfirCommitment(incidentId: string, efir: Record<string, any>) {
  const digest = (value: unknown) => ethers.keccak256(ethers.toUtf8Bytes(String(value ?? '')));
  const canonical = JSON.stringify({
    version: 1,
    incidentId,
    efirId: efir.efirId,
    category: efir.incidentCategory ?? efir.incidentType,
    occurrenceAt: efir.occurrenceAt ?? null,
    reportedAt: efir.reportedAt ?? efir.createdAt,
    narrativeDigest: digest(efir.narrative),
    evidenceDigests: (efir.evidence ?? []).map((item: any) => digest(`${item.type ?? ''}:${item.reference ?? ''}:${item.description ?? ''}`)),
    propertyDigests: (efir.stolenItems ?? []).map((item: any) => digest(item)),
  });
  const location = efir.location ?? {};
  const coarseLocation = `${Number(location.lat).toFixed(2)},${Number(location.lng).toFixed(2)}`;

  return {
    incidentKey: digest(incidentId),
    payloadHash: digest(canonical),
    locationHash: digest(coarseLocation),
  };
}

export async function anchorEfirEvidence(incidentId: string, efir: Record<string, any>): Promise<EvidenceAnchor | null> {
  if (!isIncidentChainConfigured) return null;
  try {
    const provider = new ethers.JsonRpcProvider(RPC);
    const wallet = new ethers.Wallet(KEY as string, provider);
    const contract = new ethers.Contract(ADDRESS as string, ABI, wallet);
    const commitment = createEfirCommitment(incidentId, efir);
    const network = await provider.getNetwork();

    const [alreadyMatches] = await contract.verifyIncidentHash(commitment.incidentKey, commitment.payloadHash);
    if (alreadyMatches) {
      return { ...commitment, txHash: '', blockNumber: 0, chainId: Number(network.chainId), anchoredAt: new Date().toISOString(), alreadyAnchored: true };
    }

    const tx = await contract.anchorIncident(commitment.incidentKey, commitment.payloadHash, commitment.locationHash);
    const receipt = await tx.wait();
    return {
      ...commitment,
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber ?? 0,
      chainId: Number(network.chainId),
      anchoredAt: new Date().toISOString(),
    };
  } catch (error: any) {
    // A rejected transaction must not block a human officer's decision. The
    // off-chain record keeps an explicit pending state for retry/reconciliation.
    console.warn('[prahari] anchorEfirEvidence:', error?.message ?? error);
    return null;
  }
}

export async function verifyEfirEvidence(incidentId: string, efir: Record<string, any>) {
  const commitment = createEfirCommitment(incidentId, efir);
  if (!isIncidentChainReadable) return { configured: false, anchored: false, matches: false, commitment };
  try {
    const provider = new ethers.JsonRpcProvider(RPC);
    const contract = new ethers.Contract(ADDRESS as string, ABI, provider);
    const [matches, status, timestamp, audited] = await contract.verifyIncidentHash(commitment.incidentKey, commitment.payloadHash);
    const network = await provider.getNetwork();
    return {
      configured: true,
      anchored: Number(timestamp) > 0,
      matches: Boolean(matches),
      status: Number(status),
      timestamp: Number(timestamp),
      audited: Boolean(audited),
      chainId: Number(network.chainId),
      commitment,
    };
  } catch (error: any) {
    console.warn('[prahari] verifyEfirEvidence:', error?.message ?? error);
    return { configured: true, anchored: false, matches: false, unavailable: true, commitment };
  }
}
