-- ═══════════════════════════════════════════════════════════════════
-- Little Moments — core schema
-- Run in Supabase: Dashboard → SQL Editor → paste & run (or `supabase db push`).
-- Safe to re-run: every object uses IF NOT EXISTS / CREATE OR REPLACE.
-- ═══════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

-- ───────────────────────── Helpers ─────────────────────────

-- 22-char URL-safe slug from 122 random bits (unguessable share links).
create or replace function public.gen_share_slug() returns text
language sql volatile set search_path = public as $$
  select translate(rtrim(encode(uuid_send(gen_random_uuid()), 'base64'), '='), '+/', 'Kq');
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ───────────────────────── Reference data ─────────────────────────

create table if not exists public.occasions (
  slug text primary key,
  name text not null,
  tagline text not null default '',
  grp text not null default 'everyday',
  sort_order int not null default 0
);

create table if not exists public.templates (
  slug text primary key,
  title text not null,
  format text not null,
  style text not null,
  occasions text[] not null default '{}',
  relationships text[] not null default '{}',
  is_premium boolean not null default false,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Users ─────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 80),
  phone text check (phone is null or phone ~ '^\+?[0-9 ()-]{7,20}$'),
  language text not null default 'en' check (language in ('en', 'hi', 'mr', 'bn', 'ta', 'te', 'gu', 'kn', 'ml', 'pa')),
  terms_accepted_at timestamptz,
  marketing_consent boolean not null default false,
  consent_timestamp timestamptz,
  account_status text not null default 'active' check (account_status in ('active', 'deletion_requested', 'deleted')),
  referral_source text check (char_length(referral_source) <= 80),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Consent audit is append-only and intentionally has no FK, so the legal
-- record survives account deletion (see Privacy Policy → retention).
create table if not exists public.consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  consent_type text not null check (consent_type in ('terms', 'privacy', 'marketing')),
  consent_status text not null check (consent_status in ('granted', 'withdrawn')),
  policy_version text not null,
  source text not null,
  created_at timestamptz not null default now()
);
create index if not exists consent_events_user_idx on public.consent_events (user_id);

-- ───────────────────────── Gifts ─────────────────────────

create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  slug text not null unique default public.gen_share_slug(),
  format text not null,
  template_slug text references public.templates (slug) on delete set null,
  occasion_slug text references public.occasions (slug) on delete set null,
  recipient_name text not null default '' check (char_length(recipient_name) <= 60),
  relationship text check (char_length(relationship) <= 40),
  config jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  sharing_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint gifts_config_is_object check (jsonb_typeof(config) = 'object'),
  constraint gifts_config_size check (octet_length(config::text) <= 200000),
  constraint gifts_config_format check (config ->> 'format' = format)
);
create index if not exists gifts_owner_idx on public.gifts (owner_id, updated_at desc);

create or replace function public.gifts_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  recent int;
begin
  if tg_op = 'INSERT' then
    -- Rate limit: max 30 new gifts per user per 10 minutes.
    select count(*) into recent from public.gifts
      where owner_id = new.owner_id and created_at > now() - interval '10 minutes';
    if recent >= 30 then
      raise exception 'rate_limited: too many gifts created, please wait a few minutes' using errcode = 'P0001';
    end if;
  else
    -- Immutable fields.
    new.id := old.id;
    new.owner_id := old.owner_id;
    new.slug := old.slug;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  if new.status = 'published' and (tg_op = 'INSERT' or old.published_at is null) then
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end $$;

drop trigger if exists gifts_before_write on public.gifts;
create trigger gifts_before_write before insert or update on public.gifts
  for each row execute function public.gifts_before_write();

create table if not exists public.gift_media (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid not null references public.gifts (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) <= 200),
  file_type text not null check (file_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size int not null check (file_size > 0 and file_size <= 5242880),
  created_at timestamptz not null default now()
);
create index if not exists gift_media_gift_idx on public.gift_media (gift_id);

create or replace function public.gift_media_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  if not exists (select 1 from public.gifts g where g.id = new.gift_id and g.owner_id = new.owner_id) then
    raise exception 'forbidden: gift does not belong to uploader' using errcode = '42501';
  end if;
  select count(*) into n from public.gift_media where gift_id = new.gift_id;
  if n >= 3 then
    raise exception 'limit_reached: free gifts can have up to 3 photos' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists gift_media_limit on public.gift_media;
create trigger gift_media_limit before insert on public.gift_media
  for each row execute function public.gift_media_limit();

-- ───────────────────────── Contact / feedback ─────────────────────────

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 80),
  email text not null check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  category text not null check (category in ('question', 'feedback', 'bug', 'privacy', 'other')),
  message text not null check (char_length(message) between 5 and 2000),
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved')),
  created_at timestamptz not null default now()
);

-- ───────────────────────── Payments (Phase 4, schema only) ─────────────────────────

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null,
  gift_id uuid references public.gifts (id) on delete set null,
  amount_paise int not null check (amount_paise >= 0),
  currency text not null default 'INR',
  payment_provider text not null default 'razorpay',
  provider_order_id text unique,
  transaction_reference text,
  payment_status text not null default 'created' check (payment_status in ('created', 'paid', 'failed', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null,
  gift_id uuid references public.gifts (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  granted_at timestamptz not null default now()
);

-- ───────────────────────── Google Sheets outbox ─────────────────────────
-- Every reportable change writes a row here IN THE SAME TRANSACTION as the
-- change itself (transactional outbox). The sync worker drains it.

create table if not exists public.sync_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  entity_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'synced', 'failed', 'dead')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  synced_at timestamptz
);
create index if not exists sync_events_due_idx on public.sync_events (status, next_attempt_at);

create or replace function public.enqueue_sync(p_type text, p_key text, p_payload jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.sync_events (event_type, entity_key, payload) values (p_type, p_key, coalesce(p_payload, '{}'::jsonb));
$$;
revoke all on function public.enqueue_sync(text, text, jsonb) from public, anon, authenticated;

-- Worker claims a batch atomically. Guarantees:
--  • claims are serialised (transaction-scoped advisory lock), so two workers never get the same row;
--  • at most ONE in-flight event per entity_key, processed in creation order (per-key FIFO),
--    so concurrent workers can never append the same spreadsheet row twice;
--  • stale locks from a crashed worker are reclaimed after 5 minutes.
create or replace function public.claim_sync_events(p_limit int default 25)
returns setof public.sync_events language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(7212021);
  return query
  with due as (
    select distinct on (e.entity_key) e.id, e.created_at
    from public.sync_events e
    where ((e.status in ('pending', 'failed') and e.next_attempt_at <= now())
           or (e.status = 'processing' and e.locked_at < now() - interval '5 minutes'))
      and not exists (
        select 1 from public.sync_events p
        where p.entity_key = e.entity_key and p.id <> e.id
          and ((p.status = 'processing' and p.locked_at >= now() - interval '5 minutes')
               or (p.status in ('pending', 'failed') and p.created_at < e.created_at)))
    order by e.entity_key, e.created_at
  ), pick as (
    select id from due order by created_at limit greatest(1, least(p_limit, 100))
  )
  update public.sync_events s set status = 'processing', locked_at = now(), attempts = s.attempts + 1
  where s.id in (select id from pick)
  returning s.*;
end $$;
revoke all on function public.claim_sync_events(int) from public, anon, authenticated;

-- ───────────────────────── Outbox triggers ─────────────────────────

-- New auth user → profile + consent audit + Users row.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  marketing boolean := coalesce((meta ->> 'marketing_consent')::boolean, false);
  terms boolean := coalesce((meta ->> 'terms_accepted')::boolean, false);
  pv text := coalesce(meta ->> 'policy_version', 'unknown');
  phone_in text := nullif(trim(meta ->> 'phone'), '');
begin
  insert into public.profiles (id, full_name, phone, referral_source, terms_accepted_at, marketing_consent, consent_timestamp)
  values (
    new.id,
    nullif(left(trim(coalesce(meta ->> 'full_name', meta ->> 'name', '')), 80), ''),
    case when phone_in ~ '^\+?[0-9 ()-]{7,20}$' then phone_in else null end,
    nullif(left(trim(coalesce(meta ->> 'referral_source', '')), 80), ''),
    case when terms then now() end,
    marketing,
    now()
  )
  on conflict (id) do nothing;

  if terms then
    insert into public.consent_events (user_id, consent_type, consent_status, policy_version, source)
    values (new.id, 'terms', 'granted', pv, 'signup');
  end if;
  insert into public.consent_events (user_id, consent_type, consent_status, policy_version, source)
  values (new.id, 'marketing', case when marketing then 'granted' else 'withdrawn' end, pv, 'signup');

  -- Consent rows enqueue themselves via their own trigger. Enqueue the Users row
  -- AFTER them so reporting order mirrors reality.
  perform public.enqueue_sync('user.upsert', new.id::text, jsonb_build_object('reason', 'signup'));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Email verification / provider changes → refresh the Users row.
create or replace function public.handle_user_updated() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is distinct from old.email_confirmed_at or new.email is distinct from old.email then
    perform public.enqueue_sync('user.upsert', new.id::text, jsonb_build_object('reason', 'auth_update'));
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated after update on auth.users
  for each row execute function public.handle_user_updated();

-- Profile edits → Users row + a minimised User_Submissions record of WHICH fields changed.
create or replace function public.handle_profile_updated() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  changed jsonb := '{}'::jsonb;
begin
  if new.full_name is distinct from old.full_name then changed := changed || jsonb_build_object('full_name', 'updated'); end if;
  if new.phone is distinct from old.phone then changed := changed || jsonb_build_object('phone', case when new.phone is null then 'removed' else 'updated' end); end if;
  if new.language is distinct from old.language then changed := changed || jsonb_build_object('language', new.language); end if;
  if new.marketing_consent is distinct from old.marketing_consent then
    changed := changed || jsonb_build_object('marketing_consent', new.marketing_consent);
    insert into public.consent_events (user_id, consent_type, consent_status, policy_version, source)
    values (new.id, 'marketing', case when new.marketing_consent then 'granted' else 'withdrawn' end,
            coalesce(current_setting('app.policy_version', true), 'current'), 'account_settings');
  end if;
  if new.account_status is distinct from old.account_status then changed := changed || jsonb_build_object('account_status', new.account_status); end if;

  if changed <> '{}'::jsonb then
    perform public.enqueue_sync('user.upsert', new.id::text, jsonb_build_object('reason', 'profile_update'));
    perform public.enqueue_sync('submission.created', gen_random_uuid()::text, jsonb_build_object(
      'user_id', new.id, 'submission_type', 'profile_update', 'form_name', 'account_settings',
      'submitted_data', changed, 'submitted_at', now()));
  end if;
  return new;
end $$;

drop trigger if exists on_profile_updated on public.profiles;
create trigger on_profile_updated after update on public.profiles
  for each row execute function public.handle_profile_updated();

create or replace function public.handle_consent_event() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.enqueue_sync('consent.created', new.id::text, to_jsonb(new));
  return new;
end $$;

drop trigger if exists on_consent_event on public.consent_events;
create trigger on_consent_event after insert on public.consent_events
  for each row execute function public.handle_consent_event();

-- Gifts: one upsert event per meaningful change (autosaves that only touch
-- config are coalesced: a pending upsert for the same gift is reused).
create or replace function public.handle_gift_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform public.enqueue_sync('gift.deleted', old.id::text, jsonb_build_object('user_id', old.owner_id));
    return old;
  end if;
  if tg_op = 'UPDATE' and new.status = old.status and new.sharing_enabled = old.sharing_enabled
     and exists (select 1 from public.sync_events where event_type = 'gift.upsert' and entity_key = new.id::text and status = 'pending') then
    return new; -- already queued; worker reads the latest row anyway
  end if;
  perform public.enqueue_sync('gift.upsert', new.id::text, jsonb_build_object('op', lower(tg_op)));
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    perform public.enqueue_sync('submission.created', gen_random_uuid()::text, jsonb_build_object(
      'user_id', new.owner_id, 'submission_type', case when new.status = 'published' then 'gift_published' else 'gift_created' end,
      'form_name', 'gift_editor', 'submitted_data', jsonb_build_object('gift_id', new.id, 'format', new.format, 'template', new.template_slug),
      'submitted_at', now()));
  end if;
  return new;
end $$;

drop trigger if exists on_gift_change on public.gifts;
create trigger on_gift_change after insert or update or delete on public.gifts
  for each row execute function public.handle_gift_change();

create or replace function public.handle_media_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.enqueue_sync('media.created', new.id::text, jsonb_build_object(
    'media_id', new.id, 'user_id', new.owner_id, 'gift_id', new.gift_id, 'file_name', new.file_name,
    'file_type', new.file_type, 'file_size', new.file_size, 'storage_reference', 'gift-media:' || new.id::text,
    'upload_timestamp', new.created_at));
  return new;
end $$;

drop trigger if exists on_media_created on public.gift_media;
create trigger on_media_created after insert on public.gift_media
  for each row execute function public.handle_media_created();

create or replace function public.handle_contact_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.enqueue_sync('contact.created', new.id::text, '{}'::jsonb);
  perform public.enqueue_sync('submission.created', 'contact-' || new.id::text, jsonb_build_object(
    'user_id', new.user_id, 'submission_type', 'contact', 'form_name', 'contact_form',
    'submitted_data', jsonb_build_object('category', new.category, 'contact_submission_id', new.id),
    'submitted_at', new.created_at));
  return new;
end $$;

drop trigger if exists on_contact_created on public.contact_submissions;
create trigger on_contact_created after insert on public.contact_submissions
  for each row execute function public.handle_contact_created();

create or replace function public.handle_order_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.enqueue_sync('order.upsert', new.id::text, '{}'::jsonb);
  return new;
end $$;

drop trigger if exists on_order_change on public.orders;
create trigger on_order_change after insert or update on public.orders
  for each row execute function public.handle_order_change();

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- ───────────────────────── Public gift lookup ─────────────────────────
-- The ONLY way anonymous visitors can read a gift: published + sharing on.
create or replace function public.get_published_gift(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', g.id,
    'slug', g.slug,
    'config', g.config,
    'published_at', g.published_at,
    'media', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'path', m.storage_path) order by m.created_at)
                       from public.gift_media m where m.gift_id = g.id), '[]'::jsonb)
  )
  from public.gifts g
  where g.slug = p_slug and g.status = 'published' and g.sharing_enabled
  limit 1;
$$;
revoke all on function public.get_published_gift(text) from public;
grant execute on function public.get_published_gift(text) to anon, authenticated, service_role;

-- ───────────────────────── Row-level security ─────────────────────────

alter table public.occasions enable row level security;
alter table public.templates enable row level security;
alter table public.profiles enable row level security;
alter table public.consent_events enable row level security;
alter table public.gifts enable row level security;
alter table public.gift_media enable row level security;
alter table public.contact_submissions enable row level security;
alter table public.orders enable row level security;
alter table public.entitlements enable row level security;
alter table public.sync_events enable row level security;

drop policy if exists "occasions are public" on public.occasions;
create policy "occasions are public" on public.occasions for select to anon, authenticated using (true);
drop policy if exists "templates are public" on public.templates;
create policy "templates are public" on public.templates for select to anon, authenticated using (true);

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "read own consent" on public.consent_events;
create policy "read own consent" on public.consent_events for select to authenticated using (user_id = auth.uid());

drop policy if exists "owner reads gifts" on public.gifts;
create policy "owner reads gifts" on public.gifts for select to authenticated using (owner_id = auth.uid());
drop policy if exists "owner creates gifts" on public.gifts;
create policy "owner creates gifts" on public.gifts for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "owner updates gifts" on public.gifts;
create policy "owner updates gifts" on public.gifts for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner deletes gifts" on public.gifts;
create policy "owner deletes gifts" on public.gifts for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "owner reads media" on public.gift_media;
create policy "owner reads media" on public.gift_media for select to authenticated using (owner_id = auth.uid());
drop policy if exists "owner deletes media" on public.gift_media;
create policy "owner deletes media" on public.gift_media for delete to authenticated using (owner_id = auth.uid());
-- Inserts happen only through the validated upload API (service role).

drop policy if exists "read own orders" on public.orders;
create policy "read own orders" on public.orders for select to authenticated using (user_id = auth.uid());
drop policy if exists "read own entitlements" on public.entitlements;
create policy "read own entitlements" on public.entitlements for select to authenticated using (user_id = auth.uid());
-- contact_submissions, sync_events: no policies → only the service role can touch them.

-- Column-level privileges: users may only edit safe profile fields.
revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone, language, marketing_consent, referral_source) on public.profiles to authenticated;
revoke insert, delete on public.profiles from authenticated, anon;
revoke update on public.gifts from authenticated, anon;
grant update (format, template_slug, occasion_slug, recipient_name, relationship, config, status, sharing_enabled) on public.gifts to authenticated;
revoke all on public.sync_events from anon, authenticated;
revoke all on public.contact_submissions from anon, authenticated;

-- ───────────────────────── Storage ─────────────────────────
-- Private bucket; Supabase enforces size + MIME server-side as a second line of defence.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gift-media', 'gift-media', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Objects live at <owner_id>/<gift_id>/<random>.<ext>. Owners may read/delete their own;
-- uploads go through the API (service role). Recipients get short-lived signed URLs only.
drop policy if exists "owner reads own media objects" on storage.objects;
create policy "owner reads own media objects" on storage.objects for select to authenticated
  using (bucket_id = 'gift-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "owner deletes own media objects" on storage.objects;
create policy "owner deletes own media objects" on storage.objects for delete to authenticated
  using (bucket_id = 'gift-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ───────────────────────── Admin metrics ─────────────────────────
create or replace function public.admin_metrics()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'users', (select count(*) from public.profiles where account_status <> 'deleted'),
    'signups_by_day', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'count', c) order by d)
       from (select date_trunc('day', created_at)::date d, count(*) c from public.profiles
             where created_at > now() - interval '30 days' group by 1) s), '[]'::jsonb),
    'gifts', (select count(*) from public.gifts),
    'published', (select count(*) from public.gifts where status = 'published'),
    'contacts', (select count(*) from public.contact_submissions),
    'contacts_by_status', coalesce((select jsonb_object_agg(status, c) from (select status, count(*) c from public.contact_submissions group by 1) s), '{}'::jsonb),
    'sync', coalesce((select jsonb_object_agg(status, c) from (select status, count(*) c from public.sync_events group by 1) s), '{}'::jsonb)
  );
$$;
revoke all on function public.admin_metrics() from public, anon, authenticated;
