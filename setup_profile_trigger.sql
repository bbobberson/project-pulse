-- Setup guaranteed profile creation trigger
-- Run this in your Supabase SQL editor

create extension if not exists "uuid-ossp";

create or replace function public.sync_profile()
returns trigger language plpgsql security definer as $$
begin
  insert into pm_users(id, email, full_name, role)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          'manager')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists t_auth_profile on auth.users;
create trigger t_auth_profile
  after insert on auth.users
  for each row execute procedure public.sync_profile();