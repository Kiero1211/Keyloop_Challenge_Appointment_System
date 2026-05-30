import { TechnicianSkill } from '../../../domain/entities/technician-skill.entity';

export interface ITechnicianSkillRepository {
  create(skill: Partial<TechnicianSkill>): Promise<TechnicianSkill>;
  findByTechnician(tenantId: string, technicianId: string): Promise<TechnicianSkill[]>;
  delete(tenantId: string, technicianId: string, serviceTypeId: string): Promise<boolean>;
  exists(tenantId: string, technicianId: string, serviceTypeId: string): Promise<boolean>;
}
