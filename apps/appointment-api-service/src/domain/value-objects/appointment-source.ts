import { DomainValidationException } from '../exceptions';

export class AppointmentSource {
  constructor(public readonly value: string) {
    if (value !== 'admin' && value !== 'public') {
      throw new DomainValidationException('source must be either "admin" or "public"');
    }
  }
}
