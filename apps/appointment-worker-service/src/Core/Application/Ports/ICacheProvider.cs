using System;
using System.Threading.Tasks;

namespace AppointmentWorkerService.Core.Application.Ports
{
    public interface ICacheProvider
    {
        Task<T?> GetAsync<T>(string key);
        Task SetAsync<T>(string key, T value, TimeSpan? ttl = null);
        Task DeleteAsync(string key);
        Task StreamAcknowledgeAsync(string streamName, string groupName, string messageId);
    }
}
