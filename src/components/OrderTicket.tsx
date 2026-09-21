"use client";

import { useState } from "react";
import { ticketText } from "@/lib/format";
import { printTextTest, printTicket } from "@/lib/printer/ble";
import type { Order } from "@/lib/types";
import PrinterDialog, { type DialogState } from "./PrinterDialog";

const btn =
  "mt-3 rounded-lg border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100 print:hidden";

const errorText = (e: unknown) =>
  e instanceof DOMException
    ? `${e.name}: ${e.message}`
    : e instanceof Error
      ? e.message
      : "Error desconocido";

export default function OrderTicket({ order }: { order: Order }) {
  const [copied, setCopied] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const text = ticketText(order);

  async function run(job: (log: (l: string) => void) => Promise<void>, okTitle: string) {
    const lines: string[] = [];
    setPrinting(true);
    try {
      await job((l) => lines.push(l));
      setDialog({
        kind: "ok",
        title: okTitle,
        message: "Los datos se enviaron a la impresora. ¿Salió el papel? Si no, revisá el diagnóstico.",
        log: lines,
      });
    } catch (e) {
      lines.push(`✗ ${errorText(e)}`);
      setDialog({
        kind: "error",
        title: "No se pudo imprimir",
        message: errorText(e),
        log: lines,
      });
    } finally {
      setPrinting(false);
    }
  }

  return (
    <article id={`t-${order.id}`} className="ticket rounded-2xl bg-white p-4 shadow">
      <pre className="w-fit font-mono text-xs leading-relaxed">{text}</pre>
      <button
        onClick={() => run((log) => printTicket(text, log), "Enviado a la impresora")}
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

      {dialog && (
        <PrinterDialog
          state={dialog}
          busy={printing}
          onTextTest={() => run((log) => printTextTest(log), "Prueba enviada")}
          onClose={() => setDialog(null)}
        />
      )}
    </article>
  );
}
