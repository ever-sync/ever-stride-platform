import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Power, PowerOff, Trash2, X } from 'lucide-react';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onReconnect: () => void;
  onDisconnect: () => void;
  onRefreshQR: () => void;
  onClearSelection: () => void;
  isProcessing: boolean;
}

export function BulkActionsToolbar({
  selectedCount,
  onReconnect,
  onDisconnect,
  onRefreshQR,
  onClearSelection,
  isProcessing,
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
      <div className="container flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-base px-3 py-1">
            {selectedCount} {selectedCount === 1 ? 'sessão selecionada' : 'sessões selecionadas'}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onReconnect}
            disabled={isProcessing}
          >
            <Power className="h-4 w-4 mr-2" />
            Reconectar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onDisconnect}
            disabled={isProcessing}
          >
            <PowerOff className="h-4 w-4 mr-2" />
            Desconectar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshQR}
            disabled={isProcessing}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar QR
          </Button>

          <div className="w-px h-8 bg-border mx-2" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            disabled={isProcessing}
          >
            <X className="h-4 w-4 mr-2" />
            Limpar Seleção
          </Button>
        </div>
      </div>
    </div>
  );
}
