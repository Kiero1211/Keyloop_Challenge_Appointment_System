import { ICacheProvider } from '../ports/cache-provider.port';

export class HealthCheckUseCase {
  constructor(private readonly cacheProvider: ICacheProvider) {}

  async execute() {
    let isCacheConnected = false;
    try {
      isCacheConnected = await this.cacheProvider.ping();
    } catch (error) {
      isCacheConnected = false;
    }
    
    return {
      status: isCacheConnected ? 'ok' : 'error',
      cache: isCacheConnected ? 'connected' : 'disconnected'
    };
  }
}
