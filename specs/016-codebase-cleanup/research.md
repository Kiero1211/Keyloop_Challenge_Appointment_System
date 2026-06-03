# Research: Codebase Cleanup

## Decision: Treat Cleanup as Behavior-Preserving by Default

**Rationale**: The user asked for simpler working code, not a feature behavior change. Behavior-preserving cleanup can safely resolve naming, placement, and pattern issues while reducing regression risk.

**Alternatives considered**:
- Combine cleanup with feature fixes: rejected because it blurs intent and makes verification harder.
- Perform only a written review: rejected because the spec requires simple safe fixes when the convention and reference updates are clear.

## Decision: Scope Review to Active Non-Test, Non-Generated Project Files

**Rationale**: The request explicitly allows skipping tests. Generated output, dependencies, coverage reports, build artifacts, IDE caches, and local runtime files would create noise and should not drive source cleanup.

**Alternatives considered**:
- Review every file recursively: rejected because dependency and generated folders would dominate the review and produce low-value findings.
- Review source files only: rejected because configuration, Docker, seed data, documentation, and Spec Kit metadata can contain naming and placement inconsistencies that affect maintainability.

## Decision: Prefer Dominant Local Conventions

**Rationale**: The repository spans TypeScript, React, C#, SQL, Docker, and Spec Kit artifacts. A single naming convention across all file types would create artificial churn. The cleanup should normalize within each project area.

**Alternatives considered**:
- Enforce one repository-wide file naming style: rejected because C# and TypeScript have different ecosystem conventions.
- Avoid renames entirely: rejected because clear low-risk naming inconsistencies are part of the requested cleanup.

## Decision: Report Broad Structural Gaps Instead of Opportunistic Restructuring

**Rationale**: The constitution is strict about application boundaries and layer roles. Large moves, missing service boundaries, or cross-service contract changes need explicit planning and tests beyond a cleanup pass.

**Alternatives considered**:
- Automatically create or reorganize service boundaries: rejected because it risks constitution violations and behavior changes.
- Ignore broad issues: rejected because the cleanup report must identify weird placement and project-structure issues.

## Decision: Verify with Focused Existing Checks

**Rationale**: Pure cleanup does not introduce new behavior, so existing checks are the right verification baseline. If a cleanup requires behavior change, the constitution's test-first rule applies before production edits.

**Alternatives considered**:
- Run every possible test suite after every small cleanup: rejected as inefficient and unnecessary for isolated formatting/naming/config changes.
- Skip verification for non-behavioral changes: rejected because imports, references, and builds can break even when behavior is intended to remain unchanged.

## Decision: Use a Structured Cleanup Report Contract

**Rationale**: A structured final report makes implementation auditable: maintainers can see inspected areas, findings, applied changes, verification, and deferred recommendations.

**Alternatives considered**:
- Free-form summary only: rejected because it risks omitting scope or verification details.
- Persist a machine-readable report as a new application artifact: rejected because the request does not require new tooling or storage.
