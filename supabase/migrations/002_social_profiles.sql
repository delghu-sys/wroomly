-- ============================================================
-- MichiganNest — Social Profiles
-- ============================================================
-- Adds: Instagram handle on users + a user_photos gallery table
-- ============================================================

alter table users
  add column if not exists instagram_handle text;

create table if not exists user_photos (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references users(id) on delete cascade,
  storage_path  text not null,
  display_order integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists user_photos_user_id_idx on user_photos(user_id);

alter table user_photos enable row level security;

drop policy if exists "Anyone can view user photos" on user_photos;
create policy "Anyone can view user photos"
  on user_photos for select using (true);

drop policy if exists "Users can insert own photos" on user_photos;
create policy "Users can insert own photos"
  on user_photos for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own photos" on user_photos;
create policy "Users can update own photos"
  on user_photos for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own photos" on user_photos;
create policy "Users can delete own photos"
  on user_photos for delete using (auth.uid() = user_id);
