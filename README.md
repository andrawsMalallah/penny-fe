# Penny frontend

Vue 3, TypeScript and Vite static SPA with English/Arabic and System/Light/Dark support. Requires Node >=22.12.

```powershell
npm ci
npm run dev
npm test
npm run lint
npm run format:check
npm run build
```

`npm run build` writes the deployable static files to `dist/`. Publish that directory through static-site hosting. There is no frontend Docker or Nginx deployment configuration. API requests use `/api/v1/`; configure hosting to route that path to the backend on the same public HTTPS origin for cookie sessions and CSRF. The development proxy is configured in `vite.config.ts`.

Components are grouped by feature under `src/components/`, with shared `ui/` and `layout/` folders. Financial data and security secrets remain memory-only. Workspace context lives in the parent AGENTS.md and MEMORY.md.
