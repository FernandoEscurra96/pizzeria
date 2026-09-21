import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { feeFor } from "./menu";
import {
  DELIVERY_TYPES,
  PAYMENT_METHODS,
  type NewOrder,
  type Order,
} from "./types";

const FILE = path.join(process.cwd(), "data", "orders.json");

async function readAll(): Promise<Order[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Order[];
  } catch {
    return [];
  }
}

const writeAll = async (orders: Order[]) => {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(orders, null, 2), "utf8");
};

export const listOrders = async () => (await readAll()).reverse();

/** Valida la entrada; devuelve un mensaje de error o null. */
export function validate(b: Partial<NewOrder>): string | null {
  if (!b.customer?.trim()) return "El cliente es obligatorio";
  if (!Array.isArray(b.items) || b.items.length === 0)
    return "Agregá al menos un producto";
  if (
    b.items.some(
      (i) =>
        !i.name ||
        !Number.isInteger(i.quantity) ||
        i.quantity < 1 ||
        !Number.isFinite(i.unitPrice) ||
        i.unitPrice < 0,
    )
  )
    return "Productos inválidos";
  if (!PAYMENT_METHODS.includes(b.paymentMethod as never))
    return "Forma de pago inválida";
  if (!DELIVERY_TYPES.includes(b.deliveryType as never))
    return "Tipo de entrega inválido";
  if (b.deliveryType === "Delivery" && !b.address?.trim())
    return "La dirección es obligatoria para delivery";
  return null;
}

export async function createOrder(input: NewOrder): Promise<Order> {
  const now = new Date();
  const deliveryFee = feeFor(input.deliveryType);
  const subtotal = input.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const order: Order = {
    id: randomUUID(),
    date: now.toLocaleDateString("es-PY", {
      timeZone: "America/Asuncion",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    time: now.toLocaleTimeString("es-PY", {
      timeZone: "America/Asuncion",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    customer: input.customer.trim(),
    items: input.items,
    deliveryFee,
    total: subtotal + deliveryFee, // el total siempre se calcula en el servidor
    paymentMethod: input.paymentMethod,
    deliveryType: input.deliveryType,
    address: input.deliveryType === "Delivery" ? input.address.trim() : "",
  };
  await writeAll([...(await readAll()), order]);
  return order;
}
