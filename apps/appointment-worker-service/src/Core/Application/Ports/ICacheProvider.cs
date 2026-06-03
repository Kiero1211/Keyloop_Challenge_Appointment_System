using System;
using System.Threading.Tasks;

namespace AppointmentWorkerService.Core.Application.Ports
{
    public interface ICacheProvider
    {
        Task<T?> GetAsync<T>(string key);
        Task SetAsync<T>(string key, T value, TimeSpan? ttl = null);
        Task HashSetFieldsAsync(string key, Dictionary<string, string> fields, TimeSpan? ttl = null);
        Task SortedSetAddAsync(string key, string member, double score);
        Task SortedSetRemoveAsync(string key, string member);
        Task SetAddAsync(string key, string member);
        Task SetRemoveAsync(string key, string member);
        Task<IEnumerable<string>> SetMembersAsync(string key);
        Task DeleteAsync(string key);
        Task StreamAcknowledgeAsync(string streamName, string groupName, string messageId);
    }
}
