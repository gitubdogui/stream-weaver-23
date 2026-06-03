// Mock de autenticación con localStorage. Reemplazar por JWT/sesión real.
const KEY = "stream_panel_session";

export interface Session {
  user: string;
  role: "admin" | "reseller" | "support";
  loggedAt: number;
}

export const mockAuth = {
  login(user: string, password: string): Session | null {
    if (!user || !password) return null;
    const session: Session = {
      user,
      role: user.includes("reseller") ? "reseller" : "admin",
      loggedAt: Date.now(),
    };
    if (typeof window !== "undefined") {
      localStorage.setItem(KEY, JSON.stringify(session));
    }
    return session;
  },
  logout() {
    if (typeof window !== "undefined") localStorage.removeItem(KEY);
  },
  get(): Session | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Session;
    } catch {
      return null;
    }
  },
  isAuthenticated() {
    return !!this.get();
  },
};
