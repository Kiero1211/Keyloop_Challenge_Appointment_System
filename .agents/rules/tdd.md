---
name: tdd_practices
activation: Always On
description: Enforce Test-Driven Development (TDD) rules and boundary verification constraints.
---

# Test-Driven Development (TDD) & Validation Guidelines

We prioritize system predictability, correctness, and clean contracts over fast, untested implementations.

## 1. TDD Lifecycle (Red-Green-Refactor)
* **Write Tests First**: Write unit tests before writing functional implementation code.
* **Define Invariant Boundaries**: Test both successful operations and edge cases (e.g., malformed payloads, non-existent tenants, time overlaps).

## 2. Mock Isolation
* **Abstractions Only**: When testing Application Use Cases, mock the Port interfaces. Do not hit real databases, live HTTP endpoints, or messaging queues in unit tests.
* **Infrastructure Integration Tests**: Provide dedicated integration tests in the Infrastructure layer. Use lightweight, real service instances (e.g., via Docker Testcontainers) to test concrete Adapters.

## 3. Strict Boundary Validation
* **External Boundaries**:
  * Node.js: Use Zod schemas at the Express HTTP controllers to validate incoming requests.
  * C#: Use FluentValidation or DataAnnotations in worker intake endpoints.
* **Internal Boundaries**:
  * Domain models must defend their invariants. Throw descriptive Domain exceptions immediately if an Entity or Value Object is initialized or transitioned into an invalid state.
