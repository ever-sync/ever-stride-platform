import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { QuickReplySelector } from "./QuickReplySelector";

interface ChatInputProps {
  chatId: number;
  sessionId?: string;
  phone: string;
  onMessageSent?: () => void;
}

export function ChatInput({ chatId, sessionId, phone, onMessageSent }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleQuickReplySelect = (content: string) => {
    setMessage(content);
  };

  const handleSend = async () => {
    if (!message.trim() || !sessionId) {
      toast({
        title: "Erro",
        description: sessionId ? "Digite uma mensagem" : "Sessão não vinculada a este chat",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      // Buscar session_name da sessão
      const { data: sessionData, error: sessionError } = await supabase
        .from('waha_sessions')
        .select('session_name')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Enviar mensagem via edge function
      const { error: sendError } = await supabase.functions.invoke('waha-send-message', {
        body: {
          sessionName: sessionData.session_name,
          chatId: phone,
          text: message,
        }
      });

      if (sendError) throw sendError;

      // Salvar mensagem no banco
      const { error: dbError } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: chatId,
          bot_message: message,
          phone: phone,
          message_type: 'sent',
          active: true,
        });

      if (dbError) throw dbError;

      setMessage("");
      toast({
        title: "Mensagem enviada",
        description: "A mensagem foi enviada com sucesso",
      });

      onMessageSent?.();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro ao enviar",
        description: error.message || "Não foi possível enviar a mensagem",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-card p-4 space-y-2">
      <div className="flex justify-end">
        <QuickReplySelector onSelect={handleQuickReplySelect} />
      </div>
      <div className="flex gap-2">
        <Textarea
          placeholder="Digite sua mensagem ou use /atalho para templates..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={sending || !sessionId}
          className="resize-none"
          rows={2}
        />
        <Button
          onClick={handleSend}
          disabled={sending || !message.trim() || !sessionId}
          size="icon"
          className="h-full px-4"
        >
          {sending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
      {!sessionId && (
        <p className="text-xs text-muted-foreground mt-2">
          Este chat não está vinculado a uma sessão WhatsApp ativa
        </p>
      )}
    </div>
  );
}
