namespace AppointmentWorkerService.Core.Domain;

public static class CacheKeys
{
    public static string AppointmentHashKey(string tenantId, string appointmentId)
        => $"tenant:{tenantId}:appointment:{appointmentId}";

    public static string ActiveAppointmentsSetKey(string tenantId)
        => $"tenant:{tenantId}:appointments:active";

    public static string TechnicianOccupiedKey(string tenantId, string technicianId)
        => $"tenant:{tenantId}:technician:{technicianId}:occupied";

    public static string BayOccupiedKey(string tenantId, string bayId)
        => $"tenant:{tenantId}:bay:{bayId}:occupied";

    public static string OccupiedSlotHashKey(string tenantId, string appointmentId)
        => $"tenant:{tenantId}:occupied_slot:{appointmentId}";
}
