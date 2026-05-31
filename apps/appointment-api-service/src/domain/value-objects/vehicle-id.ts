import { DomainValidationException } from '@/domain/exceptions';

export class VehicleId {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new DomainValidationException('vehicleId must be a non-empty string');
    }
  }
}
