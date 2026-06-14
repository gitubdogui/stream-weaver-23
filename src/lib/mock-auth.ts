/**
 * @deprecated Usar `authService` desde "@/lib/auth-service".
 * Se mantiene como shim para no romper imports antiguos.
 */
import { authService, type Session, type Role } from "./auth-service";

export type { Session, Role };

export const mockAuth = {
  login(user: string, password: string): Session | null {
    // API sincrónica legacy — no recomendada, usar authService.login().
    if (!user || !password) return null;
    const session: Session = {
      user,
      role: user.includes("reseller") ? "reseller" : "admin",
      token: `legacy.${Date.now()}`,
      loggedAt: Date.now(),
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("stream_panel_session", JSON.stringify(session));
      window.dispatchEvent(new CustomEvent("auth:change"));
    }
    return session;
  },
  logout: () => authService.logout(),
  get: () => authService.getSession(),
  isAuthenticated: () => authService.isAuthenticated(),
};
