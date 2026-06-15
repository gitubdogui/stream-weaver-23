/**
 * Auth helpers (server-only).
 *
 * - verifyPassword: bcrypt compare contra `password_hash`.
 * - signToken / verifyToken: JWT con `JWT_SECRET` y `JWT_EXPIRES_IN`.
 * - sanitizeUser: nunca devolver `passwordHash` al cliente.
 * - extractBearer: lee el header Authorization de la request.
 */
import bcrypt from "bcryptjs";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import type { User } from "@prisma/client";

export type SafeUser = Omit<User, "passwordHash">;

export interface TokenPayload extends JwtPayload {
  sub: string;     // user id
  username: string;
  role: User["role"];
}

function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error("JWT_SECRET no configurado (mínimo 16 caracteres).");
  }
  return s;
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function hashPassword(plain: string): Promise<string> {
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
  return bcrypt.hash(plain, rounds);
}

export function signToken(user: Pick<User, "id" | "username" | "role">): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? "15m") as SignOptions["expiresIn"];
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    getSecret(),
    { expiresIn },
  );
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getSecret()) as TokenPayload;
  } catch {
    return null;
  }
}

export function sanitizeUser(user: User): SafeUser {
  // Quitar passwordHash sin exponerlo nunca al cliente.
  const { passwordHash: _ph, ...safe } = user;
  return safe;
}

export function extractBearer(request: Request): string | null {
  const h = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

/**
 * Lee el token desde:
 *   1. Cookie httpOnly `sw_session`
 *   2. Header Authorization: Bearer
 */
export function readSessionToken(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const match = /(?:^|;\s*)sw_session=([^;]+)/.exec(cookie);
  if (match) return decodeURIComponent(match[1]);
  return extractBearer(request);
}

export function sessionCookie(token: string, maxAgeSec: number): string {
  return [
    `sw_session=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Secure",
    `Max-Age=${maxAgeSec}`,
  ].join("; ");
}

export const clearedSessionCookie =
  "sw_session=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0";
