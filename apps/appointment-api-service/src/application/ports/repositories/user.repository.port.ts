export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  isSuperAdmin: boolean;
  lastLoginAt: Date | null;
  lastActiveTenantId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserRepository {
  create(user: Partial<User>): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByTenantId(tenantId: string): Promise<User[]>;
  update(id: string, user: Partial<User>): Promise<User | null>;
  updateLastLogin(id: string, date: Date): Promise<void>;
}
