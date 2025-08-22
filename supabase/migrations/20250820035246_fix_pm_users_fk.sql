-- 1. Drop old FK (if any)
alter table public.pm_users
  drop constraint if exists pm_users_id_fkey;

-- 2. Point to auth.users(id)
alter table public.pm_users
  add constraint pm_users_id_fkey
    foreign key (id) references auth.users(id) on delete cascade;

-- 3. Ensure trigger owner (postgres) can write through RLS
drop policy if exists pm_users_trigger_writer on public.pm_users;

create policy pm_users_trigger_writer
  on public.pm_users
  for all
  to postgres
  using (true)
  with check (true);