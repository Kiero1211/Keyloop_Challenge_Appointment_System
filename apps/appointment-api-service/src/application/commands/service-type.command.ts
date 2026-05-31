import { z } from 'zod';

export const createServiceTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  estimatedDurationMinutes: z.number().int().min(1, 'Duration must be at least 1 minute'),
});

export const updateServiceTypeSchema = createServiceTypeSchema.partial();

export type CreateServiceTypeCommand = z.infer<typeof createServiceTypeSchema>;
export type UpdateServiceTypeCommand = z.infer<typeof updateServiceTypeSchema>;
