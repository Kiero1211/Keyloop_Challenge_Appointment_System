using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using AppointmentWorkerService.Core.Application.Ports;
using StackExchange.Redis;

namespace AppointmentWorkerService.Infrastructure.Redis
{
    public class RedisCacheProvider : ICacheProvider
    {
        private readonly IConnectionMultiplexer _redis;

        public RedisCacheProvider(IConnectionMultiplexer redis)
        {
            _redis = redis;
        }

        public async Task<T?> GetAsync<T>(string key)
        {
            var db = _redis.GetDatabase();
            var entries = await db.HashGetAllAsync(key);

            if (entries.Length == 0)
            {
                return default;
            }

            // Simple deserialization mapping back to object via JSON for simplicity, 
            // since we stored primitive properties and nested objects as JSON strings.
            var dict = new Dictionary<string, object>();
            foreach (var entry in entries)
            {
                string name = entry.Name.ToString();
                string val = entry.Value.ToString();
                
                try 
                {
                    // If it looks like JSON array or object, try to parse as JsonElement
                    if ((val.StartsWith("{") && val.EndsWith("}")) || (val.StartsWith("[") && val.EndsWith("]")))
                    {
                        dict[name] = JsonSerializer.Deserialize<JsonElement>(val);
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
            
            var jsonStr = JsonSerializer.Serialize(dict);
            return JsonSerializer.Deserialize<T>(jsonStr, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }

        public async Task SetAsync<T>(string key, T value, TimeSpan? ttl = null)
        {
            if (value == null) return;

            var db = _redis.GetDatabase();
            var jsonStr = JsonSerializer.Serialize(value);
            
            // For a complete generic approach, we deserialize to a flat dictionary
            // to store in the Hash fields.
            var dict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(jsonStr);
            
            if (dict == null) return;

            var hashEntries = dict.Select(kvp => 
            {
                string strVal = kvp.Value.ValueKind == JsonValueKind.String 
                                ? kvp.Value.GetString() ?? "" 
                                : kvp.Value.ToString(); // Keep objects/arrays as JSON strings
                return new HashEntry(kvp.Key, strVal);
            }).ToArray();

            var batch = db.CreateBatch();
            var tasks = new List<Task>
            {
                batch.HashSetAsync(key, hashEntries)
            };

            if (ttl.HasValue && ttl.Value > TimeSpan.Zero)
            {
                tasks.Add(batch.KeyExpireAsync(key, ttl.Value));
            }

            batch.Execute();
            await Task.WhenAll(tasks);
        }

        public async Task HashSetFieldsAsync(string key, Dictionary<string, string> fields, TimeSpan? ttl = null)
        {
            if (fields.Count == 0) return;

            var db = _redis.GetDatabase();
            var hashEntries = fields.Select(kvp => new HashEntry(kvp.Key, kvp.Value)).ToArray();
            var batch = db.CreateBatch();
            var tasks = new List<Task>
            {
                batch.HashSetAsync(key, hashEntries)
            };

            if (ttl.HasValue && ttl.Value > TimeSpan.Zero)
            {
                tasks.Add(batch.KeyExpireAsync(key, ttl.Value));
            }

            batch.Execute();
            await Task.WhenAll(tasks);
        }

        public async Task SortedSetAddAsync(string key, string member, double score)
        {
            var db = _redis.GetDatabase();
            await db.SortedSetAddAsync(key, member, score);
        }

        public async Task SortedSetRemoveAsync(string key, string member)
        {
            var db = _redis.GetDatabase();
            await db.SortedSetRemoveAsync(key, member);
        }

        public async Task SetAddAsync(string key, string member)
        {
            var db = _redis.GetDatabase();
            await db.SetAddAsync(key, member);
        }

        public async Task SetRemoveAsync(string key, string member)
        {
            var db = _redis.GetDatabase();
            await db.SetRemoveAsync(key, member);
        }

        public async Task<IEnumerable<string>> SetMembersAsync(string key)
        {
            var db = _redis.GetDatabase();
            var values = await db.SetMembersAsync(key);
            return values.Select(v => v.ToString());
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
}
