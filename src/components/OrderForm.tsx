"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_DELIVERY_FEE, MENU, priceOf } from "@/lib/menu";
import { gs } from "@/lib/format";
import {
  DELIVERY_TYPES,
  PAYMENT_METHODS,
  type DeliveryType,
  type PaymentMethod,
} from "@/lib/types";

interface Line {
  id: number;
  qty: number;
  half: boolean;
  f1: string;
  f2: string;
}

let nextId = 1;
const newLine = (): Line => ({ id: nextId++, qty: 1, half: false, f1: MENU[0].name, f2: MENU[1].name });
const flavorsOf = (l: Line) => (l.half ? [l.f1, l.f2] : [l.f1]);

const input =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500";

export default function OrderForm() {
  const router = useRouter();
  const [customer, setCustomer] = useState("");
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [payment, setPayment] = useState<PaymentMethod>("Transferencia");
  const [delivery, setDelivery] = useState<DeliveryType>("Delivery");
  const [address, setAddress] = useState("");
  const [fee, setFee] = useState(DEFAULT_DELIVERY_FEE);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const update = (id: number, patch: Partial<Line>) =>
    setLines(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const items = lines.map((l) => ({ quantity: l.qty, flavors: flavorsOf(l) }));
  const subtotal = lines.reduce((s, l) => s + l.qty * (priceOf(flavorsOf(l)) ?? 0), 0);
  const total = subtotal + (delivery === "Delivery" ? fee : 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer, items, paymentMethod: payment, deliveryType: delivery, address, deliveryFee: fee }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json()).error ?? "Error al guardar");
    setCustomer("");
    setLines([newLine()]);
    setAddress("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-5 shadow">
      <h2 className="text-lg font-semibold">Nuevo pedido</h2>

      <label className="block text-sm">
        Cliente
        <input className={input} value={customer} onChange={(e) => setCustomer(e.target.value)} />
      </label>

      <fieldset className="space-y-3">
        <legend className="text-sm">Pizzas</legend>
        {lines.map((l) => {
          const flavors = flavorsOf(l);
          const same = l.half && l.f1 === l.f2;
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
                {lines.length > 1 && (
                  <button
                    type="button"
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
