# Autenticación — Backend real

Este documento describe cómo está preparada la autenticación de **StreamWeaver Pro** y los pasos exactos para reemplazar el modo MOCK por un backend real con PostgreSQL + Prisma + JWT.

---

## 1. Estado actual

| Pieza | Estado | Ubicación |
|------|--------|-----------|
| UI de login | ✅ Real | `src/routes/login.tsx` |
| Capa `authService` (cliente) | ✅ Real, con dos modos | `src/lib/auth-service.ts` |
| Modo `mock` (localStorage + usuarios demo) | ✅ Activo por defecto | `src/lib/auth-service.ts` |
| Modo `api` (HTTP contra backend real) | ✅ | `src/lib/auth-service.ts` |
| Esquema de base de datos (`User`) | ✅ Definido en Prisma | `prisma/schema.prisma` |
| Endpoints `/api/auth/login`, `/logout`, `/me` | ✅ Implementados | `src/routes/api/auth/*.ts` |
| Hash de contraseñas (`bcryptjs`) | ✅ | `src/lib/server/auth.server.ts` |
| Emisión/validación de JWT + cookie httpOnly | ✅ | `src/lib/server/auth.server.ts` |
| Seed admin inicial | ✅ | `prisma/seed.ts` |

> ⚠️ Los endpoints requieren un runtime **Node.js** (VPS, PM2, `npm run preview`).
> Prisma + bcryptjs + jsonwebtoken **no** son compatibles con Cloudflare Workers.
> Para deploy edge, separar el backend en otro servicio.

---

## 2. Cambiar entre modos

`VITE_AUTH_MODE=mock` sigue siendo el valor **por defecto** para no romper la
demo. Cuando tengas la base de datos y el admin sembrado:

```env
# Modo demo (sin backend)
VITE_AUTH_MODE=mock

# Modo producción (mismo origen, usa /api/auth/*)
VITE_AUTH_MODE=api
VITE_API_BASE_URL=/api
```

Pasos:

1. Configurar `DATABASE_URL` y `JWT_SECRET` en `.env`.
2. `npm run db:migrate` (crea la tabla `users`).
3. Definir `ADMIN_*` en `.env` y ejecutar `npm run seed`.
4. Cambiar `VITE_AUTH_MODE=api`.
5. `npm run build && npm run preview` (o `pm2 restart`).

---

## 3. Variables de entorno

### Frontend (prefijo `VITE_`)

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `VITE_AUTH_MODE` | `mock` \| `api` | Selecciona el modo de autenticación |
| `VITE_API_BASE_URL` | `https://api.tu-dominio.com/api` | URL base del backend |
| `VITE_API_TIMEOUT` | `15000` | Timeout HTTP en ms |

### Backend (sin prefijo `VITE_`, **nunca** llegan al navegador)

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/streamweaver` | Cadena de conexión PostgreSQL |
| `JWT_SECRET` | `(secreto largo aleatorio)` | Firma de tokens JWT |
| `JWT_EXPIRES_IN` | `15m` | Vida del access token |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d` | Vida del refresh token |
| `BCRYPT_ROUNDS` | `12` | Coste del hashing de contraseñas |

---

## 4. Esquema de base de datos

Definido en [`prisma/schema.prisma`](../prisma/schema.prisma):

```prisma
model User {
  id            String     @id @default(uuid())
  name          String
  email         String     @unique
  username      String     @unique
  passwordHash  String     @map("password_hash")
  role          UserRole   @default(support)   // admin | reseller | support
  status        UserStatus @default(active)    // active | suspended
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  lastLogin     DateTime?
}
```

### Comandos Prisma

```bash
# Generar cliente tipado
npx prisma generate

# Crear migración inicial
npx prisma migrate dev --name init_auth

# Aplicar migraciones en producción
npx prisma migrate deploy

# Inspeccionar la BD
npx prisma studio
```

---

## 5. Endpoints esperados por el frontend

El cliente HTTP en `src/lib/auth-service.ts` (modo `api`) consume estos endpoints. El backend debe implementarlos con estos contratos exactos.

### `POST /api/auth/login`

**Request**
```json
{ "username": "admin", "password": "secret" }
```

**Response 200**
```json
{
  "token": "eyJhbGciOi...",
  "user": {
    "id": "uuid",
    "name": "Admin",
    "email": "admin@example.com",
    "username": "admin",
    "role": "admin",
    "status": "active",
    "lastLogin": "2026-06-15T10:00:00Z"
  }
}
```

**Response 401**
```json
{ "error": "Credenciales inválidas" }
```

### `POST /api/auth/logout`
Headers: `Authorization: Bearer <token>` · Response: `204 No Content`. Debe invalidar el token en el backend.

### `GET /api/auth/me`
Headers: `Authorization: Bearer <token>` · Response: el mismo objeto `user` que devuelve `/login`. Se usa para revalidar la sesión.

---

## 6. Recomendaciones para el backend

- **Stack sugerido:** Node.js + Fastify (o Hono) + Prisma + `bcryptjs` + `jsonwebtoken` + `zod`.
- **Hashing:** `bcrypt` con `BCRYPT_ROUNDS=12` mínimo.
- **JWT:** access token corto (15 min) + refresh token rotativo (7 días) en cookie `httpOnly; Secure; SameSite=Strict`.
- **Rate limiting** en `/auth/login` (ej. 5 intentos / 15 min por IP).
- **CORS:** permitir solo el dominio del panel.
- **Logs de auditoría:** cada login (éxito o fallo) con IP + user-agent.
- **2FA opcional** mediante TOTP cuando `ENABLE_2FA=true`.

---

## 7. Checklist de migración mock → real

1. Levantar PostgreSQL y configurar `DATABASE_URL`.
2. `npx prisma migrate deploy` para crear la tabla `users`.
3. Crear un usuario admin (script `seed` con `bcrypt.hash`).
4. Implementar los 3 endpoints (`login`, `logout`, `me`) en el backend.
5. Cambiar `VITE_AUTH_MODE=api` y `VITE_API_BASE_URL=...` en `.env`.
6. `npm run build && npm run preview`.
7. Verificar login con el usuario admin creado.
8. Eliminar `DEMO_USERS` del archivo `src/lib/auth-service.ts` y quitar el `<details>` de “Demo Access” en `src/routes/login.tsx`.
