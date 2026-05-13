-- Residence is now considered a kind of apartment (a named complex). Fold any
-- existing rows back into 'apartment' and tighten the check constraint.
update public.listings
set property_type = 'apartment'
where property_type = 'residence';

alter table public.listings drop constraint if exists listings_property_type_check;
alter table public.listings add constraint listings_property_type_check
  check (property_type in (
    'apartment', 'house', 'condo',
    'townhouse', 'duplex', 'studio', 'other'
  ));
