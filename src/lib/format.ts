import type { Order } from "./types";

export const gs = (n: number) => `${n.toLocaleString("de-DE")} Gs`; // 40.000 Gs

const WIDTH = 32; // caracteres por línea (tipografía monoespaciada)
const LINE = "-".repeat(WIDTH);

/** Parte un texto en líneas de hasta `width` caracteres, cortando en espacios. */
function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(" ")) {
    const next = cur ? `${cur} ${word}` : word;
    if (next.length <= width) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * Etiqueta a la izquierda y monto pegado al borde derecho: siempre alineados.
 * Si la etiqueta es larga, se parte en varias líneas y el monto va en la última.
 */
function row(label: string, amount: number): string[] {
  const right = gs(amount);
  const lines = wrap(label, WIDTH);
  const last = lines.pop() ?? "";
  if (last.length + right.length + 1 <= WIDTH)
    return [...lines, last.padEnd(WIDTH - right.length) + right];
  return [...lines, last, right.padStart(WIDTH)];
}

/** Ticket en texto plano de ancho fijo, listo para imprimir o copiar. */
export function ticketText(o: Order): string {
  return [
    `Fecha: ${o.date}`,
    `Hora: ${o.time}`,
    "",
    `Cliente: ${o.customer}`,
    LINE,
    ...o.items.flatMap((i) => row(`${i.quantity} x ${i.name}`, i.quantity * i.unitPrice)),
    ...(o.deliveryFee ? row("Delivery", o.deliveryFee) : []),
    LINE,
    ...row("TOTAL:", o.total),
    "",
    `Forma de pago: ${o.paymentMethod}`,
    `Entrega: ${o.deliveryType}`,
    ...(o.address ? ["", ...wrap(`Dirección: ${o.address}`, WIDTH)] : []),
    "",
    LINE,
    "¡GRACIAS POR TU PEDIDO! ❤️",
  ].join("\n");
}
