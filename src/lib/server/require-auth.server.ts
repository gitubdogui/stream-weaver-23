/**
 * Helpers de autorización para server routes.
 *
 * - `requireSession(request)` valida la cookie / Bearer y devuelve el usuario
 *   activo de la BD. Si falla, devuelve `{ error: Response }` listo para
 *   retornar desde el handler.
 * - `requireRole(session, roles)` comprueba el rol y devuelve `Response` 403
 *   si no está permitido.
 */
import type { User } from "@prisma/client";
import { prisma } from "./prisma.server";
import { readSessionToken, verifyToken } from "./auth.server";

export interface AuthOk {
  user: User;
  error?: undefined;
}
export interface AuthErr {
  user?: undefined;
  error: Response;
}
export type AuthResult = AuthOk | AuthErr;

export async function requireSession(request: Request): Promise<AuthResult> {
  const token = readSessionToken(request);
  if (!token) {
    return { error: Response.json({ error: "No autenticado" }, { status: 401 }) };
  }
  const payload = verifyToken(token);
  if (!payload?.sub) {
    return { error: Response.json({ error: "Token inválido" }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.status !== "active") {
    return { error: Response.json({ error: "Sesión no válida" }, { status: 401 }) };
  }
  return { user };
}

export function requireRole(user: User, roles: ReadonlyArray<User["role"]>): Response | null {
  if (!roles.includes(user.role)) {
    return Response.json({ error: "Permiso denegado" }, { status: 403 });
  }
  return null;
}
