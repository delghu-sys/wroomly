-- ============================================================
-- MichiganNest — Initial Schema
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "postgis"; -- for geo queries (optional, enable in Supabase dashboard)

-- ── Enums ──────────────────────────────────────────────────────────────────
create type user_type as enum ('supplier', 'consumer', 'admin');
create type listing_type as enum ('sublet', 'swap');
create type listing_status as enum ('draft', 'pending_review', 'active', 'rented', 'swapped', 'archived');
create type inquiry_status as enum ('pending', 'accepted', 'rejected', 'withdrawn');
create type transaction_type as enum ('deposit', 'first_month', 'monthly', 'refund');
create type transaction_status as enum ('pending', 'succeeded', 'failed', 'refunded');
create type report_target_type as enum ('listing', 'user', 'message');
create type report_status as enum ('open', 'resolved', 'dismissed');
create type admin_target_type as enum ('listing', 'user', 'report', 'transaction');

-- ── Users ─────────────────────────────────────────────────────────────────
create table users (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text unique not null,
  full_name           text,
  university          text,
  user_type           user_type not null,
  avatar_url          text,
  bio                 text,
  phone               text,
  stripe_account_id   text,
  stripe_customer_id  text,
  is_verified         boolean not null default false,
  is_suspended        boolean not null default false,
  created_at          timestamptz not null default now()
);

alter table users enable row level security;

create policy "Users can view all profiles"
  on users for select using (true);

create policy "Users can update own profile"
  on users for update using (auth.uid() = id);

create policy "Service role can insert users"
  on users for insert with check (true);

-- ── Listings ──────────────────────────────────────────────────────────────
create table listings (
  id                  uuid primary key default uuid_generate_v4(),
  supplier_id         uuid not null references users(id) on delete cascade,
  type                listing_type not null,
  title               text not null,
  description         text,
  address             text,
  neighborhood        text,
  lat                 float,
  lng                 float,
  city                text not null default 'Ann Arbor',
  state               text not null default 'MI',
  price_per_month     integer,         -- cents; null for swaps
  deposit_amount      integer,         -- cents
  available_from      date not null,
  available_to        date not null,
  bedrooms            integer,
  bathrooms           numeric(3,1),
  sq_ft               integer,
  furnished           boolean not null default false,
  pets_allowed        boolean not null default false,
  utilities_included  boolean not null default false,
  status              listing_status not null default 'draft',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table listings enable row level security;

create policy "Anyone can view active listings"
  on listings for select using (status = 'active' or supplier_id = auth.uid());

create policy "Suppliers can insert own listings"
  on listings for insert with check (auth.uid() = supplier_id);

create policy "Suppliers can update own listings"
  on listings for update using (auth.uid() = supplier_id);

create policy "Suppliers can delete own draft listings"
  on listings for delete using (auth.uid() = supplier_id and status = 'draft');

-- Trigger: update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger listings_updated_at
  before update on listings
  for each row execute function update_updated_at();

-- ── Listing Images ─────────────────────────────────────────────────────────
create table listing_images (
  id            uuid primary key default uuid_generate_v4(),
  listing_id    uuid not null references listings(id) on delete cascade,
  storage_path  text not null,
  display_order integer not null default 0,
  created_at    timestamptz not null default now()
);

alter table listing_images enable row level security;

create policy "Anyone can view listing images"
  on listing_images for select using (true);

create policy "Suppliers can manage own listing images"
  on listing_images for all using (
    exists (select 1 from listings where id = listing_id and supplier_id = auth.uid())
  );

-- ── Listing Amenities ─────────────────────────────────────────────────────
create table listing_amenities (
  id          uuid primary key default uuid_generate_v4(),
  listing_id  uuid not null references listings(id) on delete cascade,
  amenity     text not null
);

alter table listing_amenities enable row level security;

create policy "Anyone can view amenities"
  on listing_amenities for select using (true);

create policy "Suppliers can manage own listing amenities"
  on listing_amenities for all using (
    exists (select 1 from listings where id = listing_id and supplier_id = auth.uid())
  );

-- ── Swap Preferences ──────────────────────────────────────────────────────
create table swap_preferences (
  id               uuid primary key default uuid_generate_v4(),
  listing_id       uuid not null unique references listings(id) on delete cascade,
  preferred_cities text[] not null default '{}',
  preferred_from   date,
  preferred_to     date,
  notes            text
);

alter table swap_preferences enable row level security;

create policy "Anyone can view swap preferences"
  on swap_preferences for select using (true);

create policy "Suppliers can manage own swap preferences"
  on swap_preferences for all using (
    exists (select 1 from listings where id = listing_id and supplier_id = auth.uid())
  );

-- ── Favorites ─────────────────────────────────────────────────────────────
create table favorites (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references users(id) on delete cascade,
  listing_id  uuid not null references listings(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, listing_id)
);

alter table favorites enable row level security;

create policy "Users can manage own favorites"
  on favorites for all using (auth.uid() = user_id);

-- ── Inquiries ─────────────────────────────────────────────────────────────
create table inquiries (
  id            uuid primary key default uuid_generate_v4(),
  listing_id    uuid not null references listings(id) on delete cascade,
  consumer_id   uuid not null references users(id) on delete cascade,
  message       text not null,
  move_in_date  date,
  move_out_date date,
  status        inquiry_status not null default 'pending',
  created_at    timestamptz not null default now()
);

alter table inquiries enable row level security;

create policy "Consumers can view own inquiries"
  on inquiries for select using (auth.uid() = consumer_id);

create policy "Suppliers can view inquiries on their listings"
  on inquiries for select using (
    exists (select 1 from listings where id = listing_id and supplier_id = auth.uid())
  );

create policy "Consumers can insert inquiries"
  on inquiries for insert with check (auth.uid() = consumer_id);

create policy "Consumers can withdraw own inquiries"
  on inquiries for update using (auth.uid() = consumer_id);

create policy "Suppliers can update inquiry status on own listings"
  on inquiries for update using (
    exists (select 1 from listings where id = listing_id and supplier_id = auth.uid())
  );

-- ── Conversations ─────────────────────────────────────────────────────────
create table conversations (
  id           uuid primary key default uuid_generate_v4(),
  listing_id   uuid not null references listings(id) on delete cascade,
  supplier_id  uuid not null references users(id) on delete cascade,
  consumer_id  uuid not null references users(id) on delete cascade,
  inquiry_id   uuid not null unique references inquiries(id) on delete cascade,
  created_at   timestamptz not null default now()
);

alter table conversations enable row level security;

create policy "Participants can view their conversations"
  on conversations for select using (
    auth.uid() = supplier_id or auth.uid() = consumer_id
  );

create policy "Service role can insert conversations"
  on conversations for insert with check (true);

-- ── Messages ──────────────────────────────────────────────────────────────
create table messages (
  id               uuid primary key default uuid_generate_v4(),
  conversation_id  uuid not null references conversations(id) on delete cascade,
  sender_id        uuid not null references users(id) on delete cascade,
  content          text not null,
  is_read          boolean not null default false,
  created_at       timestamptz not null default now()
);

alter table messages enable row level security;

create policy "Participants can view messages in their conversations"
  on messages for select using (
    exists (
      select 1 from conversations
      where id = conversation_id
      and (supplier_id = auth.uid() or consumer_id = auth.uid())
    )
  );

create policy "Participants can send messages in their conversations"
  on messages for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversations
      where id = conversation_id
      and (supplier_id = auth.uid() or consumer_id = auth.uid())
    )
  );

create policy "Recipients can mark messages as read"
  on messages for update using (
    exists (
      select 1 from conversations
      where id = conversation_id
      and (supplier_id = auth.uid() or consumer_id = auth.uid())
    )
  );

-- ── Transactions ──────────────────────────────────────────────────────────
create table transactions (
  id                        uuid primary key default uuid_generate_v4(),
  listing_id                uuid not null references listings(id),
  payer_id                  uuid not null references users(id),
  payee_id                  uuid not null references users(id),
  type                      transaction_type not null,
  amount_cents              integer not null,
  platform_fee_cents        integer not null,
  stripe_payment_intent_id  text unique,
  stripe_transfer_id        text,
  status                    transaction_status not null default 'pending',
  release_date              date,
  created_at                timestamptz not null default now()
);

alter table transactions enable row level security;

create policy "Users can view own transactions"
  on transactions for select using (
    auth.uid() = payer_id or auth.uid() = payee_id
  );

create policy "Service role can manage transactions"
  on transactions for all using (true);

-- ── Reviews ───────────────────────────────────────────────────────────────
create table reviews (
  id           uuid primary key default uuid_generate_v4(),
  listing_id   uuid not null references listings(id) on delete cascade,
  reviewer_id  uuid not null references users(id) on delete cascade,
  reviewee_id  uuid not null references users(id) on delete cascade,
  rating       integer not null check (rating between 1 and 5),
  comment      text,
  created_at   timestamptz not null default now(),
  unique (listing_id, reviewer_id)
);

alter table reviews enable row level security;

create policy "Anyone can view reviews"
  on reviews for select using (true);

create policy "Users can insert own reviews"
  on reviews for insert with check (auth.uid() = reviewer_id);

-- ── Reports ───────────────────────────────────────────────────────────────
create table reports (
  id           uuid primary key default uuid_generate_v4(),
  reporter_id  uuid not null references users(id) on delete cascade,
  target_type  report_target_type not null,
  target_id    uuid not null,
  reason       text not null,
  status       report_status not null default 'open',
  created_at   timestamptz not null default now()
);

alter table reports enable row level security;

create policy "Users can create reports"
  on reports for insert with check (auth.uid() = reporter_id);

create policy "Admins can view all reports"
  on reports for select using (
    exists (select 1 from users where id = auth.uid() and user_type = 'admin')
  );

create policy "Admins can update reports"
  on reports for update using (
    exists (select 1 from users where id = auth.uid() and user_type = 'admin')
  );

-- ── Admin Actions ─────────────────────────────────────────────────────────
create table admin_actions (
  id           uuid primary key default uuid_generate_v4(),
  admin_id     uuid not null references users(id),
  target_type  admin_target_type not null,
  target_id    uuid not null,
  action       text not null,
  notes        text,
  created_at   timestamptz not null default now()
);

alter table admin_actions enable row level security;

create policy "Admins can manage admin_actions"
  on admin_actions for all using (
    exists (select 1 from users where id = auth.uid() and user_type = 'admin')
  );

-- ── Storage Buckets ───────────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('listing-images', 'listing-images', true);

create policy "Authenticated users can upload listing images"
  on storage.objects for insert with check (
    bucket_id = 'listing-images' and auth.role() = 'authenticated'
  );

create policy "Public can view listing images"
  on storage.objects for select using (bucket_id = 'listing-images');

create policy "Owners can delete own listing images"
  on storage.objects for delete using (
    bucket_id = 'listing-images' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── Indexes ───────────────────────────────────────────────────────────────
create index listings_supplier_id_idx on listings(supplier_id);
create index listings_status_idx on listings(status);
create index listings_type_idx on listings(type);
create index listings_available_from_idx on listings(available_from);
create index listing_images_listing_id_idx on listing_images(listing_id);
create index listing_amenities_listing_id_idx on listing_amenities(listing_id);
create index inquiries_listing_id_idx on inquiries(listing_id);
create index inquiries_consumer_id_idx on inquiries(consumer_id);
create index conversations_supplier_id_idx on conversations(supplier_id);
create index conversations_consumer_id_idx on conversations(consumer_id);
create index messages_conversation_id_idx on messages(conversation_id);
create index messages_created_at_idx on messages(created_at);
create index transactions_payer_id_idx on transactions(payer_id);
create index transactions_payee_id_idx on transactions(payee_id);
