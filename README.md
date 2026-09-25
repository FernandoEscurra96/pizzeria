# Pizzería · Pedidos

Next.js 16 + TypeScript + Tailwind + Supabase. Registro de pedidos, directorio
de clientes y ticket con impresión Bluetooth en impresora térmica de 58 mm.

```bash
npm install
npm run dev   # http://localhost:3000
```

Necesita un archivo `.env` con `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`
(ver `.env.example`), y las tablas creadas con `supabase/schema.sql`.

- `GET/POST /api/orders` · `GET/POST /api/customers` · `PATCH /api/customers/[id]`
- Menú y costo de delivery por defecto: `src/lib/menu.ts`
- **Cómo está armado el proyecto, con diagramas de flujo:** [`ARQUITECTURA.md`](./ARQUITECTURA.md)
- Agente: `.claude/agents/backend-developer.md` · MCP: `.mcp.json` (Serena)
