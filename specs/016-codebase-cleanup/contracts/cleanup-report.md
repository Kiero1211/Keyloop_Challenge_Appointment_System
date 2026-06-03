# Contract: Cleanup Report

The implementation must produce a final human-readable cleanup report in the completion response. It does not need to be persisted as a repository artifact unless requested later.

## Required Sections

### Inspected Areas

List each included project area with its path and review outcome.

Required fields:
- Area name
- Path
- Outcome: reviewed, changed, deferred
- Notes, if relevant

### Excluded Areas

List excluded categories and representative paths.

Required fields:
- Path or glob
- Reason for exclusion

Expected exclusions:
- Test files and test directories
- Dependency folders
- Generated build output
- Coverage reports
- IDE caches and local runtime artifacts

### Findings

List discovered issues, including fixed and deferred findings.

Required fields:
- Finding ID
- Category
- Impact
- Location
- Summary
- Recommendation
- Status

### Applied Changes

List behavior-preserving changes applied during cleanup.

Required fields:
- Change ID
- Related finding IDs
- Files changed
- Change summary
- Behavior impact

### Verification

List checks used to confirm the cleanup still works.

Required fields:
- Verification ID
- Command or check
- Scope
- Result
- Notes for skipped or failed checks

### Remaining Recommendations

List deferred cleanup items that should be handled separately.

Required fields:
- Related finding ID
- Reason deferred
- Suggested next step

## Output Rules

- Use concise Markdown.
- Include file paths for every finding and change.
- Separate fixed findings from deferred recommendations.
- Do not claim verification succeeded unless the command or check actually ran.
- If no issues are found in an area, state that the area was reviewed with no actionable findings.
