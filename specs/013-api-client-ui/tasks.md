# Tasks: API Client UI

**Input**: Design documents from `/specs/013-api-client-ui/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are omitted as they were not explicitly requested for this simple UI project.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create `apps/api-client-ui` directory and initialize Vite React-TS project
- [x] T002 [P] Clean up default Vite boilerplate in `apps/api-client-ui/src/` (remove unused assets, clean `App.tsx` and `index.css`)
- [x] T003 [P] Configure `apps/api-client-ui/tsconfig.json` paths alias to resolve schemas from `appointment-api-service`
- [x] T004 Create `apps/api-client-ui/Dockerfile` for multi-stage build

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create basic API fetching utility in `apps/api-client-ui/src/api.ts` (native fetch wrapper)
- [x] T006 Define UI state types matching `data-model.md` in `apps/api-client-ui/src/types.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Authentication and Tenant Selection (Priority: P1) 🎯 MVP

**Goal**: As a user, I need to log into the application and select a tenant context so that I can interact with the API securely and view the correct tenant's data.

**Independent Test**: Can be fully tested by verifying that the user receives an auth token upon login and can toggle between available tenants.

### Implementation for User Story 1

- [x] T007 [P] [US1] Create Auth/Tenant state management (e.g., Context or hooks) in `apps/api-client-ui/src/useAuth.ts`
- [x] T008 [P] [US1] Create Login form component in `apps/api-client-ui/src/components/Login.tsx`
- [x] T009 [P] [US1] Create Tenant Selector component in `apps/api-client-ui/src/components/TenantSelector.tsx`
- [x] T010 [US1] Integrate Login and TenantSelector into `apps/api-client-ui/src/App.tsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently (can log in and select tenant).

---

## Phase 4: User Story 2 - Data Visualization (Priority: P2)

**Goal**: As a user, I need to view the API data in a single page view so that I can easily verify the rows returned by the API service.

**Independent Test**: Can be fully tested by ensuring the data table populates correctly when connected to the API service.

### Implementation for User Story 2

- [x] T011 [P] [US2] Add endpoints for fetching Technicians, ServiceBays, Appointments, AuditLogs to `apps/api-client-ui/src/api.ts`
- [x] T012 [P] [US2] Create generic Data Table component in `apps/api-client-ui/src/components/DataTable.tsx`
- [x] T013 [US2] Create Dashboard component in `apps/api-client-ui/src/components/Dashboard.tsx` with tabs/buttons to switch entities
- [x] T014 [US2] Implement HTTP 403 handling (display "You don't have permission to see this") in `apps/api-client-ui/src/components/DataTable.tsx`
- [x] T015 [US2] Integrate Dashboard into `apps/api-client-ui/src/App.tsx` to display when authenticated

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T016 [P] Add minimal CSS styling in `apps/api-client-ui/src/index.css` for clean layout and tabular views
- [x] T017 Update `docker-compose.yml` at the repository root to include the new `api-client-ui` service

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - Sequential in priority order (P1 → P2)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2)
- **User Story 2 (P2)**: Can start after Foundational (Phase 2), requires Auth state from US1 to fetch data.

### Parallel Opportunities

- Setup tasks marked [P] can run in parallel
- React components in Phase 3 (Login, TenantSelector) can be developed in parallel
- Endpoints definition and generic DataTable in Phase 4 can be developed in parallel

---

## Implementation Strategy

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (Auth/Tenant) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (Data Viewer) → Test independently → Deploy/Demo
4. Each story adds value without breaking previous stories
