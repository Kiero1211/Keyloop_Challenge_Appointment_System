# Research: API Client UI

## Sharing Schemas
- **Decision**: Configure the React project's TypeScript configuration (`tsconfig.json`) to directly reference the domain entity types from `apps/appointment-api-service/src/domain/entities`.
- **Rationale**: Since this is a monorepo, we can use TypeScript path aliases or relative imports to use the exact same types the API service uses, avoiding any code duplication and strictly satisfying the requirement.
- **Alternatives considered**: Extracting a shared `packages/shared-types` library (good for long-term, but potentially overkill for a "very simple UI").

## UI Framework
- **Decision**: Use React.js with Vite (`create-vite`).
- **Rationale**: The user explicitly requested a "simple React.js project" and "Everything should be in one page only". Vite provides the most minimal, fast, and simple React SPA setup without the overhead of Next.js or complex SSR routers.
- **Alternatives considered**: Next.js (too heavy for a single-page data viewer), plain HTML/JS (loses React ecosystem benefits).

## Data Fetching and State
- **Decision**: Use native `fetch` and React hooks (`useState`, `useEffect`) without complex state management libraries.
- **Rationale**: The UI needs to be "very simple to show data only (minimal css needed)". Adding Redux or React Query is unnecessary complexity for simply fetching and displaying tabular data.
- **Alternatives considered**: React Query (overkill), Axios (can just use native fetch to keep dependencies low).

## Styling
- **Decision**: Use minimal inline CSS or a tiny custom CSS file.
- **Rationale**: The prompt specifies "minimal css needed" and "very simple to show data only".
- **Alternatives considered**: TailwindCSS, Material-UI (rejected due to overhead and "minimal css" requirement).
