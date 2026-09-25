// ============================================================================
// PROTOCOLO DE LA IMPRESORA (familia "MX0x / Cat Printer", ej. MX09)
// ----------------------------------------------------------------------------
// Esta impresora térmica de 58 mm NO entiende ESC/POS (el estándar más común
// de impresoras de recibos): tiene su propio protocolo binario, propio de la
// app "Fun Print". Este archivo lo reconstruye a partir de leer el código de
// esa app (un .apk), sin usar ninguna librería: es matemática de bytes pura.
// No usa nada específico de Next.js ni de React; funciona igual en cualquier
// entorno con JavaScript/TypeScript.
// ============================================================================

// Cada "cuadro" (paquete) que se le manda a la impresora tiene este formato:
//   51 78 <comando> 00 <largo, 2 bytes, little-endian> <datos> <CRC8(datos)> FF
// (0x51 0x78 son bytes fijos de inicio, "Q" y "x" en ASCII, y 0xFF de cierre.)
export const PRINTER_DOTS = 384; // ancho de la impresora: 384 puntos = 58 mm a 203 dpi
export const BYTES_PER_LINE = PRINTER_DOTS / 8; // 48: cada byte guarda 8 puntos (1 bit = 1 punto)

const QUALITY = 0x34; // valor que usa la app original
const ENERGY = 0x2710; // idem
const DENSITY = 120; // MX09 modo imagen: bajo 100 · medio 120 · alto 140 (máx 140)
const FEED = 0x0030; // avance de papel final
const LSB_FIRST = true; // el punto más a la izquierda es el bit 0 de cada byte

// CRC-8 es una "suma de verificación": un byte que resume los datos, para que
// la impresora pueda detectar si algo llegó corrupto. El algoritmo exacto
// (qué bits se van desplazando) lo sacamos directamente del código de la app;
// no es un cálculo que uno "inventa", tiene que coincidir bit a bit.
function crc8(data: ArrayLike<number>): number {
  let c = 0;
  for (let i = 0; i < data.length; i++) {
    c ^= data[i]; // ^= es "XOR": combina bits sin acarreo, típico de checksums
    for (let b = 0; b < 8; b++) c = c & 0x80 ? ((c << 1) ^ 0x07) & 0xff : (c << 1) & 0xff;
  }
  return c;
}

// Arma un cuadro completo: cabecera + datos + CRC + byte de cierre.
// `Uint8Array` es un arreglo de bytes (números de 0 a 255) de tamaño fijo,
// la forma nativa de JS de representar datos binarios.
export function frame(cmd: number, data: ArrayLike<number>): Uint8Array {
  const out = new Uint8Array(8 + data.length);
  out.set([0x51, 0x78, cmd, 0x00, data.length & 0xff, data.length >> 8]);
  out.set(data as ArrayLike<number>, 6);
  out[6 + data.length] = crc8(data);
  out[7 + data.length] = 0xff;
  return out;
}

// Secuencias fijas que la impresora espera al empezar y al terminar una
// imagen (no tienen un "significado" legible, son bytes de protocolo).
const LATTICE_START = [0xaa, 0x55, 0x17, 0x38, 0x44, 0x5f, 0x5f, 0x5f, 0x44, 0x38, 0x2c];
const LATTICE_END = [0xaa, 0x55, 0x17, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x17];

/** RGBA → bits (umbral de luminancia). El ancho debe ser PRINTER_DOTS. */
// Convierte los píxeles de un <canvas> (4 bytes por píxel: R, G, B, A) en el
// formato de 1 bit por punto que espera la impresora: negro = 1, blanco = 0.
export function rgbaToBits(rgba: Uint8ClampedArray, height: number): Uint8Array {
  const bits = new Uint8Array(BYTES_PER_LINE * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < PRINTER_DOTS; x++) {
      const p = (y * PRINTER_DOTS + x) * 4; // cada píxel ocupa 4 posiciones: R,G,B,A
      // Fórmula estándar de luminancia percibida (da más peso al verde, que
      // el ojo humano distingue mejor). Si es oscuro, se marca como "punto negro".
      const lum = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
      if (rgba[p + 3] > 127 && lum < 140) {
        const mask = LSB_FIRST ? 1 << (x & 7) : 0x80 >> (x & 7);
        bits[y * BYTES_PER_LINE + (x >> 3)] |= mask; // prende el bit correspondiente a este punto
      }
    }
  }
  return bits;
}

/** Trabajo completo, en el mismo orden que la app (get_v5g_parameter_hex). */
// Devuelve la lista completa de cuadros a enviar, en el orden exacto que
// espera la impresora: configuración → una fila de imagen por cada línea de
// puntos → cierre. src/lib/printer/ble.ts los manda uno por uno, por Bluetooth.
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
