namespace AppointmentWorkerService.Core.Application.Ports;

public interface ICacheProvider
{
    Task SetAsync<T>(string key, T value, TimeSpan? expiration = null);
    Task<T?> GetAsync<T>(string key);
    Task StreamAcknowledgeAsync(string streamName, string groupName, string messageId);
}
