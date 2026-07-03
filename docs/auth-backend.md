# Autenticación & Jerarquía de revendedores

Este documento describe la autenticación real y el nuevo modelo jerárquico
con créditos de **StreamWeaver Pro**.

## Jerarquía

```
admin
 └─ superreseller
     └─ reseller
         └─ subreseller
             └─ customer (cliente final)
```

- Cada `User` revendedor puede tener `parentId` apuntando a otro `User`.
- Cada `User` revendedor tiene un saldo `credits`.
- Cada `Customer` tiene `resellerId` (dueño directo).
- Ningún usuario ve ni gestiona nada fuera de su propio subtree.

### Roles y capacidad de creación

| Actor          | Puede crear                             |
|----------------|-----------------------------------------|
| admin          | admin, support, superreseller, reseller, subreseller |
| superreseller  | reseller, subreseller                   |
| reseller       | subreseller                             |
| subreseller    | — (solo customers)                      |
| support        | — (solo lectura)                        |

## Créditos

- `admin` inyecta créditos sin descontarse (`admin_topup` / `adjust`).
- Un padre transfiere de su saldo a un **hijo directo** (delta positivo).
- Un padre puede devolver créditos desde un hijo directo (delta negativo) si el hijo tiene saldo.
- Crear un `Customer` descuenta `CUSTOMER_CREATION_COST` (default `1`) al owner
  (excepto admin). Sin saldo → 402 `Créditos insuficientes`.
- Todos los movimientos se registran en `credit_transactions` (auditable).

## Endpoints

### Auth
- `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` (incluye `credits`, `parentId`).

### Users del panel (`/api/resellers`)
- `GET  /api/resellers`  → filtra por subtree del actor. `?children=me` limita a hijos directos.
- `POST /api/resellers`  → valida `canCreateRole`. Non-admin fija `parentId = actor.id`.
   `initialCredits`: admin acredita gratis; padre transfiere de su saldo.
- `PATCH /api/resellers/:id` · `DELETE /api/resellers/:id` (suspend).
- `GET  /api/resellers/:id/credits` → últimos 50 movimientos.
- `POST /api/resellers/:id/credits` `{ delta, reason }` → admin adjust / padre transfer.

### Customers (`/api/users`)
- `GET  /api/users`  → filtra por subtree.
- `POST /api/users`  → owner = actor (o hijo directo si se pasa `resellerId`); descuenta créditos.
- `PATCH /api/users/:id` → reasignación de `resellerId` solo dentro del árbol permitido.
- `DELETE /api/users/:id` → soft delete (no reembolsa por defecto).

## Migración VPS

```bash
git pull
npx prisma migrate deploy   # aplica 20260703000000_hierarchy_credits
npx prisma generate
npm run build
pm2 restart streamweaver
```

## Modos de auth



```env
# Modo demo (sin backend)
VITE_AUTH_MODE=mock

# Modo producción (mismo origen, usa /api/auth/* automáticamente)
VITE_AUTH_MODE=api
# VITE_API_BASE_URL solo si el backend está en otro dominio:
# VITE_API_BASE_URL=https://api.tu-dominio.com
```

Las rutas reales están implementadas como **server routes de TanStack Start** en:

- `src/routes/api/auth/login.ts`   → `POST /api/auth/login`
- `src/routes/api/auth/logout.ts`  → `POST /api/auth/logout`
- `src/routes/api/auth/me.ts`      → `GET  /api/auth/me`

Si en VPS responden `404`, rehaz el build (`npm run build && pm2 restart`)
para que se regenere `routeTree.gen.ts` con esos archivos incluidos.

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
