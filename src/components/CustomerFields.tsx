// ============================================================================
// CAMPOS DE UN CLIENTE (nombre, dirección, delivery)
// ----------------------------------------------------------------------------
// Componente chico y "tonto" (no tiene estado propio, no sabe nada de
// Supabase): solo dibuja los 3 inputs y avisa hacia afuera cuando algo
// cambia, vía la prop `onChange`. Se reutiliza en CustomerManager.tsx (alta y
// edición desde /clientes) y en CustomerPicker.tsx (alta y edición desde el
// propio formulario de pedidos), para no repetir el mismo JSX dos veces.
//
// Este archivo NO tiene "use client": no hace falta, porque no usa hooks
// (useState, useEffect, etc.). Next.js lo empaqueta igual en el navegador
// porque quien lo importa (CustomerManager, CustomerPicker) sí es "use client".
// ============================================================================

import type { CustomerInput } from "@/lib/types";

export const customerFieldInput =
  "w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500";

/** Los 3 campos de un cliente (nombre, dirección, delivery), compartidos entre formularios. */
export default function CustomerFields({
  form,
  onChange,
}: {
  form: CustomerInput;
  // `Partial<CustomerInput>` = un "parche": solo el campo que cambió, no el
  // objeto completo. Quien reciba este callback hace `{ ...form, ...patch }`
  // para combinarlo con lo que ya tenía.
  onChange: (patch: Partial<CustomerInput>) => void;
}) {
  return (
    <>
      {/* Un input "controlado": su valor SIEMPRE viene de `form.name` (nunca
          se edita solo), y cada tecla dispara onChange hacia el padre. Así el
          padre es la única fuente de verdad del valor actual. */}
      <input
        className={customerFieldInput}
        value={form.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Nombre"
        aria-label="Nombre"
      />
      <input
        className={customerFieldInput}
        value={form.address}
        onChange={(e) => onChange({ address: e.target.value })}
        placeholder="Dirección"
        aria-label="Dirección"
      />
      <input
        type="number"
        min={0}
        step={1000}
        className={customerFieldInput}
        value={form.deliveryFee}
        // +e.target.value convierte el texto del input a número; si el input
        // queda vacío, +"" da 0, y el `|| 0` cubre además el caso NaN.
        onChange={(e) => onChange({ deliveryFee: Math.max(0, Math.floor(+e.target.value || 0)) })}
        placeholder="Delivery (Gs)"
        aria-label="Delivery (Gs)"
      />
    </>
  );
}
