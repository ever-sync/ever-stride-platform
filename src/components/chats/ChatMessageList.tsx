import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/hooks/useChatMessages";

interface ChatMessageListProps {
  messages: ChatMessageType[];
  loading: boolean;
}

export function ChatMessageList({ messages, loading }: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Nenhuma mensagem nesta conversa
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-4">
      <div ref={scrollRef} className="py-4 space-y-1">
        {messages.map((msg) => {
          // User message
          if (msg.user_message) {
            return (
              <ChatMessage
                key={`${msg.id}-user`}
                message={msg.user_message}
                isBot={false}
                timestamp={msg.created_at || new Date().toISOString()}
              />
            );
          }
          
          // Bot message
          if (msg.bot_message) {
            return (
              <ChatMessage
                key={`${msg.id}-bot`}
                message={msg.bot_message}
                isBot={true}
                timestamp={msg.created_at || new Date().toISOString()}
              />
            );
          }
          
          return null;
        })}
      </div>
    </ScrollArea>
  );
}
