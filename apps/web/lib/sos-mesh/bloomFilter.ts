/**
 * Offline SOS Mesh — Lightweight Bloom Filter for Mesh Peer Synchronization
 * 
 * Enables nearby BLE nodes to exchange small bitset digests (8-32 bytes) to negotiate
 * missing Nostr event IDs before transferring full payloads over radio.
 */

/**
 * Shared mesh digest geometry. Both ends of a peer link must agree on these or
 * the bitsets are not comparable. 1024 bits is 128 bytes on the wire and keeps
 * the false-positive rate near 1.5% at a hundred held packets — a false
 * positive means an SOS is not re-sent to a peer, so the margin is deliberate.
 */
export const MESH_BLOOM_SIZE_BITS = 1024;
export const MESH_BLOOM_HASHES = 3;

export class BloomFilter {
  private sizeBits: number;
  private hashCount: number;
  private bitset: Uint8Array;

  constructor(sizeBits: number = MESH_BLOOM_SIZE_BITS, hashCount: number = MESH_BLOOM_HASHES) {
    this.sizeBits = sizeBits;
    this.hashCount = hashCount;
    this.bitset = new Uint8Array(Math.ceil(sizeBits / 8));
  }

  private hash(item: string, seed: number): number {
    let h = 0x811c9dc5 ^ seed;
    for (let i = 0; i < item.length; i++) {
      h ^= item.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0) % this.sizeBits;
  }

  public add(item: string): void {
    for (let i = 0; i < this.hashCount; i++) {
      const bitIndex = this.hash(item, i * 31);
      const byteIndex = Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      this.bitset[byteIndex] |= 1 << bitOffset;
    }
  }

  public has(item: string): boolean {
    for (let i = 0; i < this.hashCount; i++) {
      const bitIndex = this.hash(item, i * 31);
      const byteIndex = Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      if ((this.bitset[byteIndex] & (1 << bitOffset)) === 0) {
        return false;
      }
    }
    return true;
  }

  public toBuffer(): Uint8Array {
    return this.bitset;
  }

  public static fromBuffer(buf: Uint8Array, sizeBits: number = MESH_BLOOM_SIZE_BITS, hashCount: number = MESH_BLOOM_HASHES): BloomFilter {
    const filter = new BloomFilter(sizeBits, hashCount);
    filter.bitset.set(buf.subarray(0, filter.bitset.length));
    return filter;
  }

  /**
   * Returns list of item IDs in `myItems` that peer filter indicates are MISSING from peer.
   */
  public getMissingItemsForPeer(myItems: string[]): string[] {
    return myItems.filter((id) => !this.has(id));
  }
}
