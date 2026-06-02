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
        if (value == null) return;
        var db = _redis.GetDatabase();
        var jsonStr = System.Text.Json.JsonSerializer.Serialize(value);
        var dict = System.Text.Json.JsonSerializer.Deserialize<System.Collections.Generic.Dictionary<string, System.Text.Json.JsonElement>>(jsonStr);
        if (dict == null) return;

        var hashEntries = System.Linq.Enumerable.Select(dict, kvp => 
        {
            string strVal = kvp.Value.ValueKind == System.Text.Json.JsonValueKind.String 
                            ? kvp.Value.GetString() ?? "" 
                            : kvp.Value.ToString();
            return new StackExchange.Redis.HashEntry(kvp.Key, strVal);
        }).ToArray();

        var batch = db.CreateBatch();
        var tasks = new System.Collections.Generic.List<Task>
        {
            batch.HashSetAsync(key, hashEntries)
        };

        if (expiration.HasValue && expiration.Value > TimeSpan.Zero)
        {
            tasks.Add(batch.KeyExpireAsync(key, expiration.Value));
        }

        batch.Execute();
        await Task.WhenAll(tasks);
    }

    public async Task<T?> GetAsync<T>(string key)
    {
        var db = _redis.GetDatabase();
        var entries = await db.HashGetAllAsync(key);
        if (entries.Length == 0) return default;

        var dict = new System.Collections.Generic.Dictionary<string, object>();
        foreach (var entry in entries)
        {
            string name = entry.Name.ToString();
            string val = entry.Value.ToString();
            
            try 
            {
                if ((val.StartsWith("{") && val.EndsWith("}")) || (val.StartsWith("[") && val.EndsWith("]")))
                {
                    dict[name] = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(val);
                }
                else
                {
                    dict[name] = val;
                }
            }
            catch
            {
                dict[name] = val;
            }
        }
        
        var jsonStr = System.Text.Json.JsonSerializer.Serialize(dict);
        return System.Text.Json.JsonSerializer.Deserialize<T>(jsonStr, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
    }

    public async Task DeleteAsync(string key)
    {
        var db = _redis.GetDatabase();
        await db.KeyDeleteAsync(key);
    }

    public async Task StreamAcknowledgeAsync(string streamName, string groupName, string messageId)
    {
        var db = _redis.GetDatabase();
        await db.StreamAcknowledgeAsync(streamName, groupName, messageId);
    }
}
