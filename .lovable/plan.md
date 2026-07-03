## Jerarquía real de revendedores con créditos

Cambio arquitectónico grande. Reemplaza el modelo plano `admin/reseller/support` por un árbol jerárquico con créditos y movimientos auditables.

---

### 1. Esquema Prisma

**`UserRole`** — añadir `superreseller` y `subreseller`:
```
admin | support | superreseller | reseller | subreseller
```

**`User`** — nuevos campos:
- `parentId String?` (self-relation, `onDelete: SetNull`)
- `parent User? @relation("UserTree", fields:[parentId], references:[id])`
- `children User[] @relation("UserTree")`
- `credits Int @default(0)` — solo relevante para roles revendedores; admin lo ignora
- índice en `parentId`

**`Customer`** — añadir/renombrar:
- mantener `resellerId` como owner (ya existe); interpretarlo como “dueño directo” en cualquier nivel del árbol (superreseller/reseller/subreseller)
- `ownerId` = alias conceptual; usaremos `resellerId` para no romper datos

**Nuevo modelo `CreditTransaction`**:
```
id            String   @id @default(uuid())
actorId       String            // quien ejecuta la acción (admin o padre)
fromUserId    String?           // cuenta debitada (null si admin inyecta)
toUserId      String?           // cuenta acreditada (null si se consume creando customer)
customerId    String?           // si el movimiento fue por crear/eliminar customer
delta         Int               // + acredita, - debita (respecto a toUserId o fromUserId)
kind          CreditTxKind      // admin_topup | transfer_in | transfer_out | customer_create | customer_refund | adjust
reason        String?
createdAt     DateTime @default(now())
```
Con índices por `fromUserId`, `toUserId`, `customerId`, `createdAt`.

**Migración**: `prisma/migrations/20260703000000_hierarchy_credits/migration.sql`
- `ALTER TYPE "UserRole" ADD VALUE 'superreseller'`, `'subreseller'`
- `ALTER TABLE users ADD COLUMN parent_id, credits INT DEFAULT 0`
- FK self-ref + índice
- `CREATE TYPE "CreditTxKind" ...` + `CREATE TABLE credit_transactions ...`

**Comando VPS**:
```
git pull && npx prisma migrate deploy && npx prisma generate && npm run build && pm2 restart streamweaver
```

---

### 2. Helpers de árbol y permisos (`src/lib/server/hierarchy.server.ts`)

- `getDescendantIds(userId): Promise<string[]>` — recursive CTE via `$queryRaw`:
  ```sql
  WITH RECURSIVE tree AS (
    SELECT id FROM users WHERE id = $1
    UNION ALL SELECT u.id FROM users u JOIN tree t ON u.parent_id = t.id
  ) SELECT id FROM tree;
  ```
- `isInSubtree(ancestorId, targetId)`
- `canCreateRole(actorRole, targetRole)`:
  - admin → cualquiera
  - superreseller → reseller | subreseller
  - reseller → subreseller
  - subreseller → nada
- `visibleUserFilter(actor)` / `visibleCustomerFilter(actor)` — devuelve `where` Prisma según el árbol.
- `assertCanManageUser(actor, target)` / `assertCanManageCustomer(actor, customer)`.

---

### 3. Servicio de créditos (`src/lib/server/credits.server.ts`)

Todas las operaciones dentro de `prisma.$transaction` con lock (`SELECT ... FOR UPDATE`) para evitar carreras:

- `adminTopup(actorAdmin, toUserId, amount, reason)` — sin descontar.
- `transferCredits(actorParent, toUserId, amount)`:
  - `toUserId` debe ser hijo directo del actor.
  - `amount > 0` → debita padre, acredita hijo.
  - `amount < 0` → devuelve del hijo al padre, solo si `hijo.credits >= |amount|`.
- `consumeForCustomer(ownerId, customerId, cost=1)` — debita 1 al owner.
- `refundForCustomer(ownerId, customerId)` — devuelve 1 (solo cuando admin lo permita; por defecto los soft-delete no reembolsan; documentar).

Registra `CreditTransaction` en cada operación.

Coste por customer: por ahora fijo `= 1` (configurable via `CUSTOMER_CREATION_COST` env, default 1).

---

### 4. Endpoints

**`/api/resellers`** (renombrar conceptualmente a “usuarios del panel”):
- `GET` — filtra con `visibleUserFilter(actor)`.
- `POST` — valida `canCreateRole`, fija `parentId = actor.id` (admin puede pasar parentId explícito), `credits` inicial requiere transferencia si actor ≠ admin.
- `PATCH $id` — solo si `isInSubtree(actor, target)` y no es de rol superior; bloquea cambio de `parentId` salvo admin.
- `DELETE $id` — suspend, mismas reglas.

**`/api/resellers/$id/credits`** (nuevo):
- `POST { delta, reason }` — llama a `adminTopup` o `transferCredits` según rol.
- `GET` — lista `CreditTransaction` del user (paginado).

**`/api/users`** (customers):
- `GET` — `visibleCustomerFilter`.
- `POST` — determina owner:
  - admin/superreseller/reseller/subreseller: por defecto owner = actor; admin/padres pueden pasar `resellerId` si es hijo directo.
  - llama a `consumeForCustomer(owner)` dentro de la misma transacción que `customer.create`.
- `PATCH $id` — permite reasignar `resellerId` solo dentro del árbol permitido del actor.
- `DELETE $id` — soft-delete, sin reembolso por defecto.

Todos los endpoints existentes de auth quedan intactos.

---

### 5. UI

**`/resellers`**:
- Muestra `credits` en la tabla, columna “Padre”.
- Botón “Crear” con `<Select role>` filtrado según `canCreateRole(sessionRole)`.
- Diálogo “Créditos” en cada fila hijo directo: input `delta` (± permitido) + razón; llama `/api/resellers/:id/credits`.
- Admin ve badge “Top-up” (sin descuento). Otros roles ven “Transferir de mi saldo: X”.
- Encabezado muestra `Mis créditos: N`.

**`/users`**:
- Al crear cliente, muestra “Coste: 1 crédito · Saldo actual: N”; deshabilita botón si `saldo < 1` (excepto admin).
- Columna “Dueño” con nombre del reseller.
- Selector “Asignar a” en diálogo, poblado con hijos directos del actor (endpoint `GET /api/resellers?children=me`).

**Header/sidebar**: pequeño chip con créditos del user logueado (excepto admin).

---

### 6. Auth `me`

`GET /api/auth/me` incluye `credits` y `parentId` (ya devuelve el user completo sin hash — solo verificar). Actualizar `SafeUser` tipos si hace falta.

---

### 7. Documentación

Actualizar `docs/auth-backend.md`:
- Diagrama del árbol.
- Tabla nueva de roles y qué puede crear cada uno.
- Reglas de créditos y ejemplos de transacciones.
- Comando de migración para VPS.

---

### Detalles técnicos

- Sin romper `VITE_AUTH_MODE=mock`: el modo mock no toca créditos ni árbol.
- Toda lógica de árbol/créditos vive en `src/lib/server/*` (server-only).
- Transacciones Prisma con `$transaction([...])` o callback + `SELECT FOR UPDATE` vía `$queryRaw` para lock de saldos.
- El enum de Postgres se amplía con `ALTER TYPE ... ADD VALUE` (debe ir fuera de transacción — Prisma lo maneja como statements sueltos en el `.sql`).
- `tsc --noEmit` y `npm run build` deben quedar limpios.

---

### Fuera de alcance (para próximos turnos)

- Dashboard por rol (métricas del árbol).
- Permisos granulares de `support`.
- Reembolso automático al eliminar customer (queda como flag manual admin).

¿Confirmás para implementarlo así, o querés ajustar coste por paquete (ej. Básico=1, Premium=2) antes de arrancar?
