# Arquitectura del proyecto

Guía para entender cómo está armado el código y cómo fluyen los datos. Pensada
para alguien que recién empieza con Next.js: los diagramas se ven con formato
en GitHub, en VS Code (con la extensión "Markdown Preview Mermaid Support" o
similar) o pegándolos en <https://mermaid.live>.

## 1. Server Components vs Client Components (lo más importante de Next.js)

Este proyecto usa el **App Router** de Next.js (la carpeta `src/app`). Cada
archivo `.tsx` de ahí adentro es uno de estos dos tipos, y la diferencia es
central para entender todo lo demás:

| | **Server Component** (por defecto) | **Client Component** (`"use client"` al principio del archivo) |
|---|---|---|
| ¿Dónde corre? | En el servidor (Node), nunca llega al navegador | En el navegador, como React normal |
| ¿Puede usar `useState`, `useEffect`, `onClick`? | ❌ No | ✅ Sí |
| ¿Puede hacer `await` directo a la base de datos? | ✅ Sí (`await listOrders()`) | ❌ No (tiene que usar `fetch` a una API) |
| Ejemplos en este proyecto | `page.tsx`, `clientes/page.tsx`, `layout.tsx` | `OrderForm.tsx`, `CustomerPicker.tsx`, `CustomerManager.tsx`, `OrderTicket.tsx` |

Un Server Component puede renderizar Client Components (así arma sus pantallas
`page.tsx`). Al revés no se puede. Por eso todo lo interactivo (formularios,
botones, Bluetooth) quedó en componentes separados con `"use client"`.

## 2. Estructura de carpetas

```
Pizzeria/
├── src/
│   ├── app/                     # Rutas: cada carpeta = una URL (file-based routing)
│   │   ├── layout.tsx            # Envuelve TODA la app (<html>, <body>, fuentes, <title>)
│   │   ├── page.tsx              # "/" — pedidos: formulario + lista (Server Component)
│   │   ├── globals.css           # Estilos globales (Tailwind)
│   │   ├── clientes/
│   │   │   └── page.tsx          # "/clientes" — gestor de clientes (Server Component)
│   │   └── api/                  # Route Handlers: no devuelven HTML, devuelven JSON
│   │       ├── orders/route.ts           # GET y POST /api/orders
│   │       └── customers/
│   │           ├── route.ts              # GET y POST /api/customers
│   │           └── [id]/route.ts         # PATCH /api/customers/:id ([id] = ruta dinámica)
│   │
│   ├── components/               # Piezas de interfaz, todas "use client"
│   │   ├── OrderForm.tsx         # Formulario para crear un pedido
│   │   ├── OrderTicket.tsx       # Un pedido ya creado: texto + botones de acción
│   │   ├── PrinterDialog.tsx     # Modal de resultado al imprimir
│   │   ├── CustomerPicker.tsx    # Buscador de clientes, dentro del formulario
│   │   ├── CustomerManager.tsx   # Lista + alta/edición de clientes en /clientes
│   │   └── CustomerFields.tsx    # Los 3 campos de un cliente (nombre/dirección/delivery)
│   │
│   └── lib/                      # Lógica pura (sin JSX): el "backend" del proyecto
│       ├── types.ts              # Tipos de TypeScript compartidos por todo el código
│       ├── menu.ts                # Sabores de pizza y sus precios (única fuente de verdad)
│       ├── format.ts              # Arma el texto del ticket, con columnas alineadas
│       ├── supabase.ts            # Cliente de Supabase — SOLO se importa en el servidor
│       ├── orders.ts              # Todo el CRUD de pedidos contra la tabla `orders`
│       ├── customers.ts           # Todo el CRUD de clientes contra la tabla `customers`
│       └── printer/
│           ├── mxw.ts             # Protocolo binario de la impresora térmica (bytes, CRC8)
│           ├── render.ts          # Dibuja el ticket como imagen en un <canvas>
│           └── ble.ts             # Conexión Bluetooth (Web Bluetooth API) con la impresora
│
├── supabase/
│   └── schema.sql                 # SQL para crear las tablas `orders` y `customers`
│
├── .env                           # Claves de Supabase (nunca se sube a git)
├── render.yaml                    # Configuración de despliegue en Render
└── package.json
```

**Regla que se repite en todo el proyecto:** los componentes nunca hablan con
Supabase directamente. Siempre es `componente → fetch → Route Handler (API) →
lib/orders.ts o lib/customers.ts → Supabase`. Así, la validación y el cálculo
de precios viven en un solo lugar (el servidor) y nadie puede manipularlos
editando el HTML o la petición desde el navegador.

## 3. Arquitectura general

```mermaid
flowchart TD
    subgraph Navegador["📱 Navegador (celular o PC)"]
        UI["Client Components<br/>OrderForm · CustomerPicker · OrderTicket"]
        BT["Web Bluetooth API"]
    end

    subgraph Servidor["☁️ Servidor Next.js (Render)"]
        Pages["Server Components<br/>page.tsx / clientes/page.tsx"]
        API["Route Handlers<br/>/api/orders · /api/customers"]
        Lib["src/lib<br/>orders.ts · customers.ts"]
    end

    DB[("🗄️ Supabase / Postgres")]
    Printer["🖨️ Impresora térmica 58 mm"]

    Pages -- "1) await listOrders() en el servidor" --> Lib
    Pages -- "2) HTML ya con los datos" --> UI
    UI -- "3) fetch (JSON) para crear/editar" --> API
    API --> Lib
    Lib -- "service_role key" --> DB

    UI --> BT
    BT -- "GATT / Bluetooth Low Energy" --> Printer
```

## 4. Flujo: crear un pedido (con autocompletar de cliente)

```mermaid
sequenceDiagram
    actor Persona
    participant Form as OrderForm.tsx
    participant Picker as CustomerPicker.tsx
    participant API as /api/orders y /api/customers
    participant Lib as lib/orders.ts y lib/customers.ts
    participant DB as Supabase

    Note over Picker,DB: Al abrir el formulario
    Picker->>API: GET /api/customers
    API->>Lib: listCustomers()
    Lib->>DB: select * from customers
    DB-->>Picker: lista completa (se filtra en el navegador al escribir)

    Persona->>Picker: escribe o elige un cliente
    alt cliente ya existe
        Picker->>Form: onApply({address, deliveryFee}) — autocompleta
    else cliente nuevo
        Persona->>Picker: completa dirección/delivery y guarda
        Picker->>API: POST /api/customers
        API->>Lib: createCustomer()
        Lib->>DB: insert into customers
    end

    Persona->>Form: elige pizzas y click "Guardar pedido"
    Form->>API: POST /api/orders {customer, items, ...}
    API->>Lib: validate(body)
    alt datos inválidos
        Lib-->>API: mensaje de error
        API-->>Form: 400 + error (se muestra en rojo)
    else datos OK
        API->>Lib: createOrder(body)
        Lib->>Lib: recalcula precios desde menu.ts (nunca confía en el navegador)
        Lib->>DB: insert into orders
        DB-->>Form: 201 + pedido creado
        Form->>Form: router.refresh() — la lista de "/" se actualiza sola
    end
```

## 5. Flujo: imprimir por Bluetooth

```mermaid
sequenceDiagram
    actor Persona
    participant Ticket as OrderTicket.tsx
    participant Render as printer/render.ts
    participant BLE as printer/ble.ts
    participant Nav as Web Bluetooth (navegador)
    participant Imp as Impresora MX09

    Persona->>Ticket: click "Imprimir (Bluetooth)"
    Ticket->>BLE: printTicket(textoDelTicket)
    BLE->>Render: textToBits(texto)
    Render->>Render: dibuja el texto en un <canvas> de 384 px
    Render-->>BLE: bits (1 = punto negro, 0 = blanco)

    BLE->>Nav: requestDevice() — 1ª vez, se reutiliza después
    Nav->>Imp: conecta por GATT y busca la característica de escritura
    BLE->>BLE: buildJob() — arma los cuadros del protocolo (mxw.ts)

    loop por cada cuadro (paquetes de 20 bytes)
        BLE->>Imp: writeValue(paquete)
        Imp-->>BLE: notificación (pausa / continuar)
    end

    BLE-->>Ticket: éxito o error, con el diagnóstico completo
    Ticket->>Persona: muestra el modal PrinterDialog
```

## 6. Sondeo ("tiempo real" sin WebSockets)

`CustomerManager.tsx` vuelve a pedir `/api/customers` cada 5 segundos
(`setInterval` dentro de un `useEffect`). Es una forma simple de que, si se
edita un cliente desde otro teléfono, los demás lo vean reflejado sin recargar
la página, sin necesitar infraestructura de WebSockets (Supabase Realtime)
todavía.
