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

-- Directorio de clientes: nombre, dirección y delivery por defecto, editable después.
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null default '',
  delivery_fee integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Evita duplicados por mayúsculas/minúsculas ("Vene" y "vene" son el mismo cliente).
create unique index if not exists customers_name_lower_idx on customers (lower(name));

alter table customers enable row level security;
