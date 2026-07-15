# API Endpoints

Todos los endpoints están implementados como **TanStack server routes** bajo `src/routes/api/**` y responden JSON. Autenticación por cookie httpOnly `sw_session` (JWT HS256).

Códigos comunes: `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`.

## Auth

### `POST /api/auth/login`
Body: `{ "username": "guidoadmin", "password": "..." }`
Respuesta: `{ user: { id, name, username, role, credits, parentId } }`. Setea cookie `sw_session`.

### `POST /api/auth/logout`
Borra la cookie `sw_session`. Respuesta: `{ ok: true }`.

### `GET /api/auth/me`
Respuesta: `{ user }` si hay sesión, `401` si no.

## Users (clientes finales / líneas de streaming)

Tabla: `Customer`. Autorización: `admin` y `support` ven todo; `superreseller|reseller|subreseller` solo su subárbol (via `visibleCustomerWhere`).

### `GET /api/users`
Lista clientes visibles al usuario en sesión.
Query params: `?status=active|expired|suspended`, `?search=<texto>`.

### `POST /api/users`
Crea un cliente final. **Consume 1 crédito** al dueño (`resellerId`).
Body:
```json
{
  "username": "cliente01",
  "password": "opcional",
  "package": "Básico",
  "status": "active",
  "expiresAt": "2027-01-01T00:00:00Z",
  "maxConnections": 1,
  "resellerId": "uuid-opcional",
  "notes": "opcional"
}
```
Errores: `409` si `username` existe, `402` si no hay créditos suficientes.

### `PATCH /api/users/:id`
Actualiza campos permitidos. Mismos filtros de subtree.

### `DELETE /api/users/:id`
Soft-delete (setea `deletedAt`). Solo dueño en el subtree o admin.

## Resellers (cuentas del panel)

Tabla: `User`. Solo `admin` puede crear `superreseller`. Cada rol solo puede crear roles inferiores directos (`canCreateRole`).

### `GET /api/resellers`
Lista usuarios del panel visibles al llamador (subtree).

### `POST /api/resellers`
Crea `superreseller | reseller | subreseller`. Body:
```json
{
  "name": "Juan",
  "email": "juan@x.com",
  "username": "juan01",
  "password": "...",
  "role": "reseller",
  "parentId": "uuid-del-padre",
  "initialCredits": 100
}
```
`initialCredits` se descuentan del padre (o son top-up si el actor es admin).

### `PATCH /api/resellers/:id`
Actualiza nombre, email, status. No cambia `credits` (usar el endpoint de créditos).

### `DELETE /api/resellers/:id`
Suspende la cuenta (`status = suspended`). No permite auto-suspensión.

### `POST /api/resellers/:id/credits`
Mueve créditos entre padre e hijo, o top-up de admin.
Body:
```json
{ "amount": 50, "direction": "in" | "out", "reason": "opcional" }
```
- `direction: "in"` → padre transfiere hacia el hijo.
- `direction: "out"` → hijo devuelve al padre.
- Admin puede hacer top-up directo (`kind = admin_topup`) sin descontar.

Cada movimiento crea un registro en `CreditTransaction`.

## Pendientes (ver `backend-roadmap.md`)

- `/api/streams` — CRUD de canales en vivo.
- `/api/vod` — películas.
- `/api/series` — series/temporadas/episodios.
- `/api/stats/*` — métricas reales.
- `/api/servers` — nodos de streaming.
- `player_api.php`, `get.php`, `xmltv.php` — compatibilidad Xtream para players IPTV.

## Convenciones para nuevos endpoints

1. Crear archivo en `src/routes/api/<recurso>/(index|$id).ts`.
2. Usar `createFileRoute("/api/...")` con `server.handlers.{GET,POST,PATCH,DELETE}`.
3. Validar entrada con Zod.
4. Llamar `requireSession(request)` y `requireRole(user, [...])`.
5. Nunca devolver `passwordHash` (usar `select` explícito en Prisma).
6. Devolver `Response.json(data, { status })`.
