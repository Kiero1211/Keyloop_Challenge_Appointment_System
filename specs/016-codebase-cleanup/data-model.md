# Data Model: Codebase Cleanup

## ProjectArea

Represents a cohesive repository area included in or excluded from the cleanup review.

| Field | Description | Validation |
|-------|-------------|------------|
| name | Human-readable area name | Required |
| path | Repository-relative path | Required |
| type | Source, config, documentation, metadata, generated, dependency, test, local artifact | Required |
| reviewStatus | Included, excluded, reviewed, changed, deferred | Required |
| exclusionReason | Why the area is excluded | Required when reviewStatus is excluded |

**Relationships**:
- Has many CleanupFindings.
- Has many CleanupChanges when fixes are applied.

## CleanupFinding

Represents one naming, placement, organization, duplication, or complexity issue discovered during review.

| Field | Description | Validation |
|-------|-------------|------------|
| id | Stable finding identifier | Required, unique within final report |
| area | Owning ProjectArea | Required |
| location | Repository-relative file or directory path, optionally with line | Required |
| category | Naming, placement, organization, duplication, complexity, boundary risk, generated/local artifact | Required |
| impact | High, medium, low | Required |
| summary | Short statement of the issue | Required |
| recommendation | Concrete resolution or follow-up | Required |
| status | Fixed, deferred, accepted, blocked | Required |
| rationale | Why this status was chosen | Required for deferred, accepted, or blocked |

**Relationships**:
- May be resolved by one CleanupChange.
- May reference one or more VerificationResults.

## CleanupChange

Represents a behavior-preserving edit applied during implementation.

| Field | Description | Validation |
|-------|-------------|------------|
| id | Stable change identifier | Required, unique within final report |
| findingIds | Findings resolved by the change | Required |
| filesChanged | Repository-relative paths changed | Required |
| changeType | Rename, move, import update, simplification, config cleanup, documentation cleanup | Required |
| behaviorImpact | Expected behavior impact | Must be "none" unless explicitly approved otherwise |
| notes | Short implementation note | Optional |

**Relationships**:
- Must have at least one VerificationResult unless verification is documented as unavailable.

## VerificationResult

Represents proof that cleanup did not break expected behavior.

| Field | Description | Validation |
|-------|-------------|------------|
| id | Stable verification identifier | Required, unique within final report |
| commandOrCheck | Command, manual check, or static review performed | Required |
| scope | Area or files covered | Required |
| result | Passed, failed, skipped | Required |
| reason | Explanation for skipped or failed verification | Required unless result is passed |

## State Flow

```text
ProjectArea included
  -> reviewed
  -> finding recorded
  -> fixed by cleanup change
  -> verified

ProjectArea included
  -> reviewed
  -> finding recorded
  -> deferred with rationale

ProjectArea excluded
  -> exclusion reason recorded
```

## Validation Rules

- Every included ProjectArea must end in reviewed or changed status.
- Every CleanupFinding must include a location and recommendation.
- Every CleanupChange must be behavior-preserving unless explicit approval is documented.
- Every changed TypeScript internal import must use the configured path alias convention.
- Every CleanupChange must have verification or a clear skipped-verification reason.
- Deferred findings must explain why they were not fixed in the cleanup pass.
