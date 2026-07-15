# Backend Roadmap

Estado actual del proyecto: **frontend completo + backend parcial** (auth, usuarios finales y revendedores con créditos ya implementados sobre PostgreSQL). El resto sigue simulado.

Leyenda: ✅ hecho · 🟡 parcial · ⛔ pendiente

## 1. Login real ✅
- Endpoint `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
- bcrypt para hash de contraseñas, JWT firmado con `JWT_SECRET`.
- Cookie httpOnly `sw_session` (SameSite=Lax, Secure en producción).
- Middleware `requireSession` / `requireRole` en `src/lib/server/require-auth.server.ts`.

**Falta:** refresh tokens rotativos, revocación (blacklist / jti), 2FA opcional.

## 2. Base de datos ✅
- Prisma + PostgreSQL. Esquema en `prisma/schema.prisma`.
- Migraciones aplicadas: `20260619000000_add_customers`, `20260703000000_hierarchy_credits`.
- Seed inicial: `prisma/seed.ts` (crea admin desde variables `ADMIN_*`).

**Falta:** backups automáticos, réplicas de lectura si el tráfico crece.

## 3. Roles y permisos ✅
- Enum `UserRole`: `admin | support | superreseller | reseller | subreseller`.
- Enum `CustomerStatus`: `active | expired | suspended`.
- Filtros por subtree (`visibleUserWhere`, `visibleCustomerWhere`) en `hierarchy.server.ts`.

**Falta:** panel de auditoría (quién hizo qué), permisos granulares por recurso.

## 4. Revendedores + créditos ✅
- Jerarquía `admin → superreseller → reseller → subreseller → customer`.
- `User.parentId` self-relation, `User.credits`.
- `CreditTransaction` con `kind`: `admin_topup | transfer_in | transfer_out | customer_create | customer_refund | adjust`.
- Bloqueo pesimista (`SELECT FOR UPDATE`) al mover créditos.

**Falta:** UI para historial de transacciones, alertas de crédito bajo, exportar reportes.

## 5. Streams en vivo ⛔
Actualmente **simulados** en `src/lib/mock-data.ts`. Para hacerlo real hace falta:

- Servidor RTMP/HLS: **nginx-rtmp**, **SRS**, o adaptar **Xtream Codes** / **Ant Media**.
- Modelo Prisma `Stream`, `StreamNode`, `StreamCategory`.
- Endpoint `/api/streams` (CRUD) y `/api/streams/:id/restart` (control).
- Agente en cada nodo que reporte estado (WebSocket o gRPC).
- Failover automático (si un nodo cae, redirigir espectadores).

## 6. VOD / Series ⛔
Simulado. Requiere:

- Almacenamiento S3-compatible (MinIO, Backblaze B2, Wasabi).
- Job de transcodificación con FFmpeg (colas: BullMQ / Sidekiq / etc.).
- Modelo `Movie`, `Series`, `Season`, `Episode`.
- Endpoint firmado (presigned URLs) para el player.

## 7. Estadísticas reales ⛔
Ahora se muestran datos hardcoded (`dashboardStats`, `hourlyConnections`, `connectionLogs`).
Para métricas reales:

- Ingesta de logs de acceso desde nginx-rtmp / HLS edge.
- Almacén time-series (**ClickHouse**, **TimescaleDB** o **InfluxDB**).
- Endpoint `/api/stats/*` que agregue por hora/día/país/canal.
- Sustituir `mock-data.ts` en `dashboard.tsx` y `statistics.tsx` por `useSuspenseQuery`.

## 8. API compatible con players IPTV ⛔
Xtream Codes API es el estándar de facto que consumen apps como TiviMate, IPTV Smarters, GSE, etc. Falta implementar:

- `GET /player_api.php?username=&password=` → info del usuario y paquetes.
- `GET /player_api.php?action=get_live_categories`
- `GET /player_api.php?action=get_live_streams`
- `GET /player_api.php?action=get_vod_streams`
- `GET /player_api.php?action=get_series`
- `GET /get.php?username=&password=&type=m3u_plus` → lista M3U.
- `GET /xmltv.php?username=&password=` → EPG.

Todo protegido por `Customer.username` + `Customer.passwordHash`, respetando `maxConnections` y `expiresAt`.

## 9. Seguridad real 🟡
Ya hay:
- Hash bcrypt, cookie httpOnly, JWT firmado.

Falta:
- Rate limiting real (Redis + `express-rate-limit`-style para server routes).
- Protección brute-force en `/api/auth/login`.
- CAPTCHA opcional para login público.
- CSRF token en mutaciones (aunque la cookie sea SameSite=Lax).
- Rotación de `JWT_SECRET` sin invalidar todas las sesiones.
- Headers de seguridad: CSP, HSTS, X-Frame-Options (configurar en Nginx).
- Auditoría de intentos fallidos.

## 10. Conexión con servidores de streaming ⛔
- Definir protocolo agente ↔ panel (WebSocket + auth por token).
- Endpoint `/api/servers` para registrar nodos y ver estado (CPU/RAM/red).
- Comandos remotos: reiniciar canal, mover carga, drenar conexiones.
- Panel `/servers` (hoy mock) debe mostrar métricas reales.

## Orden sugerido de implementación

1. Endpoints Xtream (`player_api.php`, `get.php`) contra `Customer` — desbloquea el uso real por clientes finales.
2. Estadísticas + logs de conexión → alimenta `/dashboard` y `/statistics`.
3. Streams / VOD (requiere infra de media).
4. Agentes en nodos y `/servers` real.
5. Endurecimiento de seguridad y auditoría.
