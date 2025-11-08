import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, MessageCircle, Bot, User, TrendingUp } from "lucide-react";
import { differenceInMinutes, differenceInSeconds } from "date-fns";
import type { ChatMessage } from "@/hooks/useChatMessages";

interface ChatStatisticsProps {
  messages: ChatMessage[];
}

export function ChatStatistics({ messages }: ChatStatisticsProps) {
  const stats = useMemo(() => {
    if (messages.length === 0) {
      return {
        totalMessages: 0,
        botMessages: 0,
        userMessages: 0,
        botResponseRate: 0,
        avgResponseTime: 0,
        conversationDuration: 0,
      };
    }

    const userMessages = messages.filter(m => m.user_message);
    const botMessages = messages.filter(m => m.bot_message);

    // Calcular tempo médio de resposta do bot
    let totalResponseTime = 0;
    let responseCount = 0;

    for (let i = 0; i < messages.length - 1; i++) {
      const current = messages[i];
      const next = messages[i + 1];

      // Se mensagem atual é do usuário e próxima é do bot
      if (current.user_message && next.bot_message && current.created_at && next.created_at) {
        const responseTime = differenceInSeconds(
          new Date(next.created_at),
          new Date(current.created_at)
        );
        totalResponseTime += responseTime;
        responseCount++;
      }
    }

    const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

    // Duração total da conversa
    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];
    const conversationDuration = firstMessage.created_at && lastMessage.created_at
      ? differenceInMinutes(new Date(lastMessage.created_at), new Date(firstMessage.created_at))
      : 0;

    // Taxa de resposta do bot (quantas mensagens de usuário receberam resposta)
    const botResponseRate = userMessages.length > 0
      ? (botMessages.length / userMessages.length) * 100
      : 0;

    return {
      totalMessages: messages.length,
      botMessages: botMessages.length,
      userMessages: userMessages.length,
      botResponseRate: Math.min(botResponseRate, 100),
      avgResponseTime,
      conversationDuration,
    };
  }, [messages]);

  const formatResponseTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total</CardTitle>
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalMessages}</div>
          <p className="text-xs text-muted-foreground">mensagens</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Usuário</CardTitle>
          <User className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.userMessages}</div>
          <p className="text-xs text-muted-foreground">mensagens</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Bot</CardTitle>
          <Bot className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.botMessages}</div>
          <p className="text-xs text-muted-foreground">respostas</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa Resposta</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.botResponseRate.toFixed(0)}%</div>
          <p className="text-xs text-muted-foreground">bot vs usuário</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tempo Resposta</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatResponseTime(stats.avgResponseTime)}
          </div>
          <p className="text-xs text-muted-foreground">média</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Duração</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatDuration(stats.conversationDuration)}
          </div>
          <p className="text-xs text-muted-foreground">conversa</p>
        </CardContent>
      </Card>
    </div>
  );
}
