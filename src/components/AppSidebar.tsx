import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Radio, Film, Tv, FolderTree, Server,
  BarChart3, Code2, Settings, LogOut, UserCog, Cable,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { mockAuth } from "@/lib/mock-auth";
import { branding, currentYear } from "@/config/branding";

const groups = [
  {
    label: "General",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Estadísticas", url: "/statistics", icon: BarChart3 },
    ],
  },
  {
    label: "Clientes",
    items: [
      { title: "Usuarios / Líneas", url: "/users", icon: Users },
      { title: "Revendedores", url: "/resellers", icon: UserCog },
      { title: "Paquetes", url: "/packages", icon: Cable },
    ],
  },
  {
    label: "Contenido",
    items: [
      { title: "Streams en vivo", url: "/streams", icon: Radio },
      { title: "VOD / Películas", url: "/vod", icon: Film },
      { title: "Series", url: "/series", icon: Tv },
      { title: "Categorías", url: "/categories", icon: FolderTree },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Servidores", url: "/servers", icon: Server },
      { title: "API & Docs", url: "/api-docs", icon: Code2 },
      { title: "Configuración", url: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const session = mockAuth.get();

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b px-3 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
            <Radio className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <p className="text-sm font-semibold">
                {branding.logoText}<span className="text-primary"> {branding.logoAccent}</span>
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Admin v{branding.version}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = path === item.url;
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <Link to={item.url} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        {!collapsed && session && (
          <div className="mb-2 rounded-lg bg-sidebar-accent px-3 py-2">
            <p className="text-xs font-medium">{session.user.name}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{session.user.role}</p>
          </div>
        )}
        <SidebarMenuButton
          tooltip="Cerrar sesión"
          onClick={() => { mockAuth.logout(); navigate({ to: "/login" }); }}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Cerrar sesión</span>}
        </SidebarMenuButton>
        {!collapsed && (
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            © {currentYear()} {branding.copyrightHolder}
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
