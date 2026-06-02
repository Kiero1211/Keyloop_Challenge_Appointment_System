import { Request, Response, NextFunction } from 'express';
import { DomainValidationException, DuplicateAppointmentException, UnauthorizedException, ForbiddenException, NotFoundException, ConflictException, UnprocessableException } from '@/domain/exceptions';
import { ZodError } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.errors
    });
  }

  if (err instanceof DomainValidationException) {
    return res.status(400).json({
      error: 'Bad Request',
      message: err.message
    });
  }

  if (err instanceof DuplicateAppointmentException) {
    return res.status(409).json({
      error: 'Conflict',
      message: err.message
    });
  }

  if (err instanceof UnauthorizedException) {
    return res.status(401).json({ error: 'Unauthorized', message: err.message });
  }

  if (err instanceof ForbiddenException) {
    return res.status(403).json({ error: 'Forbidden', message: err.message });
  }

  if (err instanceof NotFoundException) {
    return res.status(404).json({ error: 'Not Found', message: err.message });
  }

  if (err instanceof ConflictException) {
    return res.status(409).json({ error: 'Conflict', message: err.message });
  }

  if (err instanceof UnprocessableException) {
    return res.status(422).json({ error: 'Unprocessable Entity', message: err.message });
  }

  console.error('Unhandled Exception:', err.message);

  return res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  });
};
