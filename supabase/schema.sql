-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.

-- One row per pilgrim. `data` holds the whole pilgrim record as JSON.
create table if not exists pilgrims (
  id text primary key,
  token text not null unique,
  data jsonb not null,
  created_at timestamptz not null default now()
);

-- Two pilgrims can never hold the same registration slot, even if they book at the same instant.
create unique index if not exists pilgrims_slot_unique
  on pilgrims ((data->>'slot'))
  where data->>'slot' is not null;

-- Only our server (using the service_role / secret key) may touch the table.
alter table pilgrims enable row level security;

-- Private bucket for the uploaded document photos.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;
