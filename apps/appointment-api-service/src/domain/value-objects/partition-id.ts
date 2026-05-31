import { DomainValidationException } from '@/domain/exceptions';

export class PartitionId {
  constructor(public readonly value: number) {
    if (!Number.isInteger(value) || value < 0 || value > 3) {
      throw new DomainValidationException('partitionId must be an integer between 0 and 3');
    }
  }
}
