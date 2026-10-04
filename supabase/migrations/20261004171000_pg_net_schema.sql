-- pg_net was installed into `public`, which the API exposes. It cannot be moved with `alter extension`, so it
-- is reinstalled into `extensions`. Its functions stay in the `net` schema, so `net.http_post` in
-- notify_support_request keeps working. Requests still queued at that moment are dropped, which only
-- costs a Telegram notification; the support request itself is kept.
-- Kept apart from the other hardening so that, if anything else in the project depends on pg_net,
-- only this step fails and nothing is dropped by cascade.
do $$
begin
  if exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pg_net' and n.nspname = 'public'
  ) then
    drop extension pg_net;
    create extension pg_net with schema extensions;
  end if;
end;
$$;
