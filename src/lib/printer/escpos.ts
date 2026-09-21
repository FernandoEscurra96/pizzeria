// Comandos ESC/POS que usan las impresoras de 58 mm de esta familia (ver Fun Print).
export const PRINTER_DOTS = 384; // 58 mm a 203 dpi
export const BYTES_PER_LINE = PRINTER_DOTS / 8; // 48

const ESC = 0x1b;
const GS = 0x1d;

/** Inicializa la impresora y fija la densidad (DC2 # n; 0x0F = media). */
export const init = (density = 0x0f) =>
  Uint8Array.of(ESC, 0x40, 0x12, 0x23, density);

/** Avanza el papel n líneas (ESC d n). */
export const feed = (lines = 3) => Uint8Array.of(ESC, 0x64, lines);

/**
 * Imagen raster GS v 0 (1 bit por punto, 1 = negro).
 * Se parte en bandas para no saturar el búfer de la impresora.
 */
export function rasterBands(bits: Uint8Array, height: number, band = 128): Uint8Array[] {
  const out: Uint8Array[] = [];
  for (let y = 0; y < height; y += band) {
    const h = Math.min(band, height - y);
    const head = Uint8Array.of(GS, 0x76, 0x30, 0x00, BYTES_PER_LINE, 0x00, h & 0xff, h >> 8);
    const data = bits.subarray(y * BYTES_PER_LINE, (y + h) * BYTES_PER_LINE);
    const cmd = new Uint8Array(head.length + data.length);
    cmd.set(head);
    cmd.set(data, head.length);
    out.push(cmd);
  }
  return out;
}

/** RGBA → bits (umbral de luminancia). El ancho debe ser PRINTER_DOTS. */
export function rgbaToBits(rgba: Uint8ClampedArray, height: number): Uint8Array {
  const bits = new Uint8Array(BYTES_PER_LINE * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < PRINTER_DOTS; x++) {
      const p = (y * PRINTER_DOTS + x) * 4;
      const lum = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
      if (rgba[p + 3] > 127 && lum < 140) bits[y * BYTES_PER_LINE + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return bits;
}

/** Trabajo completo: init + imagen + avance de papel. */
export function buildJob(bits: Uint8Array, height: number, feedLines = 3): Uint8Array[] {
  return [init(), ...rasterBands(bits, height), feed(feedLines)];
}
