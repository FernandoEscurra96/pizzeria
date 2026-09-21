import { NextResponse } from "next/server";
import { createOrder, listOrders, validate } from "@/lib/orders";
import type { NewOrder } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await listOrders());
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<NewOrder> | null;
  const error = body ? validate(body) : "JSON inválido";
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json(await createOrder(body as NewOrder), { status: 201 });
}
