using AppointmentWorkerService.Infrastructure.Cache;
using AppointmentWorkerService.Infrastructure.Redis;
using StackExchange.Redis;
using Testcontainers.Redis;

namespace AppointmentWorkerService.Tests.Integration.Infrastructure;

public class CacheProviderTests : IAsyncLifetime
{
    private RedisContainer? _redisContainer;
    private RedisConnectionProvider? _connectionProvider;
    private CacheProvider? _cacheProvider;

    public async Task InitializeAsync()
    {
        _redisContainer = new RedisBuilder().Build();
        await _redisContainer.StartAsync();

        _connectionProvider = new RedisConnectionProvider(_redisContainer.GetConnectionString());
        _cacheProvider = new CacheProvider(_connectionProvider);
    }

    public async Task DisposeAsync()
    {
        if (_redisContainer is not null)
        {
            await _redisContainer.DisposeAsync();
        }
    }

    [Fact]
    public async Task HashSetFieldsAsync_WritesFields_AndOptionalTtl()
    {
        var key = "tenant:test:appointment:appt-1";

        await _cacheProvider!.HashSetFieldsAsync(
            key,
            new Dictionary<string, string>
            {
                ["status"] = "Scheduled",
                ["notes"] = "hello"
            },
            TimeSpan.FromMinutes(5));

        var db = _connectionProvider!.GetDatabase();
        var values = await db.HashGetAllAsync(key);

        Assert.Equal("Scheduled", values.First(x => x.Name == "status").Value);
        Assert.Equal("hello", values.First(x => x.Name == "notes").Value);
    }

    [Fact]
    public async Task SortedSetAndSetMethods_WorkEndToEnd()
    {
        var sortedSetKey = "tenant:test:technician:tech-1:occupied";
        var setKey = "tenant:test:appointments:active";

        await _cacheProvider!.SortedSetAddAsync(sortedSetKey, "appt-1", 1000);
        await _cacheProvider.SortedSetAddAsync(sortedSetKey, "appt-2", 2000);
        await _cacheProvider.SetAddAsync(setKey, "appt-1");
        await _cacheProvider.SetAddAsync(setKey, "appt-2");

        var sortedMembers = await _cacheProvider.SetMembersAsync(setKey);
        Assert.Contains("appt-1", sortedMembers);
        Assert.Contains("appt-2", sortedMembers);

        var range = await _connectionProvider!.GetDatabase().SortedSetRangeByScoreAsync(sortedSetKey, 0, 1500);
        Assert.Contains("appt-1", range.Select(x => x.ToString()));
        Assert.DoesNotContain("appt-2", range.Select(x => x.ToString()));

        await _cacheProvider.SortedSetRemoveAsync(sortedSetKey, "appt-1");
        await _cacheProvider.SetRemoveAsync(setKey, "appt-1");

        var afterRemove = await _connectionProvider.GetDatabase().SortedSetRangeByScoreAsync(sortedSetKey, 0, 3000);
        Assert.DoesNotContain("appt-1", afterRemove.Select(x => x.ToString()));
    }
}
