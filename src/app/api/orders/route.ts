// ============================================================================
// ROUTE HANDLER: /api/orders — GET y POST
// ----------------------------------------------------------------------------
// Dentro de `src/app`, un archivo llamado `route.ts` (en vez de `page.tsx`)
// convierte esa carpeta en un endpoint de API en lugar de una página HTML.
// Esta carpeta es `src/app/api/orders/`, así que la URL resultante es
// `/api/orders`. Next.js busca funciones exportadas con el nombre de un
// método HTTP: `GET` responde a peticiones GET, `POST` a las POST, etc.
// Esto corre siempre en el servidor (nunca en el navegador).
// ============================================================================

import { NextResponse } from "next/server";
import { createOrder, listOrders, validate } from "@/lib/orders";
import type { NewOrder } from "@/lib/types";

// GET /api/orders → usado por el navegador cuando quiere refrescar la lista
// (además de que la página "/" ya trae los pedidos precargados desde el server).
export async function GET() {
  try {
    // NextResponse.json(...) arma una respuesta HTTP con Content-Type JSON.
    return NextResponse.json(await listOrders());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al leer los pedidos" },
      { status: 500 }, // 500 = error del servidor
    );
  }
}

// POST /api/orders → lo llama el formulario (OrderForm.tsx) para crear un pedido.
export async function POST(request: Request) {
  // `request.json()` lee y parsea el cuerpo de la petición. Si no es JSON
  // válido, `.catch(() => null)` evita que la promesa rechazada tire abajo
  // toda la función; en cambio, body queda en null y lo tratamos como error.
  const body = (await request.json().catch(() => null)) as Partial<NewOrder> | null;

  // Nunca confiamos en los datos que manda el navegador: los volvemos a
  // validar acá, en el servidor (el navegador ya valida, pero alguien podría
  // llamar a esta API directamente sin pasar por el formulario).
  const error = body ? validate(body) : "JSON inválido";
  if (error) return NextResponse.json({ error }, { status: 400 }); // 400 = pedido mal formado

  try {
    // 201 = "Created": el pedido se creó correctamente.
    return NextResponse.json(await createOrder(body as NewOrder), { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al guardar el pedido" },
      { status: 500 },
    );
  }
}
