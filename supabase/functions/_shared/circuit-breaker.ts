import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

interface CircuitBreakerConfig {
  failureThreshold: number // Número de falhas antes de abrir o circuito
  successThreshold: number // Número de sucessos para fechar um circuito HALF_OPEN
  timeout: number // Tempo em ms antes de tentar HALF_OPEN
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000, // 60 segundos
}

export class CircuitBreaker {
  private serviceName: string
  private config: CircuitBreakerConfig
  private supabase: any

  constructor(serviceName: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.serviceName = serviceName
    this.config = { ...DEFAULT_CONFIG, ...config }
    
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
  }

  async getState(): Promise<{
    state: CircuitState
    failure_count: number
    last_failure_time: string | null
  }> {
    const { data, error } = await this.supabase
      .from('circuit_breaker_state')
      .select('*')
      .eq('service_name', this.serviceName)
      .single()

    if (error || !data) {
      // Se não existe, criar com estado CLOSED
      await this.supabase
        .from('circuit_breaker_state')
        .insert({
          service_name: this.serviceName,
          state: 'CLOSED',
          failure_count: 0
        })
      
      return { state: 'CLOSED', failure_count: 0, last_failure_time: null }
    }

    // Verificar se deve mudar para HALF_OPEN
    if (data.state === 'OPEN' && data.last_failure_time) {
      const lastFailure = new Date(data.last_failure_time).getTime()
      const now = Date.now()
      
      if (now - lastFailure >= this.config.timeout) {
        await this.updateState('HALF_OPEN', data.failure_count)
        return { ...data, state: 'HALF_OPEN' }
      }
    }

    return data
  }

  async updateState(newState: CircuitState, failureCount?: number) {
    const updateData: any = {
      state: newState,
      updated_at: new Date().toISOString()
    }

    if (newState === 'CLOSED') {
      updateData.failure_count = 0
      updateData.last_success_time = new Date().toISOString()
    } else if (newState === 'OPEN') {
      updateData.failure_count = failureCount ?? this.config.failureThreshold
      updateData.last_failure_time = new Date().toISOString()
    }

    await this.supabase
      .from('circuit_breaker_state')
      .upsert({
        service_name: this.serviceName,
        ...updateData
      })
  }

  async recordSuccess() {
    const state = await this.getState()
    
    if (state.state === 'HALF_OPEN') {
      // Precisa de successThreshold sucessos para fechar
      await this.updateState('CLOSED')
      console.log(`Circuit breaker ${this.serviceName}: HALF_OPEN -> CLOSED`)
    } else if (state.state === 'CLOSED' && state.failure_count > 0) {
      // Reset contador de falhas
      await this.updateState('CLOSED', 0)
    }
  }

  async recordFailure() {
    const state = await this.getState()
    const newFailureCount = state.failure_count + 1

    if (state.state === 'HALF_OPEN') {
      // Qualquer falha em HALF_OPEN volta para OPEN
      await this.updateState('OPEN', newFailureCount)
      console.log(`Circuit breaker ${this.serviceName}: HALF_OPEN -> OPEN`)
    } else if (state.state === 'CLOSED' && newFailureCount >= this.config.failureThreshold) {
      // Atingiu threshold, abre o circuito
      await this.updateState('OPEN', newFailureCount)
      console.log(`Circuit breaker ${this.serviceName}: CLOSED -> OPEN (${newFailureCount} failures)`)
    } else {
      // Apenas incrementa o contador
      await this.supabase
        .from('circuit_breaker_state')
        .upsert({
          service_name: this.serviceName,
          state: state.state,
          failure_count: newFailureCount,
          updated_at: new Date().toISOString()
        })
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const state = await this.getState()

    if (state.state === 'OPEN') {
      throw new Error(`Circuit breaker is OPEN for service: ${this.serviceName}. Service temporarily unavailable.`)
    }

    try {
      const result = await fn()
      await this.recordSuccess()
      return result
    } catch (error) {
      await this.recordFailure()
      throw error
    }
  }
}

// Singleton para gerenciar circuit breakers
const circuitBreakers = new Map<string, CircuitBreaker>()

export function getCircuitBreaker(serviceName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(serviceName, new CircuitBreaker(serviceName, config))
  }
  return circuitBreakers.get(serviceName)!
}
