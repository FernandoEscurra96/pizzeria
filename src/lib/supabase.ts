// ============================================================================
// CLIENTE DE SUPABASE (solo servidor)
// ----------------------------------------------------------------------------
// Este archivo SOLO se importa desde código que corre en el servidor:
// src/lib/orders.ts, src/lib/customers.ts y las rutas /api/*. Usa la
// "service_role key", una clave secreta que puede leer y escribir sin
// restricciones (bypasa las políticas de RLS de Postgres). Por eso NUNCA debe
// llegar al navegador: no está en ninguna variable NEXT_PUBLIC_*, y este
// archivo nunca lo importa un componente "use client".
// ============================================================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Variable a nivel de módulo: como Node reutiliza el mismo módulo cargado
// entre peticiones, esto actúa como un "singleton" (una sola conexión
// reutilizada), en vez de crear un cliente nuevo en cada request.
let client: SupabaseClient | null = null;

/**
 * Cliente de Supabase para el servidor, con la service_role key (bypassa RLS).
 * Se crea recién al primer uso, para no romper el build si las env vars
 * todavía no están configuradas.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client; // ya existe: lo devolvemos tal cual, sin reconectar

  const url = process.env.SUPABASE_URL;
  // `??` (nullish coalescing): usa el valor de la izquierda si no es
  // null/undefined; si lo es, prueba el de la derecha. Acepta ambos nombres
  // por si la variable se creó como SUPABASE_SERVICE_ROLE.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !key)
    throw new Error(
      "Faltan las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY",
    );

  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
