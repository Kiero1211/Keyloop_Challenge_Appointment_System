# Keyloop Unified Service Scheduler

This repository contains the solution for the **Keyloop Technical Assessment** (Scenario A: The Unified Service Scheduler).

The project is built as a highly robust, scalable, and testable system combining a **Node.js/TypeScript API Service** for fast RESTful endpoint serving, and a **.NET 8 C# Worker Service** for asynchronous background processing, both backed by **PostgreSQL** and **Redis**.

For an in-depth breakdown of the architecture, data flow, and technology choices, please see the [System Design Document](System_Design_Document.md).

---

## Getting Started

### Prerequisites
- Docker and Docker Compose installed
- Node.js v20+ (for running API tests locally)
- .NET 8 SDK (for running Worker tests locally)

### Build and Run the Application

The entire system (API Service, Worker Service, PostgreSQL database, and Redis cache/stream) is fully containerized. To spin up the system, simply run:

```bash
docker-compose up --build -d
```

This will expose:
- **API Service**: `http://localhost:3000`
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`

### Stopping the Application

To cleanly stop and remove the containers, networks, and volumes:

```bash
docker-compose down -v
```

---

## Testing

The project employs a rigorous Test-Driven Development (TDD) approach with extensive Unit and Integration test coverage across both services.

### Testing the API Service (Node.js)

The API service uses Jest and Supertest.

```bash
# Navigate to the API service directory
cd apps/appointment-api-service

# Install dependencies
npm install

# Run all unit and integration tests
npm run test
```

### Testing the Worker Service (.NET 8)

The Worker service uses xUnit, Moq, FluentAssertions, and Testcontainers (for spin-up integration testing).

```bash
# Return to the project root
cd ../../

# Run the Unit Tests
dotnet test apps/appointment-worker-service/tests/AppointmentWorkerService.Tests.Unit/AppointmentWorkerService.Tests.Unit.csproj

# Run the Integration Tests
dotnet test apps/appointment-worker-service/tests/AppointmentWorkerService.Tests.Integration/AppointmentWorkerService.Tests.Integration.csproj
```

---

## AI Collaboration Narrative

Building a resilient dual-microservice architecture requires strict orchestration. This project was built through a collaborative, **Agentic AI workflow** (using Google Antigravity / OpenCode tools) guided by a "Spec-Driven Development" methodology. 

For the complete narrative detailing the high-level strategy, the verification process, and how final code quality was ensured, please read the [AI Collaboration Narrative](AI_Collaboration_Narrative.md).
