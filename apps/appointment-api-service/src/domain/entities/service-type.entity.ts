export interface ServiceType {
  id: string;
  tenantId: string;
  name: string;
  estimatedDurationMinutes: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
