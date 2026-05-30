import { ITechnicianRepository } from '@/application/ports/repositories/technician.repository.port';
import { ConflictException } from '@/domain/exceptions';
import { Technician } from '@/domain/entities/technician.entity';

export class CreateTechnicianUseCase {
  constructor(private readonly technicianRepo: ITechnicianRepository) {}

  async execute(tenantId: string, data: { firstName: string; lastName: string; email: string }): Promise<Technician> {
    const existing = await this.technicianRepo.findByEmail(tenantId, data.email);
    if (existing) {
      throw new ConflictException(`Technician with email ${data.email} already exists`);
    }

    return this.technicianRepo.create({
      tenantId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
    });
  }
}
