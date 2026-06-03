# Quickstart: Codebase Cleanup

## 1. Confirm Active Feature

```bash
cat .specify/feature.json
git branch --show-current
```

Expected feature directory: `specs/016-codebase-cleanup`

## 2. Generate Tasks

```bash
/speckit-tasks
```

Tasks should split the cleanup into:
- Inventory non-test, non-generated files
- Identify naming, placement, organization, duplication, and complexity findings
- Apply low-risk behavior-preserving fixes
- Verify changed areas
- Produce the final cleanup report

## 3. Implementation Guardrails

- Skip tests, generated output, dependencies, coverage, build artifacts, IDE caches, and local runtime files.
- Do not change behavior without explicit approval and failing tests first.
- Do not add, remove, or merge service boundaries.
- Keep Domain and Application layers free of infrastructure-specific imports.
- Preserve tenant isolation and tenant-prefixed cache key behavior.
- Use path aliases for changed internal TypeScript imports.

## 4. Suggested Inspection Commands

```bash
rg --files -g '!**/tests/**' -g '!**/*.test.*' -g '!**/*.spec.*' -g '!**/node_modules/**' -g '!**/dist/**' -g '!**/coverage/**' -g '!**/bin/**' -g '!**/obj/**'
find apps -maxdepth 3 -type d -not -path '*/node_modules*' -not -path '*/dist*' -not -path '*/coverage*' -not -path '*/bin*' -not -path '*/obj*'
rg -n "from ['\"]\\.\\.?/" apps/appointment-api-service/src apps/api-client-ui/src
```

## 5. Suggested Verification

Choose checks based on changed areas:

```bash
npm run build
dotnet test apps/appointment-worker-service/tests/AppointmentWorkerService.Tests.Unit/AppointmentWorkerService.Tests.Unit.csproj
```

For API behavior changes, run focused Jest files directly as required by the constitution. For pure source cleanup, prefer the smallest existing build/lint/test check that covers the changed area.

## 6. Completion Report

The implementation response must include:
- Inspected areas
- Excluded areas
- Findings
- Applied changes
- Verification results
- Remaining recommendations
