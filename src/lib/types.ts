// ============================================================================
// TIPOS COMPARTIDOS (TypeScript)
// ----------------------------------------------------------------------------
// Este archivo no tiene lógica, solo describe la "forma" de los datos que
// viajan por toda la app (formularios → API → base de datos). Como no exporta
// ningún componente ni función con efectos, se puede importar tanto desde
// Server Components como Client Components sin ningún problema.
// ============================================================================

// `as const` le dice a TypeScript "tratá este arreglo como fijo, no como
// string[] genérico". Gracias a eso, la línea de abajo puede sacar el tipo
// unión "Efectivo" | "Transferencia" | "Tarjeta" a partir del propio arreglo,
// en vez de tener que escribirlo dos veces.
export const PAYMENT_METHODS = ["Efectivo", "Transferencia", "Tarjeta"] as const;
export const DELIVERY_TYPES = ["Delivery", "Retiro"] as const;

// `typeof PAYMENT_METHODS` = el tipo del arreglo; `[number]` = "el tipo de
// cualquier elemento indexado por un número", es decir, la unión de sus
// valores. Resultado: PaymentMethod = "Efectivo" | "Transferencia" | "Tarjeta".
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type DeliveryType = (typeof DELIVERY_TYPES)[number];

// Un `interface` describe la forma de un objeto: qué propiedades tiene y de
// qué tipo es cada una. No genera código JavaScript real, solo existe para
// que TypeScript nos avise en el editor si algo no coincide.
export interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number; // Gs
}

// Un pedido ya guardado (tal como lo devuelve la base de datos).
export interface Order {
  id: string;
  date: string; // DD/MM/YYYY
  time: string; // HH:mm
  customer: string;
  items: OrderItem[]; // [] al final = "arreglo de OrderItem"
  deliveryFee: number; // Gs, 0 si es retiro
  total: number; // Gs
  paymentMethod: PaymentMethod;
  deliveryType: DeliveryType;
  address: string; // vacío si es retiro
}

/** Pizza pedida: 1 sabor entero, o 2 sabores (mitad y mitad). El precio lo fija el servidor. */
export interface ItemInput {
  quantity: number;
  flavors: string[]; // 1 elemento = pizza entera; 2 elementos = mitad y mitad
}

// Lo que manda el formulario al crear un pedido (todavía sin id, fecha, ni
// total: eso lo calcula el servidor en src/lib/orders.ts, nunca el cliente).
export interface NewOrder {
  customer: string;
  items: ItemInput[];
  paymentMethod: PaymentMethod;
  deliveryType: DeliveryType;
  address: string;
  deliveryFee: number;
}

/** Cliente guardado: nombre, dirección y precio de delivery por defecto. */
export interface Customer {
  id: string;
  name: string;
  address: string;
  deliveryFee: number;
  updatedAt: string;
}

// Lo que se manda al crear o editar un cliente (sin id: lo genera Supabase).
export interface CustomerInput {
  name: string;
  address: string;
  deliveryFee: number;
}
