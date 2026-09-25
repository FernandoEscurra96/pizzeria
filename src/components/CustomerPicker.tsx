"use client";

// ============================================================================
// BUSCADOR DE CLIENTES (usado dentro de OrderForm)
// ----------------------------------------------------------------------------
// "use client" es obligatorio acá: este componente usa useState/useEffect y
// responde a eventos del navegador (escribir, hacer foco, hacer click), cosas
// que solo existen en el cliente, nunca en el servidor.
//
// Qué hace: a medida que se escribe en el input, filtra la lista de clientes
// ya guardados; al elegir uno, avisa al formulario padre (OrderForm) para que
// autocomplete dirección y delivery; si el nombre no existe, ofrece crearlo;
// si ya existe, ofrece editar sus datos ahí mismo, sin salir del formulario.
// ============================================================================

import { useEffect, useState } from "react";
import CustomerFields from "@/components/CustomerFields";
import { gs } from "@/lib/format";
import { DEFAULT_DELIVERY_FEE } from "@/lib/menu";
import type { Customer, CustomerInput } from "@/lib/types";

const input =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500";
const MAX_RESULTS = 8; // no mostramos más de 8 sugerencias, para no tapar toda la pantalla

// Función compartida por "crear" y "editar": según si le pasamos `id` o no,
// hace POST (crear) o PATCH (editar) contra la API de clientes.
async function save(body: CustomerInput, id?: string): Promise<Customer> {
  const res = await fetch(id ? `/api/customers/${id}` : "/api/customers", {
    method: id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al guardar");
  return data as Customer;
}

// Funciones chicas y puras (sin estado, sin efectos secundarios) para
// comparar nombres. Separarlas del componente hace más fácil leer el resto.
const byName = (a: Customer, b: Customer) => a.name.localeCompare(b.name);
const matches = (c: Customer, q: string) => c.name.toLowerCase().includes(q);
const sameName = (c: Customer, q: string) => c.name.trim().toLowerCase() === q;

interface Props {
  name: string; // el texto que el usuario escribió (lo controla OrderForm)
  onNameChange: (name: string) => void;
  /** Se llama al elegir, crear o editar un cliente, para volcar su dirección y delivery al pedido. */
  onApply: (fields: { address: string; deliveryFee: number }) => void;
}

/** Buscador de clientes: filtra al escribir, permite crear uno nuevo o editar el ya seleccionado. */
export default function CustomerPicker({ name, onNameChange, onApply }: Props) {
  // Estado propio de este componente (independiente del resto del formulario):
  const [customers, setCustomers] = useState<Customer[]>([]); // directorio completo
  const [open, setOpen] = useState(false); // ¿se muestra el listado desplegable?
  const [adding, setAdding] = useState(false); // ¿está abierto el panel "crear cliente"?
  const [editing, setEditing] = useState(false); // ¿está abierto el panel "editar cliente"?
  const [form, setForm] = useState<CustomerInput>({ name: "", address: "", deliveryFee: DEFAULT_DELIVERY_FEE });
  const [busy, setBusy] = useState(false); // deshabilita el botón mientras guarda
  const [error, setError] = useState("");

  // useEffect con un arreglo de dependencias vacío ([]) = "ejecutá esto una
  // sola vez, apenas el componente aparece en pantalla" (no en cada render).
  // Trae el directorio de clientes para poder filtrarlo del lado del cliente.
  useEffect(() => {
    fetch("/api/customers")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCustomers)
      .catch(() => {}); // si falla, el buscador simplemente queda vacío (no rompe el formulario)
  }, []);

  // Estos valores se recalculan en cada render a partir de `name` y
  // `customers`; no hace falta guardarlos en estado propio porque son 100%
  // derivables de otros datos que ya tenemos (evita tener que sincronizarlos).
  const query = name.trim().toLowerCase();
  const selected = query ? customers.find((c) => sameName(c, query)) : undefined;
  const filtered = (query ? customers.filter((c) => matches(c, query)) : customers).slice(0, MAX_RESULTS);

  // Elegir un cliente de la lista: completa el nombre y dispara el
  // autocompletado de dirección/delivery hacia el formulario padre.
  function pick(c: Customer) {
    onNameChange(c.name);
    onApply({ address: c.address, deliveryFee: c.deliveryFee });
    setOpen(false);
  }

  function startAdd() {
    setForm({ name: name.trim(), address: "", deliveryFee: DEFAULT_DELIVERY_FEE });
    setError("");
    setAdding(true);
  }

  function startEdit() {
    if (!selected) return;
    setForm(selected);
    setError("");
    setEditing(true);
  }

  async function submitAdd() {
    setBusy(true);
    setError("");
    try {
      const created = await save(form);
      // Actualiza el directorio en memoria sin volver a pedirlo al servidor:
      // agrega el nuevo cliente y lo deja todo ordenado alfabéticamente.
      setCustomers((prev) => [...prev, created].sort(byName));
      onNameChange(created.name);
      onApply({ address: created.address, deliveryFee: created.deliveryFee });
      setAdding(false);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      // `finally` corre siempre, haya salido bien o mal el `try`: perfecto
      // para apagar el estado "cargando" sin repetir la línea en el `catch`.
      setBusy(false);
    }
  }

  async function submitEdit() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const updated = await save(form, selected.id);
      setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)).sort(byName));
      onNameChange(updated.name);
      onApply({ address: updated.address, deliveryFee: updated.deliveryFee });
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="relative">
        <input
          className={input}
          value={name}
          onChange={(e) => {
            onNameChange(e.target.value);
            setOpen(true); // al escribir, siempre mostramos el listado filtrado
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)} // al hacer click afuera, se cierra
          placeholder="Escribí para buscar o agregar"
          aria-label="Cliente"
          autoComplete="off"
        />

        {open && (
          // onMouseDown con preventDefault evita que el input pierda foco (y cierre esto)
          // antes de que el click en un ítem llegue a registrarse. Sin esto, el
          // navegador dispararía "blur" en el input ANTES que "click" en el botón,
          // React ocultaría este panel, y el click nunca llegaría a su destino.
          <div
            onMouseDown={(e) => e.preventDefault()}
            className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-neutral-200 bg-white p-1 shadow-lg"
          >
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button" // sin esto, este <button> dentro de un <form> mandaría el formulario
                onClick={() => pick(c)}
                className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100"
              >
                <span className="font-medium">{c.name}</span>{" "}
                <span className="text-neutral-500">
                  · {c.address || "sin dirección"} · {gs(c.deliveryFee)}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-2 py-1.5 text-sm text-neutral-500">Sin coincidencias</p>
            )}
            {/* Solo se ofrece "agregar" cuando lo escrito no coincide con ningún
                cliente existente (si coincide, ya está en la lista de arriba). */}
            {query && !selected && (
              <button
                type="button"
                onClick={startAdd}
                className="mt-1 block w-full rounded-md border border-dashed border-neutral-300 px-2 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
              >
                + Agregar “{name.trim()}” como cliente nuevo
              </button>
            )}
          </div>
        )}
      </div>

      {/* Este botón vive FUERA del `{open && ...}`, así no desaparece cuando
          el listado se cierra (por ejemplo, apenas se elige un cliente). */}
      {selected && !adding && !editing && (
        <button
          type="button"
          onClick={startEdit}
          className="mt-1 text-xs text-red-600 hover:underline"
        >
          ✎ Editar datos de {selected.name}
        </button>
      )}

      {/* Un solo panel para los dos casos (crear y editar): comparten los mismos
          campos (CustomerFields) y solo cambia qué función dispara "Guardar". */}
      {(adding || editing) && (
        <div className="mt-2 space-y-2 rounded-xl border border-red-300 p-3 text-sm">
          <CustomerFields form={form} onChange={(patch) => setForm({ ...form, ...patch })} />
          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => (adding ? setAdding(false) : setEditing(false))}
              className="rounded-lg border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={adding ? submitAdd : submitEdit}
              className="rounded-lg bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? "Guardando…" : "Guardar cliente"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
