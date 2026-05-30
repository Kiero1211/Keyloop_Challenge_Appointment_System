export interface Vehicle {
  id: string;
  tenantId: string;
  customerId: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  licensePlate?: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
