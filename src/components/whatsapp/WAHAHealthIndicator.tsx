import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity, AlertCircle, Loader2 } from 'lucide-react';

export function WAHAHealthIndicator() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['waha-health'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('waha-health-check');
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
    retry: 2,
  });

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        Verificando...
      </Badge>
    );
  }

  if (isError) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className="gap-2 cursor-help" onClick={() => refetch()}>
              <AlertCircle className="h-3 w-3" />
              Erro na Verificação
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1 text-xs max-w-xs">
              <p className="text-destructive font-medium">Erro ao verificar WAHA</p>
              <p className="text-muted-foreground break-words">{error?.message || 'Erro desconhecido'}</p>
              <p className="text-muted-foreground italic">Clique para tentar novamente</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
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
          <div className="space-y-2 text-xs max-w-md">
            <p className="font-medium">Status: {isOnline ? 'Online ✓' : 'Offline ✗'}</p>
            {isOnline && (
              <>
                {data.sessions !== undefined && <p>Sessões Ativas: {data.sessions}</p>}
                {data.url && <p className="text-muted-foreground break-words">URL: {data.url}</p>}
              </>
            )}
            {!isOnline && (
              <>
                {data?.error && (
                  <p className="text-destructive font-medium">Erro: {data.error}</p>
                )}
                {data?.details && typeof data.details === 'string' && (
                  <p className="text-muted-foreground break-words">{data.details}</p>
                )}
                {data?.details && typeof data.details === 'object' && (
                  <div className="text-muted-foreground">
                    <p>Config URL: {data.details.hasUrl ? '✓' : '✗'}</p>
                    <p>Config API Key: {data.details.hasKey ? '✓' : '✗'}</p>
                  </div>
                )}
                {data?.url && <p className="text-muted-foreground break-words">Tentando: {data.url}</p>}
                <p className="text-muted-foreground italic mt-2">
                  Verifique as secrets WAHA_API_URL e WAHA_API_KEY
                </p>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}