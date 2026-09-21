import { buildJob } from "./escpos";
import { textToBits } from "./render";

// Servicios BLE habituales en impresoras térmicas. Web Bluetooth exige declararlos
// para poder leerlos; Fun Print descubre el servicio dinámicamente, aquí lo imitamos.
const SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000fee7-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "0000ae30-0000-1000-8000-00805f9b34fb",
  "0000af30-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
];

// Notificaciones de control de flujo (pausa / continuar) que envía la impresora.
const FLOW_PAUSE = "5178ae0101001070ff";
const FLOW_RESUME = "5178ae0101000000ff";

const CHUNK = 20; // MTU BLE por defecto
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hex = (v: DataView) =>
  Array.from(new Uint8Array(v.buffer), (b) => b.toString(16).padStart(2, "0")).join("");

export const isSupported = () => typeof navigator !== "undefined" && "bluetooth" in navigator;

let device: BluetoothDevice | null = null;
let writer: BluetoothRemoteGATTCharacteristic | null = null;
let paused = false;

async function ensureConnected(): Promise<BluetoothRemoteGATTCharacteristic> {
  if (device?.gatt?.connected && writer) return writer;

  // La primera vez pide elegir la impresora; luego reutiliza la ya emparejada.
  if (!device) {
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: SERVICES,
    });
    device.addEventListener("gattserverdisconnected", () => (writer = null));
  }

  const server = await device.gatt!.connect();
  let notify: BluetoothRemoteGATTCharacteristic | null = null;
  writer = null;
  paused = false;

  for (const service of await server.getPrimaryServices()) {
    for (const c of await service.getCharacteristics()) {
      const p = c.properties;
      // Misma regla que la app: característica de escritura sin lectura.
      if (!writer && (p.write || p.writeWithoutResponse) && !p.read) writer = c;
      if (!notify && (p.notify || p.indicate)) notify = c;
    }
  }
  if (!writer) throw new Error("No se encontró una característica de escritura en la impresora");

  if (notify) {
    notify.addEventListener("characteristicvaluechanged", (e) => {
      const h = hex((e.target as BluetoothRemoteGATTCharacteristic).value!);
      if (h === FLOW_PAUSE) paused = true;
      else if (h === FLOW_RESUME) paused = false;
    });
    await notify.startNotifications().catch(() => {});
  }
  return writer;
}

async function send(w: BluetoothRemoteGATTCharacteristic, data: Uint8Array) {
  for (let i = 0; i < data.length; i += CHUNK) {
    while (paused) await sleep(20);
    const chunk = data.slice(i, i + CHUNK);
    if (w.properties.writeWithoutResponse) {
      await w.writeValueWithoutResponse(chunk);
      await sleep(8);
    } else {
      await w.writeValueWithResponse(chunk);
    }
  }
}

/** Imprime un ticket de texto en la impresora de 58 mm por Bluetooth. */
export async function printTicket(text: string): Promise<void> {
  if (!isSupported()) throw new Error("Este navegador no soporta Web Bluetooth (usá Chrome o Edge)");
  if (!(await navigator.bluetooth.getAvailability()))
    throw new Error(
      "Este equipo no tiene Bluetooth disponible. Activalo, conectá un adaptador USB o abrí la app desde un celular con Chrome.",
    );
  const { bits, height } = textToBits(text);
  let w: BluetoothRemoteGATTCharacteristic;
  try {
    w = await ensureConnected();
  } catch (e) {
    if (e instanceof DOMException && e.name === "NotFoundError")
      throw new Error("No se seleccionó ninguna impresora");
    throw e;
  }
  for (const part of buildJob(bits, height)) await send(w, part);
}

export function disconnectPrinter() {
  device?.gatt?.disconnect();
  writer = null;
}
