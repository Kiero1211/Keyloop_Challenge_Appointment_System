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

  async findAll(tenantId: string, filters: any, page: number = 1, pageSize: number = 20): Promise<{ data: Appointment[], total: number }> {
    const conditions = [eq(appointments.tenantId, tenantId), isNull(appointments.deletedAt)];
    if (filters.status) conditions.push(eq(appointments.status, filters.status));
    if (filters.technicianId) conditions.push(eq(appointments.technicianId, filters.technicianId));
    if (filters.serviceBayId) conditions.push(eq(appointments.serviceBayId, filters.serviceBayId));
    // T106 date filter - assuming date is in YYYY-MM-DD format
    // Support legacy date filter
    if (filters.date && !filters.startTime && !filters.endTime) {
      const startOfDay = new Date(`${filters.date}T00:00:00.000Z`);
      const endOfDay = new Date(`${filters.date}T23:59:59.999Z`);
      conditions.push(sql`${appointments.scheduledStartTime} >= ${startOfDay.toISOString()} AND ${appointments.scheduledStartTime} <= ${endOfDay.toISOString()}`);
    }

    // Support new multi-day search
    if (filters.startTime || filters.endTime) {
      if (filters.startTime) {
        const start = new Date(filters.startTime);
        conditions.push(sql`${appointments.scheduledStartTime} >= ${start.toISOString()}`);
      }
      if (filters.endTime) {
        const end = new Date(filters.endTime);
        conditions.push(sql`${appointments.scheduledStartTime} <= ${end.toISOString()}`);
      }
    }

    const limit = pageSize;
    const offset = (page - 1) * pageSize;

    const results = await db.query.appointments.findMany({
      where: and(...conditions),
      limit,
      offset,
    });

    const [countResult] = await db.select({ count: sql`count(*)` }).from(appointments).where(and(...conditions));
    return { data: results as Appointment[], total: Number(countResult.count) };
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
