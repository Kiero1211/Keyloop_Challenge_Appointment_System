import request from 'supertest';
import { app } from '@/infrastructure/http/app';
import { db } from '@/infrastructure/db/client';
import { container } from '@/infrastructure/di/container';
import { auditLogs, tenants } from '@/infrastructure/db/schema';
import { eq } from 'drizzle-orm';
import { factories } from '../../helpers/factories';

describe('Audit Logs API E2E', () => {
  let tenantId: string;
  let adminToken: string;

  beforeAll(async () => {
    await container.initialize();
    
    // Create an Admin user
    const u1 = await factories.user();
    
    const [tenant] = await db.insert(tenants).values({
      name: `Test Tenant Audit ${Date.now()}`
    }).returning();
    tenantId = tenant.id;

    adminToken = container.jwtService.generateAccessToken({
      userId: u1.id,
      tenantId: 'system',
      role: 'Admin',
      permissions: [],
      isSuperAdmin: true,
    });

    // Insert some audit logs
    await db.insert(auditLogs).values([
      {
        tenantId,
        entityType: 'ServiceBay',
        entityId: 'bay-1',
        action: 'CREATE',
        result: { Name: 'Bay 1' },
        timestamp: new Date('2024-01-01T10:00:00Z'),
      },
      {
        tenantId,
        entityType: 'ServiceBay',
        entityId: 'bay-1',
        action: 'UPDATE',
        result: { Name_Old: 'Bay 1', Name_New: 'Bay 2' },
        timestamp: new Date('2024-01-02T10:00:00Z'),
      }
    ]);
  });

  afterAll(async () => {
    if (tenantId) {
      await db.delete(auditLogs).where(eq(auditLogs.tenantId, tenantId));
      await db.delete(tenants).where(eq(tenants.id, tenantId));
    }
    await container.destroy();
  });

  it('should return audit logs for a tenant', async () => {
    const response = await request(app)
      .get(`/api/v1/audit-logs?start_time=2024-01-01T00:00:00Z&end_time=2024-01-03T00:00:00Z`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId);

    expect(response.status).toBe(200);
    const body = response.body;
    expect(body.data).toBeDefined();
    expect(body.data.length).toBeGreaterThanOrEqual(2);
    // ordered by timestamp ASC by default in repository implementation
    expect(body.data[0].action).toBe('CREATE'); 
    expect(body.data[1].action).toBe('UPDATE');
  });

  it('should filter by entity type', async () => {
    const response = await request(app)
      .get(`/api/v1/audit-logs?start_time=2024-01-01T00:00:00Z&end_time=2024-01-03T00:00:00Z&entity_type=ServiceBay`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId);

    expect(response.status).toBe(200);
    const body = response.body;
    expect(body.data.length).toBe(2);
  });
});
