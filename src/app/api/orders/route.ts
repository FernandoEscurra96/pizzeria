import { NextResponse } from "next/server";
import { createOrder, listOrders, validate } from "@/lib/orders";
import type { NewOrder } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json(await listOrders());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al leer los pedidos" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<NewOrder> | null;
  const error = body ? validate(body) : "JSON inválido";
  if (error) return NextResponse.json({ error }, { status: 400 });
  try {
    return NextResponse.json(await createOrder(body as NewOrder), { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al guardar el pedido" },
      { status: 500 },
    );
  }
}
