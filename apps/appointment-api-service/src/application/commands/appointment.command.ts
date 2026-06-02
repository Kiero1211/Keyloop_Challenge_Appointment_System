import { z } from 'zod';

export const createAppointmentCrudSchema = z.object({
  customerId: z.string().uuid('customerId must be a UUID'),
  vehicleId: z.string().uuid('vehicleId must be a UUID'),
  serviceTypeId: z.string().uuid('serviceTypeId must be a UUID'),
  technicianId: z.string().uuid('technicianId must be a UUID'),
  serviceBayId: z.string().uuid('serviceBayId must be a UUID'),
  startTime: z.string().datetime({ message: 'startTime must be a valid ISO 8601 datetime' }),
  endTime: z.string().datetime({ message: 'endTime must be a valid ISO 8601 datetime' }),
  notes: z.string().optional(),
});

export const updateAppointmentCrudSchema = createAppointmentCrudSchema.partial();

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(['Scheduled', 'InProgress', 'Completed', 'Cancelled']),
});

export type CreateAppointmentCrudCommand = z.infer<typeof createAppointmentCrudSchema>;
export type UpdateAppointmentCrudCommand = z.infer<typeof updateAppointmentCrudSchema>;
export type UpdateAppointmentStatusCommand = z.infer<typeof updateAppointmentStatusSchema>;
