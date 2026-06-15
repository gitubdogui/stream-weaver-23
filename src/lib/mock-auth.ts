/**
 * @deprecated Usar `authService` desde "@/lib/auth-service".
 * Shim de compatibilidad para imports antiguos.
 */
import { authService, type Session, type Role, type User, type Status } from "./auth-service";

export type { Session, Role, User, Status };

export const mockAuth = {
  login: (username: string, password: string) => authService.login(username, password),
  logout: () => authService.logout(),
  get: () => authService.getSession(),
  isAuthenticated: () => authService.isAuthenticated(),
};
