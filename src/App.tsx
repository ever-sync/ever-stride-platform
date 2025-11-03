import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell } from "@/components/AppShell";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import WhatsAppClients from "./pages/WhatsAppClients";
import Chats from "./pages/Chats";
import Reports from "./pages/Reports";
import ClientReports from "./pages/ClientReports";
import Settings from "./pages/Settings";
import Users from "./pages/Users";
import Integrations from "./pages/Integrations";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <AuthGuard>
                  <AppShell>
                    <Dashboard />
                  </AppShell>
                </AuthGuard>
              }
            />
            <Route
              path="/whatsapp-clients"
              element={
                <AuthGuard>
                  <AppShell>
                    <WhatsAppClients />
                  </AppShell>
                </AuthGuard>
              }
            />
            <Route
              path="/chats"
              element={
                <AuthGuard>
                  <AppShell>
                    <Chats />
                  </AppShell>
                </AuthGuard>
              }
            />
            <Route
              path="/reports"
              element={
                <AuthGuard>
                  <AppShell>
                    <Reports />
                  </AppShell>
                </AuthGuard>
              }
            />
            <Route
              path="/client-reports"
              element={
                <AuthGuard>
                  <AppShell>
                    <ClientReports />
                  </AppShell>
                </AuthGuard>
              }
            />
            <Route
              path="/settings"
              element={
                <AuthGuard>
                  <AppShell>
                    <Settings />
                  </AppShell>
                </AuthGuard>
              }
            />
            <Route
              path="/users"
              element={
                <AuthGuard>
                  <AppShell>
                    <Users />
                  </AppShell>
                </AuthGuard>
              }
            />
            <Route
              path="/integrations"
              element={
                <AuthGuard>
                  <AppShell>
                    <Integrations />
                  </AppShell>
                </AuthGuard>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
