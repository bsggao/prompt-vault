-- Public/private choice: public prompts are visible to everyone; private prompts only to owners.
drop policy if exists "Everyone can read prompts" on public.prompts;
drop policy if exists "Read own or public prompts" on public.prompts;
create policy "Read own or public prompts" on public.prompts for select
using ((select auth.uid()) = user_id or is_public = true);

drop policy if exists "Everyone can read prompt images" on storage.objects;
drop policy if exists "Read images of public prompts" on storage.objects;
create policy "Read images of public prompts" on storage.objects for select to anon, authenticated
using (bucket_id = 'prompt-images' and exists (
  select 1 from public.prompts p where p.image_url = name and p.is_public = true
));

-- The existing owner-image policy lets authenticated owners view their private images.
-- Insert/update/delete policies continue to require auth.uid() = user_id.
