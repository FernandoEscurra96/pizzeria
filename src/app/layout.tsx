// ============================================================================
// LAYOUT RAÍZ (App Router)
// ----------------------------------------------------------------------------
// En Next.js (carpeta `src/app`), cada carpeta es una "ruta" de la web, y el
// archivo `layout.tsx` de cada carpeta envuelve a todas las páginas de esa
// carpeta (y sus subcarpetas). Este `layout.tsx` está en la raíz de `app/`,
// así que envuelve TODA la aplicación: es el único lugar donde se escriben
// las etiquetas <html> y <body>. Cada `page.tsx` (por ejemplo src/app/page.tsx
// o src/app/clientes/page.tsx) se renderiza adentro, en el lugar de `children`.
// ============================================================================

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css"; // estilos globales (Tailwind) para toda la app

// `next/font/google` descarga la tipografía en el build (no en cada visita) y
// genera una variable CSS (--font-geist-sans) para usarla sin capas externas.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// `metadata` es una convención especial de Next: si un archivo (layout o page)
// exporta esta constante, Next genera automáticamente el <title> y las
// etiquetas <meta> del <head>, sin que tengamos que escribirlas a mano.
export const metadata: Metadata = {
  title: "Pizzería · Pedidos",
  description: "Gestión de pedidos de la pizzería",
};

// `LayoutProps<"/">` es un tipo que el propio Next.js genera para este archivo
// (mirá `.next/types`): describe exactamente qué props recibe el layout de la
// ruta "/". En este caso, solo `children`: el contenido de la página actual.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es" // ayuda a lectores de pantalla y buscadores a saber que el sitio está en español
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
