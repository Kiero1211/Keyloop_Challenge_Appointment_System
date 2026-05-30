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

export class UnauthorizedException extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedException';
  }
}

export class ForbiddenException extends Error {
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenException';
  }
}

export class NotFoundException extends Error {
  constructor(message: string = 'Not Found') {
    super(message);
    this.name = 'NotFoundException';
  }
}

export class ConflictException extends Error {
  constructor(message: string = 'Conflict') {
    super(message);
    this.name = 'ConflictException';
  }
}

export class UnprocessableException extends Error {
  constructor(message: string = 'Unprocessable Entity') {
    super(message);
    this.name = 'UnprocessableException';
  }
}

