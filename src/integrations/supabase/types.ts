export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          ativo: boolean | null
          client_id: string
          created_at: string
          id: string
          limite_mensagens_mes: number | null
          max_tokens: number | null
          mensagens_usadas_mes: number | null
          modelo_ia: string | null
          n8n_workflow_id: string | null
          nome_agente: string
          prompt_sistema: string | null
          saudacao_inicial: string | null
          script_atendimento: string
          temperatura: number | null
          tempo_atendimento: number | null
          tenant_id: number
          updated_at: string
          webhook_url: string | null
          workflow_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          client_id: string
          created_at?: string
          id?: string
          limite_mensagens_mes?: number | null
          max_tokens?: number | null
          mensagens_usadas_mes?: number | null
          modelo_ia?: string | null
          n8n_workflow_id?: string | null
          nome_agente?: string
          prompt_sistema?: string | null
          saudacao_inicial?: string | null
          script_atendimento: string
          temperatura?: number | null
          tempo_atendimento?: number | null
          tenant_id: number
          updated_at?: string
          webhook_url?: string | null
          workflow_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          client_id?: string
          created_at?: string
          id?: string
          limite_mensagens_mes?: number | null
          max_tokens?: number | null
          mensagens_usadas_mes?: number | null
          modelo_ia?: string | null
          n8n_workflow_id?: string | null
          nome_agente?: string
          prompt_sistema?: string | null
          saudacao_inicial?: string | null
          script_atendimento?: string
          temperatura?: number | null
          tempo_atendimento?: number | null
          tenant_id?: number
          updated_at?: string
          webhook_url?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          active: boolean | null
          bot_message: string | null
          chat_id: number | null
          created_at: string | null
          id: number
          message_type: string | null
          nomewpp: string | null
          phone: string | null
          user_message: string | null
        }
        Insert: {
          active?: boolean | null
          bot_message?: string | null
          chat_id?: number | null
          created_at?: string | null
          id?: number
          message_type?: string | null
          nomewpp?: string | null
          phone?: string | null
          user_message?: string | null
        }
        Update: {
          active?: boolean | null
          bot_message?: string | null
          chat_id?: number | null
          created_at?: string | null
          id?: number
          message_type?: string | null
          nomewpp?: string | null
          phone?: string | null
          user_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string | null
          end_user_id: number | null
          id: number
          phone: string | null
          tenant_id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_user_id?: number | null
          id?: number
          phone?: string | null
          tenant_id: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_user_id?: number | null
          id?: number
          phone?: string | null
          tenant_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_end_user_id_fkey"
            columns: ["end_user_id"]
            isOneToOne: false
            referencedRelation: "end_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_chats_end_user"
            columns: ["end_user_id"]
            isOneToOne: false
            referencedRelation: "end_users"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          agent_id: string | null
          content: string
          created_at: string
          embedding: string | null
          fts: unknown
          id: number
          metadata: Json | null
          tenant_id: number
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          content: string
          created_at?: string
          embedding?: string | null
          fts?: unknown
          id?: number
          metadata?: Json | null
          tenant_id: number
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          content?: string
          created_at?: string
          embedding?: string | null
          fts?: unknown
          id?: number
          metadata?: Json | null
          tenant_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      end_users: {
        Row: {
          atendimento_ia: string | null
          created_at: string
          email: string | null
          id: number
          meta: Json | null
          nome: string | null
          resumo_lead: string | null
          setor: string | null
          tags: string[] | null
          telefone: string
          tenant_id: number
        }
        Insert: {
          atendimento_ia?: string | null
          created_at?: string
          email?: string | null
          id?: number
          meta?: Json | null
          nome?: string | null
          resumo_lead?: string | null
          setor?: string | null
          tags?: string[] | null
          telefone: string
          tenant_id: number
        }
        Update: {
          atendimento_ia?: string | null
          created_at?: string
          email?: string | null
          id?: number
          meta?: Json | null
          nome?: string | null
          resumo_lead?: string | null
          setor?: string | null
          tags?: string[] | null
          telefone?: string
          tenant_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "end_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_config: {
        Row: {
          ativo: boolean
          canais: Json | null
          created_at: string
          horario_atend: unknown
          id: number
          idioma: string | null
          limites: Json | null
          meta: Json | null
          modelo: string | null
          prompt_sistema: string | null
          temperatura: number | null
          tenant_id: number
          tom_de_voz: string | null
        }
        Insert: {
          ativo?: boolean
          canais?: Json | null
          created_at?: string
          horario_atend?: unknown
          id?: number
          idioma?: string | null
          limites?: Json | null
          meta?: Json | null
          modelo?: string | null
          prompt_sistema?: string | null
          temperatura?: number | null
          tenant_id: number
          tom_de_voz?: string | null
        }
        Update: {
          ativo?: boolean
          canais?: Json | null
          created_at?: string
          horario_atend?: unknown
          id?: number
          idioma?: string | null
          limites?: Json | null
          meta?: Json | null
          modelo?: string | null
          prompt_sistema?: string | null
          temperatura?: number | null
          tenant_id?: number
          tom_de_voz?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      limites_tokens: {
        Row: {
          alerta_enviado_100: boolean | null
          alerta_enviado_80: boolean | null
          alerta_enviado_90: boolean | null
          client_id: string
          conversas_mes: number | null
          created_at: string | null
          custo_brl_usado_mes: number | null
          id: string
          limite_conversas_mes: number | null
          limite_custo_brl_mes: number | null
          limite_tokens_mes: number | null
          proximo_reset: string | null
          tokens_usados_mes: number | null
          ultimo_reset: string | null
          updated_at: string | null
        }
        Insert: {
          alerta_enviado_100?: boolean | null
          alerta_enviado_80?: boolean | null
          alerta_enviado_90?: boolean | null
          client_id: string
          conversas_mes?: number | null
          created_at?: string | null
          custo_brl_usado_mes?: number | null
          id?: string
          limite_conversas_mes?: number | null
          limite_custo_brl_mes?: number | null
          limite_tokens_mes?: number | null
          proximo_reset?: string | null
          tokens_usados_mes?: number | null
          ultimo_reset?: string | null
          updated_at?: string | null
        }
        Update: {
          alerta_enviado_100?: boolean | null
          alerta_enviado_80?: boolean | null
          alerta_enviado_90?: boolean | null
          client_id?: string
          conversas_mes?: number | null
          created_at?: string | null
          custo_brl_usado_mes?: number | null
          id?: string
          limite_conversas_mes?: number | null
          limite_custo_brl_mes?: number | null
          limite_tokens_mes?: number | null
          proximo_reset?: string | null
          tokens_usados_mes?: number | null
          ultimo_reset?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "limites_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_chat_histories: {
        Row: {
          created_at: string
          id: number
          message: Json
          session_id: string
          tenant_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          message: Json
          session_id: string
          tenant_id: number
        }
        Update: {
          created_at?: string
          id?: number
          message?: Json
          session_id?: string
          tenant_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "n8n_chat_histories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_workflows: {
        Row: {
          agent_id: string | null
          created_at: string | null
          failed_executions: number | null
          id: string
          is_active: boolean | null
          last_execution: string | null
          tenant_id: number
          total_executions: number | null
          updated_at: string | null
          webhook_test_url: string | null
          webhook_url: string
          workflow_id: string
          workflow_name: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          failed_executions?: number | null
          id?: string
          is_active?: boolean | null
          last_execution?: string | null
          tenant_id: number
          total_executions?: number | null
          updated_at?: string | null
          webhook_test_url?: string | null
          webhook_url: string
          workflow_id: string
          workflow_name: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          failed_executions?: number | null
          id?: string
          is_active?: boolean | null
          last_execution?: string | null
          tenant_id?: number
          total_executions?: number | null
          updated_at?: string | null
          webhook_test_url?: string | null
          webhook_url?: string
          workflow_id?: string
          workflow_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "n8n_workflows_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "n8n_workflows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      planos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          integracoes_permitidas: Json | null
          is_default: boolean | null
          is_publico: boolean | null
          limite_agentes: number | null
          limite_conversas_mes: number | null
          limite_tokens_mes: number | null
          limite_usuarios: number | null
          nome: string
          preco_mensal: number
          recursos: Json | null
          tenant_id: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          integracoes_permitidas?: Json | null
          is_default?: boolean | null
          is_publico?: boolean | null
          limite_agentes?: number | null
          limite_conversas_mes?: number | null
          limite_tokens_mes?: number | null
          limite_usuarios?: number | null
          nome: string
          preco_mensal: number
          recursos?: Json | null
          tenant_id?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          integracoes_permitidas?: Json | null
          is_default?: boolean | null
          is_publico?: boolean | null
          limite_agentes?: number | null
          limite_conversas_mes?: number | null
          limite_tokens_mes?: number | null
          limite_usuarios?: number | null
          nome?: string
          preco_mensal?: number
          recursos?: Json | null
          tenant_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      relatorios_custos: {
        Row: {
          conversas: number
          custo_bruto: number
          custo_final: number
          desconto_franquia: number
          execucoes: number
          gerado_em: string
          id: number
          imposto_percent: number
          imposto_valor: number
          llm_modelo: string | null
          mensagens: number
          minimo_mensal_aplicado: boolean
          moeda: string
          payload: Json | null
          periodo_fim: string
          periodo_inicio: string
          tenant_id: number
          tokens_cobrados: number
          tokens_total: number
          valor_por_token: number
        }
        Insert: {
          conversas: number
          custo_bruto: number
          custo_final: number
          desconto_franquia?: number
          execucoes?: number
          gerado_em?: string
          id?: number
          imposto_percent?: number
          imposto_valor?: number
          llm_modelo?: string | null
          mensagens: number
          minimo_mensal_aplicado?: boolean
          moeda?: string
          payload?: Json | null
          periodo_fim: string
          periodo_inicio: string
          tenant_id: number
          tokens_cobrados: number
          tokens_total: number
          valor_por_token: number
        }
        Update: {
          conversas?: number
          custo_bruto?: number
          custo_final?: number
          desconto_franquia?: number
          execucoes?: number
          gerado_em?: string
          id?: number
          imposto_percent?: number
          imposto_valor?: number
          llm_modelo?: string | null
          mensagens?: number
          minimo_mensal_aplicado?: boolean
          moeda?: string
          payload?: Json | null
          periodo_fim?: string
          periodo_inicio?: string
          tenant_id?: number
          tokens_cobrados?: number
          tokens_total?: number
          valor_por_token?: number
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_custos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorios_execucoes: {
        Row: {
          accuracy: number | null
          completion_tokens: number | null
          created_at: string
          execution_time: number | null
          ia_config_id: number | null
          id: number
          meta: Json | null
          model_used: string | null
          payload: Json | null
          prompt_tokens: number | null
          run_at: string
          run_number: number
          status: string
          tenant_id: number
          total_tokens: number | null
        }
        Insert: {
          accuracy?: number | null
          completion_tokens?: number | null
          created_at?: string
          execution_time?: number | null
          ia_config_id?: number | null
          id?: number
          meta?: Json | null
          model_used?: string | null
          payload?: Json | null
          prompt_tokens?: number | null
          run_at?: string
          run_number: number
          status?: string
          tenant_id: number
          total_tokens?: number | null
        }
        Update: {
          accuracy?: number | null
          completion_tokens?: number | null
          created_at?: string
          execution_time?: number | null
          ia_config_id?: number | null
          id?: number
          meta?: Json | null
          model_used?: string | null
          payload?: Json | null
          prompt_tokens?: number | null
          run_at?: string
          run_number?: number
          status?: string
          tenant_id?: number
          total_tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_execucoes_ia_config_id_fkey"
            columns: ["ia_config_id"]
            isOneToOne: false
            referencedRelation: "ia_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_execucoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: []
      }
      tenant_billing_config: {
        Row: {
          ativo: boolean
          created_at: string
          franquia_tokens_mensal: number | null
          id: number
          impostos_percent: number | null
          meta: Json | null
          minimo_mensal: number | null
          moeda: string
          tenant_id: number
          valor_por_token: number
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          franquia_tokens_mensal?: number | null
          id?: number
          impostos_percent?: number | null
          meta?: Json | null
          minimo_mensal?: number | null
          moeda?: string
          tenant_id: number
          valor_por_token: number
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          franquia_tokens_mensal?: number | null
          id?: number
          impostos_percent?: number | null
          meta?: Json | null
          minimo_mensal?: number | null
          moeda?: string
          tenant_id?: number
          valor_por_token?: number
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_billing_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean
          joined_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          documento: string | null
          email: string | null
          id: number
          meta: Json | null
          nome: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          documento?: string | null
          email?: string | null
          id?: number
          meta?: Json | null
          nome: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          documento?: string | null
          email?: string | null
          id?: number
          meta?: Json | null
          nome?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      token_usage: {
        Row: {
          agent_id: string
          chat_id: number | null
          client_id: string
          cotacao_usd_brl: number
          created_at: string | null
          custo_cache_usd: number | null
          custo_input_usd: number
          custo_output_usd: number
          custo_total_brl: number
          custo_total_usd: number | null
          erro: string | null
          id: string
          latencia_ms: number | null
          message_id: number | null
          modelo: string
          prompt_length: number | null
          provider: string
          response_length: number | null
          sucesso: boolean | null
          tenant_id: number
          tokens_cache_read: number | null
          tokens_input: number
          tokens_output: number
          tokens_total: number | null
        }
        Insert: {
          agent_id: string
          chat_id?: number | null
          client_id: string
          cotacao_usd_brl: number
          created_at?: string | null
          custo_cache_usd?: number | null
          custo_input_usd: number
          custo_output_usd: number
          custo_total_brl: number
          custo_total_usd?: number | null
          erro?: string | null
          id?: string
          latencia_ms?: number | null
          message_id?: number | null
          modelo: string
          prompt_length?: number | null
          provider: string
          response_length?: number | null
          sucesso?: boolean | null
          tenant_id: number
          tokens_cache_read?: number | null
          tokens_input: number
          tokens_output: number
          tokens_total?: number | null
        }
        Update: {
          agent_id?: string
          chat_id?: number | null
          client_id?: string
          cotacao_usd_brl?: number
          created_at?: string | null
          custo_cache_usd?: number | null
          custo_input_usd?: number
          custo_output_usd?: number
          custo_total_brl?: number
          custo_total_usd?: number | null
          erro?: string | null
          id?: string
          latencia_ms?: number | null
          message_id?: number | null
          modelo?: string
          prompt_length?: number | null
          provider?: string
          response_length?: number | null
          sucesso?: boolean | null
          tenant_id?: number
          tokens_cache_read?: number | null
          tokens_input?: number
          tokens_output?: number
          tokens_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "token_usage_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_usage_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_usage_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_usage_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: number
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: number
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: number
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      waha_sessions: {
        Row: {
          agent_id: string | null
          client_id: string
          connected_at: string | null
          created_at: string | null
          disconnected_at: string | null
          id: string
          last_activity: string | null
          last_message_at: string | null
          phone_number: string | null
          qr_code: string | null
          qr_expires_at: string | null
          reconnect_attempts: number | null
          session_name: string
          status: string | null
          tenant_id: number
          total_messages_received: number | null
          total_messages_sent: number | null
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          agent_id?: string | null
          client_id: string
          connected_at?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          id?: string
          last_activity?: string | null
          last_message_at?: string | null
          phone_number?: string | null
          qr_code?: string | null
          qr_expires_at?: string | null
          reconnect_attempts?: number | null
          session_name: string
          status?: string | null
          tenant_id: number
          total_messages_received?: number | null
          total_messages_sent?: number | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          agent_id?: string | null
          client_id?: string
          connected_at?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          id?: string
          last_activity?: string | null
          last_message_at?: string | null
          phone_number?: string | null
          qr_code?: string | null
          qr_expires_at?: string | null
          reconnect_attempts?: number | null
          session_name?: string
          status?: string | null
          tenant_id?: number
          total_messages_received?: number | null
          total_messages_sent?: number | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waha_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waha_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waha_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_clients: {
        Row: {
          api_key: string | null
          ativo: boolean | null
          cnpj: string | null
          created_at: string
          data_inicio: string | null
          data_vencimento: string | null
          email: string
          id: string
          nome_empresa: string
          plano_id: string | null
          plano_nome: string | null
          plano_valor: number | null
          status_pagamento: string | null
          telefone: string | null
          tenant_id: number
          updated_at: string
          waha_session_id: string | null
          waha_status: string | null
          waha_webhook_url: string | null
          whatsapp_numero: string
        }
        Insert: {
          api_key?: string | null
          ativo?: boolean | null
          cnpj?: string | null
          created_at?: string
          data_inicio?: string | null
          data_vencimento?: string | null
          email: string
          id?: string
          nome_empresa: string
          plano_id?: string | null
          plano_nome?: string | null
          plano_valor?: number | null
          status_pagamento?: string | null
          telefone?: string | null
          tenant_id: number
          updated_at?: string
          waha_session_id?: string | null
          waha_status?: string | null
          waha_webhook_url?: string | null
          whatsapp_numero: string
        }
        Update: {
          api_key?: string | null
          ativo?: boolean | null
          cnpj?: string | null
          created_at?: string
          data_inicio?: string | null
          data_vencimento?: string | null
          email?: string
          id?: string
          nome_empresa?: string
          plano_id?: string | null
          plano_nome?: string | null
          plano_valor?: number | null
          status_pagamento?: string | null
          telefone?: string | null
          tenant_id?: number
          updated_at?: string
          waha_session_id?: string | null
          waha_status?: string | null
          waha_webhook_url?: string | null
          whatsapp_numero?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_plano_id"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_custos_cliente_mensal: {
        Row: {
          agentes_usados: number | null
          chamadas_com_erro: number | null
          client_id: string | null
          cliente_nome: string | null
          custo_total_brl: number | null
          custo_total_usd: number | null
          latencia_media_ms: number | null
          media_tokens_chamada: number | null
          mes: string | null
          tenant_id: number | null
          tokens_total: number | null
          total_chamadas: number | null
        }
        Relationships: [
          {
            foreignKeyName: "token_usage_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_custos_periodo_base: {
        Row: {
          conversas: number | null
          custo_bruto: number | null
          custo_final: number | null
          desconto_franquia: number | null
          dia_ref: string | null
          execucoes: number | null
          gerado_em: string | null
          id: number | null
          imposto_percent: number | null
          imposto_valor: number | null
          llm_modelo: string | null
          mensagens: number | null
          mes_ref: string | null
          minimo_mensal_aplicado: boolean | null
          moeda: string | null
          payload: Json | null
          periodo_fim: string | null
          periodo_inicio: string | null
          tenant_id: number | null
          tenant_nome: string | null
          tokens_cobrados: number | null
          tokens_total: number | null
          valor_por_token: number | null
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_custos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_custos_tenant_diario: {
        Row: {
          conversas: number | null
          custo_bruto: number | null
          custo_final: number | null
          desconto_franquia: number | null
          dia_ref: string | null
          execucoes: number | null
          imposto_percent: number | null
          imposto_valor: number | null
          llm_modelo: string | null
          mensagens: number | null
          minimo_mensal_aplicado: boolean | null
          moeda: string | null
          tenant_id: number | null
          tenant_nome: string | null
          tokens_cobrados: number | null
          tokens_total: number | null
          valor_por_token: number | null
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_custos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_custos_tenant_mensal: {
        Row: {
          conversas: number | null
          custo_bruto: number | null
          custo_final: number | null
          desconto_franquia: number | null
          execucoes: number | null
          imposto_percent: number | null
          imposto_valor: number | null
          llm_modelo: string | null
          mensagens: number | null
          mes_ref: string | null
          minimo_mensal_aplicado: boolean | null
          moeda: string | null
          tenant_id: number | null
          tenant_nome: string | null
          tokens_cobrados: number | null
          tokens_total: number | null
          valor_por_token: number | null
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_custos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_user_write: {
        Args: { _tenant_id: number; _user_id: string }
        Returns: boolean
      }
      create_tenant_with_owner: {
        Args: {
          p_tenant_email: string
          p_tenant_name: string
          p_user_id: string
        }
        Returns: number
      }
      criar_end_user_e_vinculos: {
        Args: {
          p_bot_message?: string
          p_criar_chat?: boolean
          p_email?: string
          p_nome: string
          p_telefone: string
          p_tenant_id: number
          p_user_message?: string
        }
        Returns: {
          chat_id: number
          end_user_id: number
        }[]
      }
      criar_end_user_por_tenant_nome: {
        Args: {
          p_bot_message?: string
          p_criar_chat?: boolean
          p_email?: string
          p_nome: string
          p_telefone: string
          p_tenant_email?: string
          p_tenant_nome: string
          p_user_message?: string
        }
        Returns: {
          chat_id: number
          end_user_id: number
        }[]
      }
      gerar_relatorio_custos_tenant: {
        Args: {
          p_fim: string
          p_inicio: string
          p_tenant_id: number
          p_titulo?: string
        }
        Returns: number
      }
      gerar_relatorio_custos_todos: {
        Args: { p_fim: string; p_inicio: string; p_titulo?: string }
        Returns: {
          relatorio_id: number
          tenant_id: number
        }[]
      }
      get_or_create_tenant: {
        Args: { p_email?: string; p_nome: string }
        Returns: number
      }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: number }
      has_tenant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: number
          _user_id: string
        }
        Returns: boolean
      }
      hybrid_search: {
        Args: {
          full_text_weight?: number
          match_count?: number
          p_tenant_id: number
          query_embedding: string
          query_text: string
          rrf_k?: number
          semantic_weight?: number
        }
        Returns: {
          content: string
          id: number
          metadata: Json
          rank: number
          score: number
        }[]
      }
      incrementar_uso_tokens: {
        Args: { p_client_id: string; p_custo_brl: number; p_tokens: number }
        Returns: undefined
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      log_execucao_llm: {
        Args: {
          p_accuracy?: number
          p_completion_tokens: number
          p_execution_time: number
          p_ia_config_id?: number
          p_model_used: string
          p_payload?: Json
          p_prompt_tokens: number
          p_status?: string
          p_tenant_id: number
        }
        Returns: number
      }
      log_n8n_message: {
        Args: { p_message: Json; p_session_id: string; p_tenant_id: number }
        Returns: number
      }
      resetar_limites_mensais: { Args: never; Returns: undefined }
      search_documents: {
        Args: { p_embedding: string; p_limit?: number; p_tenant_id: number }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      verificar_limite_cliente: {
        Args: { p_client_id: string }
        Returns: {
          motivo: string
          percentual_usado: number
          pode_usar: boolean
          tokens_restantes: number
        }[]
      }
    }
    Enums: {
      app_role: "OWNER" | "ADMIN" | "ANALYST" | "SUPPORT" | "MASTER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["OWNER", "ADMIN", "ANALYST", "SUPPORT", "MASTER"],
    },
  },
} as const
