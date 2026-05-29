---
name: clean_architecture
activation: Always On
description: Enforce Clean Architecture (Hexagonal / Ports & Adapters) boundaries and technology portability rules.
---

# Clean Architecture & Ports & Adapters Guidelines

To ensure high maintainability and allow seamless swapping of infrastructure technologies (e.g., Redis Streams to Kafka, PostgreSQL to SQL Server, Redis Cache to Memcached), strictly enforce a separation of layers:

## 1. Layer Boundaries

### Domain Layer (Core Business Logic)
* **Locations**: 
  * C# Worker: `src/Core/Domain/`
  * Node.js API: `src/domain/`
* **Rule**: Zero dependencies on databases, web frameworks, external caches, messaging clients, or ORMs.
* **Contents**: Pure Entities, Aggregates, Value Objects, Domain Events, and Core Business Rules (e.g., time-slot intersection calculations).

### Application Layer (Use Cases)
* **Locations**: 
  * C# Worker: `src/Core/Application/`
  * Node.js API: `src/application/`
* **Rule**: Contains business orchestration logic (Use Cases, Command/Query Handlers). Defines interface boundaries (**Ports**) for external services.
* **Contents**: Interactors, Command/Query models, and Port interfaces (e.g., `IAppointmentRepository`, `IMessagePublisher`, `ICacheProvider`).

### Infrastructure Layer (Adapters)
* **Locations**: 
  * C# Worker: `src/Infrastructure/`
  * Node.js API: `src/infrastructure/`
* **Rule**: Implements the Ports defined in the Application layer (**Adapters**). Imports external SDKs, DB drivers, ORMs, and messaging frameworks.
* **Contents**: SQL/EF Core repositories, Redis Stream/Kafka event consumers, Redis/Memcached cache providers, API controllers, and CLI entry points.

## 2. Portability Guidelines

* **No Leaky Abstractions**: Infrastructure-specific types (e.g., `NpgsqlException`, `RedisValue`, `KafkaException`) must never leak into Application or Domain layers. Trap infrastructure exceptions in the Adapters and convert them into Domain-specific exceptions.
* **Dependency Injection**: Always program to interfaces (Ports). Use constructor dependency injection to bind concrete Adapters at the application composition root.
