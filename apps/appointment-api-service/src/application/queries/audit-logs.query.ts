import { z } from 'zod';

export const getAuditLogsQuerySchema = z.object({
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
});

export type GetAuditLogsQuery = z.infer<typeof getAuditLogsQuerySchema>;
