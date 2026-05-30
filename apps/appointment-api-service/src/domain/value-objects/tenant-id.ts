import { DomainValidationException } from '../exceptions';

export class TenantId {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new DomainValidationException('tenantId must be a non-empty string');
    }
  }
}
