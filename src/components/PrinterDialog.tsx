"use client";

export interface DialogState {
  kind: "error" | "ok";
  title: string;
  message: string;
  log: string[];
}

interface Props {
  state: DialogState;
  busy: boolean;
  onTextTest: () => void;
  onClose: () => void;
}

export default function PrinterDialog({ state, busy, onTextTest, onClose }: Props) {
  const isError = state.kind === "error";

  return (
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
