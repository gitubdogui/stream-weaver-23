import { createFileRoute, redirect } from "@tanstack/react-router";
import { mockAuth } from "@/lib/mock-auth";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // Solo redirige en el navegador (mock auth con localStorage).
    if (typeof window === "undefined") return;
    throw redirect({ to: mockAuth.isAuthenticated() ? "/dashboard" : "/login" });
  },
  component: () => null,
});
