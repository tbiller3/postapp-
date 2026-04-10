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

## Billing V45 Pipeline Service (`services/billing-v26/`)

Standalone Express server for the full iOS submission pipeline. V45 merges all V26 features with expanded pipeline stages.

### Structure
- `server.js` — V45 main server, mounts 4 route groups (billing, submissions, analyzer, pipeline)
- `routes/pipeline.js` — Central route hub: project, reviewer, metadata, screenshots, signing, build, Apple Connect, upload, launch, timeline
- `routes/submissions.js` — Submission credits, timeline events, review status
- `routes/billing.js` — Stripe checkout sessions, plan management
- `routes/analyzer.js` — App readiness analysis
- `services/signingService.js` — Code signing evaluation (bundle ID, certs, provisioning)
- `services/codemagicService.js` — Build config validation, trigger, polling
- `services/appleConnectService.js` — Apple API config, JWT, app/version creation
- `services/uploadService.js` — Upload state management, preparation
- `services/pipelineEngine.js` — One-click pipeline orchestrator
- `public/index.html` — 14-view UI (Pipeline, Metadata, Screenshots, Signing, Build Engine, Apple Connect, Upload, Reviewer, Timeline, Final Launch, Guided Flow, Pricing, Billing, Submission)
- `public/js/billing-ui.js` — Full frontend logic for all 14 views

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
