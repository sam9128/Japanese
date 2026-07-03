-- Run this file once in Supabase SQL Editor.
create table if not exists public.learning_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

alter table public.learning_snapshots enable row level security;

drop policy if exists "Users read their learning snapshot" on public.learning_snapshots;
create policy "Users read their learning snapshot" on public.learning_snapshots
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users insert their learning snapshot" on public.learning_snapshots;
create policy "Users insert their learning snapshot" on public.learning_snapshots
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their learning snapshot" on public.learning_snapshots;
create policy "Users update their learning snapshot" on public.learning_snapshots
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their learning snapshot" on public.learning_snapshots;
create policy "Users delete their learning snapshot" on public.learning_snapshots
  for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.sync_learning_snapshot(expected_revision bigint, new_payload jsonb)
returns table(applied boolean, revision bigint, payload jsonb, updated_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  current_row public.learning_snapshots%rowtype;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  select * into current_row from public.learning_snapshots where user_id = uid for update;
  if not found then
    insert into public.learning_snapshots as ls(user_id, payload, revision)
    values (uid, coalesce(new_payload, '{}'::jsonb), 1)
    returning ls.revision, ls.payload, ls.updated_at
    into revision, payload, updated_at;
    applied := true; return next; return;
  end if;
  if current_row.revision <> expected_revision then
    applied := false; revision := current_row.revision; payload := current_row.payload; updated_at := current_row.updated_at;
    return next; return;
  end if;
  update public.learning_snapshots as ls
    set payload = coalesce(new_payload, '{}'::jsonb), revision = current_row.revision + 1, updated_at = now()
    where user_id = uid
    returning ls.revision, ls.payload, ls.updated_at
    into revision, payload, updated_at;
  applied := true; return next;
end;
$$;

revoke all on public.learning_snapshots from anon;
grant select, insert, update, delete on public.learning_snapshots to authenticated;
revoke all on function public.sync_learning_snapshot(bigint, jsonb) from public, anon;
grant execute on function public.sync_learning_snapshot(bigint, jsonb) to authenticated;
