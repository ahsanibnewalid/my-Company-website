import { Pool, type QueryResult, type QueryResultRow } from "pg";

/**
 * All persistence lives in one PostgreSQL database. No files are written to
 * Render's ephemeral disk, and an absent database fails closed.
 */
let pool: Pool | undefined;
let schemaReady: Promise<void> | undefined;

export function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Database is not configured.");
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 4,
      connectionTimeoutMillis: 6000,
      idleTimeoutMillis: 15000,
    });
    pool.on("error", () => {
      // Background connection errors are handled by the next query.
    });
  }
  return pool;
}

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('project', 'career')),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'closed')),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL,
    organization VARCHAR(120) NOT NULL DEFAULT '',
    track VARCHAR(80) NOT NULL DEFAULT '',
    message TEXT NOT NULL,
    consent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  "CREATE INDEX IF NOT EXISTS submissions_created_idx ON submissions (created_at DESC)",
  `CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY,
    title VARCHAR(140) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('planning', 'active', 'completed')),
    url VARCHAR(500) NOT NULL DEFAULT '',
    featured BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  "CREATE INDEX IF NOT EXISTS projects_created_idx ON projects (created_at DESC)",
  `CREATE TABLE IF NOT EXISTS site_settings (
    key VARCHAR(60) PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  )`,
];

export async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      for (const statement of schemaStatements) await getPool().query(statement);
    })();
  }
  try {
    await schemaReady;
  } catch (error) {
    schemaReady = undefined;
    throw error;
  }
}

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<T>> {
  await ensureSchema();
  return getPool().query<T>(text, values);
}

export const defaultSiteSettings = {
  tagline: "We engineer secure digital products, SaaS platforms and practical AI systems.",
  founder_name: "Ahsan Ibne Walid Shuvo",
  contact_email: "",
  location: "Dhaka, Bangladesh",
};

export type SiteSettings = typeof defaultSiteSettings;

export async function getSiteSettings(): Promise<SiteSettings> {
  const result = await dbQuery<{ key: keyof SiteSettings; value: string }>(
    "SELECT key, value FROM site_settings WHERE key = ANY($1::text[])",
    [Object.keys(defaultSiteSettings)],
  );
  const settings = { ...defaultSiteSettings };
  for (const row of result.rows) {
    if (Object.prototype.hasOwnProperty.call(settings, row.key)) {
      settings[row.key] = row.value;
    }
  }
  return settings;
}
