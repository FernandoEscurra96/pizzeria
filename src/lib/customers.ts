// ============================================================================
// LÓGICA DE CLIENTES (habla con Supabase)
// ----------------------------------------------------------------------------
// Mismo patrón que src/lib/orders.ts, pero para la tabla `customers`: nombre,
// dirección y precio de delivery por defecto de cada cliente.
// ============================================================================

import { getSupabase } from "./supabase";
import type { Customer, CustomerInput } from "./types";

// Fila tal como la guarda Postgres (snake_case).
interface CustomerRow {
  id: string;
  name: string;
  address: string;
  delivery_fee: number;
  updated_at: string;
}

// Traduce una fila de la base (snake_case) al tipo Customer (camelCase) que
// usa el resto de la app.
const toCustomer = (r: CustomerRow): Customer => ({
  id: r.id,
  name: r.name,
  address: r.address,
  deliveryFee: r.delivery_fee,
  updatedAt: r.updated_at,
});

const DUPLICATE = "23505"; // código de error de Postgres para "unique_violation"

// Función chica reutilizada por createCustomer y updateCustomer: si el error
// que devolvió Supabase es por nombre duplicado, muestra un mensaje amigable;
// si es otra cosa, muestra el mensaje técnico junto con un texto genérico.
const asDbError = (e: { code?: string; message: string }, fallback: string) =>
  new Error(e.code === DUPLICATE ? "Ya existe un cliente con ese nombre" : `${fallback}: ${e.message}`);

/** Valida la entrada; devuelve un mensaje de error o null. */
export function validateCustomer(b: Partial<CustomerInput>): string | null {
  if (!b.name?.trim()) return "El nombre es obligatorio";
  if (typeof b.address !== "string") return "La dirección es obligatoria";
  if (!Number.isInteger(b.deliveryFee) || (b.deliveryFee as number) < 0)
    return "El precio de delivery debe ser un número igual o mayor a 0";
  return null;
}

export async function listCustomers(): Promise<Customer[]> {
  const { data, error } = await getSupabase().from("customers").select("*").order("name");
  if (error) throw new Error(`No se pudieron leer los clientes: ${error.message}`);
  return (data as CustomerRow[]).map(toCustomer);
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const { data, error } = await getSupabase()
    .from("customers")
    .insert({
      name: input.name.trim(),
      address: input.address.trim(),
      delivery_fee: input.deliveryFee,
    })
    .select()
    .single();
  if (error) throw asDbError(error, "No se pudo crear el cliente");
  return toCustomer(data as CustomerRow);
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<Customer> {
  const { data, error } = await getSupabase()
    .from("customers")
    .update({
      name: input.name.trim(),
      address: input.address.trim(),
      delivery_fee: input.deliveryFee,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id) // WHERE id = ... (si no se pone, ¡actualizaría TODAS las filas!)
    .select()
    .single();
  if (error) throw asDbError(error, "No se pudo actualizar el cliente");
  return toCustomer(data as CustomerRow);
}
