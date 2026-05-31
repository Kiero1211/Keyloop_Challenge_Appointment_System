using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using StackExchange.Redis;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using AppointmentWorkerService.Infrastructure.Bulkhead;
using AppointmentWorkerService.Core.Domain.Entities;
using AppointmentWorkerService.Core.Application.UseCases;
using AppointmentWorkerService.Core.Application.Ports;

namespace AppointmentWorkerService.Infrastructure.Workers;

public class StreamPartitionWorker
{
    private readonly string _streamName;
    private readonly string _groupName;
    private readonly string _consumerId;
    private readonly IDatabase _db;
    private readonly TenantBulkheadRouter _bulkheadRouter;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<StreamPartitionWorker> _logger;

    public StreamPartitionWorker(
        string streamName,
        string groupName,
        string consumerId,
        IDatabase db,
        TenantBulkheadRouter bulkheadRouter,
        IServiceScopeFactory scopeFactory,
        ILogger<StreamPartitionWorker> logger)
    {
        _streamName = streamName;
        _groupName = groupName;
        _consumerId = consumerId;
        _db = db;
        _bulkheadRouter = bulkheadRouter;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task RunAsync(CancellationToken ct)
    {
        // 1. Ensure consumer group exists
        try
        {
            await _db.StreamCreateConsumerGroupAsync(_streamName, _groupName, "0-0", createStream: true);
        }
        catch (RedisServerException ex) when (ex.Message.Contains("BUSYGROUP"))
        {
            // Group already exists
        }

        _logger.LogInformation("Partition worker started: stream={Stream} group={Group} consumer={Consumer}",
            _streamName, _groupName, _consumerId);

        try
        {
            while (!ct.IsCancellationRequested)
            {
                try
                {
                    var entries = await _db.StreamReadGroupAsync(
                        _streamName,
                        _groupName,
                        _consumerId,
                        count: 10,
                        noAck: false); // We will ack manually

                    if (entries == null || entries.Length == 0)
                    {
                        await Task.Delay(100, ct);
                        continue;
                    }

                    foreach (var entry in entries)
                    {
                        await ProcessEntryAsync(entry, ct);
                    }
                }
                catch (TaskCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error reading from stream {StreamName}", _streamName);
                    await Task.Delay(1000, ct); // backoff on error
                }
            }
        }
        finally
        {
            try
            {
                await _db.StreamDeleteConsumerAsync(_streamName, _groupName, _consumerId);
                _logger.LogInformation("Successfully deleted consumer {ConsumerId} from group {GroupName} on stream {StreamName}.", _consumerId, _groupName, _streamName);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete consumer {ConsumerId} from group {GroupName} on stream {StreamName}.", _consumerId, _groupName, _streamName);
            }
        }
    }

    private async Task ProcessEntryAsync(StreamEntry entry, CancellationToken ct)
    {
        string messageId = entry.Id;
        string? payload = null;

        foreach (var nv in entry.Values)
        {
            if (nv.Name == "payload")
            {
                payload = nv.Value;
                break;
            }
        }

        if (string.IsNullOrWhiteSpace(payload))
        {
            _logger.LogWarning("Missing or empty payload in message {MessageId} from {StreamName}. Moving to DLQ.", messageId, _streamName);
            await MoveToDlqAsync(messageId, entry.Values, "Missing payload");
            return;
        }

        AppointmentMessage? message;
        try
        {
            message = JsonSerializer.Deserialize<AppointmentMessage>(payload, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to deserialize payload for message {MessageId}. Moving to DLQ.", messageId);
            await MoveToDlqAsync(messageId, entry.Values, $"Deserialization failed: {ex.Message}");
            return;
        }

        if (message == null || string.IsNullOrWhiteSpace(message.TenantId))
        {
            _logger.LogWarning("Deserialized message has no TenantId. MessageId: {MessageId}. Moving to DLQ.", messageId);
            await MoveToDlqAsync(messageId, entry.Values, "Missing TenantId");
            return;
        }

        // Dispatch to bulkhead
        var result = _bulkheadRouter.DispatchAsync(message.TenantId, async () => 
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                
                // Set the current TenantId for this asynchronous flow
                TenantContext.CurrentTenantId = message.TenantId;
                
                var processor = scope.ServiceProvider.GetRequiredService<IAppointmentProcessor>();
                
                await processor.ProcessAsync(message, messageId, CancellationToken.None);

                // Acknowledge and delete on success
                await AckAndDelAsync(messageId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing message {MessageId} for tenant {TenantId}. Moving to DLQ.", messageId, message.TenantId);
                await MoveToDlqAsync(messageId, entry.Values, $"Processing failed: {ex.Message}");
            }
        });

        if (result == DispatchResult.ChannelFull)
        {
            _logger.LogWarning("Bulkhead full for tenant {TenantId}. Message {MessageId} left in PEL.", message.TenantId, messageId);
            // DO NOT acknowledge. It will be picked up by XAUTOCLAIM later or redelivered.
        }
    }

    private async Task AckAndDelAsync(string messageId)
    {
        await _db.StreamAcknowledgeAsync(_streamName, _groupName, messageId);
        await _db.StreamDeleteAsync(_streamName, new[] { (RedisValue)messageId });
    }

    private async Task MoveToDlqAsync(string messageId, NameValueEntry[] values, string reason)
    {
        var dlqStream = $"{_streamName}_dlq";
        
        var dlqValues = new NameValueEntry[values.Length + 1];
        values.CopyTo(dlqValues, 0);
        dlqValues[values.Length] = new NameValueEntry("dlq_reason", reason);

        try
        {
            await _db.StreamAddAsync(dlqStream, dlqValues);
            await AckAndDelAsync(messageId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to move message {MessageId} to DLQ {DlqStream}.", messageId, dlqStream);
        }
    }
}
