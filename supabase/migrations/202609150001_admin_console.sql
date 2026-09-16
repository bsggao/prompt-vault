-- Admin console. Apply after all earlier PromptVault migrations.
begin;

create table public.console_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.console_user_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  suspended boolean not null default false,
  reason text not null default '',
  updated_at timestamptz not null default now()
);
create table public.console_settings (
  project_id text primary key check (project_id = 'prompt-vault'),
  site_title text not null check (char_length(site_title) between 1 and 60),
  description text not null default '' check (char_length(description) <= 500),
  site_url text not null default '' check (site_url = '' or site_url ~ '^https?://'),
  updated_at timestamptz not null default now()
);
insert into public.console_settings(project_id, site_title, description)
values ('prompt-vault', 'PromptVault', '收藏 AI 图片及其 Prompt 的灵感库');
create table public.console_audit_logs (
  id bigint generated always as identity primary key,
  project_id text not null default 'prompt-vault',
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text not null,
  action text not null,
  target_id text not null,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index console_audit_created on public.console_audit_logs(created_at desc);
alter table public.console_admins enable row level security;
alter table public.console_user_status enable row level security;
alter table public.console_settings enable row level security;
alter table public.console_audit_logs enable row level security;
revoke all on public.console_admins, public.console_user_status, public.console_audit_logs from anon, authenticated;
revoke all on public.console_settings from anon, authenticated;
grant select on public.console_settings to anon, authenticated;
create policy "Read public project branding" on public.console_settings for select using (true);

create function public.console_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.console_admins where user_id = auth.uid()
  );
$$;
create function public.console_can_write() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and not exists (
    select 1 from public.console_user_status where user_id = auth.uid() and suspended
  );
$$;
create function public.console_assert_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.console_is_admin() then
    raise exception '此账号尚未获得后台管理员权限' using errcode = '42501';
  end if;
end;
$$;
create function public.console_log(p_action text, p_target text, p_detail jsonb default '{}') returns void
language sql security definer set search_path = '' as $$
  insert into public.console_audit_logs(actor_id, actor_email, action, target_id, detail)
  select auth.uid(), coalesce(u.email, ''), p_action, p_target, p_detail
  from auth.users u where u.id = auth.uid();
$$;

alter table public.prompts add column moderation_status text not null default 'normal'
  check (moderation_status in ('normal', 'removed'));
alter table public.prompts add column moderation_reason text not null default ''
  check (char_length(moderation_reason) <= 500);

-- Prevent owners from overriding moderation via direct REST requests.
create function public.console_guard_prompt() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if public.console_is_admin() then
      perform public.console_log('prompt.delete', old.id::text, jsonb_build_object('title', old.title));
    end if;
    return old;
  end if;
  if not public.console_is_admin() then
    if tg_op = 'INSERT' and (new.moderation_status <> 'normal' or new.moderation_reason <> '') then
      raise exception '无权设置管理状态' using errcode = '42501';
    elsif tg_op = 'UPDATE' and (new.moderation_status is distinct from old.moderation_status
      or new.moderation_reason is distinct from old.moderation_reason) then
      raise exception '无权修改管理状态' using errcode = '42501';
    end if;
  else
    perform public.console_log(case when tg_op = 'INSERT' then 'prompt.create'
      when new.moderation_status is distinct from old.moderation_status then 'prompt.moderate'
      else 'prompt.update' end, new.id::text,
      jsonb_build_object('title', new.title, 'status', new.moderation_status, 'reason', new.moderation_reason));
  end if;
  return new;
end;
$$;
create trigger console_prompt_guard before insert or update or delete on public.prompts
for each row execute function public.console_guard_prompt();

drop policy "Read own or public prompts" on public.prompts;
create policy "Read own or public prompts" on public.prompts for select
using (user_id = auth.uid() or (is_public and moderation_status = 'normal'));
create policy "Admins read public prompts" on public.prompts for select to authenticated
using (is_public and public.console_is_admin());
-- Restrictive policies are ANDed with existing ownership policies.
create policy "Active users insert prompts" on public.prompts as restrictive for insert to authenticated
with check (public.console_can_write());
create policy "Active users update prompts" on public.prompts as restrictive for update to authenticated
using (public.console_can_write()) with check (public.console_can_write());
create policy "Active users delete prompts" on public.prompts as restrictive for delete to authenticated
using (public.console_can_write());
create policy "Active users favorite" on public.prompt_favorites as restrictive for insert to authenticated
with check (public.console_can_write());
create policy "Active users unfavorite" on public.prompt_favorites as restrictive for delete to authenticated
using (public.console_can_write());
create policy "Active users upload images" on storage.objects as restrictive for insert to authenticated
with check (bucket_id <> 'prompt-images' or public.console_can_write());
create policy "Active users delete images" on storage.objects as restrictive for delete to authenticated
using (bucket_id <> 'prompt-images' or public.console_can_write());
drop policy "Read images of public prompts" on storage.objects;
create policy "Read images of public prompts" on storage.objects for select to anon, authenticated
using (bucket_id = 'prompt-images' and exists (
  select 1 from public.prompts p where p.image_url = name and p.is_public and p.moderation_status = 'normal'
));
-- Admins can preview public (including removed) images, never arbitrary private images.
create policy "Admin preview public images" on storage.objects for select to authenticated
using (bucket_id = 'prompt-images' and public.console_is_admin() and exists (
  select 1 from public.prompts p where p.image_url = name and p.is_public
));

create function public.console_me() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.console_assert_admin();
  return (select jsonb_build_object('userId', id, 'userName', email,
    'roles', jsonb_build_array('R_SUPER'), 'buttons', '[]'::jsonb) from auth.users where id = auth.uid());
end;
$$;

create function public.console_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.console_assert_admin();
  return jsonb_build_object(
    'users', (select count(*) from auth.users),
    'newUsers', (select count(*) from auth.users where created_at >= current_date),
    'prompts', (select count(*) from public.prompts),
    'publicPrompts', (select count(*) from public.prompts where is_public and moderation_status = 'normal'),
    'privatePrompts', (select count(*) from public.prompts where not is_public),
    'removedPrompts', (select count(*) from public.prompts where moderation_status = 'removed'),
    'favorites', (select count(*) from public.prompt_favorites),
    'trend', (select jsonb_agg(jsonb_build_object('date', d::date, 'count',
      (select count(*) from public.prompts p where p.created_at >= d and p.created_at < d + interval '1 day')) order by d)
      from generate_series(current_date - 13, current_date, interval '1 day') d),
    'categories', (select coalesce(jsonb_agg(t), '[]') from (
      select category as name, count(*) as count from public.prompts group by category order by count(*) desc limit 8
    ) t));
end;
$$;

create function public.console_prompts(p_query text default '', p_visibility text default '',
  p_status text default '', p_category text default '', p_model text default '',
  p_owner uuid default null, p_page integer default 1, p_size integer default 20) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  perform public.console_assert_admin();
  if p_page < 1 or p_size < 1 or p_size > 100 then raise exception '无效分页'; end if;
  with filtered as (
    select p.*, u.email as owner_email,
      (select count(*) from public.prompt_favorites f where f.prompt_id = p.id) as favorite_count
    from public.prompts p left join auth.users u on u.id = p.user_id
    where (p_query = '' or ((p.is_public or p.user_id = auth.uid()) and p.title ilike '%' || p_query || '%')
      or u.email ilike '%' || p_query || '%')
      and (p_visibility = '' or p.is_public = (p_visibility = 'public'))
      and (p_status = '' or p.moderation_status = p_status)
      and (p_category = '' or p.category = p_category)
      and (p_model = '' or p.model = p_model)
      and (p_owner is null or p.user_id = p_owner)
  ), page as (
    select id, user_id, owner_email,
      case when is_public or user_id = auth.uid() then title else '私有提示词' end as title,
      case when is_public or user_id = auth.uid() then image_url else null end as image_url,
      category, model, is_public, moderation_status, moderation_reason, favorite_count, created_at, updated_at
    from filtered order by created_at desc, id limit p_size offset (p_page - 1) * p_size
  ) select jsonb_build_object('total', (select count(*) from filtered),
    'items', coalesce((select jsonb_agg(page) from page), '[]')) into result;
  return result;
end;
$$;

create function public.console_prompt_detail(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  perform public.console_assert_admin();
  select to_jsonb(p) into result from public.prompts p
    where id = p_id and (is_public or user_id = auth.uid());
  if result is null then raise exception '内容不存在或为其他用户的私有内容' using errcode = '42501'; end if;
  return result;
end;
$$;

create function public.console_moderate(p_id uuid, p_status text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.console_assert_admin();
  if p_status not in ('normal', 'removed') or p_status is null or p_reason is null
    or char_length(p_reason) > 500 or (p_status = 'removed' and char_length(trim(p_reason)) < 2) then
    raise exception '下架需填写 2–500 字处理原因';
  end if;
  update public.prompts set moderation_status = p_status, moderation_reason = p_reason where id = p_id and is_public;
  if not found then raise exception '只能处理公开内容'; end if;
end;
$$;

create function public.console_users(p_query text default '', p_status text default '',
  p_page integer default 1, p_size integer default 20) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.console_assert_admin();
  if p_page < 1 or p_size < 1 or p_size > 100 then raise exception '无效分页'; end if;
  return (with filtered as (
    select u.id, u.email, u.created_at, u.email_confirmed_at, u.last_sign_in_at,
      coalesce(s.suspended, false) as suspended, coalesce(s.reason, '') as reason,
      exists (select 1 from public.console_admins a where a.user_id = u.id) as is_admin,
      (select count(*) from public.prompts p where p.user_id = u.id) as prompt_count,
      (select count(*) from public.prompt_favorites f where f.user_id = u.id) as favorite_count
    from auth.users u left join public.console_user_status s on s.user_id = u.id
    where (p_query = '' or u.email ilike '%' || p_query || '%')
      and (p_status = '' or coalesce(s.suspended, false) = (p_status = 'suspended'))
  ), page as (select * from filtered order by created_at desc, id limit p_size offset (p_page - 1) * p_size)
  select jsonb_build_object('total', (select count(*) from filtered), 'items', coalesce((select jsonb_agg(page) from page), '[]')));
end;
$$;

create function public.console_suspend(p_id uuid, p_suspended boolean, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.console_assert_admin();
  if exists (select 1 from public.console_admins where user_id = p_id) then raise exception '不能禁用管理员'; end if;
  if p_suspended is null or p_reason is null or char_length(p_reason) > 500
    or (p_suspended and char_length(trim(p_reason)) < 2) then raise exception '请填写 2–500 字原因'; end if;
  insert into public.console_user_status(user_id, suspended, reason) values (p_id, p_suspended, p_reason)
    on conflict(user_id) do update set suspended = excluded.suspended, reason = excluded.reason, updated_at = now();
  perform public.console_log('user.status', p_id::text, jsonb_build_object('suspended', p_suspended, 'reason', p_reason));
end;
$$;

create function public.console_save_settings(p_title text, p_description text, p_url text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.console_assert_admin();
  update public.console_settings set site_title = trim(p_title), description = p_description,
    site_url = p_url, updated_at = now() where project_id = 'prompt-vault';
  perform public.console_log('settings.update', 'prompt-vault', jsonb_build_object('site_title', p_title));
end;
$$;

create function public.console_logs(p_query text default '', p_page integer default 1, p_size integer default 20) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.console_assert_admin();
  if p_page < 1 or p_size < 1 or p_size > 100 then raise exception '无效分页'; end if;
  return (with filtered as (select * from public.console_audit_logs
    where p_query = '' or actor_email ilike '%' || p_query || '%' or target_id ilike '%' || p_query || '%'
      or action ilike '%' || p_query || '%'),
    page as (select * from filtered order by created_at desc, id desc limit p_size offset (p_page - 1) * p_size)
    select jsonb_build_object('total', (select count(*) from filtered), 'items', coalesce((select jsonb_agg(page) from page), '[]')));
end;
$$;

-- Lock down every new function, including non-RPC helpers.
revoke all on function public.console_is_admin(), public.console_can_write(), public.console_assert_admin(),
  public.console_log(text,text,jsonb), public.console_guard_prompt(), public.console_me(), public.console_overview(),
  public.console_prompts(text,text,text,text,text,uuid,integer,integer), public.console_prompt_detail(uuid),
  public.console_moderate(uuid,text,text), public.console_users(text,text,integer,integer),
  public.console_suspend(uuid,boolean,text), public.console_save_settings(text,text,text), public.console_logs(text,integer,integer)
  from public, anon, authenticated;
grant execute on function public.console_is_admin(), public.console_can_write(), public.console_me(), public.console_overview(),
  public.console_prompts(text,text,text,text,text,uuid,integer,integer), public.console_prompt_detail(uuid),
  public.console_moderate(uuid,text,text), public.console_users(text,text,integer,integer),
  public.console_suspend(uuid,boolean,text), public.console_save_settings(text,text,text), public.console_logs(text,integer,integer)
  to authenticated;
commit;
