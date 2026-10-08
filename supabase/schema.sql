-- Run once in the Supabase SQL editor. Invite team users through Auth;
-- add their UUIDs to crm_members below. Every member can view and edit.
create table if not exists public.crm_members (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.crm_members enable row level security;
create policy "Members see own membership" on public.crm_members
  for select to authenticated using (user_id = auth.uid());

create table if not exists public.crm_records (
  kind text not null check (kind in ('bookings', 'companies', 'productions')),
  id text not null,
  payload jsonb not null,
  primary key (kind, id)
);
alter table public.crm_records enable row level security;
create policy "Team can read records" on public.crm_records for select to authenticated
  using (exists (select 1 from public.crm_members where user_id = auth.uid()));
create policy "Team can create records" on public.crm_records for insert to authenticated
  with check (exists (select 1 from public.crm_members where user_id = auth.uid()));
create policy "Team can update records" on public.crm_records for update to authenticated
  using (exists (select 1 from public.crm_members where user_id = auth.uid()))
  with check (exists (select 1 from public.crm_members where user_id = auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marketing', 'marketing', false, 20971520, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "Team can read marketing files" on storage.objects for select to authenticated
  using (bucket_id = 'marketing' and exists (select 1 from public.crm_members where user_id = auth.uid()));
create policy "Team can upload marketing files" on storage.objects for insert to authenticated
  with check (bucket_id = 'marketing' and exists (select 1 from public.crm_members where user_id = auth.uid()));

-- Example (replace UUID after inviting a colleague):
-- insert into public.crm_members (user_id) values ('USER-UUID');
