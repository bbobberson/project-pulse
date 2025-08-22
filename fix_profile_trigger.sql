-- Fix profile creation trigger to not auto-create PM users for invites
-- Run this in your Supabase SQL editor

-- Drop the old trigger that auto-creates PM users
drop trigger if exists t_auth_profile on auth.users;

-- Create a new trigger that only creates PM users for confirmed/verified users
-- This prevents invited users from appearing in the PM list until they complete signup
create or replace function public.sync_profile_on_confirm()
returns trigger language plpgsql security definer as $$
begin
  -- Only create PM user record if the user has confirmed their email
  -- (invited users start unconfirmed until they set their password)
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    insert into pm_users(id, email, full_name, role, is_active, invite_status)
    values (new.id, new.email,
            coalesce(new.raw_user_meta_data->>'full_name', ''),
            'manager',
            true,
            'accepted')
    on conflict (id) do update set
      full_name = coalesce(new.raw_user_meta_data->>'full_name', pm_users.full_name),
      is_active = true,
      invite_status = 'accepted';
  end if;
  return new;
end;
$$;

-- Create trigger that fires on email confirmation instead of user creation
create trigger t_auth_profile_confirm
  after update on auth.users
  for each row execute procedure public.sync_profile_on_confirm();