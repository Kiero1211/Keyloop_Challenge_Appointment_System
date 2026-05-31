using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using AppointmentWorkerService.Core.Application.Ports;
using AppointmentWorkerService.Core.Domain.Entities;
using AppointmentWorkerService.Infrastructure.Redis;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace AppointmentWorkerService.Infrastructure.Workers;

public class RedisStreamConsumerService : BackgroundService
{
    private readonly RedisConnectionProvider _redisConnectionProvider;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<RedisStreamConsumerService> _logger;
    private readonly AppointmentWorkerService.Infrastructure.Bulkhead.TenantBulkheadRouter _bulkheadRouter;
    private readonly string _streamName = "appointments_stream";
    private readonly string _groupName = "worker_group";
    private readonly string _consumerName = $"worker_{Guid.NewGuid():N}";

    public RedisStreamConsumerService(
        RedisConnectionProvider redisConnectionProvider,
        IServiceScopeFactory scopeFactory,
        ILogger<RedisStreamConsumerService> logger,
        AppointmentWorkerService.Infrastructure.Bulkhead.TenantBulkheadRouter bulkheadRouter)
    {
        _redisConnectionProvider = redisConnectionProvider;
        _scopeFactory = scopeFactory;
        _logger = logger;
        _bulkheadRouter = bulkheadRouter;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var db = _redisConnectionProvider.GetDatabase();

        // Create consumer group if it doesn't exist
        try
        {
            await db.StreamCreateConsumerGroupAsync(_streamName, _groupName, "0-0", createStream: true);
        }
        catch (RedisServerException ex) when (ex.Message.Contains("BUSYGROUP"))
        {
            // Group already exists, ignore
        }

        _logger.LogInformation("Started Redis Stream Consumer for {StreamName} group {GroupName} as {ConsumerName}", _streamName, _groupName, _consumerName);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var messages = await db.StreamReadGroupAsync(
                    _streamName,
                    _groupName,
                    _consumerName,
                    ">", // read new messages
                    count: 1);

                if (messages.Length == 0)
                {
                    await Task.Delay(100, stoppingToken);
                    continue;
                }

                foreach (var message in messages)
                {
                    await ProcessMessageAsync(message, stoppingToken);
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reading from stream");
                await Task.Delay(1000, stoppingToken);
            }
        }
    }

    private async Task ProcessMessageAsync(StreamEntry streamEntry, CancellationToken stoppingToken)
    {
        try
        {
            var payload = streamEntry.Values.FirstOrDefault(v => v.Name == "payload").Value;
            if (!payload.HasValue)
            {
                _logger.LogWarning("Message {Id} has no payload field", streamEntry.Id);
                return;
            }

            var appointmentMessage = JsonSerializer.Deserialize<AppointmentMessage>(payload.ToString(), new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (appointmentMessage != null)
            {
                TenantContext.CurrentTenantId = appointmentMessage.TenantId;
                
                var dispatchResult = _bulkheadRouter.DispatchAsync(appointmentMessage.TenantId, async () =>
                {
                    using var scope = _scopeFactory.CreateScope();
                    var processor = scope.ServiceProvider.GetRequiredService<IAppointmentProcessor>();
                    await processor.ProcessAsync(appointmentMessage, streamEntry.Id.ToString(), stoppingToken);
                });

                if (dispatchResult == AppointmentWorkerService.Infrastructure.Bulkhead.DispatchResult.ChannelFull)
                {
                    _logger.LogWarning("Channel full for tenant {TenantId}. Skipping message {Id}", appointmentMessage.TenantId, streamEntry.Id);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing stream entry {Id}", streamEntry.Id);
            
            // DLQ Logic: Move to dead-letter stream and acknowledge to prevent infinite loops
            try
            {
                var db = _redisConnectionProvider.GetDatabase();
                await db.StreamAddAsync($"{_streamName}_dlq", streamEntry.Values);
                await db.StreamAcknowledgeAsync(_streamName, _groupName, streamEntry.Id);
                _logger.LogInformation("Moved message {Id} to DLQ", streamEntry.Id);
            }
            catch (Exception dlqEx)
            {
                _logger.LogCritical(dlqEx, "Failed to move message {Id} to DLQ", streamEntry.Id);
            }
        }
    }
}
