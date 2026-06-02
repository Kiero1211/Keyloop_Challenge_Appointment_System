import { app } from '@/infrastructure/http/app';
import { container } from '@/infrastructure/di/container';
import { StartupSeedService } from '@/infrastructure/startup/startup-seed.service';

const port = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await container.initialize();
    const startupSeedService = new StartupSeedService(container.appointmentCrudRepository, container.cacheProvider);
    await startupSeedService.seed();
    
    app.listen(port, () => {
      console.log(`Appointment API Service listening on port ${port} [Worker: ${process.pid}]`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

export { startServer };
