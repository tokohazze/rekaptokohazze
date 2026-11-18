-- ==========================================================
-- Toko Hazze - skema database Tahap 1
-- Jalankan seluruh isi file ini di Supabase > SQL Editor > New query
-- ==========================================================

-- Tabel produk: aplikasi, varian, dan durasi dengan harga jual
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  app_name    text not null,
  variant     text not null default '',
  duration    text not null,
  sell_price  numeric(14,2) not null default 0,
  is_archived boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Tabel customer
create table if not exists public.customers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text,
  email      text,
  username   text,
  note       text,
  created_at timestamptz not null default now()
);

-- Tabel supplier
create table if not exists public.suppliers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  contact    text,
  platform   text,
  note       text,
  created_at timestamptz not null default now()
);

-- Tabel transaksi (snapshot harga, modal, dan supplier disimpan di sini)
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  transaction_id  text unique not null,
  order_date      date not null default current_date,
  customer_id     uuid references public.customers(id) on delete set null,
  product_id      uuid references public.products(id) on delete set null,
  app_name        text not null,
  variant         text not null default '',
  duration        text not null,
  quantity        integer not null default 1,
  sell_price      numeric(14,2) not null,
  cost_price      numeric(14,2) not null default 0,
  supplier_name   text,
  activation_date date,
  expired_date    date,
  payment_status  text not null default 'Belum Lunas',
  work_status     text not null default 'Menunggu',
  service_status  text not null default 'Aktif',
  note            text,
  created_at      timestamptz not null default now(),
  total_sell      numeric(14,2) generated always as (quantity * sell_price) stored,
  total_cost      numeric(14,2) generated always as (quantity * cost_price) stored
);

-- Tabel pemasukan / pengeluaran manual
create table if not exists public.cash_entries (
  id         uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  kind       text not null check (kind in ('pemasukan','pengeluaran')),
  category   text not null,
  amount     numeric(14,2) not null,
  note       text,
  created_at timestamptz not null default now()
);

-- ==========================================================
-- KEAMANAN: Row Level Security. Hanya pengguna yang sudah login
-- (authenticated) yang boleh membaca dan menulis data.
-- ==========================================================
alter table public.products     enable row level security;
alter table public.customers    enable row level security;
alter table public.suppliers    enable row level security;
alter table public.orders       enable row level security;
alter table public.cash_entries enable row level security;

drop policy if exists "admin_all" on public.products;
create policy "admin_all" on public.products
  for all to authenticated using (true) with check (true);

drop policy if exists "admin_all" on public.customers;
create policy "admin_all" on public.customers
  for all to authenticated using (true) with check (true);

drop policy if exists "admin_all" on public.suppliers;
create policy "admin_all" on public.suppliers
  for all to authenticated using (true) with check (true);

drop policy if exists "admin_all" on public.orders;
create policy "admin_all" on public.orders
  for all to authenticated using (true) with check (true);

drop policy if exists "admin_all" on public.cash_entries;
create policy "admin_all" on public.cash_entries
  for all to authenticated using (true) with check (true);

-- Catatan: pendaftaran publik dimatikan dari dashboard Supabase
-- (Authentication > Sign In / Providers > matikan "Allow new users to sign up").
