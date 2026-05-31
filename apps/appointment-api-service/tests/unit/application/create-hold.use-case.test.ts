import { CreateHoldUseCase } from '@/application/use-cases/create-hold.use-case';
import { ICacheProvider } from '@/application/ports/cache-provider.port';
import { ConflictException } from '@/domain/exceptions';

describe('CreateHoldUseCase', () => {
  let useCase: CreateHoldUseCase;
  let cacheProvider: jest.Mocked<ICacheProvider>;

  beforeEach(() => {
    cacheProvider = {
      exists: jest.fn(),
      get: jest.fn(),
      hset: jest.fn(),
      hgetall: jest.fn(),
      del: jest.fn(),
      deleteMultiple: jest.fn(),
      ping: jest.fn(),
      setMultipleIfNotExists: jest.fn(),
    };
    
    useCase = new CreateHoldUseCase(cacheProvider);
  });

  it('should successfully create a hold when technician and bay are available', async () => {
    cacheProvider.setMultipleIfNotExists.mockResolvedValue(true);

    const tenantId = 'tenant-123';
    const input = {
      technicianId: 'tech-123',
      serviceBayId: 'bay-123'
    };

    const result = await useCase.execute(tenantId, input);

    expect(result.holdId).toBeDefined();
    expect(result.tenantId).toBe(tenantId);
    expect(result.technicianId).toBe(input.technicianId);
    expect(result.serviceBayId).toBe(input.serviceBayId);
    expect(result.expiresAt).toBeInstanceOf(Date);
    
    expect(cacheProvider.setMultipleIfNotExists).toHaveBeenCalledTimes(1);
    
    const callArgs = cacheProvider.setMultipleIfNotExists.mock.calls[0];
    expect(callArgs[0]).toHaveLength(2);
    expect(callArgs[0][0].key).toBe(`tenant:${tenantId}:hold:technician:${input.technicianId}`);
    expect(callArgs[0][1].key).toBe(`tenant:${tenantId}:hold:bay:${input.serviceBayId}`);
    expect(callArgs[1]).toBe(300); // 5 minutes TTL
  });

  it('should throw ConflictException when technician or bay is already held', async () => {
    cacheProvider.setMultipleIfNotExists.mockResolvedValue(false);

    const tenantId = 'tenant-123';
    const input = {
      technicianId: 'tech-123',
      serviceBayId: 'bay-123'
    };

    await expect(useCase.execute(tenantId, input)).rejects.toThrow(ConflictException);
    await expect(useCase.execute(tenantId, input)).rejects.toThrow("The selected technician or service bay is currently held by another user.");
  });
});
