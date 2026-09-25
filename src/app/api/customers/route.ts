// ============================================================================
// ROUTE HANDLER: /api/customers — GET (listar) y POST (crear)
// ----------------------------------------------------------------------------
// Mismo mecanismo que /api/orders: este archivo vive en
// `src/app/api/customers/route.ts`, así que atiende la URL "/api/customers".
// Ver el archivo hermano `[id]/route.ts` para editar un cliente puntual.
// ============================================================================

import { NextResponse } from "next/server";
import { createCustomer, listCustomers, validateCustomer } from "@/lib/customers";
import type { CustomerInput } from "@/lib/types";

// GET /api/customers → usado por CustomerPicker y CustomerManager para traer
// (o refrescar) la lista completa de clientes guardados.
export async function GET() {
  try {
    return NextResponse.json(await listCustomers());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al leer los clientes" },
      { status: 500 },
    );
  }
}

// POST /api/customers → crea un cliente nuevo (nombre, dirección, delivery).
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<CustomerInput> | null;
  const error = body ? validateCustomer(body) : "JSON inválido";
  if (error) return NextResponse.json({ error }, { status: 400 });
  try {
    return NextResponse.json(await createCustomer(body as CustomerInput), { status: 201 });
  } catch (e) {
    // Si el nombre ya existe, createCustomer() lanza un Error con un mensaje
    // amigable (ver src/lib/customers.ts); acá simplemente lo reenviamos.
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al crear el cliente" },
      { status: 500 },
    );
  }
}
