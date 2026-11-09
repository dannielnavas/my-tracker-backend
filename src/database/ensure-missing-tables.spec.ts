import {
  ensureMissingTablesBeforeInit,
  MISSING_TABLE_DDL,
} from './ensure-missing-tables';

type PgInstance = {
  connect: jest.Mock;
  query: jest.Mock;
  end: jest.Mock;
};

const instances: PgInstance[] = [];

jest.mock('pg', () => {
  const Client = jest.fn().mockImplementation(() => {
    const instance: PgInstance = {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue({ rowCount: 0 }),
      end: jest.fn().mockResolvedValue(undefined),
    };
    instances.push(instance);
    return instance;
  });
  return { Client };
});

const cfg = {
  host: 'db.example.com',
  port: 5432,
  username: 'app',
  password: 'secret',
  database: 'appdb',
};

describe('ensureMissingTablesBeforeInit', () => {
  beforeEach(() => {
    instances.length = 0;
  });

  it('creates the three tables synchronize never creates in prod, idempotently', async () => {
    await ensureMissingTablesBeforeInit(cfg);

    expect(instances).toHaveLength(1);
    const [client] = instances;
    expect(client.connect).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenCalledTimes(MISSING_TABLE_DDL.length);
    const executed = client.query.mock.calls.map(([sql]) => sql as string);
    expect(executed).toEqual([...MISSING_TABLE_DDL]);
    expect(executed.join('\n')).toContain(
      'CREATE TABLE IF NOT EXISTS "refresh_tokens"',
    );
    expect(executed.join('\n')).toContain(
      'CREATE TABLE IF NOT EXISTS "stripe_events"',
    );
    expect(executed.join('\n')).toContain(
      'CREATE TABLE IF NOT EXISTS "ai_usage_logs"',
    );
    expect(client.end).toHaveBeenCalledTimes(1);
  });

  it('creates unique/index constraints matching the entity declarations', () => {
    const ddl = MISSING_TABLE_DDL.join('\n');
    expect(ddl).toContain('"token_hash" character varying(128) NOT NULL');
    expect(ddl).toContain('UQ_refresh_tokens_token_hash');
    expect(ddl).toContain('UQ_stripe_events_stripe_event_id');
    expect(ddl).toContain('IDX_ai_usage_logs_user_id');
    expect(ddl).toContain('IDX_ai_usage_logs_sprint_id');
  });

  it('does not throw when connection fails (TypeORM owns retries)', async () => {
    const failing: PgInstance = {
      connect: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      query: jest.fn(),
      end: jest.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Client } = require('pg');
    (Client as jest.Mock).mockImplementationOnce(() => failing);

    await expect(ensureMissingTablesBeforeInit(cfg)).resolves.toBeUndefined();
    expect(failing.query).not.toHaveBeenCalled();
  });

  it('treats concurrent creation (42P07) as success', async () => {
    const racing: PgInstance = {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest
        .fn()
        .mockRejectedValue(
          Object.assign(new Error('duplicate'), { code: '42P07' }),
        ),
      end: jest.fn().mockResolvedValue(undefined),
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Client } = require('pg');
    (Client as jest.Mock).mockImplementationOnce(() => racing);

    await expect(ensureMissingTablesBeforeInit(cfg)).resolves.toBeUndefined();
    expect(racing.end).toHaveBeenCalledTimes(1);
  });
});
