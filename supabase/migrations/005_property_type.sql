-- Adds property_type + residence_name to listings.
alter table public.listings
  add column if not exists property_type text default 'apartment',
  add column if not exists residence_name text;

-- Constrain property_type to a known set. Keep in sync with PROPERTY_TYPES in
-- src/lib/constants.ts.
alter table public.listings
  drop constraint if exists listings_property_type_check;
alter table public.listings
  add constraint listings_property_type_check
  check (property_type in (
    'residence', 'apartment', 'house', 'condo',
    'townhouse', 'duplex', 'studio', 'other'
  ));

create index if not exists listings_property_type_idx
  on public.listings(property_type);
create index if not exists listings_residence_name_idx
  on public.listings(residence_name);
