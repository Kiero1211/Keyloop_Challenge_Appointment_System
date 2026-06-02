import { eq, and, isNull, sql } from 'drizzle-orm';
import { db } from '@/infrastructure/db/client';
import { appointments } from '@/infrastructure/db/schema';
import { Appointment } from '@/domain/entities/appointment.entity';
import { IAppointmentCrudRepository } from '@/application/ports/repositories/appointment-crud.repository.port';
import { customers, vehicles, serviceTypes, technicians, serviceBays } from '@/infrastructure/db/schema';

export class DrizzleAppointmentCrudRepository implements IAppointmentCrudRepository {
  async create(data: Partial<Appointment>): Promise<Appointment> {
    const [result] = await db.insert(appointments).values({
      tenantId: data.tenantId!,
      customerId: data.customerId!,
      vehicleId: data.vehicleId!,
      serviceTypeId: data.serviceTypeId!,
      technicianId: data.technicianId!,
      serviceBayId: data.serviceBayId!,
      status: data.status || 'Scheduled',
      scheduledStartTime: data.scheduledStartTime!,
      scheduledEndTime: data.scheduledEndTime!,
      notes: data.notes,
    }).returning();
    return result as Appointment;
  }

  async findById(tenantId: string, id: string): Promise<Appointment | null> {
    const result = await db.query.appointments.findFirst({
      where: and(eq(appointments.id, id), eq(appointments.tenantId, tenantId), isNull(appointments.deletedAt)),
    });
    return (result as Appointment) || null;
  }

  async findDetailById(tenantId: string, id: string): Promise<any | null> {
    const result = await db.select({
      appointment: appointments,
      customer: customers,
      vehicle: vehicles,
      serviceType: serviceTypes,
      technician: technicians,
      serviceBay: serviceBays,
    })
      .from(appointments)
      .leftJoin(customers, eq(appointments.customerId, customers.id))
      .leftJoin(vehicles, eq(appointments.vehicleId, vehicles.id))
      .leftJoin(serviceTypes, eq(appointments.serviceTypeId, serviceTypes.id))
      .leftJoin(technicians, eq(appointments.technicianId, technicians.id))
      .leftJoin(serviceBays, eq(appointments.serviceBayId, serviceBays.id))
      .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId), isNull(appointments.deletedAt)))
      .limit(1);

    if (result.length === 0) return null;
    return result[0];
  }

  async findAll(tenantId: string | undefined, filters: any, page: number = 1, pageSize: number = 20): Promise<{ data: Appointment[], total: number, page: number, pageSize: number }> {
    const { count, gte, lte } = await import('drizzle-orm');
    const conditions = [isNull(appointments.deletedAt)];
    if (tenantId) {
      conditions.push(eq(appointments.tenantId, tenantId));
    }

    if (filters.status) conditions.push(eq(appointments.status, filters.status));
    if (filters.technicianId) conditions.push(eq(appointments.technicianId, filters.technicianId));
    if (filters.serviceBayId) conditions.push(eq(appointments.serviceBayId, filters.serviceBayId));
    if (filters.customerId) conditions.push(eq(appointments.customerId, filters.customerId));
    if (filters.vehicleId) conditions.push(eq(appointments.vehicleId, filters.vehicleId));
    if (filters.date) {
      const startOfDay = new Date(filters.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.date);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(gte(appointments.scheduledStartTime, startOfDay), lte(appointments.scheduledStartTime, endOfDay));
    }
    if (filters.startTime) conditions.push(gte(appointments.scheduledStartTime, new Date(filters.startTime)));
    if (filters.endTime) conditions.push(lte(appointments.scheduledEndTime, new Date(filters.endTime)));

    const whereClause = and(...conditions);
    
    const totalResult = await db.select({ count: count() }).from(appointments).where(whereClause);
    const total = totalResult[0].count;

    const offset = (page - 1) * pageSize;
    
    const results = await db.select().from(appointments)
      .where(whereClause)
      .orderBy(appointments.scheduledStartTime)
      .limit(pageSize)
      .offset(offset);

    return { data: results as Appointment[], total, page, pageSize };
  }

  async updateStatus(tenantId: string, id: string, status: string): Promise<Appointment | null> {
    const [result] = await db.update(appointments)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId), isNull(appointments.deletedAt)))
      .returning();
    return (result as Appointment) || null;
  }

  async softDelete(tenantId: string, id: string): Promise<boolean> {
    const [result] = await db.update(appointments)
      .set({ deletedAt: new Date() })
      .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId), isNull(appointments.deletedAt)))
      .returning();
    return !!result;
  }
}
