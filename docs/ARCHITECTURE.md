# Arquitectura

## Stack

- **Framework:** TanStack Start v1 (SSR opcional) + React 19
- **Bundler:** Vite 7
- **Routing:** TanStack Router (file-based en `src/routes/`)
- **Estilos:** Tailwind CSS v4 + tokens OKLCH en `src/styles.css`
- **UI:** shadcn/ui (Radix) en `src/components/ui/`
- **Gráficas:** Recharts
- **Estado servidor:** TanStack Query (preparado, aún no usado)

## Capas

```
┌─────────────────────────────────────────┐
│  UI (routes/, components/)              │
├─────────────────────────────────────────┤
│  Capa de datos (lib/mock-*.ts)  ◀── reemplazar por SDK/API real
├─────────────────────────────────────────┤
│  Backend real (pendiente)               │
│   ├─ Auth (JWT + refresh)               │
│   ├─ DB (PostgreSQL)                    │
│   ├─ Stream control (FFmpeg/nginx-rtmp) │
│   └─ Player API (Xtream-compatible)     │
└─────────────────────────────────────────┘
```

## Plan de migración a producción

1. Levantar backend (Node/Fastify o Go) y exponer `/api/v1/*`.
2. Crear `src/lib/api/` con clientes tipados (fetch + zod).
3. Reemplazar imports de `mock-*.ts` por hooks `useQuery` contra la API.
4. Sustituir `mock-auth.ts` por flujo JWT real + middleware de rutas.
5. Conectar agentes en los nodos de streaming vía WebSocket para métricas.
