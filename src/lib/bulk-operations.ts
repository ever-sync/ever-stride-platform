import { supabase } from '@/integrations/supabase/client';

export interface BulkOperationResult {
  sessionId: string;
  status: 'success' | 'failed';
  error?: string;
}

export interface BulkOperationSummary {
  total: number;
  successful: number;
  failed: number;
  results: BulkOperationResult[];
}

export async function executeBulkOperation(
  operation: 'reconnect' | 'disconnect' | 'refresh_qr',
  sessionIds: string[],
  options: {
    batchSize?: number;
    delayMs?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<BulkOperationSummary> {
  const { batchSize = 5, delayMs = 500, onProgress } = options;
  const results: BulkOperationResult[] = [];
  
  // Process in batches
  for (let i = 0; i < sessionIds.length; i += batchSize) {
    const batch = sessionIds.slice(i, i + batchSize);
    
    const batchResults = await Promise.allSettled(
      batch.map(async (sessionId) => {
        const { data, error } = await supabase.functions.invoke('waha-bulk-operation', {
          body: {
            operation,
            sessionId,
          },
        });

        if (error) throw error;
        return { sessionId, status: 'success' as const };
      })
    );

    // Collect results
    batchResults.forEach((result, idx) => {
      const sessionId = batch[idx];
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          sessionId,
          status: 'failed',
          error: result.reason?.message || 'Unknown error',
        });
      }
    });

    // Update progress
    if (onProgress) {
      onProgress(Math.min(i + batchSize, sessionIds.length), sessionIds.length);
    }

    // Add delay between batches (except for last batch)
    if (i + batchSize < sessionIds.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return {
    total: sessionIds.length,
    successful: results.filter(r => r.status === 'success').length,
    failed: results.filter(r => r.status === 'failed').length,
    results,
  };
}
