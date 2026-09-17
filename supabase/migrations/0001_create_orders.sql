-- Orders table for Shopify/Amazon/Flipkart order management
create extension if not exists "pgcrypto";

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  date timestamptz not null,
  channel text not null check (channel in ('Shopify', 'Amazon', 'Flipkart')),
  product_name text not null,
  state text,
  pincode text,
  shipping_through text,
  tracking_number text,
  product_cost numeric(12,2) not null default 0,
  selling_price numeric(12,2) not null default 0,
  shipping_cost numeric(12,2),
  packing_dimension text,
  packing_weight text,
  profit numeric(12,2) generated always as
    (selling_price - product_cost - coalesce(shipping_cost, 0)) stored,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_date_idx on orders (date);
create index if not exists orders_order_no_idx on orders (order_no);
create index if not exists orders_deleted_at_idx on orders (deleted_at);

-- Keep updated_at current on every row change
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at
  before update on orders
  for each row
  execute function set_updated_at();

alter table orders enable row level security;

-- Service role (server-side API routes) has full access.
create policy "Service role full access" on orders
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
