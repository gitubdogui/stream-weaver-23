# StreamPanel — Panel de Gestión de Streaming

Panel administrativo moderno (dark, responsive) inspirado en plataformas tipo Xtream UI, construido desde cero con **TanStack Start + React 19 + Vite 7 + Tailwind v4 + shadcn/ui**.

> Actualmente es un **frontend completo con datos simulados (mock)**. La arquitectura está lista para conectar un backend real.

---

## 🚀 Instalación y uso

Requisitos: **Node.js 20+** y npm (o bun / pnpm).

```bash
# 1. Instalar dependencias
npm install

# 2. Correr en desarrollo (http://localhost:5173)
npm run dev

# 3. Compilar para producción
npm run build

# 4. Previsualizar el build
npm run preview
```

### Credenciales demo

| Usuario | Contraseña |
|---------|------------|
| `admin` | `admin`    |

Cualquier usuario que contenga `reseller` en el nombre entra con rol revendedor.

---

## 📁 Estructura del proyecto

```
.
├── public/                 # Assets estáticos
├── src/
│   ├── components/         # UI reutilizable (AppSidebar, StatCard, StatusBadge, PageHeader, ui/*)
│   ├── lib/
│   │   ├── mock-auth.ts    # Autenticación simulada (localStorage)
│   │   ├── mock-data.ts    # Datos simulados (líneas, streams, VOD, series, servidores...)
│   │   └── utils.ts
│   ├── routes/             # File-based routing (TanStack Router)
│   │   ├── __root.tsx
│   │   ├── index.tsx
│   │   ├── login.tsx
│   │   ├── _authenticated.tsx
│   │   └── _authenticated/
│   │       ├── dashboard.tsx
│   │       ├── users.tsx
│   │       ├── streams.tsx
│   │       ├── vod.tsx
│   │       ├── series.tsx
│   │       ├── servers.tsx
│   │       ├── categories.tsx
│   │       ├── packages.tsx
│   │       ├── resellers.tsx
│   │       ├── statistics.tsx
│   │       ├── api-docs.tsx
│   │       └── settings.tsx
│   └── styles.css          # Tokens del design system (OKLCH)
├── docs/                   # Documentación adicional
├── vite.config.ts
├── tsconfig.json
├── .env.example
└── package.json
```

---

## 🧩 Módulos incluidos

- **Login seguro** (mock)
- **Dashboard** con métricas y gráficas (Recharts)
- **Usuarios / Líneas** — alta, renovación, suspensión, exportación CSV
- **Streams** en vivo — estado online, bitrate, codec, conexiones
- **VOD** — grid con pósters y estados
- **Series** — temporadas y episodios
- **Servidores** — monitoreo CPU/RAM/Disco/Bandwidth
- **Categorías** y **Paquetes**
- **Revendedores** — créditos y usuarios
- **Estadísticas**
- **API & Documentación** — endpoints y tokens
- **Configuración** — 2FA, rate-limit, logs

---

## 🎭 Qué es simulado actualmente

Todo el estado vive en memoria / `localStorage`. Concretamente:

- 🔐 **Login mock** — `src/lib/mock-auth.ts` (sin hashing, sin JWT real)
- 👥 **Usuarios/líneas mock** — `src/lib/mock-data.ts`
- 📺 **Streams mock** — sin transcoding ni FFmpeg real
- 🎬 **VOD mock** — sin almacenamiento ni procesado de video
- 📊 **Estadísticas mock** — datos generados aleatoriamente
- 🖥️ **Servidores mock** — métricas CPU/RAM hardcoded

---

## 🏗️ Qué falta para una versión de producción real

| Pieza | Descripción |
|-------|-------------|
| **Backend real** | API REST/GraphQL (Node/Fastify, Go, Rust, etc.) que reemplace los `mock-*.ts` |
| **Base de datos** | PostgreSQL / MySQL para usuarios, líneas, catálogos, logs, métricas |
| **Autenticación real** | JWT + refresh tokens, hashing bcrypt/argon2, 2FA, rate-limit |
| **API para players** | Endpoints compatibles con apps tipo TiviMate / IPTVSmarters (`get.php`, `player_api.php`, `xmltv.php`) |
| **Control real de streams** | Integración con FFmpeg / nginx-rtmp / SRS para transcoding y restreaming |
| **Seguridad avanzada** | WAF, IP whitelisting, anti-share, fingerprinting de dispositivo, captcha |
| **Conexión con servidores** | Agentes en cada nodo reportando CPU/RAM/bandwidth en tiempo real (WebSocket / gRPC) |
| **Almacenamiento de VOD** | S3 / MinIO / disco local con CDN |
| **Logs y auditoría** | Sistema centralizado (Loki, ELK) |
| **Pagos** | Stripe / PayPal para revendedores y suscripciones |

---

## 🌐 Despliegue fuera de Lovable

El proyecto es **100% estándar** (Vite + TanStack Start). No depende de Lovable Cloud y puede ejecutarse en cualquier PC o VPS:

```bash
git clone <tu-repo>
cd <repo>
npm install
npm run build
npm run preview   # o servir /dist con nginx / caddy / cualquier static host
```

Compatible con: **Vercel, Netlify, Cloudflare Pages, Render, VPS propio (nginx + pm2)**, etc.

Variables de entorno: copia `.env.example` a `.env` y ajusta los valores.

---

## 📜 Licencia

Privado. Todos los derechos reservados.
