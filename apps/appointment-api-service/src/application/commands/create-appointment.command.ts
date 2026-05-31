import { z } from 'zod';

export const createAppointmentSchema = z.object({
  customerId: z.string().min(1, 'customerId is required'),
  vehicleId: z.string().min(1, 'vehicleId is required'),
  serviceTypeId: z.string().min(1, 'serviceTypeId is required'),
  technicianId: z.string().min(1, 'technicianId is required'),
  serviceBayId: z.string().min(1, 'serviceBayId is required'),
  desiredStartTime: z.string().datetime({ message: 'desiredStartTime must be a valid ISO 8601 datetime' }),
});

export type CreateAppointmentCommand = z.infer<typeof createAppointmentSchema>;
