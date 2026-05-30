import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../client';
import { vehicles } from '../schema';
import { Vehicle } from '@/domain/entities/vehicle.entity';
import { IVehicleRepository } from '@/application/ports/repositories/vehicle.repository.port';

export class DrizzleVehicleRepository implements IVehicleRepository {
  async create(data: Partial<Vehicle>): Promise<Vehicle> {
    const [result] = await db.insert(vehicles).values({
      tenantId: data.tenantId!,
      customerId: data.customerId!,
      make: data.make!,
      model: data.model!,
      year: data.year!,
      vin: data.vin,
      licensePlate: data.licensePlate,
    }).returning();
    return result as Vehicle;
  }

  async findById(tenantId: string, id: string): Promise<Vehicle | null> {
    const result = await db.query.vehicles.findFirst({
      where: and(eq(vehicles.id, id), eq(vehicles.tenantId, tenantId), isNull(vehicles.deletedAt)),
    });
    return (result as Vehicle) || null;
  }

  async findByCustomer(tenantId: string, customerId: string): Promise<Vehicle[]> {
    const results = await db.query.vehicles.findMany({
      where: and(eq(vehicles.customerId, customerId), eq(vehicles.tenantId, tenantId), isNull(vehicles.deletedAt)),
    });
    return results as Vehicle[];
  }

  async update(tenantId: string, id: string, data: Partial<Vehicle>): Promise<Vehicle | null> {
    const [result] = await db.update(vehicles)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(vehicles.id, id), eq(vehicles.tenantId, tenantId), isNull(vehicles.deletedAt)))
      .returning();
    return (result as Vehicle) || null;
  }

  async softDelete(tenantId: string, id: string): Promise<boolean> {
    const [result] = await db.update(vehicles)
      .set({ deletedAt: new Date() })
      .where(and(eq(vehicles.id, id), eq(vehicles.tenantId, tenantId), isNull(vehicles.deletedAt)))
      .returning();
    return !!result;
  }

  async hasActiveAppointments(tenantId: string, id: string): Promise<boolean> {
    return false; // placeholder implementation
  }
}
