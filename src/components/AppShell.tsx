import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { useNotifications } from "@/hooks/useNotifications";
import { N8NAlerts } from "@/components/n8n/N8NAlerts";
import { AgentAlertsPopover } from "@/components/agents/AgentAlertsPopover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TenantSelector } from "@/components/TenantSelector";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { NavLink } from "@/components/NavLink";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Settings,
  Users,
  Zap,
  LogOut,
  Moon,
  Sun,
  Building2,
  Bot,
  BookOpen,
  Shield,
  Smartphone,
  TrendingUp,
  CreditCard,
  BarChart,
  Plug,
  Activity,
  GitCompare,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

interface AppShellProps {
  children: ReactNode;
}

function AppSidebarContent() {
  const { isSuperAdmin } = useIsSuperAdmin();
  const { hasNewMessage } = useNotifications({ enableSound: true, enableToast: true });
  const location = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const [showDevMode, setShowDevMode] = useState(() => {
    const saved = localStorage.getItem("showDevMode");
    return saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("showDevMode", showDevMode.toString());
  }, [showDevMode]);

  const mainItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Clientes", url: "/clients", icon: Building2 },
  ];

  const intelligenceItems = [
    { title: "Agentes", url: "/agents", icon: Bot },
    { title: "Comparar Agentes", url: "/agents/comparison", icon: GitCompare },
    { title: "Base de Conhecimento", url: "/knowledge-base", icon: BookOpen },
  ];

  const conversationItems = [
    { title: "Chats", url: "/chats", icon: MessageSquare, badge: hasNewMessage },
    { title: "Analytics Chats", url: "/chat-analytics", icon: BarChart },
  ];

  const whatsappItems = [
    { title: "WhatsApp", url: "/whatsapp-connection", icon: Smartphone },
    { title: "Dashboard WhatsApp", url: "/whatsapp-dashboard", icon: TrendingUp },
  ];

  const analyticsItems = [
    { title: "Uso de Tokens", url: "/token-usage", icon: TrendingUp },
    { title: "Relatórios", url: "/reports", icon: BarChart },
    { title: "Relatórios por Cliente", url: "/client-reports", icon: FileText },
  ];

  const settingsItems = [
    { title: "Configurações", url: "/settings", icon: Settings },
    { title: "Equipe", url: "/users", icon: Users },
    { title: "Integrações", url: "/integrations", icon: Plug },
    { title: "Planos", url: "/planos", icon: CreditCard },
  ];

  const devItems = [
    { title: "Teste Chat IA", url: "/test-agent-chat", icon: Zap },
    { title: "Teste WhatsApp", url: "/whatsapp-test", icon: Smartphone },
    { title: "Monitoramento N8N", url: "/n8n-monitoring", icon: Activity },
  ];

  return (
    <>
      <SidebarContent>
        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Sistema</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/master-admin" 
                      className="hover:bg-muted/50" 
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <Shield className="h-4 w-4" />
                      {!isCollapsed && <span>Painel Master</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className="hover:bg-muted/50" 
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Inteligência</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {intelligenceItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className="hover:bg-muted/50" 
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Conversas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {conversationItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className="hover:bg-muted/50 relative" 
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                      {item.badge && (
                        <Badge 
                          variant="destructive" 
                          className="ml-auto h-5 px-1.5 text-xs animate-pulse"
                        >
                          {!isCollapsed && "Nova"}
                        </Badge>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>WhatsApp</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {whatsappItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className="hover:bg-muted/50" 
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Análises</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticsItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className="hover:bg-muted/50" 
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Configurações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className="hover:bg-muted/50" 
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showDevMode && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
              <Wrench className="h-3 w-3" />
              {!isCollapsed && "Desenvolvimento"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {devItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className="hover:bg-muted/50" 
                        activeClassName="bg-muted text-primary font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        {!isCollapsed && (
          <div className="flex items-center justify-between px-4 py-2 border-t">
            <Label htmlFor="dev-mode" className="text-xs text-muted-foreground cursor-pointer">
              Modo Dev
            </Label>
            <Switch
              id="dev-mode"
              checked={showDevMode}
              onCheckedChange={setShowDevMode}
            />
          </div>
        )}
      </SidebarFooter>
    </>
  );
}

export function AppShell({ children }: AppShellProps) {
  const { userSession, signOut } = useAuth();
  const location = useLocation();
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const initials = userSession?.profile?.full_name
    ? userSession.profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : userSession?.profile?.email?.[0]?.toUpperCase() || "U";

  const pageTitle = 
    location.pathname === "/master-admin" ? "Painel Master" :
    location.pathname === "/dashboard" ? "Dashboard" :
    location.pathname === "/clients" ? "Clientes" :
    location.pathname.startsWith("/agents/comparison") ? "Comparar Agentes" :
    location.pathname.startsWith("/agents") ? "Agentes" :
    location.pathname === "/knowledge-base" ? "Base de Conhecimento" :
    location.pathname === "/chats" ? "Chats" :
    location.pathname === "/chat-analytics" ? "Analytics Chats" :
    location.pathname === "/whatsapp-connection" ? "WhatsApp" :
    location.pathname === "/whatsapp-dashboard" ? "Dashboard WhatsApp" :
    location.pathname === "/whatsapp-test" ? "Teste WhatsApp" :
    location.pathname === "/test-agent-chat" ? "Teste Chat IA" :
    location.pathname === "/token-usage" ? "Uso de Tokens" :
    location.pathname === "/reports" ? "Relatórios" :
    location.pathname === "/client-reports" ? "Relatórios por Cliente" :
    location.pathname === "/settings" ? "Configurações" :
    location.pathname === "/users" ? "Equipe" :
    location.pathname === "/integrations" ? "Integrações" :
    location.pathname === "/planos" ? "Planos" :
    location.pathname === "/n8n-monitoring" ? "Monitoramento N8N" :
    "Construtor de IA";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar collapsible="icon">
          <div className="flex h-14 items-center border-b px-4">
            <img src={logo} alt="Construtor de IA" className="h-6 w-auto" />
          </div>
          <AppSidebarContent />
        </Sidebar>

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card/95 backdrop-blur px-4 gap-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h2 className="text-base sm:text-lg font-semibold truncate">
                {pageTitle}
              </h2>
              <TenantSelector />
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <AgentAlertsPopover />
              <N8NAlerts />
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9"
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {userSession?.profile?.full_name || "Usuário"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {userSession?.profile?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <div className="flex flex-col gap-1 w-full">
                      <div className="text-xs text-muted-foreground">Organização</div>
                      <div className="font-medium text-sm">{userSession?.tenant?.nome}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {userSession?.role?.toLowerCase()}
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
