# Agent Orchestrator Frontend

## Quick start

1. Use the existing Node toolchain (recommended: Node 18+).
2. Install dependencies: `npm install` or `pnpm install`.
3. Start dev server: `npm run dev`.
4. Build for production: `npm run build`.

## Integration notes

- The UI is structured as modular React components so it can be copied into other projects.
- State management is handled via lightweight Zustand stores located in `src/state`.
- API access is encapsulated in `src/api` with Axios; adjust the base URL as needed.
- Ant Design provides layout, theming, and interactive components.

