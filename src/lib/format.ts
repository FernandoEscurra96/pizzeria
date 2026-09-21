import type { Order } from "./types";

export const gs = (n: number) => `${n.toLocaleString("de-DE")} Gs`; // 40.000 Gs

const WIDTH = 32; // caracteres por línea (tipografía monoespaciada)
const LINE = "-".repeat(WIDTH);

/** Etiqueta a la izquierda y monto pegado al borde derecho: siempre alineados. */
function row(label: string, amount: number): string {
  const right = gs(amount);
  const left = label.slice(0, WIDTH - right.length - 1);
  return left.padEnd(WIDTH - right.length) + right;
}

/** Ticket en texto plano de ancho fijo, listo para imprimir o copiar. */
export function ticketText(o: Order): string {
  return [
    `Fecha: ${o.date}`,
    `Hora: ${o.time}`,
    "",
    `Cliente: ${o.customer}`,
    LINE,
    ...o.items.map((i) => row(`${i.quantity} x ${i.name}`, i.quantity * i.unitPrice)),
    ...(o.deliveryFee ? [row("Delivery", o.deliveryFee)] : []),
    LINE,
    row("TOTAL:", o.total),
    "",
    `Forma de pago: ${o.paymentMethod}`,
    `Entrega: ${o.deliveryType}`,
    ...(o.address ? ["", `Dirección: ${o.address}`] : []),
    "",
    LINE,
    "¡GRACIAS POR TU PEDIDO! ❤️",
  ].join("\n");
}
