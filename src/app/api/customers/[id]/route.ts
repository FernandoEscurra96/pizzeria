// ============================================================================
// ROUTE HANDLER: /api/customers/[id] — PATCH (editar un cliente puntual)
// ----------------------------------------------------------------------------
// El nombre de carpeta entre corchetes `[id]` es una "ruta dinámica": Next.js
// reemplaza `[id]` por lo que sea que venga en la URL. Por ejemplo, una
// petición a "/api/customers/abc-123" hace que `id` valga "abc-123".
//
// PATCH es el verbo HTTP pensado para "actualizar parcialmente" un recurso
// que ya existe (a diferencia de POST, que crea uno nuevo).
// ============================================================================

import { NextResponse } from "next/server";
import { updateCustomer, validateCustomer } from "@/lib/customers";
import type { CustomerInput } from "@/lib/types";

// `RouteContext<"/api/customers/[id]">` es un tipo que genera el propio
// Next.js para este archivo, describiendo su segundo parámetro. En esta
// versión de Next, `ctx.params` es una Promise (no un objeto directo), así
// que hay que hacerle `await` antes de leer `id`.
export async function PATCH(request: Request, ctx: RouteContext<"/api/customers/[id]">) {
  const { id } = await ctx.params;

  const body = (await request.json().catch(() => null)) as Partial<CustomerInput> | null;
  const error = body ? validateCustomer(body) : "JSON inválido";
  if (error) return NextResponse.json({ error }, { status: 400 });

  try {
    return NextResponse.json(await updateCustomer(id, body as CustomerInput));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al actualizar el cliente" },
      { status: 500 },
    );
  }
}
