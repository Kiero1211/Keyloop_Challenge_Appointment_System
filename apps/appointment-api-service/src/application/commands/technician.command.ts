import { z } from 'zod';

export const createTechnicianSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
});

export const updateTechnicianSchema = createTechnicianSchema.partial();

export type CreateTechnicianCommand = z.infer<typeof createTechnicianSchema>;
export type UpdateTechnicianCommand = z.infer<typeof updateTechnicianSchema>;
