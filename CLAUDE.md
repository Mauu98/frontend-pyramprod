# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

React 19 + Vite frontend for Pyramid, a multi-tenant industrial ERP. The backend is the sibling repo
`../api-pyramprod` (Spring Boot, Java), covering Codificación/Catálogo, Stock, Formulación/MRP, and
Entorno Social (Proveedores, Clientes, Planificación, RRHH). This repo only implements a subset of that
domain today (see Routing below) — UI copy and domain terms are in Spanish (Argentina).

## Commands

```bash
npm run dev       # vite dev server; proxies /api -> http://localhost:8080 (see vite.config.ts)
npm run build     # tsc -b (project-references type check) then vite build
npm run lint      # eslint .
npm run preview   # preview the production build
```

There is no test runner configured in this repo (no vitest/jest, no test script in package.json).

## Architecture

### Routing & auth gate
`src/router.tsx` builds the route tree by hand with TanStack Router (`createRoute`, no file-based
routing). All authenticated pages hang off a single `/app` route whose `beforeLoad` checks
`useAuthStore.getState().isAuthenticated()` and redirects to `/login` otherwise — this is the only
auth gate; there's no per-route guard. `src/layouts/AppLayout.tsx` renders the sidebar nav and an
`<Outlet />` for the matched page. Note the sidebar (`navGroups` in `AppLayout.tsx`) lists more
destinations (Facturación, Reportes) than are actually registered in `router.tsx` — check the router
before assuming a nav link resolves to a real page.

`src/App.tsx` is unmodified Vite/React boilerplate and is **not** wired into `main.tsx` — the real
entry point renders `RouterProvider` directly. Don't treat `App.tsx` as live code.

### Data layer
- `src/lib/api-client.ts` — single Axios instance, base URL from `VITE_API_URL` (defaults to `/api`).
  Attaches `Authorization: Bearer <token>` from `localStorage['pyramid_token']` on every non-`/auth/`
  request, and on a 401/403 response clears the token and hard-redirects to `/login`.
- `src/lib/query-client.ts` — shared TanStack Query `QueryClient` (5 min `staleTime`, `retry: 1`).
- `src/services/*.service.ts` — one file per domain (catalog, stock, production, purchasing, sales),
  each exporting a plain object of functions that call `apiClient` and return `.then(r => r.data)`.
  This is the preferred pattern for new data calls. Some older pages (e.g. `CodificacionPage.tsx`)
  call `apiClient` directly inline with `useQuery`/`useMutation` instead of going through a service —
  don't copy that for new work, prefer adding to the relevant `*.service.ts`.
- `src/types/api.types.ts` — one large file with all request/response DTOs, grouped by module with
  `// ─── Section ───` comment banners. Mirrors backend DTOs; check here before inventing a new shape.
- Backend error responses follow a `{ status, error, code?, message, timestamp }` shape
  (`ApiError` in `api.types.ts`). Pages map specific `code` values to Spanish user-facing messages
  (see `getErrMsg` in `CodificacionPage.tsx` for the pattern) rather than showing the raw message.

### State
- `src/stores/auth.store.ts` — Zustand store (`zustand` + `persist` middleware) holding
  `token`/`userId`/`companyId`/`role`, persisted to localStorage under key `pyramid_auth`. This is
  the only global client state store in the app; everything else is local component state or
  server state via React Query.

### UI system
- `src/styles/tokens.css` defines all `--erp-*` CSS custom properties (color, spacing, radius,
  typography) and is imported once in `main.tsx`. It is the single source of truth for styling —
  do not hardcode a hex/px value that already has a token.
- `src/components/ui/` holds shadcn-style primitives (`button.tsx`, `card.tsx`, `input.tsx`,
  `form-field.tsx`, `form-dialog.tsx`, `page-layout.tsx`, `tabs.tsx`, etc.) built on Radix UI
  primitives + `class-variance-authority` + `cn()` (clsx + tailwind-merge, in `src/lib/utils.ts`).
  Reuse these before writing a new one.
- `src/pages/` is organized by business domain (`catalog/`, `production/`, `purchasing/`, `sales/`,
  `stock/`), matching the backend's module boundaries.
- A project skill at `.claude/skills/frontend-design-review/SKILL.md` encodes the established UI
  conventions in detail (token reuse, primitive reuse, no boxed branding, mockup-before-code via the
  `design` Artifact skill). Read it before creating or restyling anything under `src/pages`,
  `src/components`, or `src/layouts` — this file intentionally doesn't duplicate its content.

### Path alias
`@/*` resolves to `src/*` (configured in both `vite.config.ts` and `tsconfig.app.json`).
