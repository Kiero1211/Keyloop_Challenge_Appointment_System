namespace AppointmentWorkerService.Infrastructure.Workers;

public class WorkerOptions
{
    public int StreamPartitionCount { get; set; } = 4;
    public string StreamBaseName { get; set; } = "appointments_stream";
    public string ConsumerGroupName { get; set; } = "worker_group";
}
