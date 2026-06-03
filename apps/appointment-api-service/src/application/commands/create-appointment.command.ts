import { z } from 'zod';

export const createAppointmentSchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID').optional(),
  vehicleId: z.string().min(1, 'vehicleId is required'),
  serviceTypeId: z.string().min(1, 'serviceTypeId is required'),
  desiredStartTime: z.string().datetime({ message: 'desiredStartTime must be a valid ISO 8601 datetime' }),
  autoAssigned: z.boolean().default(false),
  technicianId: z.string().min(1, 'technicianId is required').optional(),
  serviceBayId: z.string().min(1, 'serviceBayId is required').optional(),
}).refine(data => {
  if (!data.autoAssigned) {
    return !!(data.technicianId && data.serviceBayId);
  }
  return true;
}, {
  message: "technicianId and serviceBayId are required when autoAssigned is false",
  path: ["autoAssigned"],
});

export type CreateAppointmentCommand = z.infer<typeof createAppointmentSchema>;
