export class PartitionHasher {
  private static readonly FNV_OFFSET_BASIS = 2166136261;
  private static readonly FNV_PRIME = 16777619;
  private static readonly PARTITION_COUNT = 4;

  /**
   * Computes a deterministic partition (0 to PARTITION_COUNT-1)
   * using FNV-1a 32-bit hash algorithm.
   */
  public static hash(tenantId: string, vehicleId: string): number {
    const key = `${tenantId}:${vehicleId}`;
    let hash = this.FNV_OFFSET_BASIS;

    for (let i = 0; i < key.length; i++) {
      hash ^= key.charCodeAt(i);
      // Multiply by FNV prime using 32-bit integer arithmetic
      // hash * 16777619 is equivalent to hash + (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
      hash = Math.imul(hash, this.FNV_PRIME);
    }

    // Ensure positive integer modulo
    return (hash >>> 0) % this.PARTITION_COUNT;
  }
}
