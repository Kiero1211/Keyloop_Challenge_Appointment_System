using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;

namespace AppointmentWorkerService.Infrastructure.Bulkhead;

public enum DispatchResult
{
    Dispatched,
    ChannelFull
}

public class TenantBulkheadRouter
{
    private readonly int _maxConcurrent;
    private readonly int _queueCapacity;
    private readonly Microsoft.Extensions.Logging.ILogger<TenantBulkheadRouter>? _logger;
    private readonly ConcurrentDictionary<string, (Channel<Func<Task>> channel, SemaphoreSlim semaphore)> _tenantChannels = new();

    public TenantBulkheadRouter(int maxConcurrent = 5, int queueCapacity = 50, Microsoft.Extensions.Logging.ILogger<TenantBulkheadRouter>? logger = null)
    {
        _maxConcurrent = maxConcurrent;
        _queueCapacity = queueCapacity;
        _logger = logger;
    }

    public DispatchResult DispatchAsync(string tenantId, Func<Task> handler)
    {
        var (channel, semaphore) = _tenantChannels.GetOrAdd(tenantId, CreateTenantQueue);

        if (channel.Writer.TryWrite(handler))
        {
            return DispatchResult.Dispatched;
        }

        _logger?.LogWarning("ChannelFull: Tenant {TenantId} has reached the queue capacity of {QueueCapacity}.", tenantId, _queueCapacity);
        return DispatchResult.ChannelFull;
    }

    private (Channel<Func<Task>> channel, SemaphoreSlim semaphore) CreateTenantQueue(string tenantId)
    {
        var channelOptions = new BoundedChannelOptions(_queueCapacity)
        {
            FullMode = BoundedChannelFullMode.Wait,
            SingleReader = true,
            SingleWriter = false
        };
        var channel = Channel.CreateBounded<Func<Task>>(channelOptions);
        var semaphore = new SemaphoreSlim(_maxConcurrent, _maxConcurrent);

        // Start background drain task
        _ = Task.Run(async () => await DrainChannelAsync(channel, semaphore));

        return (channel, semaphore);
    }

    private async Task DrainChannelAsync(Channel<Func<Task>> channel, SemaphoreSlim semaphore)
    {
        await foreach (var handler in channel.Reader.ReadAllAsync())
        {
            await semaphore.WaitAsync();

            _ = Task.Run(async () =>
            {
                try
                {
                    await handler();
                }
                finally
                {
                    semaphore.Release();
                }
            });
        }
    }
}
