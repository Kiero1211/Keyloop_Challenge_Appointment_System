export interface Technician {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
