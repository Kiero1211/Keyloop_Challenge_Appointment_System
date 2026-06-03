export interface Vehicle {
  id: string;
  tenantId: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  licensePlate?: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
