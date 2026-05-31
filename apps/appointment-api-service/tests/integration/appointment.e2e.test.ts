import request from "supertest";
import { app } from "@/infrastructure/http/app";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import Redis from "ioredis";
import { container } from "@/infrastructure/di/container";

describe("Appointment API E2E", () => {
  let redisContainer: StartedTestContainer;
  let redisClient: Redis;

  let token: string;
  let tenantId: string;

  beforeAll(async () => {
    redisContainer = await new GenericContainer("redis:7-alpine")
      .withExposedPorts(6379)
      .start();

    const host = redisContainer.getHost();
    const port = redisContainer.getMappedPort(6379);

    redisClient = new Redis({ host, port });

    // Override DI container with test redis client
    await container.initialize(redisClient);

    const { factories } = await import("../helpers/factories");
    const t1 = await factories.tenant();
    tenantId = t1.id;
    const u1 = await factories.user();
    await factories.userTenant(u1.id, tenantId);

    token = container.jwtService.generateAccessToken({
      userId: u1.id,
      tenantId: tenantId,
      role: "TenantUser",
      permissions: [],
      isSuperAdmin: false,
    });
  }, 30000);

  afterAll(async () => {
    await container.destroy();

    if (redisContainer) {
      await redisContainer.stop();
    }
  });

  beforeEach(async () => {
    await redisClient.flushdb();
  });

  describe("POST /api/v1/appointments", () => {
    it("should accept a valid appointment with a valid hold and return 202", async () => {
      // First create a hold
      const holdPayload = {
        technicianId: "tech-1",
        serviceBayId: "bay-1",
      };
      const holdResponse = await request(app)
        .post("/api/v1/appointments/hold")
        .set("Authorization", `Bearer ${token}`)
        .set("x-tenant-id", tenantId)
        .send(holdPayload);

      const payload = {
        holdId: holdResponse.body.holdId,
        customerId: "cust-1",
        vehicleId: "veh-1",
        serviceTypeId: "srv-1",
        technicianId: "tech-1",
        serviceBayId: "bay-1",
        desiredStartTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      };

      const response = await request(app)
        .post("/api/v1/appointments")
        .set("Authorization", `Bearer ${token}`)
        .set("x-tenant-id", tenantId)
        .send(payload);

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty("commandId");

      // Verify in redis
      const keys = await redisClient.keys(
        `tenant:${tenantId}:appointment:veh-1:pending`,
      );
      expect(keys.length).toBe(1);

      // Verify hold was deleted
      const holdKeys = await redisClient.keys(`tenant:${tenantId}:hold:technician:tech-1`);
      expect(holdKeys.length).toBe(0);
    });

    it("should reject requests with missing tenant ID (400)", async () => {
      const response = await request(app)
        .post("/api/v1/appointments")
        .set("Authorization", `Bearer ${token}`)
        .send({
          customerId: "cust-1",
          vehicleId: "veh-1",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("x-tenant-id");
    });

    it("should reject booking (409 Conflict) if hold is missing or expired", async () => {
      const payload = {
        holdId: "00000000-0000-0000-0000-000000000000",
        customerId: "cust-1",
        vehicleId: "veh-1",
        serviceTypeId: "srv-1",
        technicianId: "tech-1",
        serviceBayId: "bay-1",
        desiredStartTime: new Date(Date.now() + 86400000).toISOString(),
      };

      const response = await request(app)
        .post("/api/v1/appointments")
        .set("Authorization", `Bearer ${token}`)
        .set("x-tenant-id", tenantId)
        .send(payload);

      expect(response.status).toBe(409);
      expect(response.body.message).toBe("The booking session has expired. Please re-create the booking session.");
    });

    it("should allow booking same vehicle twice without idempotency conflict", async () => {
      const hold1Response = await request(app)
        .post("/api/v1/appointments/hold")
        .set("Authorization", `Bearer ${token}`)
        .set("x-tenant-id", tenantId)
        .send({ technicianId: "tech-1", serviceBayId: "bay-1" });

      const payload1 = {
        holdId: hold1Response.body.holdId,
        customerId: "cust-1",
        vehicleId: "veh-1",
        serviceTypeId: "srv-1",
        technicianId: "tech-1",
        serviceBayId: "bay-1",
        desiredStartTime: new Date(Date.now() + 86400000).toISOString(),
      };

      await request(app)
        .post("/api/v1/appointments")
        .set("Authorization", `Bearer ${token}`)
        .set("x-tenant-id", tenantId)
        .send(payload1)
        .expect(202);

      const hold2Response = await request(app)
        .post("/api/v1/appointments/hold")
        .set("Authorization", `Bearer ${token}`)
        .set("x-tenant-id", tenantId)
        .send({ technicianId: "tech-2", serviceBayId: "bay-2" });

      const payload2 = {
        holdId: hold2Response.body.holdId,
        customerId: "cust-1",
        vehicleId: "veh-1",
        serviceTypeId: "srv-1",
        technicianId: "tech-2",
        serviceBayId: "bay-2",
        desiredStartTime: new Date(Date.now() + 86400000).toISOString(),
      };

      await request(app)
        .post("/api/v1/appointments")
        .set("Authorization", `Bearer ${token}`)
        .set("x-tenant-id", tenantId)
        .send(payload2)
        .expect(202);
    });
  });

  describe("POST /api/v1/appointments/hold", () => {
    it("should create a temporary hold and return 201", async () => {
      const payload = {
        technicianId: "tech-1",
        serviceBayId: "bay-1",
      };

      const response = await request(app)
        .post("/api/v1/appointments/hold")
        .set("Authorization", `Bearer ${token}`)
        .set("x-tenant-id", tenantId)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("holdId");
      expect(response.body).toHaveProperty("expiresAt");
    });

    it("should reject concurrent hold for same technician/bay (409)", async () => {
      const payload = {
        technicianId: "tech-1",
        serviceBayId: "bay-1",
      };

      await request(app)
        .post("/api/v1/appointments/hold")
        .set("Authorization", `Bearer ${token}`)
        .set("x-tenant-id", tenantId)
        .send(payload)
        .expect(201);

      const response = await request(app)
        .post("/api/v1/appointments/hold")
        .set("Authorization", `Bearer ${token}`)
        .set("x-tenant-id", tenantId)
        .send(payload);

      expect(response.status).toBe(409);
      expect(response.body.message).toContain("held by another user");
    });
  });

  describe("GET /health", () => {
    it("should return 200 OK", async () => {
      const response = await request(app).get("/health");
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: "ok", cache: "connected" });
    });
  });
});
