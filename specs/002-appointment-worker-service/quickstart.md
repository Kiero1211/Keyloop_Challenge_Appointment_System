# Quickstart: appointment-worker-service

## Overview
The `appointment-worker-service` is a .NET 8 Background Worker that consumes appointment requests from Redis Streams, validates resource availability against `bay-service`, and persists confirmed appointments to PostgreSQL.

## Prerequisites
- .NET 8 SDK
- Docker & Docker Compose (for running Redis and PostgreSQL)

## Running Locally

1. **Start infrastructure dependencies**:
   From the repository root, start the infrastructure:
   ```bash
   docker compose up -d redis postgres bay-service
   ```

2. **Database Migrations**:
   Navigate to the worker service directory and run EF Core migrations:
   ```bash
   cd apps/appointment-worker-service
   dotnet ef database update
   ```

3. **Run the Worker**:
   ```bash
   dotnet run
   ```

## Development Workflow
- **Tests**: Run `dotnet test` to execute xUnit tests (Integration tests require Docker running for Testcontainers).
- **Code Formatting**: Ensure compliance via `dotnet format`.
