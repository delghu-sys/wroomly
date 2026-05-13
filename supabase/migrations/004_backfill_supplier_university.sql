-- Backfill: any supplier without a university gets University of Michigan.
update public.users
set university = 'University of Michigan'
where user_type = 'supplier'
  and (university is null or btrim(university) = '');
