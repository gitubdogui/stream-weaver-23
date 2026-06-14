/**
 * auth-service
 * ----------------------------------------------------------------------------
 * Capa de autenticación de la app. Hoy funciona en modo MOCK (localStorage +
 * usuarios de demo), pero la interfaz pública está pensada para reemplazar
 * cada método por llamadas a un backend real sin tocar la UI.
 *
 * ⚠️  PARTES MOCK (reemplazar antes de producción):
 *   - `login()`        → reemplazar por POST /api/v1/auth/login (JWT)
 *   - `logout()`       → reemplazar por POST /api/v1/auth/logout + revocar token
 *   - `getSession()`   → reemplazar por lectura de token httpOnly + /me
 *   - `DEMO_USERS`     → eliminar; el backend valida credenciales
 *
 * ✅  LISTO PARA REEMPLAZAR:
 *   - Forma de `Session` y `Role` (tipos estables consumidos por la UI)
 *   - API pública: `login / logout / getSession / isAuthenticated / onChange`
 *   - Eventos de cambio para que la UI reaccione (storage / login / logout)
 */

const STORAGE_KEY = "stream_panel_session";
const EVENT_NAME = "auth:change";

export type Role = "admin" | "reseller" | "support";

export interface Session {
  user: string;
  role: Role;
  /** Token simulado. En producción sería un JWT firmado por el backend. */
  token: string;
  loggedAt: number;
}

// === MOCK: usuarios de demo (NO usar en producción) =========================
// Listos para borrar cuando se conecte el backend real.
const DEMO_USERS: Array<{ user: string; password: string; role: Role }> = [
  { user: "demo-admin",    password: "demo1234", role: "admin" },
  { user: "demo-reseller", password: "demo1234", role: "reseller" },
  { user: "demo-support",  password: "demo1234", role: "support" },
];

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

export interface LoginResult {
  ok: boolean;
  session?: Session;
  error?: string;
}

export const authService = {
  /**
   * MOCK login. Reemplazar por:
   *   const res = await fetch("/api/v1/auth/login", { method: "POST", body: ... });
   *   if (!res.ok) return { ok: false, error: "..." };
   *   const session = await res.json();
   */
  async login(user: string, password: string): Promise<LoginResult> {
    await new Promise((r) => setTimeout(r, 350)); // simula latencia de red
    const u = user.trim();
    if (!u || !password) return { ok: false, error: "Usuario y contraseña requeridos" };

    const match = DEMO_USERS.find((d) => d.user === u && d.password === password);
    if (!match) return { ok: false, error: "Credenciales inválidas" };

    const session: Session = {
      user: match.user,
      role: match.role,
      token: `mock.${btoa(match.user)}.${Date.now()}`,
      loggedAt: Date.now(),
    };
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      emitChange();
    }
    return { ok: true, session };
  },

  /** MOCK logout. Reemplazar por POST /api/v1/auth/logout y limpieza de token. */
  logout() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
    emitChange();
  },

  /** Lee la sesión actual (mock). En producción: validar token contra /me. */
  getSession(): Session | null {
    return readSession();
  },

  isAuthenticated(): boolean {
    return !!readSession();
  },

  /** Suscripción a cambios de sesión (login/logout/storage). */
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

  /** Solo expuesto para la pantalla de login (mostrar hint de demo). */
  getDemoCredentials() {
    return DEMO_USERS.map(({ user, password, role }) => ({ user, password, role }));
  },
};
