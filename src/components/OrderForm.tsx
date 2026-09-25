"use client";

// ============================================================================
// FORMULARIO "NUEVO PEDIDO"
// ----------------------------------------------------------------------------
// "use client" es lo primero del archivo: marca este módulo como un "Client
// Component". A diferencia de src/app/page.tsx (que corre en el servidor),
// todo lo de aquí corre en el navegador de quien está usando la app: puede
// usar useState, escuchar clicks, y hacer fetch a nuestras propias rutas de
// API (/api/orders, /api/customers) para hablar con el servidor.
// ============================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import CustomerPicker from "@/components/CustomerPicker";
import { DEFAULT_DELIVERY_FEE, MENU, priceOf } from "@/lib/menu";
import { gs } from "@/lib/format";
import { DELIVERY_TYPES, PAYMENT_METHODS, type DeliveryType, type PaymentMethod } from "@/lib/types";

// Una "línea" de pizza en el formulario (no confundir con OrderItem: esto es
// solo el estado de la UI mientras se completa el pedido; recién al enviar se
// convierte en los ítems reales que espera la API).
interface Line {
  id: number; // id local, solo para que React distinga una línea de otra (prop `key`)
  qty: number;
  half: boolean; // ¿es mitad y mitad?
  f1: string; // sabor de la primera mitad (o el único sabor, si no es mitad y mitad)
  f2: string; // sabor de la segunda mitad (se ignora si half === false)
}

let nextId = 1; // contador simple para generar ids únicos de línea (vive fuera del componente)
const newLine = (): Line => ({ id: nextId++, qty: 1, half: false, f1: MENU[0].name, f2: MENU[1].name });
// Devuelve 1 sabor, o 2 si es mitad y mitad (según cómo esté armado priceOf/itemName en menu.ts).
const flavorsOf = (l: Line) => (l.half ? [l.f1, l.f2] : [l.f1]);

// Clase de Tailwind reutilizada por varios inputs/selects del formulario, para
// no repetir la misma cadena larga en cada uno.
const input =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500";

export default function OrderForm() {
  const router = useRouter(); // permite refrescar los datos de la página después de guardar

  // Cada `useState` es un pedacito de estado que, al cambiar, hace que React
  // vuelva a dibujar este componente con el valor nuevo.
  const [customer, setCustomer] = useState("");
  const [lines, setLines] = useState<Line[]>([newLine()]); // arranca con 1 pizza vacía
  const [payment, setPayment] = useState<PaymentMethod>("Transferencia");
  const [delivery, setDelivery] = useState<DeliveryType>("Delivery");
  const [address, setAddress] = useState("");
  const [fee, setFee] = useState(DEFAULT_DELIVERY_FEE);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false); // true mientras se está guardando (deshabilita el botón)

  // Actualiza una sola línea del arreglo `lines`, dejando las demás intactas.
  // `Partial<Line>` = un objeto con solo los campos que cambian (no hace
  // falta pasar la línea entera para modificar, por ejemplo, solo `qty`).
  const update = (id: number, patch: Partial<Line>) =>
    setLines(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  // Estos valores NO están en un useState: se recalculan en cada render a
  // partir de `lines`/`delivery`/`fee`. No hace falta guardarlos aparte
  // porque siempre se pueden derivar de nuevo (evita que queden desactualizados).
  const items = lines.map((l) => ({ quantity: l.qty, flavors: flavorsOf(l) }));
  const subtotal = lines.reduce((s, l) => s + l.qty * (priceOf(flavorsOf(l)) ?? 0), 0);
  const total = subtotal + (delivery === "Delivery" ? fee : 0);

  // Se ejecuta al tocar "Guardar pedido". `React.FormEvent` es el tipo del
  // evento que dispara un <form onSubmit={...}>.
  async function submit(e: React.FormEvent) {
    e.preventDefault(); // sin esto, el navegador recargaría toda la página
    setBusy(true);
    setError("");
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // JSON.stringify convierte el objeto de JS en texto JSON, que es lo
      // que espera recibir el Route Handler (src/app/api/orders/route.ts).
      body: JSON.stringify({ customer, items, paymentMethod: payment, deliveryType: delivery, address, deliveryFee: fee }),
    });
    setBusy(false);
    // Si el servidor respondió con un error (400, 500...), `res.ok` es false.
    if (!res.ok) return setError((await res.json()).error ?? "Error al guardar");

    // Pedido guardado: se limpia el formulario para el próximo.
    setCustomer("");
    setLines([newLine()]);
    setAddress("");
    // router.refresh() le pide a Next.js que vuelva a ejecutar el Server
    // Component de la página ("/") y traiga la lista de pedidos actualizada,
    // sin perder el estado de este formulario ni recargar todo el navegador.
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-5 shadow">
      <h2 className="text-lg font-semibold">Nuevo pedido</h2>

      <label className="block text-sm">
        Cliente
        {/* Todo el filtrado, alta y edición de clientes vive adentro de
            CustomerPicker; este formulario solo le pasa el nombre actual y
            recibe de vuelta la dirección/delivery para autocompletar. */}
        <CustomerPicker
          name={customer}
          onNameChange={setCustomer}
          onApply={({ address, deliveryFee }) => {
            setAddress(address);
            setFee(deliveryFee);
          }}
        />
      </label>

      <fieldset className="space-y-3">
        <legend className="text-sm">Pizzas</legend>
        {/* Recorremos cada línea de pizza y dibujamos sus controles.
            `key={l.id}` es el id que ayuda a React a no confundir una línea con otra. */}
        {lines.map((l) => {
          const flavors = flavorsOf(l);
          const same = l.half && l.f1 === l.f2; // mitad y mitad con el mismo sabor 2 veces: inválido
          return (
            <div key={l.id} className="space-y-2 rounded-xl border border-neutral-200 p-3 text-sm">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  aria-label="Cantidad"
                  className="w-16 rounded-lg border border-neutral-300 px-2 py-2"
                  value={l.qty}
                  onChange={(e) => update(l.id, { qty: Math.max(1, Math.floor(+e.target.value || 1)) })}
                />
                <select
                  aria-label={l.half ? "Sabor primera mitad" : "Sabor"}
                  className={input}
                  value={l.f1}
                  onChange={(e) => update(l.id, { f1: e.target.value })}
                >
                  {MENU.map((m) => <option key={m.name}>{m.name}</option>)}
                </select>
                {/* Solo se puede quitar una línea si hay más de una (siempre
                    debe quedar al menos 1 pizza en el pedido). */}
                {lines.length > 1 && (
                  <button
                    type="button" // "button" evita que este botón envíe el <form> por error
                    aria-label="Quitar pizza"
                    onClick={() => setLines(lines.filter((x) => x.id !== l.id))}
                    className="rounded-lg px-2 py-1 text-neutral-500 hover:bg-neutral-100"
                  >
                    ✕
                  </button>
                )}
              </div>

              <label className="flex items-center gap-2">
                <input type="checkbox" checked={l.half} onChange={(e) => update(l.id, { half: e.target.checked })} />
                Mitad y mitad (2 sabores)
              </label>

              {/* Renderizado condicional: el segundo <select> solo aparece si
                  `l.half` es true. En JSX, `{condición && <algo/>}` es la
                  forma habitual de mostrar u ocultar partes de la interfaz. */}
              {l.half && (
                <select
                  aria-label="Sabor segunda mitad"
                  className={input}
                  value={l.f2}
                  onChange={(e) => update(l.id, { f2: e.target.value })}
                >
                  {MENU.map((m) => <option key={m.name}>{m.name}</option>)}
                </select>
              )}

              <p className={`text-xs ${same ? "text-red-600" : "text-neutral-500"}`}>
                {same
                  ? "Elegí dos sabores distintos"
                  : `${l.qty} × ${gs(priceOf(flavors) ?? 0)}${l.half ? " (se cobra la mitad más cara)" : ""}`}
              </p>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => setLines([...lines, newLine()])}
          className="w-full rounded-lg border border-dashed border-neutral-400 py-2 text-sm hover:bg-neutral-50"
        >
          + Agregar pizza
        </button>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          Forma de pago
          {/* `e.target.value as PaymentMethod`: el navegador siempre da un
              string; el "as" le dice a TypeScript "confiá en que este string
              es uno de los valores válidos de PaymentMethod" (lo es, porque
              las <option> vienen justamente de PAYMENT_METHODS). */}
          <select className={input} value={payment} onChange={(e) => setPayment(e.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          Entrega
          <select className={input} value={delivery} onChange={(e) => setDelivery(e.target.value as DeliveryType)}>
            {DELIVERY_TYPES.map((d) => <option key={d}>{d}</option>)}
          </select>
        </label>
      </div>

      {/* Dirección y delivery solo se piden si el pedido es "Delivery" (si es
          "Retiro", no hacen falta). */}
      {delivery === "Delivery" && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            Dirección
            <input className={input} value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>
          <label className="block text-sm">
            Delivery (Gs)
            <input
              type="number"
              min={0}
              step={1000}
              className={input}
              value={fee}
              onChange={(e) => setFee(Math.max(0, Math.floor(+e.target.value || 0)))}
            />
          </label>
        </div>
      )}

      <div className="flex items-center justify-between border-t pt-3 text-sm">
        <span className="text-neutral-500">
          {delivery === "Delivery" && `Incluye delivery ${gs(fee)}`}
        </span>
        <strong className="text-base">TOTAL: {gs(total)}</strong>
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <button
        disabled={busy}
        className="w-full rounded-lg bg-red-600 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {busy ? "Guardando…" : "Guardar pedido"}
      </button>
    </form>
  );
}
