using StackExchange.Redis;

namespace AppointmentWorkerService.Infrastructure.Redis;

public class RedisConnectionProvider
{
    private readonly Lazy<ConnectionMultiplexer> _connection;

    public RedisConnectionProvider(string configuration)
    {
        _connection = new Lazy<ConnectionMultiplexer>(() => ConnectionMultiplexer.Connect(configuration));
    }

    public ConnectionMultiplexer GetConnection() => _connection.Value;
    public IDatabase GetDatabase() => _connection.Value.GetDatabase();
}
