-- Public gallery: every upload is visible, while ownership still controls writes.
alter table public.prompts alter column is_public set default true;

update public.prompts set is_public = true where is_public = false;

drop policy if exists "Read own or public prompts" on public.prompts;
create policy "Everyone can read prompts" on public.prompts for select
using (true);

drop policy if exists "Read images of public prompts" on storage.objects;
create policy "Everyone can read prompt images" on storage.objects for select to anon, authenticated
using (bucket_id = 'prompt-images' and exists (
  select 1 from public.prompts p where p.image_url = name
));

-- Existing insert/update/delete policies continue to require auth.uid() = user_id.
