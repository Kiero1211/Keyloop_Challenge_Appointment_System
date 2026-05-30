using System.Net.Http.Json;
using AppointmentWorkerService.Core.Application.Ports;

namespace AppointmentWorkerService.Infrastructure.Http;

public class HttpBayAvailabilityService : IBayAvailabilityService
{
    private readonly HttpClient _httpClient;

    public HttpBayAvailabilityService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<bool> IsAvailableAsync(string serviceBayId, string technicianId, DateTimeOffset startTime, DateTimeOffset endTime, CancellationToken cancellationToken = default)
    {
        var requestUrl = $"/api/bays/{serviceBayId}/availability?technicianId={technicianId}&start={startTime:O}&end={endTime:O}";
        
        try
        {
            var response = await _httpClient.GetAsync(requestUrl, cancellationToken);
            
            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<AvailabilityResponse>(cancellationToken: cancellationToken);
                return result?.IsAvailable ?? false;
            }
            
            return false;
        }
        catch (HttpRequestException)
        {
            // Transient or timeout failures will bubble up to trigger DLQ logic per requirements
            throw;
        }
    }

    private class AvailabilityResponse
    {
        public bool IsAvailable { get; set; }
    }
}
