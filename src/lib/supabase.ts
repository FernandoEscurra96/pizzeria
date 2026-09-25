import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Cliente de Supabase para el servidor, con la service_role key (bypassa RLS).
 * Se crea recién al primer uso, para no romper el build si las env vars
 * todavía no están configuradas.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  // Acepta ambos nombres por si la variable se creó como SUPABASE_SERVICE_ROLE.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key)
    throw new Error(
      "Faltan las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY",
    );
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
