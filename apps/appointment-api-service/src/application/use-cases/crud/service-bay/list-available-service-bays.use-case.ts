import { IServiceBayRepository } from '@/application/ports/repositories/service-bay.repository.port';
import { ServiceBay } from '@/domain/entities/service-bay.entity';
import { tenantContext } from '@/domain/context/tenant-context';
import { DomainValidationException } from '@/domain/exceptions';

export class ListAvailableServiceBaysUseCase {
  constructor(private readonly serviceBayRepository: IServiceBayRepository) {}

  async execute(startTime: string, endTime: string): Promise<ServiceBay[]> {
    const context = tenantContext.getStore();
    if (!context || !context.tenantId) {
      throw new DomainValidationException('Tenant context is missing');
    }

    const parsedStartTime = new Date(startTime);
    const parsedEndTime = new Date(endTime);

    if (isNaN(parsedStartTime.getTime()) || isNaN(parsedEndTime.getTime())) {
      throw new DomainValidationException('Invalid start or end time format');
    }

    if (parsedStartTime >= parsedEndTime) {
      throw new DomainValidationException('Start time must be before end time');
    }

    return this.serviceBayRepository.findAvailable(context.tenantId, parsedStartTime, parsedEndTime);
  }
}
