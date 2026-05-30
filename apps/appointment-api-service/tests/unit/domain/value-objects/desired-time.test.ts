import { DesiredTime } from '../../../../src/domain/value-objects/desired-time';
import { DomainValidationException } from '../../../../src/domain/exceptions';

describe('DesiredTime Value Object', () => {
  it('should create valid desired time for future dates', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const time = new DesiredTime(futureDate);
    expect(time.value).toBe(futureDate);
  });

  it('should throw exception for invalid date formats', () => {
    expect(() => new DesiredTime('not-a-date')).toThrow(DomainValidationException);
    expect(() => new DesiredTime('not-a-date')).toThrow('desiredStartTime must be a valid ISO 8601 datetime');
  });

  it('should throw exception for past dates', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    expect(() => new DesiredTime(pastDate)).toThrow(DomainValidationException);
    expect(() => new DesiredTime(pastDate)).toThrow('desiredStartTime must be strictly in the future');
  });
});
