"use client";

import { useState } from "react";
import { ticketText } from "@/lib/format";
import { printTicket } from "@/lib/printer/ble";
import type { Order } from "@/lib/types";

const btn =
  "mt-3 rounded-lg border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100 print:hidden";

export default function OrderTicket({ order }: { order: Order }) {
  const [copied, setCopied] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState("");
  const text = ticketText(order);

  async function printBluetooth() {
    setPrinting(true);
    setError("");
    try {
      await printTicket(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo imprimir");
    } finally {
      setPrinting(false);
    }
  }

  return (
    <article id={`t-${order.id}`} className="ticket rounded-2xl bg-white p-4 shadow">
      <pre className="w-fit font-mono text-xs leading-relaxed">{text}</pre>
      <button
        onClick={printBluetooth}
        disabled={printing}
        className="mt-3 rounded-lg bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50 print:hidden"
      >
        {printing ? "Imprimiendo…" : "Imprimir (Bluetooth)"}
      </button>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className={`ml-2 ${btn}`}
      >
        {copied ? "¡Copiado!" : "Copiar ticket"}
      </button>
      <button
        onClick={() => {
          const el = document.getElementById(`t-${order.id}`);
          el?.setAttribute("data-print", "");
          window.print();
          el?.removeAttribute("data-print");
        }}
        className={`ml-2 ${btn}`}
      >
        Imprimir (navegador)
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600 print:hidden">
          {error}
        </p>
      )}
    </article>
  );
}
