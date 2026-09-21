export const PAYMENT_METHODS = ["Efectivo", "Transferencia", "Tarjeta"] as const;
export const DELIVERY_TYPES = ["Delivery", "Retiro"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type DeliveryType = (typeof DELIVERY_TYPES)[number];

export interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number; // Gs
}

export interface Order {
  id: string;
  date: string; // DD/MM/YYYY
  time: string; // HH:mm
  customer: string;
  items: OrderItem[];
  deliveryFee: number; // Gs, 0 si es retiro
  total: number; // Gs
  paymentMethod: PaymentMethod;
  deliveryType: DeliveryType;
  address: string; // vacío si es retiro
}

export type NewOrder = Pick<
  Order,
  "customer" | "items" | "paymentMethod" | "deliveryType" | "address" | "deliveryFee"
>;
