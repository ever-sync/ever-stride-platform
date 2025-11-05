import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

export function useIsSuperAdmin() {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSuperAdmin() {
      if (!user) {
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc("is_super_admin", {
          _user_id: user.id,
        });

        if (error) {
          console.error("Error checking super admin status:", error);
          setIsSuperAdmin(false);
        } else {
          setIsSuperAdmin(data || false);
        }
      } catch (error) {
        console.error("Error checking super admin status:", error);
        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    checkSuperAdmin();
  }, [user]);

  return { isSuperAdmin, loading };
}
