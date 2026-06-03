import { z } from 'zod';

export const createVehicleSchema = z.object({
  userId: z.string().uuid('Invalid userId'),
  licensePlate: z.string().min(1, 'License plate is required'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  color: z.string().optional(),
});

export const updateVehicleSchema = createVehicleSchema.omit({ userId: true }).partial();

export type CreateVehicleCommand = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleCommand = z.infer<typeof updateVehicleSchema>;
