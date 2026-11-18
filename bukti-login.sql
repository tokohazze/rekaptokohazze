-- ==========================================================
-- Toko Hazze - bukti login dan penanda garansi aktif
-- Jalankan sekali di Supabase > SQL Editor > New query
-- ==========================================================

-- Kolom baru di tabel orders
alter table public.orders add column if not exists garansi_aktif boolean not null default false;
alter table public.orders add column if not exists bukti_login_path text;

-- Tempat penyimpanan file bukti login (bucket privat, hanya admin yang login)
insert into storage.buckets (id, name, public)
values ('bukti-login', 'bukti-login', false)
on conflict (id) do nothing;

drop policy if exists "admin_bukti_login" on storage.objects;
create policy "admin_bukti_login" on storage.objects
  for all to authenticated
  using (bucket_id = 'bukti-login')
  with check (bucket_id = 'bukti-login');
