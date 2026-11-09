import { Logger } from '@nestjs/common';
import { Client } from 'pg';
import type { PgRepairConfig } from './pre-sync-repair';

/**
 * Idempotent DDL for tables that TypeORM `synchronize` never creates in
 * production.
 *
 * Why this exists: `DatabaseModule` sets `synchronize: !isProd` on purpose
 * (commit 33841d7) to avoid concurrent serverless instances racing DDL on
 * cold start. That froze the schema in prod, so entities added later —
 * `refresh_tokens` (AuthService.createRefreshToken → login/refresh),
 * `stripe_events` (Payments webhook idempotency) and `ai_usage_logs`
 * (AI daily-limit) — 404-ish with `42P01 undefined_table`:
 *
 *   QueryFailedError: relation "refresh_tokens" does not exist
 *
 * Running `CREATE TABLE IF NOT EXISTS` via a raw `pg` client *before*
 * DataSource initialization is safe under concurrent serverless starts
 * (Postgres serializes DDL; duplicate_table/duplicate_object are treated
 * as success) and needs no manual SQL on the next deploy. It does not
 * alter existing tables — `synchronize` still owns that outside prod.
 *
 * Column types mirror the entities exactly:
 * - RefreshToken: src/auth/entities/refresh-token.entity.ts
 * - StripeEvent: src/payments/entities/stripe-event.entity.ts
 * - AiUsageLog: src/ai-functions/entities/ai-usage-log.entity.ts
 */
export const MISSING_TABLE_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "token_hash" character varying(128) NOT NULL,
    "user_id" integer NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "revoked" boolean NOT NULL DEFAULT false,
    "replaced_by_token_id" integer,
    "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_refresh_tokens_token_hash"
    ON "refresh_tokens" ("token_hash")`,
  `CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_user_id"
    ON "refresh_tokens" ("user_id")`,
  `CREATE TABLE IF NOT EXISTS "stripe_events" (
    "id" SERIAL NOT NULL,
    "stripe_event_id" character varying(255) NOT NULL,
    "type" character varying(255) NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_stripe_events" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_stripe_events_stripe_event_id"
    ON "stripe_events" ("stripe_event_id")`,
  `CREATE TABLE IF NOT EXISTS "ai_usage_logs" (
    "id" SERIAL NOT NULL,
    "user_id" integer NOT NULL,
    "sprint_id" integer NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ai_usage_logs" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "IDX_ai_usage_logs_user_id"
    ON "ai_usage_logs" ("user_id")`,
  `CREATE INDEX IF NOT EXISTS "IDX_ai_usage_logs_sprint_id"
    ON "ai_usage_logs" ("sprint_id")`,
] as const;

export async function ensureMissingTablesBeforeInit(
  cfg: PgRepairConfig,
): Promise<void> {
  const logger = new Logger('EnsureMissingTables');
  const client = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.username,
    password: cfg.password,
    database: cfg.database,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
  });

  try {
    await client.connect();
  } catch (err) {
    // Let TypeORM handle connect retries — don't block startup here.
    logger.warn(
      `Ensure-missing-tables skipped (cannot connect): ${(err as Error).message}`,
    );
    return;
  }

  try {
    for (const statement of MISSING_TABLE_DDL) {
      await client.query(statement);
    }
    logger.debug(
      'Ensure-missing-tables: refresh_tokens, stripe_events, ai_usage_logs ready.',
    );
  } catch (err: unknown) {
    const pgErr = err as { code?: string; message?: string };
    // 42P07 duplicate_table / 42710 duplicate_object: a concurrent
    // serverless instance created it first — that is success.
    if (pgErr?.code === '42P07' || pgErr?.code === '42710') {
      logger.debug(
        `Ensure-missing-tables: table already created by concurrent instance: ${pgErr.message}`,
      );
    } else {
      // Don't crash boot here; the first real query will surface the error.
      logger.warn(
        `Ensure-missing-tables warning: ${pgErr?.message ?? String(err)}`,
      );
    }
  } finally {
    await client.end().catch(() => undefined);
  }
}
