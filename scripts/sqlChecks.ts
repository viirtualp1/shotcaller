import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

/**
 * Disposable PostgreSQL checks for migrations, privileges and ranked settlement. Auth, Vault and pg_net are
 * minimal local stubs: this exercises SQL behavior, not hosted Supabase integrations or cron scheduling.
 * It never reads credentials or connects to a cloud database.
 */
const ROOT = fileURLToPath(new URL('../supabase/', import.meta.url))

const db = new PGlite()

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create schema extensions;
    create schema vault;
    create schema net;
    create table vault.decrypted_secrets(name text, decrypted_secret text);
    create function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb, headers jsonb default '{}'::jsonb, timeout_milliseconds integer default 1000) returns bigint language sql as $$ select 1::bigint $$;
    create table auth.users(id uuid primary key, is_anonymous boolean default false, created_at timestamptz default now(), raw_user_meta_data jsonb default '{}', email text);
    create table auth.identities(id uuid default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, provider text, provider_id text, identity_data jsonb, updated_at timestamptz default now(), created_at timestamptz default now());
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on all functions in schema auth to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    create publication supabase_realtime;
  `)

  const migrations = readdirSync(join(ROOT, 'migrations'))
    .filter((file) => file.endsWith('.sql'))
    .sort()

  for (const file of migrations) {
    const sql = readFileSync(join(ROOT, 'migrations', file), 'utf8').replace(
      /create extension if not exists pg_net;/g,
      '-- pg_net is stubbed in this disposable database',
    )

    try {
      await db.exec(sql)
    } catch (error) {
      throw new Error(`Migration ${file} failed`, { cause: error })
    }
  }

  console.log(
    `${migrations.length} migrations loaded; Auth, Vault and pg_net are stubs; cron is unavailable.`,
  )

  /* Every check, in name order: each one rolls its fixtures back, so they share the database. */
  const tests = readdirSync(join(ROOT, 'tests'))
    .filter((file) => file.endsWith('.sql'))
    .sort()

  for (const file of tests) {
    try {
      await db.exec(readFileSync(join(ROOT, 'tests', file), 'utf8'))
    } catch (error) {
      throw new Error(`SQL check ${file} failed`, { cause: error })
    }

    console.log(`${file}: passed`)
  }
} finally {
  await db.close()
}
