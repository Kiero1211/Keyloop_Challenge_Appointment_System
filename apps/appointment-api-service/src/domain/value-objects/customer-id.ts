import { DomainValidationException } from '../exceptions';

export class CustomerId {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new DomainValidationException('customerId must be a non-empty string');
    }
  }
}
