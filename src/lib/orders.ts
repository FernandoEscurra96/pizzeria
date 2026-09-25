import { itemName, priceOf } from "./menu";
import { getSupabase } from "./supabase";
import {
  DELIVERY_TYPES,
  PAYMENT_METHODS,
  type DeliveryType,
  type NewOrder,
  type Order,
  type OrderItem,
  type PaymentMethod,
} from "./types";

interface OrderRow {
  id: string;
  created_at: string;
  customer: string;
  items: OrderItem[];
  delivery_fee: number;
  total: number;
  payment_method: PaymentMethod;
  delivery_type: DeliveryType;
  address: string;
}

const dateOpts = {
  timeZone: "America/Asuncion",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
} as const;
const timeOpts = {
  timeZone: "America/Asuncion",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
} as const;

function toOrder(row: OrderRow): Order {
  const created = new Date(row.created_at);
  return {
    id: row.id,
    date: created.toLocaleDateString("es-PY", dateOpts),
    time: created.toLocaleTimeString("es-PY", timeOpts),
    customer: row.customer,
    items: row.items,
    deliveryFee: row.delivery_fee,
    total: row.total,
    paymentMethod: row.payment_method,
    deliveryType: row.delivery_type,
    address: row.address,
  };
}

export async function listOrders(): Promise<Order[]> {
  const { data, error } = await getSupabase()
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`No se pudieron leer los pedidos: ${error.message}`);
  return (data as OrderRow[]).map(toOrder);
}

/** Valida la entrada; devuelve un mensaje de error o null. */
export function validate(b: Partial<NewOrder>): string | null {
  if (!b.customer?.trim()) return "El cliente es obligatorio";
  if (!Array.isArray(b.items) || b.items.length === 0)
    return "Agregá al menos un producto";
  if (
    b.items.some(
      (i) =>
        !Number.isInteger(i.quantity) ||
        i.quantity < 1 ||
        !Array.isArray(i.flavors) ||
        ![1, 2].includes(i.flavors.length) ||
        priceOf(i.flavors) === null ||
        (i.flavors.length === 2 && i.flavors[0] === i.flavors[1]),
    )
  )
    return "Pizza inválida: elegí 1 sabor, o 2 sabores distintos";
  if (!PAYMENT_METHODS.includes(b.paymentMethod as never))
    return "Forma de pago inválida";
  if (!DELIVERY_TYPES.includes(b.deliveryType as never))
    return "Tipo de entrega inválido";
  if (
    b.deliveryType === "Delivery" &&
    (!Number.isInteger(b.deliveryFee) || (b.deliveryFee as number) < 0)
  )
    return "Costo de delivery inválido";
  if (b.deliveryType === "Delivery" && !b.address?.trim())
    return "La dirección es obligatoria para delivery";
  return null;
}

export async function createOrder(input: NewOrder): Promise<Order> {
  const deliveryFee = input.deliveryType === "Delivery" ? input.deliveryFee : 0;
  // Nombre y precio salen del menú del servidor, nunca del cliente.
  const items: OrderItem[] = input.items.map((i) => ({
    name: itemName(i.flavors),
    quantity: i.quantity,
    unitPrice: priceOf(i.flavors)!,
  }));
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const { data, error } = await getSupabase()
    .from("orders")
    .insert({
      customer: input.customer.trim(),
      items,
      delivery_fee: deliveryFee,
      total: subtotal + deliveryFee, // el total siempre se calcula en el servidor
      payment_method: input.paymentMethod,
      delivery_type: input.deliveryType,
      address: input.deliveryType === "Delivery" ? input.address.trim() : "",
    })
    .select()
    .single();
  if (error) throw new Error(`No se pudo guardar el pedido: ${error.message}`);
  return toOrder(data as OrderRow);
}
