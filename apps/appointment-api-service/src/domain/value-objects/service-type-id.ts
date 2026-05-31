import { DomainValidationException } from '@/domain/exceptions';

export class ServiceTypeId {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new DomainValidationException('serviceTypeId must be a non-empty string');
    }
  }
}
