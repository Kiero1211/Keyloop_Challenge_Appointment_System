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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply global query filter for multi-tenancy on all entities implementing IMustHaveTenant
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(IMustHaveTenant).IsAssignableFrom(entityType.ClrType))
            {
                modelBuilder.Entity(entityType.ClrType)
                    .HasQueryFilter(CreateTenantFilter(entityType.ClrType));
            }
        }

        // Configure concurrency token and timestamptz
        modelBuilder.Entity<TrackingRecord>(entity =>
        {
            entity.Property(t => t.Version)
                .IsRowVersion()
                .HasColumnName("xmin")
                .HasColumnType("xid");

            entity.Property(t => t.StartTime)
                .HasColumnType("timestamp with time zone");

            entity.Property(t => t.EndTime)
                .HasColumnType("timestamp with time zone");
        });

        // Configure TechnicianSkill composite key
        modelBuilder.Entity<TechnicianSkill>()
            .HasKey(ts => new { ts.TechnicianId, ts.ServiceTypeId, ts.TenantId });
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
