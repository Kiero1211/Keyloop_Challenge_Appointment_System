<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
specs/006-partition-appointments/plan.md
<!-- SPECKIT END -->

- ALWAYS use static imports with path aliases (e.g., `import ... from '@/domain/...'`) instead of relative paths (`../`, `../../`) across the entire project for internal module resolution. Use this rule every time you generate or modify code.
