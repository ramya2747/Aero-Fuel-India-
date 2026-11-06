-- ====================================================================
-- AERO // FUEL INDIA: Migration 01 - Table, Schema Upgrades & Security
-- ====================================================================

-- Step 1: Create base table if it does not already exist
create table if not exists public.fuel_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  local_id text default null,
  date date not null,
  state text not null,
  city text not null,
  vehicle_type text not null,
  fuel_type text not null,
  litres numeric(10,2) not null check (litres > 0),
  price_per_litre numeric(10,2) not null check (price_per_litre > 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  notes text default '',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Step 2: Safe schema migrations in case an older table exists
alter table public.fuel_records add column if not exists local_id text default null;
alter table public.fuel_records add column if not exists notes text default '';
alter table public.fuel_records add column if not exists created_at timestamptz default now();
alter table public.fuel_records add column if not exists updated_at timestamptz default now();

-- Step 3: Integrity check enforcing total_amount equals litres multiplied by price_per_litre
do $$
begin
  if not exists (
    select 1 
    from pg_constraint 
    where conname = 'chk_fuel_records_total_amount_math' 
      and conrelid = 'public.fuel_records'::regclass
  ) then
    alter table public.fuel_records 
      add constraint chk_fuel_records_total_amount_math 
      check (abs(total_amount - (litres * price_per_litre)) < 0.02);
  end if;
end $$;

-- Step 4: Unique constraint scoped strictly to public.fuel_records for idempotent upserts
do $$
begin
  if not exists (
    select 1 
    from pg_constraint 
    where conname = 'uq_fuel_records_user_local_id' 
      and conrelid = 'public.fuel_records'::regclass
  ) then
    alter table public.fuel_records 
      add constraint uq_fuel_records_user_local_id unique (user_id, local_id);
  end if;
end $$;

-- Step 5: Query performance indexes
create index if not exists idx_fuel_records_user_date on public.fuel_records (user_id, date desc);
create index if not exists idx_fuel_records_user_state on public.fuel_records (user_id, state);
create index if not exists idx_fuel_records_user_fuel on public.fuel_records (user_id, fuel_type);

-- Step 6: Automated updated_at trigger function
create or replace function public.handle_fuel_records_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Step 7: Attach updated_at trigger safely
drop trigger if exists trg_fuel_records_updated_at on public.fuel_records;
create trigger trg_fuel_records_updated_at
  before update on public.fuel_records
  for each row execute function public.handle_fuel_records_updated_at();

-- Step 8: Strict privilege revocation and least-privilege granting
revoke all on table public.fuel_records from anon, authenticated, public;
grant select, insert, update, delete on table public.fuel_records to authenticated;

-- Step 9: Enable Row Level Security (RLS)
alter table public.fuel_records enable row level security;

-- Step 10: RLS Policies (Strict user isolation)
drop policy if exists "Users can view own records" on public.fuel_records;
create policy "Users can view own records"
  on public.fuel_records for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own records" on public.fuel_records;
create policy "Users can insert own records"
  on public.fuel_records for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own records" on public.fuel_records;
create policy "Users can update own records"
  on public.fuel_records for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own records" on public.fuel_records;
create policy "Users can delete own records"
  on public.fuel_records for delete
  to authenticated
  using (auth.uid() = user_id);
