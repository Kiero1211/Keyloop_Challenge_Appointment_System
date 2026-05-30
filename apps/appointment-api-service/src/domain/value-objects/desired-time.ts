import { DomainValidationException } from '../exceptions';

export class DesiredTime {
  public readonly value: string;
  
  constructor(value: string) {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new DomainValidationException('desiredStartTime must be a valid ISO 8601 datetime');
    }
    
    if (date.getTime() <= Date.now()) {
      throw new DomainValidationException('desiredStartTime must be strictly in the future');
    }
    
    this.value = date.toISOString();
  }
}
