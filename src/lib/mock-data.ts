// Datos simulados para el panel. Reemplazar por llamadas reales al backend.

export type UserStatus = "active" | "expired" | "suspended";

export interface Line {
  id: string;
  client: string;
  username: string;
  password: string;
  createdAt: string;
  expiresAt: string;
  status: UserStatus;
  maxConnections: number;
  package: string;
  notes?: string;
}

export interface Stream {
  id: string;
  name: string;
  logo: string;
  category: string;
  source: string;
  server: string;
  online: boolean;
  bitrate: string;
  codec: string;
  fps: number;
  uptime: string;
  connections: number;
}

export interface Vod {
  id: string;
  title: string;
  poster: string;
  category: string;
  year: number;
  duration: string;
  language: string;
  source: string;
  server: string;
  status: "ready" | "processing" | "error";
}

export interface Series {
  id: string;
  title: string;
  poster: string;
  category: string;
  seasons: number;
  episodes: number;
  status: "ready" | "processing";
}

export interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  online: boolean;
  cpu: number;
  ram: number;
  disk: number;
  bandwidth: string;
  streams: number;
  connections: number;
}

export interface Reseller {
  id: string;
  username: string;
  email: string;
  credits: number;
  users: number;
  status: UserStatus;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: "live" | "vod" | "series";
  order: number;
  items: number;
}

export interface ConnectionLog {
  id: string;
  user: string;
  channel: string;
  ip: string;
  country: string;
  userAgent: string;
  duration: string;
  startedAt: string;
}

const pad = (n: number) => n.toString().padStart(3, "0");

export const lines: Line[] = Array.from({ length: 24 }).map((_, i) => ({
  id: `ln_${pad(i + 1)}`,
  client: ["Carlos Mendoza", "Ana Torres", "Luis Pérez", "Sofía Ramírez", "Miguel Castro"][i % 5],
  username: `cliente${pad(i + 1)}`,
  password: `pass${Math.random().toString(36).slice(2, 8)}`,
  createdAt: `2025-${pad(((i % 12) + 1)).slice(1)}-12`,
  expiresAt: `2026-${pad(((i % 12) + 1)).slice(1)}-12`,
  status: (["active", "active", "active", "expired", "suspended"] as UserStatus[])[i % 5],
  maxConnections: [1, 2, 2, 3, 1][i % 5],
  package: ["Básico", "Premium", "Full HD", "Sports", "Family"][i % 5],
  notes: i % 4 === 0 ? "Cliente VIP" : undefined,
}));

export const streams: Stream[] = [
  "ESPN HD", "Fox Sports", "HBO", "Discovery", "National Geographic",
  "CNN", "Cartoon Network", "AXN", "Universal", "Star Channel",
  "Disney+", "Cinemax", "TNT Series", "FX", "Comedy Central",
].map((name, i) => ({
  id: `st_${pad(i + 1)}`,
  name,
  logo: name.slice(0, 2).toUpperCase(),
  category: ["Deportes", "Películas", "Documentales", "Noticias", "Infantil"][i % 5],
  source: `udp://239.255.0.${i + 1}:1234`,
  server: `node-${(i % 3) + 1}`,
  online: i % 7 !== 0,
  bitrate: `${3000 + i * 120} kbps`,
  codec: i % 2 === 0 ? "H.264" : "HEVC",
  fps: i % 3 === 0 ? 60 : 30,
  uptime: `${(i + 1) * 3}h ${i * 5}m`,
  connections: Math.floor(Math.random() * 800),
}));

export const vods: Vod[] = [
  "Dune Part Two", "Oppenheimer", "Interstellar", "The Batman", "Inception",
  "Tenet", "Joker", "Avatar", "Top Gun: Maverick", "John Wick 4",
  "Spider-Man: NWH", "Mad Max", "Blade Runner 2049",
].map((title, i) => ({
  id: `vod_${pad(i + 1)}`,
  title,
  poster: title.slice(0, 1),
  category: ["Acción", "Drama", "Ciencia Ficción", "Thriller"][i % 4],
  year: 2018 + (i % 7),
  duration: `${100 + i * 4} min`,
  language: ["ES", "EN", "Dual"][i % 3],
  source: `/storage/vod/${title.toLowerCase().replace(/\s+/g, "-")}.mp4`,
  server: `node-${(i % 3) + 1}`,
  status: (["ready", "ready", "processing", "ready", "error"] as const)[i % 5],
}));

export const series: Series[] = [
  "Breaking Bad", "Game of Thrones", "Stranger Things", "The Last of Us",
  "House of the Dragon", "Succession", "The Bear", "Severance", "Wednesday",
].map((title, i) => ({
  id: `sr_${pad(i + 1)}`,
  title,
  poster: title.slice(0, 1),
  category: ["Drama", "Fantasía", "Ciencia Ficción", "Thriller"][i % 4],
  seasons: 1 + (i % 6),
  episodes: 8 + i * 3,
  status: i % 5 === 0 ? "processing" : "ready",
}));

export const servers: Server[] = [1, 2, 3, 4].map((i) => ({
  id: `srv_${pad(i)}`,
  name: `node-${i}`,
  host: `10.0.0.${10 + i}`,
  port: 25461,
  online: i !== 4,
  cpu: [42, 67, 28, 0][i - 1],
  ram: [58, 71, 33, 0][i - 1],
  disk: [44, 62, 25, 12][i - 1],
  bandwidth: ["1.2 Gbps", "850 Mbps", "640 Mbps", "0 Mbps"][i - 1],
  streams: [120, 85, 60, 0][i - 1],
  connections: [1320, 980, 540, 0][i - 1],
}));

export const resellers: Reseller[] = [
  { id: "rs_001", username: "reseller_mx", email: "mx@panel.tv", credits: 120, users: 48, status: "active", createdAt: "2025-03-10" },
  { id: "rs_002", username: "reseller_ar", email: "ar@panel.tv", credits: 45, users: 22, status: "active", createdAt: "2025-05-22" },
  { id: "rs_003", username: "reseller_co", email: "co@panel.tv", credits: 0, users: 12, status: "suspended", createdAt: "2025-01-05" },
  { id: "rs_004", username: "reseller_es", email: "es@panel.tv", credits: 320, users: 110, status: "active", createdAt: "2024-11-30" },
];

export const categories: Category[] = [
  { id: "c1", name: "Deportes", type: "live", order: 1, items: 24 },
  { id: "c2", name: "Películas HD", type: "vod", order: 1, items: 312 },
  { id: "c3", name: "Series", type: "series", order: 1, items: 88 },
  { id: "c4", name: "Documentales", type: "live", order: 2, items: 14 },
  { id: "c5", name: "Infantil", type: "live", order: 3, items: 18 },
  { id: "c6", name: "Noticias 24h", type: "live", order: 4, items: 9 },
];

export const connectionLogs: ConnectionLog[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `cn_${pad(i + 1)}`,
  user: `cliente${pad((i % 24) + 1)}`,
  channel: streams[i % streams.length].name,
  ip: `190.${100 + i}.${i * 3}.${i + 1}`,
  country: ["MX", "AR", "CO", "ES", "PE", "CL"][i % 6],
  userAgent: ["TiviMate/4.7", "IPTVSmarters/3.1", "Perfect Player", "Kodi 21"][i % 4],
  duration: `${(i + 1) * 7}m`,
  startedAt: `2026-06-03 ${pad(8 + i).slice(1)}:${pad(i * 4).slice(1)}`,
}));

export const hourlyConnections = Array.from({ length: 24 }).map((_, h) => ({
  hour: `${pad(h).slice(1)}:00`,
  conexiones: Math.round(400 + Math.sin(h / 3) * 250 + Math.random() * 120),
}));

export const dashboardStats = {
  totalUsers: lines.length,
  activeUsers: lines.filter((l) => l.status === "active").length,
  expiredUsers: lines.filter((l) => l.status === "expired").length,
  suspendedUsers: lines.filter((l) => l.status === "suspended").length,
  activeStreams: streams.filter((s) => s.online).length,
  totalVod: vods.length,
  totalSeries: series.length,
  currentConnections: 2840,
  cpu: 54,
  ram: 61,
  disk: 38,
};
