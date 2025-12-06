import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, MessageSquare, Filter, X } from "lucide-react";
import { TagManager } from "@/components/chats/TagManager";
import { ExportDialog } from "@/components/chats/ExportDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Chat } from "@/types/database";

interface ExtendedChat extends Chat {
  evolution_instances?: {
    instance_name: string;
  };
  end_users?: {
    nome: string;
  };
  chat_tags_mapping?: Array<{
    chat_tags: {
      id: string;
      name: string;
      color: string;
    };
  }>;
}

interface SessionOption {
  id: string;
  instance_name: string;
  session_name?: string; // Alias
}

interface Agent {
  id: string;
  nome_agente: string;
}

export default function Chats() {
  const navigate = useNavigate();
  const { userSession } = useAuth();
  const [chats, setChats] = useState<ExtendedChat[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [search, setSearch] = useState("");
  const [sessionFilter, setSessionFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [botStatusFilter, setBotStatusFilter] = useState<string>("all");
  const [availableTags, setAvailableTags] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (userSession?.tenant) {
      loadChats();
      loadSessions();
      loadAgents();
      loadTags();
    }
  }, [userSession]);

  const loadChats = async () => {
    if (!userSession?.tenant?.id) return;

      try {
        const { data, error } = await supabase
          .from("chats")
          .select(`
            *,
            evolution_instances(instance_name),
            end_users!chats_end_user_id_fkey(nome),
            chat_tags_mapping(
              chat_tags(id, name, color)
            )
          `)
          .eq("tenant_id", userSession.tenant.id)
          .order("created_at", { ascending: false })
          .limit(200);

        if (error) throw error;
        setChats(data as any || []);
      } catch (error) {
        console.error("Error loading chats:", error);
      } finally {
        setLoading(false);
      }
    };

    const loadSessions = async () => {
      if (!userSession?.tenant?.id) return;

      try {
        const { data, error } = await supabase
          .from("evolution_instances")
          .select("id, instance_name")
          .eq("tenant_id", userSession.tenant.id)
          .order("instance_name");

        if (error) throw error;
        // Map to include session_name alias
        setSessions((data || []).map(s => ({ ...s, session_name: s.instance_name })));
      } catch (error) {
        console.error("Error loading sessions:", error);
      }
    };

    const loadAgents = async () => {
      if (!userSession?.tenant?.id) return;

      try {
        const { data, error } = await supabase
          .from("agents")
          .select("id, nome_agente")
          .eq("tenant_id", userSession.tenant.id)
          .order("nome_agente");

        if (error) throw error;
        setAgents(data || []);
      } catch (error) {
        console.error("Error loading agents:", error);
      }
    };

    const loadTags = async () => {
      if (!userSession?.tenant?.id) return;

      try {
        const { data, error } = await supabase
          .from("chat_tags")
          .select("id, name, color")
          .eq("tenant_id", userSession.tenant.id)
          .order("name");

        if (error) throw error;
        setAvailableTags(data || []);
      } catch (error) {
        console.error("Error loading tags:", error);
      }
    };


  const clearFilters = () => {
    setSearch("");
    setSessionFilter("all");
    setAgentFilter("all");
    setTagFilter("all");
    setBotStatusFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const filteredChats = chats.filter((chat) => {
    // Busca por telefone ou nome
    const matchesSearch = 
      chat.phone?.toLowerCase().includes(search.toLowerCase()) ||
      chat.end_users?.nome?.toLowerCase().includes(search.toLowerCase());
    
    // Filtro por sessão
    const matchesSession = sessionFilter === "all" || chat.session_id === sessionFilter;
    
    // Filtro por tag
    const matchesTag = tagFilter === "all" || 
      chat.chat_tags_mapping?.some(mapping => mapping.chat_tags.id === tagFilter);
    
    // Filtro por status do bot
    const matchesBotStatus = 
      botStatusFilter === "all" ||
      (botStatusFilter === "active" && !chat.bot_paused && !chat.transferred_to_human) ||
      (botStatusFilter === "paused" && chat.bot_paused && !chat.transferred_to_human) ||
      (botStatusFilter === "transferred" && chat.transferred_to_human);
    
    // Filtro por data
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const chatDate = chat.created_at ? new Date(chat.created_at) : null;
      if (chatDate) {
        if (dateFrom) {
          matchesDate = matchesDate && chatDate >= new Date(dateFrom);
        }
        if (dateTo) {
          matchesDate = matchesDate && chatDate <= new Date(dateTo + "T23:59:59");
        }
      } else {
        matchesDate = false;
      }
    }

    return matchesSearch && matchesSession && matchesTag && matchesDate && matchesBotStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Chats</h1>
            <p className="text-muted-foreground mt-1">Gerencie suas conversas</p>
          </div>
          <TagManager />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por telefone ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <ExportDialog 
            data={filteredChats} 
            filename="conversas"
            type="chats"
          />
        </div>

        {showFilters && (
          <Card className="p-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <div>
                <label className="text-sm font-medium mb-2 block">Sessão WhatsApp</label>
                <select
                  value={sessionFilter}
                  onChange={(e) => setSessionFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="all">Todas as sessões</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.instance_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Data inicial</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Data final</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Tag</label>
                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="all">Todas as tags</option>
                  {availableTags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Status do Bot</label>
                <select
                  value={botStatusFilter}
                  onChange={(e) => setBotStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="all">Todos os status</option>
                  <option value="active">Bot Ativo</option>
                  <option value="paused">Bot Pausado</option>
                  <option value="transferred">Atend. Humano</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpar filtros
                </Button>
              </div>
            </div>
          </Card>
        )}
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
            <Card 
              key={chat.id} 
              className="p-4 hover:shadow-md transition-smooth cursor-pointer"
              onClick={() => navigate(`/chats/${chat.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{chat.phone}</span>
                      <Badge variant="secondary">#{chat.id}</Badge>
                      {chat.end_users?.nome && (
                        <Badge variant="outline">{chat.end_users.nome}</Badge>
                      )}
                      {chat.evolution_instances?.instance_name && (
                        <Badge variant="default" className="text-xs">
                          {chat.evolution_instances.instance_name}
                        </Badge>
                      )}
                      {chat.transferred_to_human && (
                        <Badge variant="secondary" className="text-xs">
                          🧑 Atend. Humano
                        </Badge>
                      )}
                      {chat.bot_paused && !chat.transferred_to_human && (
                        <Badge variant="outline" className="text-xs">
                          ⏸️ Bot Pausado
                        </Badge>
                      )}
                      {chat.chat_tags_mapping?.map((mapping: any) => (
                        <Badge
                          key={mapping.chat_tags.id}
                          style={{ backgroundColor: mapping.chat_tags.color, color: "#fff" }}
                          className="text-xs"
                        >
                          {mapping.chat_tags.name}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Criado em{" "}
                      {chat.created_at &&
                        format(new Date(chat.created_at), "dd MMM yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
