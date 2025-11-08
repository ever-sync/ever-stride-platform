/**
 * Retry automático com backoff exponencial
 * @param fn Função assíncrona a ser executada
 * @param maxRetries Número máximo de tentativas
 * @param baseDelay Delay inicial em ms
 * @returns Resultado da função
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Se for o último attempt, lança o erro
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Calcula o delay com backoff exponencial
      const delay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 0.3 * delay; // 0-30% de jitter
      const totalDelay = delay + jitter;
      
      console.log(`Tentativa ${attempt + 1}/${maxRetries + 1} falhou. Aguardando ${Math.round(totalDelay)}ms antes de tentar novamente...`);
      console.error('Erro:', lastError.message);
      
      // Aguarda antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }
  
  throw lastError!;
}

/**
 * Wrapper para chamadas fetch com retry
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  return retryWithBackoff(async () => {
    const response = await fetch(url, options);
    
    // Se for erro 5xx, faz retry (erro do servidor)
    // Se for 429 (rate limit), faz retry
    if (response.status >= 500 || response.status === 429) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  }, maxRetries);
}
