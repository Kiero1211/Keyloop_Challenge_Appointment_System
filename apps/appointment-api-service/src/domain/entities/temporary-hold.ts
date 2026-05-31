import { z } from "zod";

export const CreateHoldInputSchema = z.object({
  technicianId: z.string().min(1).optional(),
  serviceBayId: z.string().min(1).optional(),
}).refine(data => data.technicianId || data.serviceBayId, {
  message: "At least one of technicianId or serviceBayId must be provided"
});

export type CreateHoldInput = z.infer<typeof CreateHoldInputSchema>;

export interface TemporaryHold {
  holdId: string;
  tenantId: string;
  technicianId?: string;
  serviceBayId?: string;
  expiresAt: Date;
}
