"use client";

// ============================================================================
// TICKET DE UN PEDIDO (texto + botones de acción)
// ----------------------------------------------------------------------------
// "use client": necesita estado (para el mensaje "¡Copiado!" y el modal de
// diagnóstico) y APIs del navegador (portapapeles, impresión, Bluetooth).
//
// Recibe un `order` ya armado desde el servidor (ver src/app/page.tsx) y
// ofrece 3 acciones: imprimir por Bluetooth en la impresora térmica, copiar
// el texto del ticket, o imprimirlo con el diálogo normal del navegador.
// ============================================================================

import { useState } from "react";
import { ticketText } from "@/lib/format";
import { printTextTest, printTicket } from "@/lib/printer/ble";
import type { Order } from "@/lib/types";
import PrinterDialog, { type DialogState } from "./PrinterDialog";

const btn =
  "mt-3 rounded-lg border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100 print:hidden";

// Convierte cualquier error (de red, de Bluetooth, o un Error normal de JS)
// en un texto legible. `instanceof` chequea de qué "clase" es el objeto.
const errorText = (e: unknown) =>
  e instanceof DOMException
    ? `${e.name}: ${e.message}`
    : e instanceof Error
      ? e.message
      : "Error desconocido";

export default function OrderTicket({ order }: { order: Order }) {
  const [copied, setCopied] = useState(false);
  const [printing, setPrinting] = useState(false);
  // `DialogState | null`: no hay modal (null) o hay uno con estos datos.
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const text = ticketText(order); // el texto del ticket se recalcula en cada render, es barato

  // Función compartida por "imprimir de verdad" y "prueba de texto": arma el
  // modal de resultado (éxito o error) a partir de lo que haga `job`.
  // `job` recibe una función `log` para ir juntando líneas de diagnóstico.
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
    // El `id` único permite que el botón "Imprimir (navegador)" encuentre
    // este ticket puntual en el DOM y lo marque para imprimir solo ese.
    <article id={`t-${order.id}`} className="ticket rounded-2xl bg-white p-4 shadow">
      {/* <pre> conserva los espacios y saltos de línea tal cual, así el
          alineado de columnas de ticketText() se ve igual que en el papel. */}
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
          // API del navegador para copiar texto al portapapeles del sistema.
          await navigator.clipboard.writeText(text);
          setCopied(true);
          // setTimeout: después de 1.5s, vuelve el botón a su texto normal.
          setTimeout(() => setCopied(false), 1500);
        }}
        className={`ml-2 ${btn}`}
      >
        {copied ? "¡Copiado!" : "Copiar ticket"}
      </button>
      <button
        onClick={() => {
          // window.print() abre el diálogo de impresión del navegador para
          // TODA la página; por eso marcamos con data-print solo este ticket,
          // y el CSS de globals.css oculta el resto mientras se imprime.
          const el = document.getElementById(`t-${order.id}`);
          el?.setAttribute("data-print", "");
          window.print();
          el?.removeAttribute("data-print");
        }}
        className={`ml-2 ${btn}`}
      >
        Imprimir (navegador)
      </button>

      {/* El modal solo existe en el DOM cuando `dialog` no es null. */}
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
