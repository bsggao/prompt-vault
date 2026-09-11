-- Each user keeps an independent list of favorite prompts.
create table if not exists public.prompt_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, prompt_id)
);

create index if not exists prompt_favorites_prompt_idx
on public.prompt_favorites(prompt_id);

alter table public.prompt_favorites enable row level security;
grant select, insert, delete on public.prompt_favorites to authenticated;

drop policy if exists "Read own favorites" on public.prompt_favorites;
create policy "Read own favorites" on public.prompt_favorites for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Add own favorites" on public.prompt_favorites;
create policy "Add own favorites" on public.prompt_favorites for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.prompts p
    where p.id = prompt_id
      and (p.is_public = true or p.user_id = (select auth.uid()))
  )
);

drop policy if exists "Delete own favorites" on public.prompt_favorites;
create policy "Delete own favorites" on public.prompt_favorites for delete to authenticated
using ((select auth.uid()) = user_id);

-- Preserve the uploader's old favorite selections during migration.
insert into public.prompt_favorites(user_id, prompt_id)
select user_id, id from public.prompts where is_favorite = true
on conflict do nothing;
