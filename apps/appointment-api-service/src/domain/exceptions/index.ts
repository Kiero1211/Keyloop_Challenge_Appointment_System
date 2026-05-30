export class DomainValidationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainValidationException';
  }
}

export class DuplicateAppointmentException extends Error {
  constructor(public readonly vehicleId: string) {
    super(`Appointment already pending for vehicle ${vehicleId}`);
    this.name = 'DuplicateAppointmentException';
  }
}

export class CacheUnavailableException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CacheUnavailableException';
  }
}

export class StreamPublishException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StreamPublishException';
  }
}
