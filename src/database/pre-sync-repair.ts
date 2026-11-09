import { Logger } from '@nestjs/common';
import { Client } from 'pg';

export interface PgRepairConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

/**
 * Repairs NULLs in seeded tables BEFORE TypeORM `synchronize` runs.
 *
 * Why: `synchronize` runs during DataSource initialization. `SeedService`
 * runs on `onApplicationBootstrap` — i.e. AFTER that. If a legacy row has
 * `name = NULL` (or `description = NULL`) while the entity declares the
 * column `NOT NULL`, synchronize fails with:
 *   QueryFailedError: column "name" of relation "subscription_plans"
 *   contains null values
 * and the app never boots (crash loop in serverless).
 *
 * This function opens a raw `pg` connection and updates NULLs using the
 * same per-id values the seed uses (ids 1/2/3 are sacred), so synchronize
 * can safely apply `SET NOT NULL` afterwards. Fresh DBs (tables not yet
 * created) are ignored — TypeORM will create them first.
 */
export async function repairNullsBeforeSync(
  cfg: PgRepairConfig,
): Promise<void> {
  const logger = new Logger('PreSyncRepair');
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
      `Pre-sync repair skipped (cannot connect): ${(err as Error).message}`,
    );
    return;
  }

  try {
    // subscription_plans.name is unique NOT NULL (varchar 50).
    // Keep per-id mapping for 1/2/3; unknown ids get a unique fallback
    // so the update cannot violate the unique constraint.
    const plansName = await client.query(
      `UPDATE subscription_plans
       SET name = CASE subscription_plan_id
         WHEN 1 THEN 'free'
         WHEN 2 THEN 'monthly'
         WHEN 3 THEN 'lifetime'
         ELSE 'unknown-' || subscription_plan_id::text END
       WHERE name IS NULL OR name = ''`,
    );
    // subscription_plans.description is NOT NULL (varchar 255).
    const plansDesc = await client.query(
      `UPDATE subscription_plans
       SET description = CASE subscription_plan_id
         WHEN 1 THEN 'Plan Gratuito: Límite de 2 sprints y 30 tareas.'
         WHEN 2 THEN 'Plan Mensual: Sprints y tareas ilimitadas.'
         WHEN 3 THEN 'Plan de por vida: Acceso total permanente.'
         ELSE 'Plan desconocido.' END
       WHERE description IS NULL`,
    );
    // status_tasks.name is unique NOT NULL (varchar 50).
    const statuses = await client.query(
      `UPDATE status_tasks
       SET name = CASE status_task_id
         WHEN 1 THEN 'Pending'
         WHEN 2 THEN 'In Progress'
         WHEN 3 THEN 'Completed'
         ELSE 'unknown-' || status_task_id::text END
       WHERE name IS NULL OR name = ''`,
    );

    const total =
      (plansName.rowCount ?? 0) +
      (plansDesc.rowCount ?? 0) +
      (statuses.rowCount ?? 0);
    if (total > 0) {
      logger.warn(
        `Repaired ${total} NULL value(s) before synchronize ` +
          `(plans.name=${plansName.rowCount}, ` +
          `plans.description=${plansDesc.rowCount}, ` +
          `status_tasks.name=${statuses.rowCount})`,
      );
    } else {
      logger.debug('Pre-sync repair: no NULL values found.');
    }
  } catch (err: unknown) {
    const pgErr = err as { code?: string; message?: string };
    // 42P01 undefined_table / 42703 undefined_column => fresh DB,
    // TypeORM synchronize will create tables/columns, nothing to repair.
    if (pgErr?.code === '42P01' || pgErr?.code === '42703') {
      logger.debug(
        `Pre-sync repair skipped (table/column not yet created): ${pgErr.message}`,
      );
    } else {
      // Don't crash boot here; synchronize/seed will surface real errors.
      logger.warn(`Pre-sync repair warning: ${pgErr?.message ?? String(err)}`);
    }
  } finally {
    await client.end().catch(() => undefined);
  }
}
