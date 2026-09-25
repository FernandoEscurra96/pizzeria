// ============================================================================
// FORMATO DEL TICKET
// ----------------------------------------------------------------------------
// Convierte un pedido (objeto Order) en el texto plano que se copia, se
// imprime en el navegador o se manda a la impresora térmica. Todo el ancho
// está pensado para que los montos queden siempre alineados a la derecha,
// como en un ticket real, aunque cambien el nombre del producto o del cliente.
// ============================================================================

import type { Order } from "./types";

// `toLocaleString("de-DE")` da el formato de miles con punto (40.000) en vez
// de coma (40,000): es un "truco" común para simular el formato guaraní/es-PY.
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
  // `.pop()` saca y devuelve el último elemento del arreglo (y lo quita de `lines`).
  // El `?? ""` es por si `lines` llegara vacío (no debería pasar, pero TS lo exige).
  const last = lines.pop() ?? "";
  if (last.length + right.length + 1 <= WIDTH)
    // `.padEnd(n)` completa con espacios hasta el largo `n`: así el monto queda
    // pegado al borde derecho sin importar cuánto mida la etiqueta.
    return [...lines, last.padEnd(WIDTH - right.length) + right];
  // Si ni así entra, el monto va solo, en su propia línea, alineado a la derecha.
  return [...lines, last, right.padStart(WIDTH)];
}

/** Ticket en texto plano de ancho fijo, listo para imprimir o copiar. */
export function ticketText(o: Order): string {
  // `.flatMap()` es como `.map()` pero además "aplana" el resultado: cada
  // ítem puede convertirse en 1 o 2 líneas (row devuelve un arreglo), y
  // flatMap las mezcla todas en una sola lista de líneas.
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
  ].join("\n"); // .join("\n") pega todas las líneas del arreglo con saltos de línea reales
}
