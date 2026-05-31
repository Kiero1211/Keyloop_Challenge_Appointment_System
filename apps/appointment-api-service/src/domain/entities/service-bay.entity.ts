export interface ServiceBay {
  id: string;
  tenantId: string;
  name: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
