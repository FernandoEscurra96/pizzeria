-- Ejecutar en el SQL Editor del panel de Supabase (una sola vez).
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer text not null,
  items jsonb not null,              -- [{name, quantity, unitPrice}]
  delivery_fee integer not null default 0,
  total integer not null,
  payment_method text not null,
  delivery_type text not null,
  address text not null default ''
);

create index if not exists orders_created_at_idx on orders (created_at desc);

-- RLS queda activo sin políticas: solo la service_role key (usada en el servidor)
-- puede leer o escribir. El navegador nunca accede a la tabla directamente.
alter table orders enable row level security;
