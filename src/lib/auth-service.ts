/**
 * auth-service
 * ----------------------------------------------------------------------------
 * Capa de autenticación con DOS modos seleccionados por `VITE_AUTH_MODE`:
 *
 *   - "mock" (por defecto): usuarios demo en localStorage. Útil para
 *                           desarrollo sin backend.
 *   - "api":                consume el backend real definido en
 *                           `VITE_API_BASE_URL`. Contratos en
 *                           `docs/auth-backend.md`.
 *
 * La API pública (`login / logout / getSession / isAuthenticated /
 * getCurrentUser / onChange`) NO cambia entre modos — la UI no necesita saber
 * cuál está activo.
 */

const STORAGE_KEY = "stream_panel_session";
const EVENT_NAME = "auth:change";

export type Role = "admin" | "support" | "superreseller" | "reseller" | "subreseller";
export type Status = "active" | "suspended";

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: Role;
  status: Status;
  credits?: number;
  parentId?: string | null;
  lastLogin?: string | null;
}

export interface Session {
  user: User;
  /** En modo mock es un token simulado; en modo api es un JWT real. */
  token: string;
  loggedAt: number;
}

export interface LoginResult {
  ok: boolean;
  session?: Session;
  error?: string;
}

// === Config ================================================================
const AUTH_MODE: "mock" | "api" =
  (import.meta.env.VITE_AUTH_MODE as "mock" | "api") ?? "mock";
// Base URL del backend. Por defecto vacío = mismo origen (las rutas server de
// TanStack Start viven en /api/auth/*). Solo definir VITE_API_BASE_URL si el
// backend está en otro dominio (ej: https://api.tu-dominio.com).
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT ?? 15000);

// Endpoints absolutos — siempre bajo /api/auth/* (server routes de TanStack Start).
const EP_LOGIN  = "/api/auth/login";
const EP_LOGOUT = "/api/auth/logout";
const EP_ME     = "/api/auth/me";

// === MOCK: usuarios demo (NO usar en producción) ===========================
const DEMO_USERS: Array<{ username: string; password: string; user: User }> = [
  {
    username: "demo-admin",
    password: "demo1234",
    user: { id: "demo-1", name: "Admin Demo",    email: "admin@demo.local",    username: "demo-admin",    role: "admin",    status: "active" },
  },
  {
    username: "demo-reseller",
    password: "demo1234",
    user: { id: "demo-2", name: "Reseller Demo", email: "reseller@demo.local", username: "demo-reseller", role: "reseller", status: "active" },
  },
  {
    username: "demo-support",
    password: "demo1234",
    user: { id: "demo-3", name: "Support Demo",  email: "support@demo.local",  username: "demo-support",  role: "support",  status: "active" },
  },
];

// === Helpers ===============================================================
function emitChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function writeSession(session: Session) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  emitChange();
}

function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  emitChange();
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), API_TIMEOUT);
  try {
    return await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

// === MOCK implementation ===================================================
async function loginMock(username: string, password: string): Promise<LoginResult> {
  await new Promise((r) => setTimeout(r, 350));
  const u = username.trim();
  if (!u || !password) return { ok: false, error: "Usuario y contraseña requeridos" };
  const match = DEMO_USERS.find((d) => d.username === u && d.password === password);
  if (!match) return { ok: false, error: "Credenciales inválidas" };
  const session: Session = {
    user: { ...match.user, lastLogin: new Date().toISOString() },
    token: `mock.${btoa(match.username)}.${Date.now()}`,
    loggedAt: Date.now(),
  };
  writeSession(session);
  return { ok: true, session };
}

// === API implementation ====================================================
async function loginApi(username: string, password: string): Promise<LoginResult> {
  try {
    const res = await apiFetch(EP_LOGIN, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body.error ?? `Error ${res.status}` };
    }
    const data = (await res.json()) as { token: string; user: User };
    const session: Session = { user: data.user, token: data.token, loggedAt: Date.now() };
    writeSession(session);
    return { ok: true, session };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error de red" };
  }
}

async function logoutApi(token: string) {
  try {
    await apiFetch(EP_LOGOUT, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    /* el cliente cierra sesión local igualmente */
  }
}

async function getCurrentUserApi(token: string): Promise<User | null> {
  try {
    const res = await apiFetch(EP_ME, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as User;
  } catch {
    return null;
  }
}

// === Public API ============================================================
export const authService = {
  mode: AUTH_MODE,

  async login(username: string, password: string): Promise<LoginResult> {
    return AUTH_MODE === "api" ? loginApi(username, password) : loginMock(username, password);
  },

  async logout(): Promise<void> {
    const session = readSession();
    if (AUTH_MODE === "api" && session?.token) await logoutApi(session.token);
    clearSession();
  },

  getSession(): Session | null {
    return readSession();
  },

  isAuthenticated(): boolean {
    return !!readSession();
  },

  /**
   * En modo `mock` devuelve el user de la sesión local.
   * En modo `api` revalida contra `/auth/me` (y cierra sesión si el token expiró).
   */
  async getCurrentUser(): Promise<User | null> {
    const session = readSession();
    if (!session) return null;
    if (AUTH_MODE !== "api") return session.user;

    const fresh = await getCurrentUserApi(session.token);
    if (!fresh) {
      clearSession();
      return null;
    }
    writeSession({ ...session, user: fresh });
    return fresh;
  },

  onChange(cb: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    const handler = () => cb();
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener("storage", handler);
    };
  },

  /** Sólo para la pantalla de login en modo demo. Vacío en modo `api`. */
  getDemoCredentials() {
    if (AUTH_MODE === "api") return [];
    return DEMO_USERS.map((d) => ({ user: d.username, password: d.password, role: d.user.role }));
  },
};
