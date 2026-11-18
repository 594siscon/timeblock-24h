-- ============================================================
-- 時光方塊 · 24H 時間管理 App — Supabase 雲端即時同步建表腳本
-- 使用方式：複製全部內容 → 貼到 Supabase SQL Editor → 按 Run
-- ============================================================

-- 1. 建立使用者排程資料表（每位登入使用者一筆 JSONB 狀態）
create table if not exists public.user_schedules (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  client_id text,
  updated_at timestamptz not null default now()
);

-- 2. 啟用列層級安全性（RLS），確保每人只能讀寫自己的資料
alter table public.user_schedules enable row level security;

drop policy if exists "Users can read own schedule" on public.user_schedules;
create policy "Users can read own schedule"
  on public.user_schedules
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own schedule" on public.user_schedules;
create policy "Users can insert own schedule"
  on public.user_schedules
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own schedule" on public.user_schedules;
create policy "Users can update own schedule"
  on public.user_schedules
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. 啟用 Realtime 即時推播（電腦一修改，iPhone 立刻同步更新）
alter table public.user_schedules replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_schedules'
  ) then
    alter publication supabase_realtime add table public.user_schedules;
  end if;
end $$;
