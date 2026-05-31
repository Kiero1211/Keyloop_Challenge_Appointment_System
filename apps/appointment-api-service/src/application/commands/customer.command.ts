import { z } from 'zod';

export const createCustomerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerCommand = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerCommand = z.infer<typeof updateCustomerSchema>;
