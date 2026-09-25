// ============================================================================
// PÁGINA "/clientes" — Server Component
// ----------------------------------------------------------------------------
// Como esta carpeta (`src/app/clientes/`) tiene su propio `page.tsx`, Next.js
// crea automáticamente la ruta "/clientes" sin que haga falta configurar
// nada más (es la convención de "file-based routing" del App Router: el
// nombre de la carpeta ES la URL).
//
// Igual que en la página principal, este componente corre en el servidor,
// trae los clientes desde Supabase, y le pasa esa lista ya cargada al
// componente de cliente <CustomerManager> como prop `initial` (para que la
// pantalla no empiece vacía mientras el navegador hace su propio fetch).
// ============================================================================

import Link from "next/link";
import CustomerManager from "@/components/CustomerManager";
import { listCustomers } from "@/lib/customers";

export const dynamic = "force-dynamic"; // igual que en "/": siempre datos frescos, nunca cacheado

export default async function ClientesPage() {
  let customers: Awaited<ReturnType<typeof listCustomers>> = [];
  let dbError = "";
  try {
    customers = await listCustomers();
  } catch (e) {
    dbError = e instanceof Error ? e.message : "No se pudo conectar con la base de datos";
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">👤 Clientes</h1>
        <Link href="/" className="text-sm text-red-600 hover:underline">
          ← Volver a pedidos
        </Link>
      </header>
      {dbError ? (
        <p role="alert" className="text-sm text-red-600">
          No se pudieron cargar los clientes: {dbError}
        </p>
      ) : (
        // A partir de aquí, todo lo interactivo (editar, agregar, sondeo) vive
        // dentro de CustomerManager, que es un Client Component.
        <CustomerManager initial={customers} />
      )}
    </main>
  );
}
