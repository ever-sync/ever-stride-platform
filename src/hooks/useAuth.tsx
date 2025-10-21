import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UserSession } from "@/types/database";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userSession: UserSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, tenantName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadUserSession = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      const { data: tenantUser } = await supabase
        .from("tenant_users")
        .select("*, tenants(*)")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (profile && tenantUser) {
        setUserSession({
          user: { id: userId, email: profile.email },
          profile,
          tenantUser,
          tenant: tenantUser.tenants as any,
          role: tenantUser.role as any,
        });
      }
    } catch (error) {
      console.error("Error loading user session:", error);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserSession(session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserSession(session.user.id);
      } else {
        setUserSession(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    navigate("/dashboard");
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    tenantName: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error("User creation failed");

    const { error: tenantError } = await supabase.rpc("create_tenant_with_owner", {
      p_tenant_name: tenantName,
      p_tenant_email: email,
      p_user_id: data.user.id,
    });

    if (tenantError) throw tenantError;

    toast.success("Conta criada! Verifique seu email para confirmar.");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserSession(null);
    navigate("/login");
  };

  const refreshSession = async () => {
    if (user) {
      await loadUserSession(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userSession,
        loading,
        signIn,
        signUp,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
