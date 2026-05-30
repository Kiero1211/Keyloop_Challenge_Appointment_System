import { ICacheProvider } from '../ports/cache-provider.port';

export class HealthCheckUseCase {
  constructor(private readonly cacheProvider: ICacheProvider) {}

  async execute() {
    const isCacheConnected = await this.cacheProvider.ping();
    
    return {
      status: isCacheConnected ? 'ok' : 'error',
      cache: isCacheConnected ? 'connected' : 'disconnected'
    };
  }
}
