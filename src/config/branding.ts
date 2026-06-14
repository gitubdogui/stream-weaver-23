/**
 * Branding central — StreamWeaver Pro
 * ----------------------------------------------------------------------------
 * Cambia aquí los valores y se propagan a sidebar, login, header, footer,
 * metadata del navegador y mensajes visibles del panel.
 */

export const branding = {
  appName: "StreamWeaver Pro",
  appShortName: "SW Pro",
  slogan: "Panel profesional de gestión de streaming",
  version: "1.0.0",
  supportEmail: "support@streamweaver.pro",
  /** Color primario de la marca (hex). Los tokens OKLCH viven en styles.css. */
  primaryColor: "#3B82F6",
  logoText: "StreamWeaver",
  logoAccent: "Pro",
  copyrightHolder: "StreamWeaver Pro",
} as const;

export type Branding = typeof branding;

/** Helper para construir títulos de página: "Dashboard — StreamWeaver Pro". */
export const pageTitle = (section: string) => `${section} — ${branding.appName}`;

/** Año dinámico para el footer. */
export const currentYear = () => new Date().getFullYear();
