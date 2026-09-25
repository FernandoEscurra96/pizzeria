"use client";

// ============================================================================
// GESTOR DE CLIENTES (pantalla /clientes)
// ----------------------------------------------------------------------------
// "use client": necesita estado (useState) y efectos (useEffect) para
// sondear cambios, cosas que no existen en un Server Component.
//
// Recibe la lista inicial de clientes como prop `initial` (ya cargada en el
// servidor por src/app/clientes/page.tsx), y a partir de ahí se vuelve
// autónomo: agrega, edita y se sincroniza sola cada 5 segundos por si otro
// dispositivo (otro teléfono, por ejemplo) editó algo mientras tanto.
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import CustomerFields from "@/components/CustomerFields";
import { gs } from "@/lib/format";
import type { Customer, CustomerInput } from "@/lib/types";

const POLL_MS = 5000; // sincroniza con lo que edite otro dispositivo

const emptyForm: CustomerInput = { name: "", address: "", deliveryFee: 10000 };

// Igual que en CustomerPicker: una sola función para crear (POST) o editar
// (PATCH), según si recibe un `id`.
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

const byName = (a: Customer, b: Customer) => a.name.localeCompare(b.name);

// Una fila de la lista: puede estar "en reposo" (solo texto + botón Editar) o
// "en edición" (con el formulario abierto). `editing` decide cuál de las dos
// vistas se dibuja; es un componente aparte porque cada fila necesita su
// propio estado de edición, independiente de las demás.
function Row({ customer, onSaved }: { customer: Customer; onSaved: (c: Customer) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<CustomerInput>(customer);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!editing)
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3 text-sm">
        <div>
          <p className="font-medium">{customer.name}</p>
          <p className="text-neutral-500">
            {customer.address || "(sin dirección)"} · Delivery {gs(customer.deliveryFee)}
          </p>
        </div>
        <button
          onClick={() => {
            // Toma los datos vigentes (por si el sondeo trajo cambios de otro dispositivo).
            setForm(customer);
            setEditing(true);
          }}
          className="rounded-lg border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100"
        >
          Editar
        </button>
      </div>
    );

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault(); // evita que el navegador recargue la página al enviar el <form>
        setBusy(true);
        setError("");
        try {
          onSaved(await save(form, customer.id));
          setEditing(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error al guardar");
        } finally {
          setBusy(false);
        }
      }}
      className="space-y-2 rounded-xl border border-red-300 p-3 text-sm"
    >
      <CustomerFields form={form} onChange={(patch) => setForm({ ...form, ...patch })} />
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100"
        >
          Cancelar
        </button>
        <button
          disabled={busy}
          className="rounded-lg bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
        >
          {busy ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

export default function CustomerManager({ initial }: { initial: Customer[] }) {
  // `useState(initial)`: arranca con lo que ya vino del servidor; a partir de
  // ahí, este estado vive solo en el navegador y el servidor ya no lo toca.
  const [customers, setCustomers] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState<CustomerInput>(emptyForm);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // `useCallback` memoriza la función entre renders, para que el `useEffect`
  // de abajo (que la usa como dependencia) no la vea como "nueva" en cada
  // render y reinicie el intervalo sin necesidad.
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/customers");
      if (res.ok) setCustomers(await res.json());
    } catch {
      // silencioso: si falla, el próximo sondeo lo vuelve a intentar
    }
  }, []);

  // Sondeo ("polling"): cada POLL_MS milisegundos, vuelve a pedir la lista al
  // servidor. Es una forma simple de simular "tiempo real" sin necesitar
  // WebSockets. El `return () => clearInterval(id)` es la función de
  // limpieza de useEffect: se ejecuta si el componente desaparece de
  // pantalla, para no dejar un temporizador corriendo en el vacío.
  useEffect(() => {
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <div className="space-y-3">
      {customers.length === 0 && (
        <p className="text-sm text-neutral-500">Todavía no hay clientes guardados.</p>
      )}
      {customers.map((c) => (
        <Row
          key={c.id}
          customer={c}
          onSaved={(updated) =>
            // Reemplaza, dentro del arreglo, solo el cliente que se editó
            // (comparando por id) y deja el resto sin tocar.
            setCustomers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)).sort(byName))
          }
        />
      ))}

      {adding ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const created = await save(newForm);
              setCustomers((prev) => [...prev, created].sort(byName));
              setNewForm(emptyForm);
              setAdding(false);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Error al guardar");
            } finally {
              setBusy(false);
            }
          }}
          className="space-y-2 rounded-xl border border-red-300 p-3 text-sm"
        >
          <CustomerFields form={newForm} onChange={(patch) => setNewForm({ ...newForm, ...patch })} />
          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-lg border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100"
            >
              Cancelar
            </button>
            <button
              disabled={busy}
              className="rounded-lg bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full rounded-lg border border-dashed border-neutral-400 py-2 text-sm hover:bg-neutral-50"
        >
          + Agregar cliente
        </button>
      )}
    </div>
  );
}
