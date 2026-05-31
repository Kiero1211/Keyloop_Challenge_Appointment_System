import { DomainValidationException } from '@/domain/exceptions';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';

export class CommandId {
  constructor(public readonly value: string) {
    if (!uuidValidate(value) || uuidVersion(value) !== 4) {
      throw new DomainValidationException('commandId must be a valid UUID v4');
    }
  }
}
