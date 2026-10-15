-- BeetleLog Web Push subscription storage (run only after review).
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
create policy "read own subscriptions" on public.push_subscriptions for select to authenticated using (user_id = (select auth.uid()));
create policy "insert own subscriptions" on public.push_subscriptions for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own subscriptions" on public.push_subscriptions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "delete own subscriptions" on public.push_subscriptions for delete to authenticated using (user_id = (select auth.uid()));
-- Note: run this migration exactly once on a fresh schema.
