export interface Customer {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
