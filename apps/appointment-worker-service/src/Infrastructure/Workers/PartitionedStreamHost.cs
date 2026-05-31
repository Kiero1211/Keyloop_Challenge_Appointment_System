using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.DependencyInjection;
using AppointmentWorkerService.Infrastructure.Redis;
using AppointmentWorkerService.Infrastructure.Bulkhead;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using System;

namespace AppointmentWorkerService.Infrastructure.Workers;

public class PartitionedStreamHost : IHostedService
{
    private readonly RedisConnectionProvider _redisProvider;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly TenantBulkheadRouter _bulkheadRouter;
    private readonly ILogger<PartitionedStreamHost> _logger;
    private readonly ILoggerFactory _loggerFactory;
    private readonly WorkerOptions _options;
    
    private readonly List<Task> _partitionTasks = new();
    private readonly CancellationTokenSource _cts = new();
    private readonly string _consumerId = $"worker_{Guid.NewGuid():N}";

    public PartitionedStreamHost(
        RedisConnectionProvider redisProvider,
        IServiceScopeFactory scopeFactory,
        TenantBulkheadRouter bulkheadRouter,
        ILogger<PartitionedStreamHost> logger,
        ILoggerFactory loggerFactory,
        IOptions<WorkerOptions> options)
    {
        _redisProvider = redisProvider;
        _scopeFactory = scopeFactory;
        _bulkheadRouter = bulkheadRouter;
        _logger = logger;
        _loggerFactory = loggerFactory;
        _options = options.Value;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting PartitionedStreamHost. Partition count: {Count}, ConsumerId: {ConsumerId}", 
            _options.StreamPartitionCount, _consumerId);

        var db = _redisProvider.GetDatabase();

        for (int i = 0; i < _options.StreamPartitionCount; i++)
        {
            var streamName = $"{_options.StreamBaseName}_{i}";
            var workerLogger = _loggerFactory.CreateLogger<StreamPartitionWorker>();
            var worker = new StreamPartitionWorker(
                streamName,
                _options.ConsumerGroupName,
                _consumerId,
                db,
                _bulkheadRouter,
                _scopeFactory,
                workerLogger);

            var task = Task.Run(() => worker.RunAsync(_cts.Token), _cts.Token);
            _partitionTasks.Add(task);
        }

        return Task.CompletedTask;
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Stopping PartitionedStreamHost. Cancelling {Count} partition workers.", _partitionTasks.Count);
        _cts.Cancel();
        
        try
        {
            await Task.WhenAll(_partitionTasks);
        }
        catch (OperationCanceledException)
        {
            // Expected
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while waiting for partition workers to stop.");
        }
        
        _logger.LogInformation("PartitionedStreamHost stopped successfully.");
    }
}
