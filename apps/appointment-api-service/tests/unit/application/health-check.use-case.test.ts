import { HealthCheckUseCase } from '../../../../src/application/use-cases/health-check.use-case';
import { ICacheProvider } from '../../../../src/application/ports/cache-provider.port';

describe('HealthCheckUseCase', () => {
  let useCase: HealthCheckUseCase;
  let cacheProvider: jest.Mocked<ICacheProvider>;

  beforeEach(() => {
    cacheProvider = {
      exists: jest.fn(),
      hset: jest.fn(),
      hgetall: jest.fn(),
      del: jest.fn(),
      ping: jest.fn(),
    };
    
    useCase = new HealthCheckUseCase(cacheProvider);
  });

  it('should return healthy status when cache is pingable', async () => {
    cacheProvider.ping.mockResolvedValue(true);
    const result = await useCase.execute();
    expect(result).toEqual({ status: 'ok', cache: 'connected' });
  });

  it('should return unhealthy status when cache ping fails', async () => {
    cacheProvider.ping.mockRejectedValue(new Error('Connection timeout'));
    const result = await useCase.execute();
    expect(result).toEqual({ status: 'error', cache: 'disconnected' });
  });
});
