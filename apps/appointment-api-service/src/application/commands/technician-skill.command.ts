import { z } from 'zod';

export const createTechnicianSkillSchema = z.object({
  serviceTypeId: z.string().uuid('Invalid service type ID'),
});

export type CreateTechnicianSkillCommand = z.infer<typeof createTechnicianSkillSchema>;
