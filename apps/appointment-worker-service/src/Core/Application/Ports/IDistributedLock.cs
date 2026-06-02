using System;
using System.Threading.Tasks;

namespace AppointmentWorkerService.Core.Application.Ports;

public interface IDistributedLock
{
    Task<bool> AcquireLockAsync(string lockKey, string lockValue, TimeSpan expiration);
    Task<bool> ReleaseLockAsync(string lockKey, string lockValue);
}
