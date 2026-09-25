// ============================================================================
// PÁGINA PRINCIPAL ("/") — Server Component
// ----------------------------------------------------------------------------
// Este archivo no tiene "use client" al principio, así que es un "Server
// Component": el código de esta función se ejecuta en el SERVIDOR (Node),
// nunca en el navegador del cliente. Por eso puede usar `await listOrders()`
// directamente (que habla con Supabase) sin pasar por una API. El HTML que
// arma esta función ya sale listo desde el servidor.
//
// En cambio, <OrderForm /> y <OrderTicket /> SÍ son "use client" (mirá esos
// archivos): esos necesitan interactividad en el navegador (botones, estado,
// Bluetooth), así que se hidratan como componentes de React normales ahí.
// Un Server Component puede renderizar Client Components sin problema; al
// revés (un Client Component importando uno de servidor) no se puede.
// ============================================================================

import Link from "next/link"; // <Link> navega entre páginas sin recargar todo el sitio
import OrderForm from "@/components/OrderForm";
import OrderTicket from "@/components/OrderTicket";
import { listOrders } from "@/lib/orders";

// Por defecto, Next intenta "pre-renderizar" páginas como HTML estático en el
// build, para que carguen más rápido. Pero esta página muestra pedidos que
// cambian todo el tiempo, así que forzamos que se genere de nuevo en CADA
// visita (`force-dynamic`), consultando siempre los datos más recientes.
export const dynamic = "force-dynamic";

// Un Server Component puede ser `async`: React espera a que termine antes de
// mandar el HTML. Así conseguimos datos del servidor sin useEffect ni fetch.
export default async function Home() {
  let orders: Awaited<ReturnType<typeof listOrders>> = [];
  let dbError = "";
  try {
    orders = await listOrders();
  } catch (e) {
    // Si Supabase falla (sin conexión, tabla borrada, etc.), no rompemos toda
    // la página: mostramos el error abajo y el formulario sigue funcionando.
    dbError = e instanceof Error ? e.message : "No se pudo conectar con la base de datos";
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-6 p-6 md:grid-cols-2">
      <header className="flex items-center justify-between md:col-span-2">
        <h1 className="text-3xl font-bold">🍕 Pizzería · Pedidos</h1>
        <Link href="/clientes" className="text-sm text-red-600 hover:underline">
          Clientes →
        </Link>
      </header>

      {/* Formulario para crear un pedido nuevo (columna izquierda en pantallas grandes) */}
      <OrderForm />

      {/* Lista de pedidos ya guardados (columna derecha) */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Pedidos ({orders.length})</h2>

        {dbError && (
          <p role="alert" className="text-sm text-red-600">
            No se pudieron cargar los pedidos: {dbError}
          </p>
        )}

        {/* `&&` en JSX: si la condición de la izquierda es falsa, no se renderiza nada */}
        {!dbError && orders.length === 0 && (
          <p className="text-sm text-neutral-500">Aún no hay pedidos.</p>
        )}

        {/* .map() recorre el arreglo de pedidos y devuelve un <OrderTicket> por cada uno.
            El prop `key` es obligatorio en listas de React: le permite saber qué
            elemento cambió, se agregó o se borró, sin volver a dibujar todo. */}
        {orders.map((o) => <OrderTicket key={o.id} order={o} />)}
      </section>
    </main>
  );
}
