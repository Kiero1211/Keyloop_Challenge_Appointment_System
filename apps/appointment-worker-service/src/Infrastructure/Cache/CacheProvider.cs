using AppointmentWorkerService.Core.Application.Ports;
using AppointmentWorkerService.Infrastructure.Redis;

namespace AppointmentWorkerService.Infrastructure.Cache;

public class CacheProvider : ICacheProvider
{
    private readonly RedisConnectionProvider _redis;

    public CacheProvider(RedisConnectionProvider redis)
    {
        _redis = redis;
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null)
    {
        var db = _redis.GetDatabase();
        var json = System.Text.Json.JsonSerializer.Serialize(value);
        await db.StringSetAsync(key, json, expiration);
    }

    public async Task<T?> GetAsync<T>(string key)
    {
        var db = _redis.GetDatabase();
        var value = await db.StringGetAsync(key);
        
        if (!value.HasValue) return default;
        
        return System.Text.Json.JsonSerializer.Deserialize<T>(value.ToString());
    }

    public async Task StreamAcknowledgeAsync(string streamName, string groupName, string messageId)
    {
        var db = _redis.GetDatabase();
        await db.StreamAcknowledgeAsync(streamName, groupName, messageId);
    }
}
