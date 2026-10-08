-- Run once for an existing CRM project. Keeps all records and access rules.
begin;
alter table public.crm_records drop constraint if exists crm_records_kind_check;
alter table public.crm_records add constraint crm_records_kind_check
  check (kind in ('bookings', 'companies', 'productions', 'venues'));
-- Preserve only legacy sample venues already referenced by bookings.
insert into public.crm_records (kind, id, payload)
select 'venues', legacy.payload->>'id', legacy.payload
from (values
('{"id":1,"name":"The Lantern Theatre","city":"Bristol","contact":"Alex Morgan","email":"alex@example.com","capacity":240,"parking":"Loading bay on Willow Lane; arrange access with the duty manager.","tech":"End-on stage, 8m × 6m. Lighting and sound specification to be confirmed."}'::jsonb),
('{"id":2,"name":"Riverside Arts","city":"Oxford","contact":"Sam Taylor","email":"sam@example.com","capacity":180,"parking":"Two artist spaces behind the venue.","tech":"Black box studio, 6m × 5m; step-free loading."}'::jsonb),
('{"id":3,"name":"Northgate Playhouse","city":"York","contact":"Jamie Reed","email":"jamie@example.com","capacity":320,"parking":"Use the east entrance for unloading.","tech":"Proscenium stage; request current technical pack."}'::jsonb),
('{"id":4,"name":"The Assembly Room","city":"Bath","contact":"Robin Ellis","email":"robin@example.com","capacity":150,"parking":"Public car park nearby; loading by appointment.","tech":"Flexible seating. Portable PA available."}'::jsonb)
) as legacy(payload)
where exists (
  select 1 from public.crm_records booking
  where booking.kind = 'bookings'
    and booking.payload->>'venueId' = legacy.payload->>'id'
)
on conflict (kind, id) do nothing;
commit;
