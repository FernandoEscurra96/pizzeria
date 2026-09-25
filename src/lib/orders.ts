// ============================================================================
// LÓGICA DE PEDIDOS (habla con Supabase)
// ----------------------------------------------------------------------------
// Esta es la única parte de la app que lee o escribe la tabla `orders`. Ni el
// formulario ni las rutas de API tocan Supabase directamente: siempre pasan
// por estas funciones. Así, si algún día cambia la base de datos, solo hay
// que tocar este archivo.
// ============================================================================

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

// Así se ve una fila de la tabla `orders` en Supabase (nombres en snake_case,
// como en SQL). Es distinto del tipo `Order` de types.ts (camelCase, como en
// JS/TS); la función `toOrder` de abajo traduce de uno al otro.
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

// `as const` fija el tipo exacto de este objeto de opciones (en vez de
// "string" genérico), como pide la firma de `toLocaleDateString`.
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

// Convierte una fila de la base de datos (snake_case) en el tipo `Order` que
// usa el resto de la app (camelCase). `created_at` es una fecha en UTC; acá
// se la formatea ya en el huso horario de Paraguay.
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

// Trae todos los pedidos, del más nuevo al más viejo.
export async function listOrders(): Promise<Order[]> {
  // `.from("orders")` apunta a la tabla; `.select("*")` pide todas las
  // columnas; `.order(...)` ordena en el propio Postgres (más eficiente que
  // traer todo y ordenar en JS). Supabase nunca "tira" un error de red: lo
  // devuelve como `{ data, error }`, así que siempre hay que chequear `error`.
  const { data, error } = await getSupabase()
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`No se pudieron leer los pedidos: ${error.message}`);
  return (data as OrderRow[]).map(toOrder);
}

/** Valida la entrada; devuelve un mensaje de error o null. */
export function validate(b: Partial<NewOrder>): string | null {
  // `Partial<NewOrder>` = todas las propiedades de NewOrder, pero opcionales.
  // Se usa acá porque el body que llega por la API todavía no está
  // garantizado: puede faltarle cualquier campo, y hay que revisarlo a mano.
  if (!b.customer?.trim()) return "El cliente es obligatorio";
  if (!Array.isArray(b.items) || b.items.length === 0)
    return "Agregá al menos un producto";
  if (
    // `.some()` devuelve true si AL MENOS UN elemento cumple la condición
    // (alcanza con que una sola pizza esté mal para rechazar todo el pedido).
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
  return null; // null = "sin errores"
}

export async function createOrder(input: NewOrder): Promise<Order> {
  const deliveryFee = input.deliveryType === "Delivery" ? input.deliveryFee : 0;

  // Nombre y precio de cada pizza salen del menú del servidor (src/lib/menu.ts),
  // nunca de lo que mande el navegador: así nadie puede pedir una pizza "gratis"
  // manipulando la petición HTTP.
  const items: OrderItem[] = input.items.map((i) => ({
    name: itemName(i.flavors),
    quantity: i.quantity,
    unitPrice: priceOf(i.flavors)!, // el "!" es seguro: validate() ya garantizó que no es null
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
    // `.select().single()` le pide a Supabase que devuelva la fila recién
    // creada (con su id y created_at generados), en vez de solo confirmar el insert.
    .select()
    .single();
  if (error) throw new Error(`No se pudo guardar el pedido: ${error.message}`);
  return toOrder(data as OrderRow);
}
