// ============================================================================
// MODAL DE RESULTADO DE IMPRESIÓN
// ----------------------------------------------------------------------------
// Componente puramente visual (no tiene estado propio ni hace fetch): todo lo
// que muestra viene por props desde OrderTicket.tsx, que es quien decide
// cuándo abrirlo y qué mensaje mostrar (éxito o error).
// ============================================================================

// `export interface` + `export default function`: este archivo exporta dos
// cosas a la vez, el tipo de datos que necesita el modal y el componente.
export interface DialogState {
  kind: "error" | "ok"; // decide el color del título (rojo o verde)
  title: string;
  message: string;
  log: string[]; // líneas de diagnóstico (qué característica Bluetooth se usó, bytes enviados, etc.)
}

interface Props {
  state: DialogState;
  busy: boolean; // true mientras se está reintentando "Prueba de texto"
  onTextTest: () => void;
  onClose: () => void;
}

export default function PrinterDialog({ state, busy, onTextTest, onClose }: Props) {
  const isError = state.kind === "error";

  return (
    // `role="alertdialog"` y `aria-modal` son atributos de accesibilidad: le
    // avisan a lectores de pantalla que esto es un diálogo que interrumpe el
    // flujo normal de la página (equivalente semántico de un modal).
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="printer-dialog-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center print:hidden"
    >
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white p-5 shadow-xl">
        <h3
          id="printer-dialog-title"
          className={`text-lg font-semibold ${isError ? "text-red-600" : "text-green-700"}`}
        >
          {isError ? "⚠ " : "✓ "}
          {state.title}
        </h3>
        <p className="mt-1 text-sm">{state.message}</p>

        <p className="mt-3 text-xs font-medium text-neutral-500">Diagnóstico</p>
        {/* `state.log.join("\n")` convierte el arreglo de líneas en un solo
            texto con saltos de línea, para mostrarlo dentro de un <pre>. */}
        <pre className="mt-1 max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-neutral-100 p-2 text-[11px] leading-snug">
          {state.log.join("\n") || "(sin registros)"}
        </pre>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            onClick={() => navigator.clipboard?.writeText(state.log.join("\n"))}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
          >
            Copiar diagnóstico
          </button>
          <button
            onClick={onTextTest}
            disabled={busy}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-50"
          >
            {busy ? "Enviando…" : "Prueba de texto"}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
