import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Chat } from "@/types/database";

export default function Chats() {
  const { userSession } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userSession?.tenant) {
      loadChats();
    }
  }, [userSession]);

  const loadChats = async () => {
    if (!userSession?.tenant?.id) return;

    try {
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .eq("tenant_id", userSession.tenant.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setChats(data || []);
    } catch (error) {
      console.error("Error loading chats:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = chats.filter((chat) =>
    chat.phone?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Chats</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas conversas</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filteredChats.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum chat encontrado
        </div>
      ) : (
        <div className="space-y-3">
          {filteredChats.map((chat) => (
            <Card key={chat.id} className="p-4 hover:shadow-md transition-smooth cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{chat.phone}</span>
                    <Badge variant="secondary">Chat #{chat.id}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Criado em{" "}
                    {chat.created_at &&
                      format(new Date(chat.created_at), "dd MMM yyyy, HH:mm", {
                        locale: ptBR,
                      })}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
