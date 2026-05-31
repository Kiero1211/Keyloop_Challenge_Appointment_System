import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { CreateHoldInput, TemporaryHold } from '@/domain/entities/temporary-hold';
import { ConflictException } from '@/domain/exceptions';
import { v4 as uuidv4 } from 'uuid';

export class CreateHoldUseCase {
  constructor(private readonly cacheProvider: ICacheProvider) {}

  async execute(tenantId: string, input: CreateHoldInput): Promise<TemporaryHold> {
    const holdId = uuidv4();
    const ttlSeconds = 300; // 5 minutes
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const items: Array<{ key: string; value: string }> = [];
    if (input.technicianId) {
      items.push({ key: `tenant:${tenantId}:hold:technician:${input.technicianId}`, value: JSON.stringify({ holdId, technicianId: input.technicianId, expiresAt: expiresAt.toISOString() }) });
    }
    if (input.serviceBayId) {
      items.push({ key: `tenant:${tenantId}:hold:bay:${input.serviceBayId}`, value: JSON.stringify({ holdId, serviceBayId: input.serviceBayId, expiresAt: expiresAt.toISOString() }) });
    }

    const success = await this.cacheProvider.setMultipleIfNotExists(items, ttlSeconds);

    if (!success) {
      throw new ConflictException("The selected technician or service bay is currently held by another user.");
    }

    return {
      holdId,
      tenantId,
      technicianId: input.technicianId,
      serviceBayId: input.serviceBayId,
      expiresAt
    };
  }
}
