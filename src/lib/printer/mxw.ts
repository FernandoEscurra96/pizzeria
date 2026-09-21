// Protocolo de las impresoras "MX0x / Cat Printer" (p. ej. MX09), obtenido de la app Fun Print.
// Cada cuadro: 51 78 <cmd> 00 <len LE 2B> <datos> <crc8(datos)> FF
export const PRINTER_DOTS = 384; // 58 mm a 203 dpi
export const BYTES_PER_LINE = PRINTER_DOTS / 8; // 48

const QUALITY = 0x34; // valor que usa la app
const ENERGY = 0x2710; // idem
const DENSITY = 120; // MX09 modo imagen: bajo 100 · medio 120 · alto 140 (máx 140)
const FEED = 0x0030; // avance de papel final
const LSB_FIRST = true; // el punto más a la izquierda es el bit 0 de cada byte

function crc8(data: ArrayLike<number>): number {
  let c = 0;
  for (let i = 0; i < data.length; i++) {
    c ^= data[i];
    for (let b = 0; b < 8; b++) c = c & 0x80 ? ((c << 1) ^ 0x07) & 0xff : (c << 1) & 0xff;
  }
  return c;
}

export function frame(cmd: number, data: ArrayLike<number>): Uint8Array {
  const out = new Uint8Array(8 + data.length);
  out.set([0x51, 0x78, cmd, 0x00, data.length & 0xff, data.length >> 8]);
  out.set(data as ArrayLike<number>, 6);
  out[6 + data.length] = crc8(data);
  out[7 + data.length] = 0xff;
  return out;
}

const LATTICE_START = [0xaa, 0x55, 0x17, 0x38, 0x44, 0x5f, 0x5f, 0x5f, 0x44, 0x38, 0x2c];
const LATTICE_END = [0xaa, 0x55, 0x17, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x17];

/** RGBA → bits (umbral de luminancia). El ancho debe ser PRINTER_DOTS. */
export function rgbaToBits(rgba: Uint8ClampedArray, height: number): Uint8Array {
  const bits = new Uint8Array(BYTES_PER_LINE * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < PRINTER_DOTS; x++) {
      const p = (y * PRINTER_DOTS + x) * 4;
      const lum = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
      if (rgba[p + 3] > 127 && lum < 140) {
        const mask = LSB_FIRST ? 1 << (x & 7) : 0x80 >> (x & 7);
        bits[y * BYTES_PER_LINE + (x >> 3)] |= mask;
      }
    }
  }
  return bits;
}

/** Trabajo completo, en el mismo orden que la app (get_v5g_parameter_hex). */
export function buildJob(bits: Uint8Array, height: number): Uint8Array[] {
  const rows: Uint8Array[] = [];
  for (let y = 0; y < height; y++)
    rows.push(frame(0xa2, bits.subarray(y * BYTES_PER_LINE, (y + 1) * BYTES_PER_LINE)));

  return [
    frame(0xa4, [QUALITY]),
    frame(0xaf, [ENERGY & 0xff, ENERGY >> 8]),
    frame(0xa6, LATTICE_START),
    frame(0xbe, [0x00]), // modo imagen
    frame(0xbd, [0x0a]),
    frame(0xf2, [0x01, DENSITY]),
    ...rows,
    frame(0xbd, [0x19]),
    frame(0xa1, [FEED & 0xff, FEED >> 8]),
    frame(0xa6, LATTICE_END),
  ];
}
