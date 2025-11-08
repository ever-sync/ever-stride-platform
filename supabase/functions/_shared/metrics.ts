import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function recordMetric(
  functionName: string,
  executionTimeMs: number,
  status: 'success' | 'error' | 'retry',
  retryCount: number = 0,
  errorMessage?: string,
  metadata: Record<string, any> = {}
) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    await supabase
      .from('edge_function_metrics')
      .insert({
        function_name: functionName,
        execution_time_ms: executionTimeMs,
        status,
        retry_count: retryCount,
        error_message: errorMessage,
        metadata
      })
  } catch (error) {
    // Não falhar se a gravação de métricas falhar
    console.error('Failed to record metric:', error)
  }
}

export function trackExecution<T>(
  functionName: string,
  fn: () => Promise<T>,
  retryCount: number = 0
): Promise<T> {
  const startTime = Date.now()
  
  return fn()
    .then(async (result) => {
      const executionTime = Date.now() - startTime
      await recordMetric(functionName, executionTime, 'success', retryCount)
      return result
    })
    .catch(async (error) => {
      const executionTime = Date.now() - startTime
      await recordMetric(
        functionName,
        executionTime,
        'error',
        retryCount,
        error.message
      )
      throw error
    })
}
