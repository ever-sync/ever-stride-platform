import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity, AlertCircle, Loader2 } from 'lucide-react';

export function WAHAHealthIndicator() {
  const { data, isLoading } = useQuery({
    queryKey: ['waha-health'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('waha-health-check');
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        Verificando...
      </Badge>
    );
  }

  const isOnline = data?.online === true;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={isOnline ? 'default' : 'destructive'} className="gap-2 cursor-help">
            {isOnline ? (
              <>
                <Activity className="h-3 w-3" />
                WAHA Online
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3" />
                WAHA Offline
              </>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-xs">
            <p>Status: {isOnline ? 'Online' : 'Offline'}</p>
            {isOnline && (
              <>
                {data.version && <p>Versão: {data.version}</p>}
                {data.sessions !== undefined && <p>Sessões: {data.sessions}</p>}
                {data.url && <p className="text-muted-foreground">{data.url}</p>}
              </>
            )}
            {!isOnline && data?.error && (
              <p className="text-red-500">Erro: {data.error}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}