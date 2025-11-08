import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: number;
  user_message?: string;
  bot_message?: string;
  created_at: string;
  phone?: string;
}

interface MessageSearchProps {
  messages: Message[];
  onResultClick?: (messageId: number) => void;
}

interface SearchResult {
  messageId: number;
  content: string;
  isBot: boolean;
  context: string;
  highlightedContent: string;
  timestamp: string;
}

export function MessageSearch({ messages, onResultClick }: MessageSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const highlightText = (text: string, term: string): string => {
    if (!term) return text;
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-300 dark:bg-yellow-600">$1</mark>');
  };

  const getContext = (text: string, term: string, contextLength = 50): string => {
    const lowerText = text.toLowerCase();
    const lowerTerm = term.toLowerCase();
    const index = lowerText.indexOf(lowerTerm);
    
    if (index === -1) return text.substring(0, contextLength * 2) + '...';
    
    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + term.length + contextLength);
    
    let context = text.substring(start, end);
    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';
    
    return context;
  };

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const searchResults: SearchResult[] = [];
    const term = searchTerm.trim();

    messages.forEach((msg) => {
      const userMsg = msg.user_message || "";
      const botMsg = msg.bot_message || "";

      if (userMsg.toLowerCase().includes(term.toLowerCase())) {
        searchResults.push({
          messageId: msg.id,
          content: userMsg,
          isBot: false,
          context: getContext(userMsg, term),
          highlightedContent: highlightText(getContext(userMsg, term), term),
          timestamp: msg.created_at
        });
      }

      if (botMsg.toLowerCase().includes(term.toLowerCase())) {
        searchResults.push({
          messageId: msg.id,
          content: botMsg,
          isBot: true,
          context: getContext(botMsg, term),
          highlightedContent: highlightText(getContext(botMsg, term), term),
          timestamp: msg.created_at
        });
      }
    });

    setResults(searchResults);
    setShowResults(true);
  };

  const handleClear = () => {
    setSearchTerm("");
    setResults([]);
    setShowResults(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nas mensagens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button onClick={handleSearch}>
          <Search className="h-4 w-4 mr-2" />
          Buscar
        </Button>
      </div>

      {showResults && (
        <Card className="p-4 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">
              {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
            </h3>
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma mensagem encontrada com "{searchTerm}"
            </p>
          ) : (
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={`${result.messageId}-${index}`}
                  className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => onResultClick?.(result.messageId)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={result.isBot ? "secondary" : "default"}>
                      {result.isBot ? "Bot" : "Usuário"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(result.timestamp).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div
                    className="text-sm"
                    dangerouslySetInnerHTML={{ __html: result.highlightedContent }}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
