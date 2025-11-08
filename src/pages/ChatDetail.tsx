import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useChatMessages } from "@/hooks/useChatMessages";
import { ChatHeader } from "@/components/chats/ChatHeader";
import { ChatMessageList } from "@/components/chats/ChatMessageList";
import { ChatStatistics } from "@/components/chats/ChatStatistics";
import { ChatInput } from "@/components/chats/ChatInput";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import type { Chat } from "@/types/database";

export default function ChatDetail() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { userSession } = useAuth();
  const [chat, setChat] = useState<Chat | null>(null);
  const [loadingChat, setLoadingChat] = useState(true);
  const { messages, loading: loadingMessages } = useChatMessages(chatId || "");

  useEffect(() => {
    if (chatId && userSession?.tenant?.id) {
      loadChat();
    }
  }, [chatId, userSession]);

  const loadChat = async () => {
    if (!chatId || !userSession?.tenant?.id) return;

    try {
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .eq("id", parseInt(chatId))
        .eq("tenant_id", userSession.tenant.id)
        .single();

      if (error) throw error;
      
      if (!data) {
        navigate("/chats");
        return;
      }

      setChat(data);
    } catch (error) {
      console.error("Error loading chat:", error);
      navigate("/chats");
    } finally {
      setLoadingChat(false);
    }
  };

  if (loadingChat) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Carregando chat...</div>
      </div>
    );
  }

  if (!chat) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Chat não encontrado</h2>
        <p className="text-muted-foreground">
          O chat que você está procurando não existe ou foi removido.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      <ChatHeader
        phone={chat.phone || "Desconhecido"}
        chatId={chat.id}
        messageCount={messages.length}
      />
      
      <ChatStatistics messages={messages} />
      
      <div className="flex-1 flex flex-col min-h-0">
        <ChatMessageList messages={messages} loading={loadingMessages} />
        <ChatInput
          chatId={chat.id}
          sessionId={chat.session_id || undefined}
          phone={chat.phone || ""}
        />
      </div>
    </div>
  );
}
