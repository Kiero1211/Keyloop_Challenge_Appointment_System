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

  let customer: any;
  let vehicle: any;
  let serviceType: any;
  let tech1: any;
  let tech2: any;
  let bay1: any;
  let bay2: any;

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
    
    const { factories } = await import("../helpers/factories");
    customer = await factories.customer(tenantId);
    vehicle = await factories.vehicle(tenantId, customer.id);
    serviceType = await factories.serviceType(tenantId);
    tech1 = await factories.technician(tenantId);
    tech2 = await factories.technician(tenantId);
    bay1 = await factories.serviceBay(tenantId);
    bay2 = await factories.serviceBay(tenantId);
  });

  describe("POST /api/v1/appointments", () => {
    let holdId = "";

    it("should accept a valid appointment with a valid hold and return 202", async () => {
      // First create a hold
      const holdPayload = {
        technicianId: tech1.id,
        serviceBayId: bay1.id,
      };
      const holdResponse = await request(app)
        .post("/api/v1/appointments/hold")
        .set("Authorization", `Bearer ${token}`)
        .set("x-tenant-id", tenantId)
        .send(holdPayload);

      const payload = {
        technicianHolId: holdResponse.body.holdId,
        serviceBayHoldId: holdResponse.body.holdId,
        customerId: customer.id,
        vehicleId: vehicle.id,
        serviceTypeId: serviceType.id,
        technicianId: tech1.id,
        serviceBayId: bay1.id,
        desiredStartTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      };
      holdId = holdResponse.body.holdId;

      const response = await request(app)
        .post("/api/v1/appointments")
        .set("Authorization", `Bearer ${token}`)
        .set("x-tenant-id", tenantId)
        .send(payload);

      console.log("response.body", response.body);
      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty("commandId");

      // Verify bay hold was deleted
      const keys = await redisClient.keys(
        `tenant:${tenantId}:hold:bay:${holdPayload.serviceBayId}`,
      );
      expect(keys.length).toBe(0);

      // Verify technician hold was deleted
      const holdKeys = await redisClient.keys(
        `tenant:${tenantId}:hold:technician:${holdPayload.technicianId}`,
      );
      expect(holdKeys.length).toBe(0);
    });

    it("should reject requests with missing tenant ID (400)", async () => {
      const response = await request(app)
        .post("/api/v1/appointments")
        .set("Authorization", `Bearer ${token}`)
        .send({
          customerId: customer.id,
          vehicleId: vehicle.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("x-tenant-id");
    });

    it("should reject booking (409 Conflict) if hold is missing or expired", async () => {
      const payload = {
        technicianHolId: holdId,
        serviceBayHoldId: holdId,
        customerId: customer.id,
        vehicleId: vehicle.id,
        serviceTypeId: serviceType.id,
        technicianId: tech1.id,
        serviceBayId: bay1.id,
        desiredStartTime: new Date(Date.now() + 86400000).toISOString(),
      };

      const response = await request(app)
        .post("/api/v1/appointments")
        .set("Authorization", `Bearer ${token}`)
        .set("x-tenant-id", tenantId)
        .send(payload);

      console.log("response.body 409 test", response.body);
      expect(response.status).toBe(409);
      expect(response.body.message).toBe(
        "The booking session has expired. Please re-create the booking session.",
      );
    });

    it("should allow booking same vehicle twice without idempotency conflict", async () => {
      const hold1Response = await request(app)
        .post("/api/v1/appointments/hold")
        .set("Authorization", `Bearer ${token}`)
        .set("x-tenant-id", tenantId)
        .send({ technicianId: tech1.id, serviceBayId: bay1.id });

      const payload1 = {
        technicianHolId: hold1Response.body.holdId,
        serviceBayHoldId: hold1Response.body.holdId,
        customerId: customer.id,
        vehicleId: vehicle.id,
        serviceTypeId: serviceType.id,
        technicianId: tech1.id,
        serviceBayId: bay1.id,
        desiredStartTime: new Date(Date.now() + 86400000).toISOString(),
      };

      await request(app)
        .post("/api/v1/appointments")
        .set("Authorization", `Bearer ${token}`)
        .set("x-tenant-id", tenantId)
        .send(payload1)
        .expect((res) => {
          if (res.status !== 202) {
            console.log("payload1 failure:", res.body);
          }
        })
        .expect(202);

      const hold2Response = await request(app)
        .post("/api/v1/appointments/hold")
        .set("Authorization", `Bearer ${token}`)
        .set("x-tenant-id", tenantId)
        .send({ technicianId: tech2.id, serviceBayId: bay2.id });

      const payload2 = {
        technicianHolId: hold2Response.body.holdId,
        serviceBayHoldId: hold2Response.body.holdId,
        customerId: customer.id,
        vehicleId: vehicle.id,
        serviceTypeId: serviceType.id,
        technicianId: tech2.id,
        serviceBayId: bay2.id,
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
        technicianId: tech1.id,
        serviceBayId: bay1.id,
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
        technicianId: tech1.id,
        serviceBayId: bay1.id,
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
