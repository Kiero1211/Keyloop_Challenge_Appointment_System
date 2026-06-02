using StackExchange.Redis;
using System;
using System.Threading.Tasks;
using AppointmentWorkerService.Core.Application.Ports;

namespace AppointmentWorkerService.Infrastructure.Locking;

public class RedisDistributedLock : IDistributedLock
{
    private readonly IConnectionMultiplexer _redis;

    public RedisDistributedLock(IConnectionMultiplexer redis)
    {
        _redis = redis;
    }

    public async Task<bool> AcquireLockAsync(string lockKey, string lockValue, TimeSpan expiration)
    {
        var db = _redis.GetDatabase();
        return await db.StringSetAsync(lockKey, lockValue, expiration, When.NotExists);
    }

    public async Task<bool> ReleaseLockAsync(string lockKey, string lockValue)
    {
        var db = _redis.GetDatabase();
        
        // Lua script to release the lock only if the value matches (prevents releasing someone else's lock)
        var script = @"
            if redis.call('get', KEYS[1]) == ARGV[1] then
                return redis.call('del', KEYS[1])
            else
                return 0
            end";

        var result = await db.ScriptEvaluateAsync(script, new RedisKey[] { lockKey }, new RedisValue[] { lockValue });
        return (int)result == 1;
    }
}
