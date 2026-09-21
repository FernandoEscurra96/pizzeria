import { buildJob, init, feed } from "./escpos";
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
const priority = (uuid: string) => {
  const i = SERVICES.indexOf(uuid);
  return i === -1 ? SERVICES.length : i;
};

// Notificaciones de control de flujo (pausa / continuar) que envía la impresora.
const FLOW_PAUSE = "5178ae0101001070ff";
const FLOW_RESUME = "5178ae0101000000ff";

const CHUNK = 20; // MTU BLE por defecto
const PAUSE_TIMEOUT = 5000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hex = (v: DataView) =>
  Array.from(new Uint8Array(v.buffer, v.byteOffset, v.byteLength), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
const propsOf = (c: BluetoothRemoteGATTCharacteristic) =>
  (["read", "write", "writeWithoutResponse", "notify", "indicate"] as const)
    .filter((k) => c.properties[k])
    .join(",");
const short = (uuid: string) => uuid.replace("-0000-1000-8000-00805f9b34fb", "");

export const isSupported = () => typeof navigator !== "undefined" && "bluetooth" in navigator;

let device: BluetoothDevice | null = null;
let writer: BluetoothRemoteGATTCharacteristic | null = null;
let paused = false;
let log: Log = () => {};

async function ensureConnected(): Promise<BluetoothRemoteGATTCharacteristic> {
  if (device?.gatt?.connected && writer) {
    log(`Reutilizando conexión con "${device.name}"`);
    return writer;
  }

  if (!device) {
    log("Abriendo selector de dispositivos…");
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

  let chosen: { c: BluetoothRemoteGATTCharacteristic; s: BluetoothRemoteGATTService } | null = null;
  let fallback: typeof chosen = null;
  const notifiers = new Map<string, BluetoothRemoteGATTCharacteristic>();

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

  chosen ??= fallback;
  if (!chosen) throw new Error("La impresora no tiene ninguna característica de escritura");
  writer = chosen.c;
  log(`Escritura en: ${short(chosen.s.uuid)} / ${short(chosen.c.uuid)}`);

  const notify = notifiers.get(chosen.s.uuid) ?? [...notifiers.values()][0];
  if (notify) {
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

async function send(w: BluetoothRemoteGATTCharacteristic, data: Uint8Array) {
  const withResponse = w.properties.write; // más lento pero reporta errores
  for (let i = 0; i < data.length; i += CHUNK) {
    const t0 = Date.now();
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
      await sleep(8);
    }
  }
}

async function run(job: () => Promise<void>, logger: Log) {
  log = (line) => {
    console.log("[impresora]", line);
    logger(line);
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

/** Imprime un ticket de texto (como imagen) en la impresora de 58 mm. */
export const printTicket = (text: string, logger: Log) =>
  run(async () => {
    const { bits, height } = textToBits(text);
    log(`Ticket: ${height} líneas de 384 puntos`);
    const w = await ensureConnected();
    let total = 0;
    for (const part of buildJob(bits, height)) {
      await send(w, part);
      total += part.length;
    }
    log(`✓ ${total} bytes enviados. Si no salió papel, probá "Prueba de texto".`);
  }, logger);

/** Prueba mínima: texto ASCII plano, sin imágenes. */
export const printTextTest = (logger: Log) =>
  run(async () => {
    const w = await ensureConnected();
    const body = new TextEncoder().encode("PRUEBA DE IMPRESION\n1234567890\n");
    const data = new Uint8Array([...init(), ...body, ...feed(3)]);
    await send(w, data);
    log(`✓ ${data.length} bytes de texto enviados`);
  }, logger);

export function disconnectPrinter() {
  device?.gatt?.disconnect();
  writer = null;
}
