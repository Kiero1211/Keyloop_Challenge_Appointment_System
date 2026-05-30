import { PartitionHasher } from '../../../../src/domain/utils/partition-hasher';

describe('PartitionHasher', () => {
  it('should be deterministic for the same inputs', () => {
    const p1 = PartitionHasher.hash('tenant-1', 'vehicle-1');
    const p2 = PartitionHasher.hash('tenant-1', 'vehicle-1');
    expect(p1).toBe(p2);
  });

  it('should return value within [0, 3] by default', () => {
    for (let i = 0; i < 100; i++) {
      const p = PartitionHasher.hash(`tenant-${i}`, `vehicle-${i}`);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(3);
    }
  });

  it('should distribute 1000 items with acceptable variance (<= 30%)', () => {
    const buckets = [0, 0, 0, 0];
    const total = 1000;
    
    for (let i = 0; i < total; i++) {
      const tenantId = `tenant-${Math.floor(Math.random() * 50)}`; // Simulating 50 tenants
      const vehicleId = `veh-${Math.floor(Math.random() * 1000)}`; // Simulating 1000 vehicles
      const p = PartitionHasher.hash(tenantId, vehicleId);
      buckets[p]++;
    }

    const expectedPerBucket = total / 4;
    const maxVariance = expectedPerBucket * 0.3; // 30% variance

    for (let i = 0; i < 4; i++) {
      const variance = Math.abs(buckets[i] - expectedPerBucket);
      expect(variance).toBeLessThanOrEqual(maxVariance);
    }
  });
});
