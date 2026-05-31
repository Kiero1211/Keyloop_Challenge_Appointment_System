using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;
using AppointmentWorkerService.Core.Application.Ports;
using AppointmentWorkerService.Core.Application.Ports.Repositories;
using AppointmentWorkerService.Core.Application.Ports.Services;
using AppointmentWorkerService.Core.Application.Services;
using AppointmentWorkerService.Core.Application.UseCases;
using AppointmentWorkerService.Infrastructure.Data;
using AppointmentWorkerService.Infrastructure.Redis;
using AppointmentWorkerService.Infrastructure.Cache;
using AppointmentWorkerService.Infrastructure.Workers;
using FluentValidation;

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
                
                services.AddScoped<ITenantService, ScopedTenantService>();
                
                services.AddScoped<IAppointmentRepository, AppointmentRepository>();
                services.AddScoped<ITechnicianRepository, TechnicianRepository>();
                services.AddScoped<IServiceBayRepository, ServiceBayRepository>();
                services.AddScoped<ITechnicianSkillRepository, TechnicianSkillRepository>();
                
                services.AddScoped<ITechnicianService, TechnicianService>();
                services.AddScoped<IBayService, BayService>();
                
                services.AddScoped<IAppointmentProcessor, AppointmentProcessor>();
                
                services.AddValidatorsFromAssemblyContaining<AppointmentWorkerService.Core.Application.Validators.AppointmentMessageValidator>();

                int maxConcurrent = int.TryParse(hostContext.Configuration["WORKER_BULKHEAD_MAX_CONCURRENT"], out int mc) ? mc : 5;
                int queueCapacity = int.TryParse(hostContext.Configuration["WORKER_BULKHEAD_QUEUE_CAPACITY"], out int qc) ? qc : 50;
                services.AddSingleton(new AppointmentWorkerService.Infrastructure.Bulkhead.TenantBulkheadRouter(maxConcurrent, queueCapacity));

                services.Configure<WorkerOptions>(options => 
                {
                    if (int.TryParse(hostContext.Configuration["WORKER_STREAM_PARTITION_COUNT"], out int pc))
                        options.StreamPartitionCount = pc;
                    options.StreamBaseName = hostContext.Configuration["WORKER_STREAM_BASE_NAME"] ?? "appointments_stream";
                    options.ConsumerGroupName = hostContext.Configuration["WORKER_CONSUMER_GROUP"] ?? "worker_group";
                });
                
                services.AddHostedService<PartitionedStreamHost>();
            });
}

public static class TenantContext
{
    private static readonly AsyncLocal<string> _currentTenantId = new AsyncLocal<string>();

    public static string CurrentTenantId
    {
        get => _currentTenantId.Value ?? "default-tenant";
        set => _currentTenantId.Value = value;
    }
}

public class ScopedTenantService : ITenantService
{
    public string GetTenantId() => TenantContext.CurrentTenantId;
}


