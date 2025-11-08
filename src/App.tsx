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
import Clients from "./pages/Clients";
import Agents from "./pages/Agents";
import KnowledgeBase from "./pages/KnowledgeBase";
import Chats from "./pages/Chats";
import ChatDetail from "./pages/ChatDetail";
import Reports from "./pages/Reports";
import ClientReports from "./pages/ClientReports";
import Settings from "./pages/Settings";
import Users from "./pages/Users";
import Integrations from "./pages/Integrations";
import NotFound from "./pages/NotFound";
import MasterAdmin from "./pages/MasterAdmin";
import WhatsAppConnection from "./pages/WhatsAppConnection";
import TokenUsage from "./pages/TokenUsage";
import Planos from "./pages/Planos";
import TestAgentChat from "./pages/TestAgentChat";
import WhatsAppTest from "./pages/WhatsAppTest";
import WhatsAppDashboard from "./pages/WhatsAppDashboard";

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
            <Route path="/whatsapp-clients" element={<Navigate to="/clients" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/master-admin"
              element={
                <AuthGuard>
                  <AppShell>
                    <MasterAdmin />
                  </AppShell>
                </AuthGuard>
              }
            />
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
              path="/clients"
              element={
                <AuthGuard>
                  <AppShell>
                    <Clients />
                  </AppShell>
                </AuthGuard>
              }
            />
            <Route
              path="/agents"
              element={
                <AuthGuard>
                  <AppShell>
                    <Agents />
                  </AppShell>
                </AuthGuard>
              }
            />
            <Route
              path="/knowledge-base"
              element={
                <AuthGuard>
                  <AppShell>
                    <KnowledgeBase />
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
              path="/chats/:chatId"
              element={
                <AuthGuard>
                  <AppShell>
                    <ChatDetail />
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
            <Route
              path="/whatsapp-connection"
              element={
                <AuthGuard>
                  <AppShell>
                    <WhatsAppConnection />
                  </AppShell>
                </AuthGuard>
              }
            />
            <Route
              path="/token-usage"
              element={
                <AuthGuard>
                  <AppShell>
                    <TokenUsage />
                  </AppShell>
                </AuthGuard>
              }
            />
            <Route
              path="/planos"
              element={
                <AuthGuard>
                  <AppShell>
                    <Planos />
                  </AppShell>
                </AuthGuard>
              }
            />
            <Route
              path="/test-agent-chat"
              element={
                <AuthGuard>
                  <AppShell>
                    <TestAgentChat />
                  </AppShell>
                </AuthGuard>
              }
            />
            <Route
              path="/whatsapp-test"
              element={
                <AuthGuard>
                  <AppShell>
                    <WhatsAppTest />
                  </AppShell>
                </AuthGuard>
              }
            />
            <Route
              path="/whatsapp-dashboard"
              element={
                <AuthGuard>
                  <AppShell>
                    <WhatsAppDashboard />
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
