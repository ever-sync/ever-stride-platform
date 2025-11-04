import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Menu,
  X,
  Building2,
  Bot,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

interface AppShellProps {
  children: ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Clientes", href: "/clients", icon: Building2 },
  { name: "Agentes", href: "/agents", icon: Bot },
  { name: "Base de Conhecimento", href: "/knowledge-base", icon: BookOpen },
  { name: "Chats", href: "/chats", icon: MessageSquare },
  { name: "Relatórios", href: "/reports", icon: FileText },
  { name: "Relatórios por Cliente", href: "/client-reports", icon: FileText },
  { name: "Configurações", href: "/settings", icon: Settings },
  { name: "Equipe", href: "/users", icon: Users },
  { name: "Integrações", href: "/integrations", icon: Zap },
];

export function AppShell({ children }: AppShellProps) {
  const { userSession, signOut } = useAuth();
  const location = useLocation();
  const [isDark, setIsDark] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 lg:hidden"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-card transition-transform duration-300",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-border px-6">
            <img src={logo} alt="Construtor de IA" className="h-8 w-auto" />
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navigation.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start transition-smooth",
                      isActive && "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Tenant info */}
          <div className="border-t border-border p-4">
            <div className="text-xs text-muted-foreground mb-1">Organização</div>
            <div className="font-semibold truncate">{userSession?.tenant?.nome}</div>
            <div className="text-xs text-muted-foreground mt-1 capitalize">
              {userSession?.role?.toLowerCase()}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 backdrop-blur px-4 sm:px-6">
          <div className="flex items-center gap-4 pl-12 lg:pl-0">
            <h2 className="text-base sm:text-lg font-semibold truncate">
              {navigation.find((item) => location.pathname.startsWith(item.href))?.name ||
                "Construtor de IA"}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
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
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
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
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
