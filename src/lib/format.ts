import type { Order } from "./types";

export const gs = (n: number) =>
  `${n.toLocaleString("de-DE")} Gs`; // 40.000 Gs

const LINE = "--------------------------";

/** Ticket en texto plano, listo para copiar/pegar en WhatsApp. */
export function ticketText(o: Order): string {
  const rows = [
    `Fecha: ${o.date}`,
    `Hora: ${o.time}`,
    "",
    `Cliente: ${o.customer}`,
    LINE,
    ...o.items.map((i) => `${i.quantity} x ${i.name}      ${gs(i.quantity * i.unitPrice)}`),
    ...(o.deliveryFee ? [`Delivery          ${gs(o.deliveryFee)}`] : []),
    LINE,
    `TOTAL:               ${gs(o.total)}`,
    "",
    `Forma de pago: ${o.paymentMethod}`,
    `Entrega: ${o.deliveryType}`,
    ...(o.address ? ["", `Dirección: ${o.address}`] : []),
    "",
    LINE,
    "¡GRACIAS POR TU PEDIDO! ❤️",
  ];
  return rows.join("\n");
}
