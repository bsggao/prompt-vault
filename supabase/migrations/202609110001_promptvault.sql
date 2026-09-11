-- Apply once in the Supabase SQL Editor or with `supabase db push`.
create table public.prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  image_url text not null,
  prompt text not null check (char_length(prompt) between 1 and 20000),
  negative_prompt text default '' check (char_length(negative_prompt) <= 10000),
  category text not null,
  tags text[] not null default '{}' check (cardinality(tags) <= 12),
  model text,
  aspect_ratio text,
  source text,
  source_url text default '' check (source_url = '' or source_url ~ '^https?://'),
  notes text default '' check (char_length(notes) <= 10000),
  is_favorite boolean not null default false,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint image_belongs_to_user check (split_part(image_url, '/', 1) = user_id::text)
);
create index prompts_user_created_idx on public.prompts(user_id, created_at desc);
create index prompts_favorite_idx on public.prompts(user_id) where is_favorite;
create index prompts_tags_idx on public.prompts using gin(tags);

create function public.set_prompt_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  new.created_at = old.created_at;
  return new;
end;
$$;
create trigger prompts_updated_at before update on public.prompts
for each row execute function public.set_prompt_updated_at();

alter table public.prompts enable row level security;
grant select on public.prompts to anon;
grant select, insert, update, delete on public.prompts to authenticated;
create policy "Read own or public prompts" on public.prompts for select
using ((select auth.uid()) = user_id or is_public = true);
create policy "Insert own prompts" on public.prompts for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "Update own prompts" on public.prompts for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own prompts" on public.prompts for delete to authenticated
using ((select auth.uid()) = user_id);

-- Private bucket: uploaded images are fetched through expiring signed URLs.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('prompt-images', 'prompt-images', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Upload own prompt images" on storage.objects for insert to authenticated
with check (bucket_id = 'prompt-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Read own prompt images" on storage.objects for select to authenticated
using (bucket_id = 'prompt-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Read images of public prompts" on storage.objects for select to anon, authenticated
using (bucket_id = 'prompt-images' and exists (
  select 1 from public.prompts p where p.image_url = name and p.is_public = true
));
create policy "Delete own prompt images" on storage.objects for delete to authenticated
using (bucket_id = 'prompt-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Replacements use new UUID paths. No storage UPDATE or overwrite policy is needed.
-- Collections can be added later through a collections table + prompt_collections join.
