import { z } from 'zod';

export const createServiceBaySchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

export const updateServiceBaySchema = createServiceBaySchema.partial();

export type CreateServiceBayCommand = z.infer<typeof createServiceBaySchema>;
export type UpdateServiceBayCommand = z.infer<typeof updateServiceBaySchema>;
