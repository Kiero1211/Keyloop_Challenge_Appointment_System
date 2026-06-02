import { z } from 'zod';

export const getAuditLogsQuerySchema = z.object({
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

export type GetAuditLogsQuery = z.infer<typeof getAuditLogsQuerySchema>;
