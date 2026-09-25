// ============================================================================
// CONEXIÓN BLUETOOTH CON LA IMPRESORA (Web Bluetooth API)
// ----------------------------------------------------------------------------
// Usa la Web Bluetooth API del navegador (solo Chrome/Edge, y solo en
// localhost o HTTPS) para conectarse directamente a la impresora térmica,
// sin pasar por ninguna app nativa. No es específico de Next.js: es una API
// del navegador, disponible en cualquier página web que corra en el cliente.
//
// Conceptos de Bluetooth de bajo nivel (BLE) usados acá:
// - "Device": el aparato Bluetooth en sí (la impresora).
// - "Service": un grupo de funciones que ofrece el dispositivo (identificado
//   por un UUID). Una impresora puede tener varios.
// - "Characteristic": un "canal" puntual dentro de un servicio, por el que se
//   puede escribir (mandar datos) o recibir notificaciones (la impresora
//   avisando algo, como "pausá, me estoy quedando sin buffer").
// ============================================================================

import { buildJob } from "./mxw";
import { textToBits } from "./render";

export type Log = (line: string) => void;

// Servicios BLE habituales en impresoras térmicas, en orden de prioridad.
// Web Bluetooth exige declararlos para poder leerlos. FEE7 (WeChat) va al final
// porque su característica de escritura no imprime.
const SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "0000ae30-0000-1000-8000-00805f9b34fb",
  "0000af30-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "0000fee7-0000-1000-8000-00805f9b34fb",
];
// Al conectar, probamos los servicios en este orden (índice más bajo primero).
// Si un servicio no está en la lista, queda al final (SERVICES.length).
const priority = (uuid: string) => {
  const i = SERVICES.indexOf(uuid);
  return i === -1 ? SERVICES.length : i;
};

// Notificaciones de control de flujo (pausa / continuar) que envía la impresora.
const FLOW_PAUSE = "5178ae0101001070ff";
const FLOW_RESUME = "5178ae0101000000ff";

const CHUNK = 20; // MTU BLE por defecto: cuántos bytes entran en un solo paquete
const PAUSE_TIMEOUT = 5000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Convierte los bytes crudos que llegan por Bluetooth en un string hexadecimal
// legible (para comparar contra FLOW_PAUSE/FLOW_RESUME y para el diagnóstico).
const hex = (v: DataView) =>
  Array.from(new Uint8Array(v.buffer, v.byteOffset, v.byteLength), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
// Lista, en texto, qué operaciones soporta una característica BLE (para el
// panel de diagnóstico que ve el usuario si algo falla).
const propsOf = (c: BluetoothRemoteGATTCharacteristic) =>
  (["read", "write", "writeWithoutResponse", "notify", "indicate"] as const)
    .filter((k) => c.properties[k])
    .join(",");
const short = (uuid: string) => uuid.replace("-0000-1000-8000-00805f9b34fb", "");

// Chequea si el navegador actual soporta Web Bluetooth (no todos lo hacen:
// por ejemplo, Safari no).
export const isSupported = () => typeof navigator !== "undefined" && "bluetooth" in navigator;

// Variables a nivel de módulo: guardan la conexión activa para poder
// reutilizarla en el siguiente pedido, sin volver a pedir "elegí un
// dispositivo" cada vez que se imprime.
let device: BluetoothDevice | null = null;
let writer: BluetoothRemoteGATTCharacteristic | null = null;
let paused = false;
let log: Log = () => {};

// Conecta con la impresora (si no había una conexión ya abierta) y encuentra
// cuál de sus características usar para escribir. Es `async` porque cada
// paso (elegir dispositivo, conectar, listar servicios...) es una operación
// que tarda y devuelve una Promise.
async function ensureConnected(): Promise<BluetoothRemoteGATTCharacteristic> {
  if (device?.gatt?.connected && writer) {
    log(`Reutilizando conexión con "${device.name}"`);
    return writer;
  }

  if (!device) {
    log("Abriendo selector de dispositivos…");
    // navigator.bluetooth.requestDevice() abre el diálogo nativo del
    // navegador para que la persona elija su impresora de una lista.
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: SERVICES,
    });
    device.addEventListener("gattserverdisconnected", () => {
      writer = null;
      log("La impresora se desconectó");
    });
  }

  log(`Conectando a "${device.name ?? device.id}"…`);
  const server = await device.gatt!.connect();
  paused = false;

  const services = (await server.getPrimaryServices()).sort(
    (a, b) => priority(a.uuid) - priority(b.uuid),
  );
  log(`Servicios encontrados: ${services.map((s) => short(s.uuid)).join(", ") || "ninguno"}`);

  type Pick = { c: BluetoothRemoteGATTCharacteristic; s: BluetoothRemoteGATTService };
  let chosen = null as Pick | null;
  let fallback = null as Pick | null;
  const notifiers = new Map<string, BluetoothRemoteGATTCharacteristic>();

  // Recorremos cada servicio y cada característica dentro de él, buscando:
  // 1) una característica de "solo escritura" (sin lectura) → la ideal, y
  // 2) cualquier característica de "notificación" → para escuchar los
  //    avisos de pausa/continuar que manda la impresora mientras imprime.
  for (const s of services) {
    for (const c of await s.getCharacteristics()) {
      log(`  ${short(s.uuid)} / ${short(c.uuid)} [${propsOf(c)}]`);
      const p = c.properties;
      const canWrite = p.write || p.writeWithoutResponse;
      if (canWrite && !p.read && !chosen) chosen = { c, s };
      if (canWrite && !fallback) fallback = { c, s };
      if ((p.notify || p.indicate) && !notifiers.has(s.uuid)) notifiers.set(s.uuid, c);
    }
  }

  chosen ??= fallback; // si no hubo una "ideal", usamos cualquiera que permita escribir
  if (!chosen) throw new Error("La impresora no tiene ninguna característica de escritura");
  writer = chosen.c;
  log(`Escritura en: ${short(chosen.s.uuid)} / ${short(chosen.c.uuid)}`);

  const notify = notifiers.get(chosen.s.uuid) ?? [...notifiers.values()][0];
  if (notify) {
    // Cada vez que la impresora manda un valor por esta característica,
    // dispara este evento. Así nos enteramos cuándo debemos pausar el envío.
    notify.addEventListener("characteristicvaluechanged", (e) => {
      const h = hex((e.target as BluetoothRemoteGATTCharacteristic).value!);
      log(`← Respuesta de la impresora: ${h}`);
      if (h === FLOW_PAUSE) paused = true;
      else if (h === FLOW_RESUME) paused = false;
    });
    await notify.startNotifications().catch((e) => log(`No se pudo activar notificaciones: ${e}`));
  } else {
    log("Sin característica de notificación");
  }
  return writer;
}

// Manda un bloque de datos, partido en paquetes de CHUNK bytes (Bluetooth
// no deja mandar mensajes arbitrariamente largos de una sola vez).
async function send(w: BluetoothRemoteGATTCharacteristic, data: Uint8Array) {
  const withResponse = w.properties.write; // más lento pero reporta errores
  for (let i = 0; i < data.length; i += CHUNK) {
    const t0 = Date.now();
    // Si la impresora pidió pausa, esperamos (revisando cada 20ms) hasta que
    // avise que puede seguir, o hasta que pasen 5 segundos sin respuesta.
    while (paused) {
      if (Date.now() - t0 > PAUSE_TIMEOUT) {
        paused = false;
        log("⚠ La impresora no reanudó el flujo en 5 s; se continúa igual");
        break;
      }
      await sleep(20);
    }
    const chunk = data.slice(i, i + CHUNK);
    if (withResponse) await w.writeValueWithResponse(chunk);
    else {
      await w.writeValueWithoutResponse(chunk);
      await sleep(8); // pequeña pausa para no saturar el buffer de la impresora
    }
  }
}

// Punto de entrada común para "imprimir de verdad" y "prueba de texto":
// valida que Bluetooth esté disponible, ejecuta el trabajo, y si algo falla
// deja la conexión limpia para que el próximo intento vuelva a conectar bien.
async function run(job: () => Promise<void>, logger: Log) {
  log = (line) => {
    console.log("[impresora]", line);
    logger(line); // además de la consola del navegador, guarda la línea para el modal de diagnóstico
  };
  if (!isSupported()) throw new Error("Este navegador no soporta Web Bluetooth (usá Chrome o Edge)");
  if (!(await navigator.bluetooth.getAvailability()))
    throw new Error("Este equipo no tiene Bluetooth disponible o está apagado.");
  try {
    await job();
  } catch (e) {
    // Fuerza reconexión limpia en el próximo intento.
    writer = null;
    device?.gatt?.disconnect();
    if (e instanceof DOMException && e.name === "NotFoundError")
      throw new Error("No se seleccionó ninguna impresora");
    throw e;
  }
}

async function printText(text: string) {
  const { bits, height } = textToBits(text); // dibuja el texto y lo convierte a bits (render.ts)
  log(`Imagen: ${height} líneas de 384 puntos`);
  const w = await ensureConnected();
  let total = 0;
  // buildJob (mxw.ts) devuelve la lista de cuadros del protocolo; los
  // mandamos uno por uno, en orden, respetando la pausa si la impresora la pide.
  for (const part of buildJob(bits, height)) {
    await send(w, part);
    total += part.length;
  }
  log(`✓ ${total} bytes enviados`);
}

/** Imprime un ticket (dibujado como imagen) en la impresora de 58 mm. */
export const printTicket = (text: string, logger: Log) => run(() => printText(text), logger);

/** Prueba corta con el mismo protocolo. */
export const printTextTest = (logger: Log) =>
  run(() => printText("PRUEBA DE IMPRESION\n1234567890"), logger);

export function disconnectPrinter() {
  device?.gatt?.disconnect();
  writer = null;
}
