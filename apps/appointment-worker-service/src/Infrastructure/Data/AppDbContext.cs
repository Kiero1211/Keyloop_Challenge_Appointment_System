using AppointmentWorkerService.Core.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AppointmentWorkerService.Infrastructure.Data;

public class AppDbContext : DbContext
{
    private readonly string _tenantId;

    public AppDbContext(DbContextOptions<AppDbContext> options, ITenantService tenantService) : base(options)
    {
        _tenantId = tenantService.GetTenantId();
    }

    public DbSet<TrackingRecord> TrackingRecords => Set<TrackingRecord>();
    public DbSet<Technician> Technicians => Set<Technician>();
    public DbSet<ServiceBay> ServiceBays => Set<ServiceBay>();
    public DbSet<TechnicianSkill> TechnicianSkills => Set<TechnicianSkill>();
    public DbSet<AuditLogEntry> AuditLogs => Set<AuditLogEntry>();
    public DbSet<AppointmentReminder> AppointmentReminders => Set<AppointmentReminder>();
    public DbSet<AppointmentReminderData> AppointmentReminderView => Set<AppointmentReminderData>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        var stringToGuidConverter = new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<string, Guid>(
            v => Guid.Parse(v),
            v => v.ToString()
        );

        // Apply global query filter for multi-tenancy and string-to-uuid conversions
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(IMustHaveTenant).IsAssignableFrom(entityType.ClrType))
            {
                modelBuilder.Entity(entityType.ClrType)
                    .HasQueryFilter(CreateTenantFilter(entityType.ClrType));
            }

            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(string) && (property.Name.EndsWith("Id") || property.Name == "Id"))
                {
                    property.SetValueConverter(stringToGuidConverter);
                }
            }
        }

        // Configure concurrency token and timestamptz
        modelBuilder.Entity<TrackingRecord>(entity =>
        {
            entity.ToTable("appointments");

            entity.Property(t => t.Version)
                .IsRowVersion()
                .HasColumnName("xmin")
                .HasColumnType("xid");

            entity.Property(t => t.StartTime)
                .HasColumnType("timestamp with time zone");

            entity.Property(t => t.EndTime)
                .HasColumnType("timestamp with time zone");

            entity.Property(t => t.Status)
                .HasConversion<string>();
        });

        // Configure TechnicianSkill primary key
        modelBuilder.Entity<TechnicianSkill>()
            .HasKey(ts => ts.Id);

        // Configure AuditLogEntry
        modelBuilder.Entity<AuditLogEntry>(entity =>
        {
            entity.ToTable("audit_logs");
            
            entity.HasKey(a => new { a.TenantId, a.Id }); // Composite key for partition

            entity.Property(a => a.Result)
                .HasColumnType("jsonb");

            entity.Property(a => a.Timestamp)
                .HasColumnType("timestamp with time zone");
        });

        // Configure AppointmentReminder
        modelBuilder.Entity<AppointmentReminder>(entity =>
        {
            entity.ToTable("appointment_reminders");
            entity.HasKey(a => a.Id);
            entity.Property(a => a.SentAt)
                .HasColumnType("timestamp with time zone");
        });

        // Configure AppointmentReminderData
        modelBuilder.Entity<AppointmentReminderData>(entity =>
        {
            entity.ToView("appointment_reminder_view");
            entity.HasNoKey();
            entity.Property(a => a.AppointmentStartTime)
                .HasColumnType("timestamp with time zone");
            entity.Property(a => a.AppointmentStatus)
                .HasConversion<string>();
        });
    }

    private System.Linq.Expressions.LambdaExpression CreateTenantFilter(Type type)
    {
        var parameter = System.Linq.Expressions.Expression.Parameter(type, "e");
        var property = System.Linq.Expressions.Expression.Property(parameter, nameof(IMustHaveTenant.TenantId));
        var tenantIdField = System.Linq.Expressions.Expression.Field(System.Linq.Expressions.Expression.Constant(this), nameof(_tenantId));
        var body = System.Linq.Expressions.Expression.Equal(property, tenantIdField);
        return System.Linq.Expressions.Expression.Lambda(body, parameter);
    }
}

public interface ITenantService
{
    string GetTenantId();
}
