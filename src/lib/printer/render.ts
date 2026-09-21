import { PRINTER_DOTS, rgbaToBits } from "./escpos";

const COLS = 32; // debe coincidir con WIDTH de src/lib/format.ts

/** Dibuja el ticket (texto monoespaciado) en un canvas de 384 px y lo pasa a bits. */
export function textToBits(text: string): { bits: Uint8Array; height: number } {
  const lines = text.split("\n");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  // Tamaño de fuente que hace caber COLS caracteres exactamente en el ancho.
  const family = '"Courier New", Consolas, monospace';
  ctx.font = `bold 100px ${family}`;
  const charAt100 = ctx.measureText("M").width;
  const size = Math.floor((PRINTER_DOTS / COLS / charAt100) * 100);
  const lineH = Math.round(size * 1.25);
  const pad = 8;

  canvas.width = PRINTER_DOTS;
  canvas.height = lines.length * lineH + pad * 2;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000";
  ctx.font = `bold ${size}px ${family}`;
  ctx.textBaseline = "top";
  lines.forEach((l, i) => ctx.fillText(l, 0, pad + i * lineH));

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { bits: rgbaToBits(data, canvas.height), height: canvas.height };
}
