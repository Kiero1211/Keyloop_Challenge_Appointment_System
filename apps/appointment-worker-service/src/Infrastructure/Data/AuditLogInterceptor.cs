using System.Text.Json;
using AppointmentWorkerService.Core.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace AppointmentWorkerService.Infrastructure.Data;

public class AuditLogInterceptor : SaveChangesInterceptor
{
    private readonly ITenantService _tenantService;

    public AuditLogInterceptor(ITenantService tenantService)
    {
        _tenantService = tenantService;
    }

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        GenerateAuditLogs(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        GenerateAuditLogs(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void GenerateAuditLogs(DbContext? context)
    {
        if (context == null) return;

        var entries = context.ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified || e.State == EntityState.Deleted)
            .Where(e => e.Entity is not AuditLogEntry)
            .ToList();

        var tenantId = _tenantService.GetTenantId();
        var now = DateTimeOffset.UtcNow;

        foreach (var entry in entries)
        {
            var entityType = entry.Entity.GetType().Name;
            
            // Try to extract entity ID (assuming it has an Id property)
            var idProperty = entry.Properties.FirstOrDefault(p => p.Metadata.Name == "Id");
            var entityId = idProperty?.CurrentValue?.ToString() ?? Guid.NewGuid().ToString();

            string action = entry.State switch
            {
                EntityState.Added => "CREATE",
                EntityState.Modified => "UPDATE",
                EntityState.Deleted => "DELETE",
                _ => "UNKNOWN"
            };

            var payload = new Dictionary<string, object?>();

            if (entry.State == EntityState.Added)
            {
                foreach (var prop in entry.Properties)
                {
                    payload[prop.Metadata.Name] = prop.CurrentValue;
                }
            }
            else if (entry.State == EntityState.Modified)
            {
                foreach (var prop in entry.Properties)
                {
                    if (prop.IsModified)
                    {
                        payload[$"{prop.Metadata.Name}_Old"] = prop.OriginalValue;
                        payload[$"{prop.Metadata.Name}_New"] = prop.CurrentValue;
                    }
                }
            }
            else if (entry.State == EntityState.Deleted)
            {
                foreach (var prop in entry.Properties)
                {
                    payload[prop.Metadata.Name] = prop.OriginalValue;
                }
            }

            var auditLog = new AuditLogEntry
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                EntityType = entityType,
                EntityId = entityId,
                Action = action,
                Result = JsonSerializer.Serialize(payload),
                Timestamp = now
            };

            context.Add(auditLog);
        }
    }
}
