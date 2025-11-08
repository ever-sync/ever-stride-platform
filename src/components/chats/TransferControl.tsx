import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Bot, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TransferControlProps {
  chatId: number;
  botPaused: boolean;
  transferredToHuman: boolean;
  onUpdate: () => void;
}

export function TransferControl({ 
  chatId, 
  botPaused, 
  transferredToHuman,
  onUpdate 
}: TransferControlProps) {
  const [loading, setLoading] = useState(false);

  const handleTransferToHuman = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("chats")
        .update({
          bot_paused: true,
          transferred_to_human: true,
          transferred_at: new Date().toISOString(),
          transferred_by: user?.id
        })
        .eq("id", chatId);

      if (error) throw error;

      toast.success("Chat transferido para atendimento humano");
      onUpdate();
    } catch (error: any) {
      toast.error("Erro ao transferir chat: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBotPause = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("chats")
        .update({
          bot_paused: !botPaused,
          transferred_to_human: botPaused ? false : transferredToHuman // Reset transfer if resuming bot
        })
        .eq("id", chatId);

      if (error) throw error;

      toast.success(botPaused ? "Bot reativado" : "Bot pausado");
      onUpdate();
    } catch (error: any) {
      toast.error("Erro ao atualizar status: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToBot = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("chats")
        .update({
          bot_paused: false,
          transferred_to_human: false,
          transferred_at: null,
          transferred_by: null
        })
        .eq("id", chatId);

      if (error) throw error;

      toast.success("Chat retornado para o bot");
      onUpdate();
    } catch (error: any) {
      toast.error("Erro ao retornar chat: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Status badges */}
      {transferredToHuman && (
        <Badge variant="secondary" className="gap-1">
          <UserPlus className="h-3 w-3" />
          Atendimento Humano
        </Badge>
      )}
      {botPaused && !transferredToHuman && (
        <Badge variant="outline" className="gap-1">
          <Pause className="h-3 w-3" />
          Bot Pausado
        </Badge>
      )}
      {!botPaused && !transferredToHuman && (
        <Badge variant="default" className="gap-1">
          <Bot className="h-3 w-3" />
          Bot Ativo
        </Badge>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {!transferredToHuman ? (
          <>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={loading}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Transferir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Transferir para Atendimento Humano</AlertDialogTitle>
                  <AlertDialogDescription>
                    O bot será pausado e o chat será marcado como atendimento humano. 
                    Você poderá retornar ao bot posteriormente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleTransferToHuman}>
                    Confirmar Transferência
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              variant={botPaused ? "default" : "outline"}
              size="sm"
              onClick={handleToggleBotPause}
              disabled={loading}
            >
              {botPaused ? (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Reativar Bot
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pausar Bot
                </>
              )}
            </Button>
          </>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="default" size="sm" disabled={loading}>
                <Bot className="h-4 w-4 mr-2" />
                Retornar ao Bot
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Retornar ao Atendimento do Bot</AlertDialogTitle>
                <AlertDialogDescription>
                  O chat será marcado como atendimento por bot e o bot voltará a responder automaticamente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleReturnToBot}>
                  Confirmar Retorno
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
