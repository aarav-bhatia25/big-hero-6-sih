import { ethers } from "ethers";

/**
 * Thin client for the on-chain TouristIdentityRegistry. Anchors credential
 * hashes (never PII) so a credential can be independently verified and proven
 * un-tampered. Works against a local Hardhat chain out of the box; point the
 * env vars at Sepolia (Alchemy RPC + a funded key) to go public — no code change.
 *
 * Every function degrades gracefully: if the chain is not configured or is
 * unreachable it returns null, exactly like the ML client, so credential
 * issuance never fails just because anchoring is unavailable.
 */

const ABI = [
  "function registerCredential(bytes32 credentialHash, uint64 expiresAt) external",
  "function updateCredentialState(bytes32 credentialHash, uint8 newState) external",
  "function verifyCredential(bytes32 credentialHash) external view returns (bool isValid, uint8 currentState, uint64 expiresAt)",
  "function getCredential(bytes32 credentialHash) external view returns (tuple(bytes32 credentialHash, uint64 issuedAt, uint64 expiresAt, uint8 state, address issuer))",
  "function totalIssuedCredentials() external view returns (uint256)",
  "event CredentialRegistered(bytes32 indexed credentialHash, address indexed issuer, uint64 issuedAt, uint64 expiresAt)",
];

const RPC = process.env.CHAIN_RPC_URL;
const ADDR = process.env.IDENTITY_REGISTRY_ADDRESS;
const KEY = process.env.ANCHOR_PRIVATE_KEY;

/** Writing (anchoring) needs all three; reading only needs RPC + address. */
export const isChainConfigured = Boolean(RPC && ADDR && KEY);
export const isChainReadable = Boolean(RPC && ADDR);

export const CREDENTIAL_STATE = ["Inexistent", "Active", "Suspended", "Revoked", "Expired"] as const;

/** credentialHash is already `0x` + 64 hex (sha256) — a valid bytes32. */
function toBytes32(hash: string): string {
  return hash.startsWith("0x") ? hash : "0x" + hash;
}

export interface AnchorResult {
  txHash: string;
  blockNumber: number;
  chainId: number;
  alreadyAnchored?: boolean;
}

export async function anchorCredential(
  credentialHash: string,
  expiresAtISO: string
): Promise<AnchorResult | null> {
  if (!isChainConfigured) return null;
  try {
    const provider = new ethers.JsonRpcProvider(RPC);
    const wallet = new ethers.Wallet(KEY as string, provider);
    const contract = new ethers.Contract(ADDR as string, ABI, wallet);
    const hash = toBytes32(credentialHash);
    const net = await provider.getNetwork();

    // Idempotent: if this hash is already on-chain, don't re-send (the contract
    // would revert with "already registered").
    const [, stateNum] = await contract.verifyCredential(hash);
    if (Number(stateNum) !== 0) {
      return { txHash: "", blockNumber: 0, chainId: Number(net.chainId), alreadyAnchored: true };
    }

    const expiresAt = Math.floor(new Date(expiresAtISO).getTime() / 1000);
    const tx = await contract.registerCredential(hash, expiresAt);
    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber ?? 0,
      chainId: Number(net.chainId),
    };
  } catch (err: any) {
    console.warn("[prahari] anchorCredential:", err?.message ?? err);
    return null;
  }
}

export interface OnChainStatus {
  exists: boolean;
  isValid: boolean;
  state: string;
  expiresAt: number;
  chainId: number;
}

export async function verifyOnChain(credentialHash: string): Promise<OnChainStatus | null> {
  if (!isChainReadable) return null;
  try {
    const provider = new ethers.JsonRpcProvider(RPC);
    const contract = new ethers.Contract(ADDR as string, ABI, provider);
    const hash = toBytes32(credentialHash);
    const [isValid, stateNum, expiresAt] = await contract.verifyCredential(hash);
    const net = await provider.getNetwork();
    return {
      exists: Number(stateNum) !== 0,
      isValid: Boolean(isValid),
      state: CREDENTIAL_STATE[Number(stateNum)] ?? "Unknown",
      expiresAt: Number(expiresAt),
      chainId: Number(net.chainId),
    };
  } catch (err: any) {
    console.warn("[prahari] verifyOnChain:", err?.message ?? err);
    return null;
  }
}
exists: Number(stateNum) !== 0,
  isValid: Boolean(isValid),
    state: CREDENTIAL_STATE[Number(stateNum)] ?? "Unknown",
      expiresAt: Number(expiresAt),
        chainId: Number(net.chainId),
    };
  } catch (err: any) {
  console.warn("[prahari] verifyOnChain:", err?.message ?? err);
  return null;
}
}
