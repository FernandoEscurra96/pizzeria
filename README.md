# Pizzería · Pedidos

Next.js 16 + TypeScript + Tailwind. Registro de pedidos con ticket copiable.

```bash
npm install
npm run dev   # http://localhost:3000
```

- `POST /api/orders` crea un pedido · `GET /api/orders` los lista
- Datos en `data/orders.json` (ignorado por git)
- Menú y costo de delivery: `src/lib/menu.ts`
- Agente: `.claude/agents/backend-developer.md` · MCP: `.mcp.json` (Serena)
