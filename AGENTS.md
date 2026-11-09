# AGENTS.md — My Tracker Backend (Focus Loop)

NestJS 11 + TypeORM + PostgreSQL backend for Angular frontend “Focus Loop”. Single package, no monorepo. Real API contract is `BACKEND_INTEGRATION_GUIDE.md` (Spanish); `README.md` is stock Nest template — do not trust it.

## Commands (pnpm only — lockfile is `pnpm-lock.yaml`)

```bash
pnpm install
pnpm run start:dev      # watch mode (nest start --watch), port PORT ?? 3000
pnpm run start          # no watch
pnpm run build          # nest build -> dist/
pnpm run start:prod     # node dist/main (run build first)
pnpm run lint           # eslint {src,apps,libs,test}/**/*.ts --fix (mutates files; currently has pre-existing errors on main)
pnpm run format         # prettier --write src/**/*.ts test/**/*.ts
pnpm run test           # jest unit (rootDir=src, *.spec.ts)
pnpm run test -- <path> # single file, e.g. pnpm run test -- src/tasks/services/tasks.service.spec.ts
pnpm run test:e2e       # jest --config ./test/jest-e2e.json (needs live DB)
```

No typecheck / CI / pre-commit scripts — `pnpm run build` is the typecheck. Do not add npm/yarn commands.

## Local setup & env (app will fail Joi validation on boot without this)

- Env file selected by `NODE_ENV` in `src/environments.ts`: `dev` → `.env`, `stag` → `.stag.env`, `prod` → `.prod.env`. All gitignored; copy/edit locally.
- Required (validated in `src/app.module.ts` Joi schema): `API_KEY`, `JWT_SECRET`, `DATABASE_NAME`, `DATABASE_PORT`, `POSTGRES_PASSWORD`, `POSTGRES_USER`, `POSTGRES_DB`, `POSTGRES_HOST`, `POSTGRES_PORT`, `API_OPEN_AI`, `API_KEY_RESEND`.
- Optional: `CLOUDINARY_*`, `STRIPE_*`, `CLIENT_URL` (defaults `http://localhost:4200`), `CORS_ORIGINS` (comma list, appended to web+Electron defaults in `src/main.ts`), `JWT_ACCESS_EXPIRES_IN` (24h), `JWT_REFRESH_TTL_DAYS` (30), `AI_TIMEOUT_MS` (15000), `AI_MAX_TOKENS` (800), `AI_DAILY_LIMIT` (10), `AI_PROVIDER` (`auto|openai|gemini|openrouter|mock`, default `auto`), `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` (default `openai/gpt-4o-mini`), `OPENROUTER_BASE_URL` (default `https://openrouter.ai/api/v1`), `OPENROUTER_SITE_URL` (HTTP-Referer), `OPENROUTER_APP_TITLE`.
- Postgres required to boot. `src/database/database.module.ts` always sets `ssl: { rejectUnauthorized: false }` and `synchronize: true` (no migrations — entities auto-sync, incl. new `refresh_tokens`, `stripe_events`, `ai_usage_logs`).
- Seeding is automatic on bootstrap (`SeedService`, idempotent per-id): subscription plans `1=free, 2=monthly, 3=lifetime`; task statuses `1=Pending, 2=In Progress, 3=Completed`; default AI prompt.

## Architecture & entrypoints

- Entrypoint: `src/main.ts` (`rawBody: true` for Stripe webhook, restricted CORS web+Electron incl. `file://`/`null`/`capacitor://localhost`, global `ErrorEnvelopeFilter`, `RateLimitGuard`, `ValidationPipe { whitelist, forbidNonWhitelisted }`, Swagger at `/docs`).
- All errors are `{code,message,details?,statusCode}` via `ErrorEnvelopeFilter`; 401 keeps frontend session-clear. Plan limits are `403 {code:"PLAN_LIMITED",message,details:{limitType,limitValue},limitType,limitValue}`.
- Auth: JWT access (default 24h, `exp` mandatory in `JwtStrategy`) + rotating refresh (`POST /auth/refresh {refresh_token}` → new `{access_token,refresh_token,user}`, persisted hashed in `refresh_tokens`). Public: `POST /auth/login`, `POST /auth/refresh`, `POST /users`, `POST /payments/webhook`, `GET /healthz`, `GET /`. Everything else needs `Authorization: Bearer <JWT>`. Owner id always comes from token (`sub`); client `user_id`/`role`/`subscription_plan_id`/`stripe_customer_id` are ignored server-side.
- Imports use `src/...` prefix (`baseUrl: ./`); follow that. Cross-cutting code lives in `src/common/` (exceptions, filters, guards, decorators, pagination, markdown sanitizer).

## API contract (canonical now — `/sprint` is deprecated alias)

- Canonical sprints base is `/sprints` (full CRUD + `user/:userId`, `task/:taskId`, `status/:status`, pagination `?page=&limit=` default = full array). `/sprint` (singular) is the deprecated alias — keep both or the frontend breaks.
- Tasks: `GET /tasks?sprint_id=` (same pagination default), `PATCH /tasks/reorder {sprint_id?, tasks:[{task_id,position}]}` (transactional, must be declared before `PATCH :id`), `PATCH /tasks/:id` (status only 1/2/3, `date_end` server-only on completion, client dates ignored). `GET /tasks/count-task-*` are deprecated (use `SprintResponse.countTask*`), still functional with `Deprecation: true`.
- Users: `PATCH /users/{id}` (self/admin only; email conflict → 409; `profile_image` base64 data URI → Cloudinary URL, fallback stores data URI in `TEXT` column if Cloudinary unconfigured; `preferences`; returns full user with plan). `POST /auth/change-password {current_password,new_password}` (token user, bcrypt). Legacy `POST /users/:id/change-password` kept but self-only.
- Payments: `POST /payments/create-checkout-session {plan_key}`, `POST /payments/customer-portal` (both token user → `{url}`), `POST /payments/webhook` (public, raw-body signature required in real mode; idempotent via `stripe_events`; upgrades 2=monthly/3=lifetime). Mock mode without `STRIPE_SECRET_KEY` still auto-upgrades.
- AI: `POST /ai-functions/generate {sprint_id,dateReport}` (owner check, 10/day DB-enforced, timeout `AI_TIMEOUT_MS`, `max_tokens` budget, Markdown sanitized or `refusal`). Real LLM only for free plan; others mock; `mock`/empty key → mock for all; provider resolution in `resolveAiClient()`: `AI_PROVIDER` or auto (OpenRouter key wins, else `AIzaSy*` → Gemini `gemini-1.5-flash`, else `gpt-4o-mini`), OpenRouter uses `https://openrouter.ai/api/v1` + `HTTP-Referer`/`X-Title` headers.

## Testing & gotchas

- Unit tests mock repos/services; new-dependency injections are `@Optional()` so old specs still construct. `test:e2e` boots full `AppModule` (env + Postgres) — never run without DB.
- Jest unit config is inline in `package.json` (`rootDir: src`); e2e uses `test/jest-e2e.json`. New specs: `markdown-sanitizer`, `pagination`, `tasks.reorder`.
- `pnpm run lint` currently reports pre-existing errors on main (count only); don’t gate on it. Run `format` after any lint `--fix`.
- TypeScript `strictNullChecks` on, but `noImplicitAny: false` and ESLint `no-explicit-any` off.
- No `.github/` CI, no `opencode.json`, no `.cursor` rules. Schema source of truth is entities + `synchronize: true` (indexes cover FKs: `users.email` unique, `sprints.user_id`, `tasks.sprint_id/status_task_id`, plans/status names unique).
- Deploy: `vercel.json` builds `src/main.ts` with `@vercel/node` (serverless, not `dist/`); `X-Forwarded-For` is used for rate limiting.
