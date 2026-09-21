import OrderForm from "@/components/OrderForm";
import OrderTicket from "@/components/OrderTicket";
import { listOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function Home() {
  const orders = await listOrders();

  return (
    <main className="mx-auto grid max-w-5xl gap-6 p-6 md:grid-cols-2">
      <header className="md:col-span-2">
        <h1 className="text-3xl font-bold">🍕 Pizzería · Pedidos</h1>
      </header>
      <OrderForm />
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Pedidos ({orders.length})</h2>
        {orders.length === 0 && <p className="text-sm text-neutral-500">Aún no hay pedidos.</p>}
        {orders.map((o) => <OrderTicket key={o.id} order={o} />)}
      </section>
    </main>
  );
}
