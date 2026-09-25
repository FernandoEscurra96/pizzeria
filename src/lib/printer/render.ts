// ============================================================================
// DIBUJAR EL TICKET COMO IMAGEN
// ----------------------------------------------------------------------------
// La impresora no entiende texto: solo imprime imágenes (ver mxw.ts). Este
// archivo "dibuja" el texto del ticket en un <canvas> invisible, del ancho
// exacto de la impresora, y lo convierte en los bits que espera el protocolo.
// Solo funciona en el navegador (usa `document`), por eso quien lo llama
// (src/lib/printer/ble.ts) siempre corre del lado del cliente.
// ============================================================================

import { PRINTER_DOTS, rgbaToBits } from "./mxw";

const COLS = 32; // debe coincidir con WIDTH de src/lib/format.ts

/** Dibuja el ticket (texto monoespaciado) en un canvas de 384 px y lo pasa a bits. */
export function textToBits(text: string): { bits: Uint8Array; height: number } {
  const lines = text.split("\n");
  // Un <canvas> creado con JS (sin agregarlo al HTML visible) sirve como
  // "lienzo" temporal para dibujar y después leer los píxeles resultantes.
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  // Tamaño de fuente que hace caber COLS caracteres exactamente en el ancho.
  const family = '"Courier New", Consolas, monospace';
  ctx.font = `bold 100px ${family}`;
  // measureText() devuelve, entre otras cosas, cuánto mide un texto dibujado
  // con la fuente actual. Se usa "M" como referencia porque en una fuente
  // monoespaciada todos los caracteres miden exactamente lo mismo de ancho.
  const charAt100 = ctx.measureText("M").width;
  // Regla de tres: si "M" mide charAt100 px con fuente de 100px, ¿qué tamaño
  // de fuente hace que COLS caracteres midan exactamente PRINTER_DOTS px?
  const size = Math.floor((PRINTER_DOTS / COLS / charAt100) * 100);
  const lineH = Math.round(size * 1.25); // alto de línea, con un poco de aire
  const pad = 8;

  canvas.width = PRINTER_DOTS;
  canvas.height = lines.length * lineH + pad * 2;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height); // fondo blanco (si no, sería transparente)
  ctx.fillStyle = "#000";
  ctx.font = `bold ${size}px ${family}`;
  ctx.textBaseline = "top";
  // Dibuja cada línea de texto, una debajo de la otra.
  lines.forEach((l, i) => ctx.fillText(l, 0, pad + i * lineH));

  // getImageData() lee los píxeles ya dibujados, como un arreglo plano de
  // números R,G,B,A (4 por píxel). rgbaToBits (en mxw.ts) los convierte al
  // formato de 1 bit por punto que espera la impresora.
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { bits: rgbaToBits(data, canvas.height), height: canvas.height };
}
