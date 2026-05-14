# PostApp — Claude Project Memory

## Who You're Working With
- **Tim Biller** (tbiller3 on GitHub, t.biller3@gmail.com)
- Indie developer with ~45 apps built, working to monetize them
- **Urgent:** Needs income within ~15 days or loses housing
- Priority order: PostApp → MarketEngine → IRONBEAM → Infrasounder → Fix WaitWise

---

## PostApp — Current State

### App Store
- **v1.7 is LIVE** on the App Store (confirmed via "Open" button on iPhone)
- Monetized via **Stripe** (not App Store in-app purchase — pricing shows $0 in App Store, that's intentional)
- v1.8 needs to be submitted once Railway backend URL is confirmed and iOS build updated

### Railway Backend
- **Project:** `gentle-determination` (ID: a64ca35b-02c8-4de7-8b50-fa8ad63353a3)
- **Service:** `@workspace/api-server`
- **Repo:** github.com/tbiller3/postapp- (branch: main)
- **Builder:** Dockerfile (switched from RAILPACK/Nixpacks — both had pnpm lockfile issues)
- **Latest deploy commit:** `ede519e` — healthcheck + Neon SSL fix

### Railway Environment Variables (all set)
| Variable | Notes |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `NODE_ENV` | production |
| `LOG_LEVEL` | set |
| `STRIPE_SECRET_KEY` | set |
| `STRIPE_PUBLISHABLE_KEY` | set |
| `STRIPE_WEBHOOK_SECRET` | set |
| `OPENAI_API_KEY` | set |

### Database
- **Provider:** Neon (neon.tech) — used because Railway free plan can't provision PostgreSQL
- Project name on Neon: "postapp"
- **IMPORTANT:** Database tables have NOT been migrated yet — run `pnpm db:push` or drizzle-kit push against Neon before first login will work

### What Still Needs Doing for PostApp
1. ✅ Railway build passing (Dockerfile approach)
2. ⬜ Confirm Railway healthcheck passes and get the public URL
3. ⬜ Run Drizzle migrations against Neon (`cd lib/db && DATABASE_URL=<neon-url> pnpm push`)
4. ⬜ Set `RAILWAY_PUBLIC_DOMAIN` or `PUBLIC_URL` variable in Railway to the assigned domain
5. ⬜ Configure Stripe webhook in Stripe dashboard → the endpoint URL is `https://<railway-domain>/api/stripe/webhook`
6. ⬜ Update iOS app's backend URL to point to Railway (not Replit)
7. ⬜ Build new iOS version (v1.8) and submit to App Store

---

## Repo Structure
```
postapp_github/               ← git root (github.com/tbiller3/postapp-)
├── Dockerfile                ← Railway build (added by Claude)
├── railway.json              ← healthcheckPath: /api/healthz, start: node artifacts/api-server/dist/index.mjs
├── pnpm-workspace.yaml       ← monorepo config, lockfileVersion 9.0
├── artifacts/
│   ├── api-server/           ← Express backend (@workspace/api-server)
│   │   ├── src/
│   │   │   ├── index.ts      ← entry point, reads PORT env var (required)
│   │   │   ├── app.ts        ← Express app, healthcheck at top, serves React frontend
│   │   │   ├── routes/       ← /api/* routes
│   │   │   ├── middlewares/authMiddleware.ts
│   │   │   ├── stripeClient.ts     ← uses STRIPE_SECRET_KEY env var
│   │   │   ├── stripeStorage.ts    ← direct Stripe API calls (no stripe-replit-sync)
│   │   │   └── webhookHandlers.ts  ← Stripe webhook processing
│   │   └── build.mjs         ← esbuild bundler script
│   └── postapp/              ← React frontend (@workspace/postapp)
│       └── dist/public/      ← built output, served as static files by api-server
├── lib/
│   ├── db/                   ← @workspace/db (drizzle-orm + pg)
│   │   └── src/index.ts      ← Pool with Neon SSL support
│   ├── api-zod/              ← shared zod schemas
│   └── integrations-openai-ai-server/
└── postapp-ios/              ← iOS Capacitor wrapper (NOT the workspace root package)
```

## Key Build Commands
```bash
# Full build (what Dockerfile runs):
pnpm install --no-frozen-lockfile
BASE_PATH=/ pnpm --filter @workspace/postapp build
pnpm --filter @workspace/api-server build

# Run DB migrations against Neon:
cd lib/db && DATABASE_URL=<neon-url> pnpm push

# Local dev:
pnpm --filter @workspace/api-server dev
```

---

## Problems Solved (don't repeat these!)

### stripe-replit-sync
- This is a **Replit-only package not on public npm** — Railway can't install it
- Removed from: `index.ts`, `stripeClient.ts`, `webhookHandlers.ts`
- `stripeStorage.ts` now uses direct Stripe API calls instead of `stripe.*` postgres tables
- `stripeClient.ts` no longer has `getStripeSync()`

### pnpm Lockfile Mismatch (ERR_PNPM_LOCKFILE_CONFIG_MISMATCH)
- Caused by `onlyBuiltDependencies` in `pnpm-workspace.yaml` not matching lockfile settings
- Fixed by regenerating lockfile locally: `npm install -g pnpm@9` then `pnpm install --no-frozen-lockfile`
- **Do NOT use `--frozen-lockfile`** in the build command — use `--no-frozen-lockfile`

### RAILPACK / Nixpacks ignoring railway.json
- Both builders run their own `pnpm i --frozen-lockfile` pre-step that can't be overridden
- Fixed by switching to **Dockerfile builder** — gives 100% control over install/build steps
- Dockerfile is at repo root, uses `node:20-slim`, pnpm@9.15.9 via corepack

### Neon SSL
- Neon requires SSL. Added `ssl: { rejectUnauthorized: false }` when URL contains `neon.tech`

### Express 5 wildcard route crash
- `app.get("*", ...)` throws `PathError: Missing parameter name at index 1: *` at startup
- Express 5 upgraded path-to-regexp to v8 which rejects bare `*`
- Fix: use `app.get("/*splat", ...)` instead

### AI_INTEGRATIONS_OPENAI_BASE_URL crash
- `lib/integrations-openai-ai-server/src/client.ts` threw on startup if Replit AI vars missing
- Fixed: falls back to standard `OPENAI_API_KEY` env var (already set in Railway variables)
- `baseURL` is now optional (only used on Replit)

---

## MarketEngine (Next Major Project)
- Currently on **Replit** — needs to move to Railway
- AI "university" with **29 specialist agents** across 7 schools (Honor Roll)
- Has 10 agent runs currently, needs to actually call Anthropic/OpenAI APIs
- Needs: commission intake flow + Stripe payment + move off Replit
- Screenshots at: `C:\Users\Costc\Desktop\UNIV\` (35 screenshots, IMG_4465-IMG_4499)

## Other Apps in Pipeline
- **IRONBEAM** — ready to submit to App Store
- **Infrasounder** — ready for iOS + macOS submission  
- **WaitWise** — rejected, needs fixes before resubmission
- ~40 other apps built but not yet submitted/monetized

---

## iOS Login Issue
- **v1.7 on App Store uses old Replit-based login** (OIDC)
- Email/password auth was added in commit `98613e7` but that code lives in the Railway backend
- Until Railway is live AND iOS app points to Railway URL, login won't work on iPad/iPhone
- Fix: update `postapp-ios` Capacitor config with Railway URL → build v1.8 → submit

## Auth System
- **Email/password** auth: `POST /api/auth/local/login` and `/api/auth/local/register`
- Passwords hashed with PBKDF2 (Node crypto, no external deps)
- Sessions stored in Neon `sessions` table via drizzle-orm
- Replit OIDC still works when `REPL_ID` env var is set (backward compat)

---

## Railway CLI (installed)
```bash
railway version   # v4.58.0
railway login     # already authenticated as tbiller3
railway link      # link to project gentle-determination
```
