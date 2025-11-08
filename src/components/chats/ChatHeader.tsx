import { ArrowLeft, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface ChatHeaderProps {
  phone: string;
  chatId: number;
  messageCount: number;
}

export function ChatHeader({ phone, chatId, messageCount }: ChatHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="border-b bg-card sticky top-0 z-10">
      <div className="flex items-center gap-4 p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/chats")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-3 flex-1">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Phone className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1">
            <h2 className="font-semibold text-lg">{phone}</h2>
            <p className="text-sm text-muted-foreground">
              Chat #{chatId}
            </p>
          </div>
          
          <Badge variant="secondary">
            {messageCount} {messageCount === 1 ? 'mensagem' : 'mensagens'}
          </Badge>
        </div>
      </div>
    </div>
  );
}
