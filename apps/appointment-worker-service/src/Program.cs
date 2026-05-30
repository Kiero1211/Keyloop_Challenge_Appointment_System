using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;
using AppointmentWorkerService.Core.Application.Ports;
using AppointmentWorkerService.Core.Application.UseCases;
using AppointmentWorkerService.Infrastructure.Data;
using AppointmentWorkerService.Infrastructure.Redis;
using AppointmentWorkerService.Infrastructure.Cache;
using AppointmentWorkerService.Infrastructure.Workers;
using AppointmentWorkerService.Infrastructure.Http;

namespace AppointmentWorkerService;

public class Program
{
    public static void Main(string[] args)
    {
        CreateHostBuilder(args).Build().Run();
    }

    public static IHostBuilder CreateHostBuilder(string[] args) =>
        Host.CreateDefaultBuilder(args)
            .ConfigureServices((hostContext, services) =>
            {
                var connectionString = hostContext.Configuration["DB_CONNECTION"] ?? "Host=localhost;Database=appointments;Username=postgres;Password=postgres";
                var redisConnection = hostContext.Configuration["REDIS_CONNECTION"] ?? "localhost:6379";

                services.AddDbContext<AppDbContext>(options =>
                    options.UseNpgsql(connectionString));

                services.AddSingleton(new RedisConnectionProvider(redisConnection));
                services.AddSingleton<ICacheProvider, CacheProvider>();
                services.AddHttpClient<IBayAvailabilityService, HttpBayAvailabilityService>(client =>
                {
                    client.BaseAddress = new Uri(hostContext.Configuration["BAY_SERVICE_URL"] ?? "http://bay-service:3000");
                });
                
                // We need a scoped tenant service for EF Core query filter
                services.AddScoped<ITenantService, ScopedTenantService>();
                
                services.AddScoped<IAppointmentRepository, AppointmentRepository>();
                services.AddScoped<IAppointmentProcessor, AppointmentProcessor>();

                services.AddHostedService<RedisStreamConsumerService>();
            });
}

// Simple tenant service for worker context - in a real app this might extract from the message payload via an AsyncLocal or similar
public class ScopedTenantService : ITenantService
{
    // For now, hardcode or inject based on context. The processor will pass the tenant ID down.
    public string GetTenantId() => "default-tenant";
}


