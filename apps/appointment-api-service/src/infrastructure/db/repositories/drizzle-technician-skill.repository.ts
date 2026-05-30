import { eq, and } from 'drizzle-orm';
import { db } from '../client';
import { technicianSkills } from '../schema';
import { TechnicianSkill } from '@/domain/entities/technician-skill.entity';
import { ITechnicianSkillRepository } from '@/application/ports/repositories/technician-skill.repository.port';

export class DrizzleTechnicianSkillRepository implements ITechnicianSkillRepository {
  async create(data: Partial<TechnicianSkill>): Promise<TechnicianSkill> {
    const [result] = await db.insert(technicianSkills).values({
      tenantId: data.tenantId!,
      technicianId: data.technicianId!,
      serviceTypeId: data.serviceTypeId!,
    }).returning();
    return result as TechnicianSkill;
  }

  async findByTechnician(tenantId: string, technicianId: string): Promise<TechnicianSkill[]> {
    const results = await db.query.technicianSkills.findMany({
      where: and(eq(technicianSkills.tenantId, tenantId), eq(technicianSkills.technicianId, technicianId)),
    });
    return results as TechnicianSkill[];
  }

  async delete(tenantId: string, technicianId: string, serviceTypeId: string): Promise<boolean> {
    const [result] = await db.delete(technicianSkills)
      .where(and(
        eq(technicianSkills.tenantId, tenantId),
        eq(technicianSkills.technicianId, technicianId),
        eq(technicianSkills.serviceTypeId, serviceTypeId)
      )).returning();
    return !!result;
  }

  async exists(tenantId: string, technicianId: string, serviceTypeId: string): Promise<boolean> {
    const result = await db.query.technicianSkills.findFirst({
      where: and(
        eq(technicianSkills.tenantId, tenantId),
        eq(technicianSkills.technicianId, technicianId),
        eq(technicianSkills.serviceTypeId, serviceTypeId)
      ),
    });
    return !!result;
  }
}
