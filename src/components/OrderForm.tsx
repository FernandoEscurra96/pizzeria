"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DELIVERY_FEE, MENU, feeFor } from "@/lib/menu";
import { gs } from "@/lib/format";
import {
  DELIVERY_TYPES,
  PAYMENT_METHODS,
  type DeliveryType,
  type PaymentMethod,
} from "@/lib/types";

const input =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500";

export default function OrderForm() {
  const router = useRouter();
  const [customer, setCustomer] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [payment, setPayment] = useState<PaymentMethod>("Transferencia");
  const [delivery, setDelivery] = useState<DeliveryType>("Delivery");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const items = MENU.filter((m) => (qty[m.name] ?? 0) > 0).map((m) => ({
    name: m.name,
    quantity: qty[m.name],
    unitPrice: m.price,
  }));
  const total =
    items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) + feeFor(delivery);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer, items, paymentMethod: payment, deliveryType: delivery, address }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json()).error ?? "Error al guardar");
    setCustomer("");
    setQty({});
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

      <fieldset className="space-y-2">
        <legend className="text-sm">Productos</legend>
        {MENU.map((m) => (
          <div key={m.name} className="flex items-center justify-between gap-3 text-sm">
            <span>
              {m.name} <span className="text-neutral-500">· {gs(m.price)}</span>
            </span>
            <input
              type="number"
              min={0}
              aria-label={`Cantidad ${m.name}`}
              className="w-20 rounded-lg border border-neutral-300 px-2 py-1"
              value={qty[m.name] ?? 0}
              onChange={(e) => setQty({ ...qty, [m.name]: Math.max(0, Math.floor(+e.target.value || 0)) })}
            />
          </div>
        ))}
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
        <label className="block text-sm">
          Dirección
          <input className={input} value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
      )}

      <div className="flex items-center justify-between border-t pt-3 text-sm">
        <span className="text-neutral-500">
          {delivery === "Delivery" && `Incluye delivery ${gs(DELIVERY_FEE)}`}
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
