-- ==========================================================
-- Toko Hazze - tabel garansi (jalankan sekali di Supabase > SQL Editor)
-- ==========================================================

-- Setiap garansi dicatat di sini: kapan mulai, kapan selesai, dan berapa hari ditambahkan
create table if not exists public.warranties (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  days_added  integer,
  reason      text,
  created_at  timestamptz not null default now()
);

alter table public.warranties enable row level security;

drop policy if exists "admin_all" on public.warranties;
create policy "admin_all" on public.warranties
  for all to authenticated using (true) with check (true);
