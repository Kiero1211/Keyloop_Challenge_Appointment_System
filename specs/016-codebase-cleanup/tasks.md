# Tasks: Codebase Cleanup

**Input**: Design documents from `specs/016-codebase-cleanup/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/cleanup-report.md`, `quickstart.md`

**Tests**: No new test files are required for behavior-preserving cleanup. If an implementation step reveals a needed behavior change, stop that change path and add failing focused tests before editing production code, per the constitution.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files or independent inspection areas
- **[Story]**: Which user story this task belongs to
- Every task includes a concrete repository path or documented output target

## Phase 1: Setup (Shared Cleanup Context)

**Purpose**: Confirm feature context and collect the rules that constrain the cleanup pass.

- [X] T001 Confirm the active feature pointer is `specs/016-codebase-cleanup` in `.specify/feature.json`
- [X] T002 Review cleanup scope, constraints, and constitution gates in `specs/016-codebase-cleanup/plan.md`
- [X] T003 Review user-story acceptance criteria and exclusions in `specs/016-codebase-cleanup/spec.md`
- [X] T004 Review the required final-report sections in `specs/016-codebase-cleanup/contracts/cleanup-report.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the repository inventory and guardrails before any story work begins.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Build the included/excluded path inventory for active app areas under `apps/`
- [X] T006 [P] Build the included/excluded path inventory for repository metadata under `.specify/`, `.agents/`, `AGENTS.md`, `README.md`, and `docker-compose.yml`
- [X] T007 [P] Identify generated, dependency, coverage, local-runtime, and IDE artifact paths to exclude under `apps/appointment-api-service/`, `apps/appointment-worker-service/`, and `apps/api-client-ui/`
- [X] T008 Check changed TypeScript import guardrails against the alias-import rule in `AGENTS.md`
- [X] T009 Check cleanup safety guardrails against tenant isolation and layer-boundary rules in `.specify/memory/constitution.md`

**Checkpoint**: Repository scope is known, exclusions are justified, and cleanup can proceed without reviewing tests or generated output.

---

## Phase 3: User Story 1 - Identify Cleanup Targets (Priority: P1) MVP

**Goal**: Produce a clear inventory of naming, placement, organization, duplication, and complexity findings across included non-test, non-generated files.

**Independent Test**: Verify that all included project areas were inspected or explicitly excluded, and that every finding has a location, category, impact, and recommendation.

### Implementation for User Story 1

- [X] T010 [P] [US1] Inspect API domain naming, placement, and purity patterns in `apps/appointment-api-service/src/domain/`
- [X] T011 [P] [US1] Inspect API application commands, ports, queries, and use-case organization in `apps/appointment-api-service/src/application/`
- [X] T012 [P] [US1] Inspect API infrastructure adapters, HTTP routes, DB repositories, cache, auth, and messaging placement in `apps/appointment-api-service/src/infrastructure/`
- [X] T013 [P] [US1] Inspect API config, contract, seed, and service-root artifacts in `apps/appointment-api-service/`
- [X] T014 [P] [US1] Inspect worker Domain and Application naming, placement, and dependency-boundary patterns in `apps/appointment-worker-service/src/Core/`
- [X] T015 [P] [US1] Inspect worker Infrastructure, migrations, Docker, solution, package config, helper scripts, and local artifacts in `apps/appointment-worker-service/`
- [X] T016 [P] [US1] Inspect UI source, component naming, API helpers, auth, schemas, and types in `apps/api-client-ui/src/`
- [X] T017 [P] [US1] Inspect UI config, Docker, public assets, and service-root artifacts in `apps/api-client-ui/`
- [X] T018 [P] [US1] Inspect root documentation, orchestration, Spec Kit metadata, and agent rules in `README.md`, `docker-compose.yml`, `.specify/`, and `.agents/`
- [X] T019 [US1] Consolidate CleanupFinding entries for all inspected areas using the required fields from `specs/016-codebase-cleanup/data-model.md`
- [X] T020 [US1] Classify each CleanupFinding as fixed-candidate, deferred, accepted, or blocked using `specs/016-codebase-cleanup/contracts/cleanup-report.md`

**Checkpoint**: User Story 1 is complete when the implementation notes contain all inspected areas, excluded areas, and prioritized cleanup findings.

---

## Phase 4: User Story 2 - Apply Simple Safe Cleanups (Priority: P2)

**Goal**: Apply behavior-preserving fixes for low-risk inconsistencies where the local convention and reference updates are clear.

**Independent Test**: Verify that each applied change maps to one or more findings, has no intended behavior impact, updates references consistently, and preserves project guardrails.

### Implementation for User Story 2

- [X] T021 [US2] Select fixed-candidate findings from the User Story 1 inventory that are behavior-preserving and safe to apply within `apps/`, `.specify/`, `.agents/`, `AGENTS.md`, `README.md`, or `docker-compose.yml`
- [X] T022 [US2] Apply simple naming or placement fixes for selected API findings and update affected references in `apps/appointment-api-service/`
- [X] T023 [US2] Apply simple naming or placement fixes for selected worker findings and update affected references in `apps/appointment-worker-service/`
- [X] T024 [US2] Apply simple naming or placement fixes for selected UI findings and update affected references in `apps/api-client-ui/`
- [X] T025 [US2] Apply simple metadata, documentation, or orchestration cleanup for selected findings in `.specify/`, `.agents/`, `AGENTS.md`, `README.md`, and `docker-compose.yml`
- [X] T026 [US2] Replace any changed internal TypeScript relative imports with static alias imports in `apps/appointment-api-service/src/` and `apps/api-client-ui/src/`
- [X] T027 [US2] Confirm no behavior-changing cleanup was applied without explicit approval and failing tests for the affected file paths in `apps/`
- [X] T028 [US2] Record CleanupChange entries for every applied edit using the required fields from `specs/016-codebase-cleanup/data-model.md`
- [X] T029 [US2] Record deferred CleanupFinding entries with rationale for broad or risky issues in the final report structure defined by `specs/016-codebase-cleanup/contracts/cleanup-report.md`

**Checkpoint**: User Story 2 is complete when safe cleanup edits are applied, all references are updated, and every finding is marked fixed, deferred, accepted, or blocked.

---

## Phase 5: User Story 3 - Verify and Summarize Results (Priority: P3)

**Goal**: Verify changed areas and produce the final concise cleanup report.

**Independent Test**: Read the final report and confirm it includes inspected areas, exclusions, findings, applied changes, verification results, and remaining recommendations.

### Implementation for User Story 3

- [X] T030 [P] [US3] Run the most relevant API build, lint, or focused test checks for changes under `apps/appointment-api-service/`
- [X] T031 [P] [US3] Run the most relevant worker build, format, or `dotnet test` checks for changes under `apps/appointment-worker-service/`
- [X] T032 [P] [US3] Run the most relevant UI build or lint checks for changes under `apps/api-client-ui/`
- [X] T033 [P] [US3] Run documentation and metadata sanity checks for changes under `.specify/`, `.agents/`, `AGENTS.md`, `README.md`, and `docker-compose.yml`
- [X] T034 [US3] Record VerificationResult entries for each command or manual check using `specs/016-codebase-cleanup/data-model.md`
- [X] T035 [US3] Produce the final cleanup report in the completion response using `specs/016-codebase-cleanup/contracts/cleanup-report.md`

**Checkpoint**: User Story 3 is complete when verification outcomes are recorded and the final report is ready for the maintainer.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency checks across the generated task flow and implementation summary.

- [X] T036 Validate every fixed finding has a corresponding CleanupChange entry in `specs/016-codebase-cleanup/data-model.md`
- [X] T037 Validate every CleanupChange has a VerificationResult or skipped-verification reason in `specs/016-codebase-cleanup/contracts/cleanup-report.md`
- [X] T038 Confirm the implementation summary can be understood in under 5 minutes using `specs/016-codebase-cleanup/spec.md`
- [X] T039 Confirm no tests, generated output, dependency folders, coverage reports, build artifacts, IDE caches, or local runtime files were edited under `apps/`
- [X] T040 Confirm `git status --short` only shows intentional cleanup and Spec Kit files for `016-codebase-cleanup`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1; blocks all user-story work.
- **User Story 1 (Phase 3)**: Depends on Phase 2; delivers the MVP review inventory.
- **User Story 2 (Phase 4)**: Depends on User Story 1; cleanup fixes require the findings inventory.
- **User Story 3 (Phase 5)**: Depends on User Story 2 if cleanup changes were applied; can still summarize User Story 1 findings if no fixes are safe.
- **Polish (Phase 6)**: Depends on all completed story phases.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational; independent MVP.
- **User Story 2 (P2)**: Starts after User Story 1 because safe fixes depend on identified findings.
- **User Story 3 (P3)**: Starts after User Story 2 for changed-area verification, or after User Story 1 if no changes are applied.

### Within Each User Story

- Inspect before classifying findings.
- Classify findings before applying fixes.
- Apply fixes before verification.
- Record verification before final summary.
- Stop before behavior changes unless explicit approval and failing tests are added.

### Parallel Opportunities

- T006 and T007 can run in parallel after T005 starts because they inspect different path groups.
- T010 through T018 can run in parallel because they inspect different repository areas.
- T030 through T033 can run in parallel when they cover different changed areas.

---

## Parallel Example: User Story 1

```text
Task: "T010 Inspect API domain naming, placement, and purity patterns in apps/appointment-api-service/src/domain/"
Task: "T014 Inspect worker Domain and Application naming, placement, and dependency-boundary patterns in apps/appointment-worker-service/src/Core/"
Task: "T016 Inspect UI source, component naming, API helpers, auth, schemas, and types in apps/api-client-ui/src/"
Task: "T018 Inspect root documentation, orchestration, Spec Kit metadata, and agent rules in README.md, docker-compose.yml, .specify/, and .agents/"
```

## Parallel Example: User Story 3

```text
Task: "T030 Run the most relevant API build, lint, or focused test checks for changes under apps/appointment-api-service/"
Task: "T031 Run the most relevant worker build, format, or dotnet test checks for changes under apps/appointment-worker-service/"
Task: "T032 Run the most relevant UI build or lint checks for changes under apps/api-client-ui/"
Task: "T033 Run documentation and metadata sanity checks for changes under .specify/, .agents/, AGENTS.md, README.md, and docker-compose.yml"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 to identify cleanup targets.
3. Stop and validate that the inventory covers all included non-test, non-generated areas.
4. Share the findings inventory if the maintainer wants review before fixes.

### Incremental Delivery

1. Deliver User Story 1 findings inventory.
2. Apply User Story 2 fixes only for safe fixed-candidate findings.
3. Complete User Story 3 verification and final report.
4. Keep deferred broad changes separate from the cleanup pass.

### Parallel Team Strategy

1. One contributor completes setup and foundational scope.
2. Multiple contributors inspect API, Worker, UI, and metadata areas in parallel for User Story 1.
3. A single contributor coordinates User Story 2 edits to avoid conflicting file moves or renames.
4. Verification can split by changed area for User Story 3.

---

## Notes

- `[P]` tasks inspect or verify different files and can run in parallel.
- `[US1]`, `[US2]`, and `[US3]` labels map tasks to the prioritized user stories in `spec.md`.
- Avoid editing test files, generated output, dependency folders, coverage reports, build artifacts, IDE caches, or local runtime files.
- Use path aliases for every changed internal TypeScript import.
- Preserve behavior unless explicit approval and failing tests are added first.
- Do not add, remove, or merge application boundaries.
- Final response must follow `specs/016-codebase-cleanup/contracts/cleanup-report.md`.
