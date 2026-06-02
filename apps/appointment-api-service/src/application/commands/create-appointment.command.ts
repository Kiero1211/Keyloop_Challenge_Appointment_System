import { z } from 'zod';

export const createAppointmentSchema = z.object({
  customerId: z.string().min(1, 'customerId is required'),
  vehicleId: z.string().min(1, 'vehicleId is required'),
  serviceTypeId: z.string().min(1, 'serviceTypeId is required'),
  desiredStartTime: z.string().datetime({ message: 'desiredStartTime must be a valid ISO 8601 datetime' }),
  autoAssigned: z.boolean().default(false),
  technicianHolId: z.string().uuid('technicianHolId must be a valid UUID').optional(),
  serviceBayHoldId: z.string().uuid('serviceBayHoldId must be a valid UUID').optional(),
  technicianId: z.string().min(1, 'technicianId is required').optional(),
  serviceBayId: z.string().min(1, 'serviceBayId is required').optional(),
}).refine(data => {
  if (!data.autoAssigned) {
    return !!(data.technicianHolId && data.serviceBayHoldId && data.technicianId && data.serviceBayId);
  }
  return true;
}, {
  message: "technicianHolId, serviceBayHoldId, technicianId, and serviceBayId are required when autoAssigned is false",
  path: ["autoAssigned"],
});

export type CreateAppointmentCommand = z.infer<typeof createAppointmentSchema>;
