import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { occupiedSlotHashKey, technicianOccupiedKey } from '@/domain/cache-keys';

export interface OccupiedSlotDto {
  appointmentId: string;
  startTime: string;
  endTime: string;
}

export interface TechnicianOccupiedSlotsDto {
  technicianId: string;
  occupiedSlots: OccupiedSlotDto[];
}

function getDayRange(date?: string): { start: number; end: number } {
  const base = date ? new Date(`${date}T00:00:00.000Z`) : new Date();
  const start = Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()) / 1000;
  const end = start + 24 * 60 * 60 - 1;
  return { start, end };
}

export class GetTechnicianOccupiedSlotsUseCase {
  constructor(private readonly cacheProvider: ICacheProvider) {}

  async execute(tenantId: string, technicianId: string, date?: string): Promise<TechnicianOccupiedSlotsDto> {
    const { start, end } = getDayRange(date);
    const appointmentIds = await this.cacheProvider.zrangebyscore(
      technicianOccupiedKey(tenantId, technicianId),
      start,
      end
    );

    const occupiedSlots: OccupiedSlotDto[] = [];
    for (const appointmentId of appointmentIds) {
      const hash = await this.cacheProvider.hgetall(occupiedSlotHashKey(tenantId, appointmentId));
      if (!hash) continue;
      occupiedSlots.push({
        appointmentId: hash.appointment_id ?? appointmentId,
        startTime: hash.start_time ?? '',
        endTime: hash.end_time ?? '',
      });
    }

    return { technicianId, occupiedSlots };
  }
}
