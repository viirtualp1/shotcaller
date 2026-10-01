-- Round lineups, replays and career progress outgrew the original snapshot limits.
-- Keep the complete save and a bounded payload: 1 MiB per profile, 256 KiB per match.
-- Replace both checks atomically, including on databases with existing profiles.
begin;

alter table public.profiles
  drop constraint profiles_data_check,
  add constraint profiles_data_check check (pg_column_size(data) <= 1048576);

alter table public.matches
  drop constraint matches_data_check,
  add constraint matches_data_check check (pg_column_size(data) <= 262144);

commit;
