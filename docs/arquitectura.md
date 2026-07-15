# Arquitectura — StreamWeaver Pro

## Stack

- **Framework:** TanStack Start v1 (SSR) + React 19
- **Bundler:** Vite 7
- **Routing:** TanStack Router (file-based en `src/routes/`)
- **Estilos:** Tailwind CSS v4 + tokens OKLCH en `src/styles.css`
- **UI:** shadcn/ui (Radix) en `src/components/ui/`
- **Gráficas:** Recharts
- **Estado servidor:** TanStack Query (preparado)
- **ORM (backend real):** Prisma + PostgreSQL
- **Auth (backend real):** JWT (HS256) + cookie httpOnly `sw_session` + bcrypt

## Capas

```
┌──────────────────────────────────────────────────────────┐
│  UI                                                      │
│   ├─ src/routes/                (páginas + layouts)      │
│   ├─ src/components/            (componentes de dominio) │
│   └─ src/components/ui/         (shadcn/ui primitivos)   │
├──────────────────────────────────────────────────────────┤
│  Capa de datos (cliente)                                 │
│   ├─ src/lib/auth-service.ts        (login/logout/me)    │
│   ├─ src/lib/mock-auth.ts           (auth demo local)    │
│   ├─ src/lib/mock-data.ts           (datos demo)         │
│   └─ src/lib/api/*.functions.ts     (RPC TanStack)       │
├──────────────────────────────────────────────────────────┤
│  Backend (server routes / server functions)              │
│   ├─ src/routes/api/auth/*          (login/logout/me)    │
│   ├─ src/routes/api/users/*         (clientes finales)   │
│   ├─ src/routes/api/resellers/*     (jerarquía+créditos) │
│   └─ src/lib/server/*.server.ts     (prisma, auth, ...)  │
├──────────────────────────────────────────────────────────┤
│  Infraestructura (VPS, pendiente de completar)           │
│   ├─ PostgreSQL                                          │
│   ├─ Nginx / reverse proxy                               │
│   ├─ pm2 / systemd                                       │
│   └─ FFmpeg / nginx-rtmp / Xtream-compatible (futuro)    │
└──────────────────────────────────────────────────────────┘
```

## Modos de ejecución

El proyecto se puede correr **sin backend** para demos y desarrollo de UI:

- `VITE_AUTH_MODE=mock` (por defecto): usa `src/lib/mock-auth.ts` y `src/lib/mock-data.ts`. **No requiere base de datos, ni Lovable Cloud, ni Supabase.**
- `VITE_AUTH_MODE=api`: usa las server routes reales (`/api/auth/*`, `/api/users/*`, `/api/resellers/*`) contra PostgreSQL vía Prisma.

## Separación mock vs. real

| Área          | Mock                              | Real                                          |
| ------------- | --------------------------------- | --------------------------------------------- |
| Autenticación | `src/lib/mock-auth.ts`            | `src/routes/api/auth/*` + `auth.server.ts`    |
| Datos demo    | `src/lib/mock-data.ts`            | Prisma + PostgreSQL                           |
| Usuarios      | Array en memoria                  | `/api/users` (tabla `Customer`)               |
| Revendedores  | Array en memoria                  | `/api/resellers` (tabla `User` con `parentId`)|
| Streams / VOD | Estático en `mock-data.ts`        | **pendiente** — ver `backend-roadmap.md`      |

## Convenciones

- Server-only: cualquier archivo con sufijo `.server.ts` no se bundlea al cliente.
- Server functions (`*.functions.ts`) usan `createServerFn` de `@tanstack/react-start`.
- Server routes HTTP viven en `src/routes/api/**`.
- No editar `src/routeTree.gen.ts` a mano; lo regenera el plugin de TanStack Router.
