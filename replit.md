# Workspace

## Overview

pnpm workspace monorepo using TypeScript. POSTAPP is an App Store submission management tool that helps developers track apps, manage revision feedback from Apple reviewers, and work through App Store submission checklists.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui + Wouter routing

## Artifacts

- **POSTAPP** (`artifacts/postapp/`) — React + Vite frontend, preview at `/`
- **API Server** (`artifacts/api-server/`) — Express 5 backend, serves at `/api`

## Features

- Dashboard with app status summary (total, in-review, needs-revision, ready, approved)
- App list with status badges per app
- Per-app detail: edit status, view/add revision notes from Apple Review/Internal/Tester
- App Store submission checklist (17 items across 5 categories) auto-generated per app
- Add new app entries with platform, bundle ID, version, category

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## DB Schema

- `apps` — app records (name, platform, status, bundleId, version, category, description)
- `revisions` — revision notes per app (note, source, resolved)
- `checklist` — App Store checklist items per app (label, category, completed)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
