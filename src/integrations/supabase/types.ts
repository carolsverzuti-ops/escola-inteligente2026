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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ajustes_plano: {
        Row: {
          created_at: string
          descricao: string
          id: string
          plano_id: string
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          plano_id: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          plano_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ajustes_plano_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_aula"
            referencedColumns: ["id"]
          },
        ]
      }
      alunos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          data_nascimento: string | null
          email: string | null
          id: string
          nome: string
          numero_chamada: number | null
          observacoes: string | null
          responsavel: string | null
          serie: string | null
          telefone: string | null
          turma_id: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome: string
          numero_chamada?: number | null
          observacoes?: string | null
          responsavel?: string | null
          serie?: string | null
          telefone?: string | null
          turma_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome?: string
          numero_chamada?: number | null
          observacoes?: string | null
          responsavel?: string | null
          serie?: string | null
          telefone?: string | null
          turma_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alunos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplinas: {
        Row: {
          carga_horaria: number | null
          cor: string | null
          created_at: string | null
          id: string
          nome: string
          professor: string | null
          user_id: string
        }
        Insert: {
          carga_horaria?: number | null
          cor?: string | null
          created_at?: string | null
          id?: string
          nome: string
          professor?: string | null
          user_id: string
        }
        Update: {
          carga_horaria?: number | null
          cor?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          professor?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gabaritos: {
        Row: {
          anulada: boolean | null
          id: string
          numero_questao: number
          peso: number | null
          prova_id: string | null
          resposta_correta: string
        }
        Insert: {
          anulada?: boolean | null
          id?: string
          numero_questao: number
          peso?: number | null
          prova_id?: string | null
          resposta_correta: string
        }
        Update: {
          anulada?: boolean | null
          id?: string
          numero_questao?: number
          peso?: number | null
          prova_id?: string | null
          resposta_correta?: string
        }
        Relationships: [
          {
            foreignKeyName: "gabaritos_prova_id_fkey"
            columns: ["prova_id"]
            isOneToOne: false
            referencedRelation: "provas"
            referencedColumns: ["id"]
          },
        ]
      }
      lembretes: {
        Row: {
          concluido: boolean
          cor: string
          created_at: string
          data: string | null
          descricao: string | null
          disciplina_id: string | null
          fixado: boolean
          id: string
          posicao: number | null
          prioridade: string
          titulo: string
          turma_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          concluido?: boolean
          cor?: string
          created_at?: string
          data?: string | null
          descricao?: string | null
          disciplina_id?: string | null
          fixado?: boolean
          id?: string
          posicao?: number | null
          prioridade?: string
          titulo: string
          turma_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          concluido?: boolean
          cor?: string
          created_at?: string
          data?: string | null
          descricao?: string | null
          disciplina_id?: string | null
          fixado?: boolean
          id?: string
          posicao?: number | null
          prioridade?: string
          titulo?: string
          turma_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lembretes_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lembretes_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      notas: {
        Row: {
          aluno_id: string | null
          bimestre: number | null
          created_at: string | null
          id: string
          nota: number | null
          observacoes: string | null
          tipo_avaliacao_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          aluno_id?: string | null
          bimestre?: number | null
          created_at?: string | null
          id?: string
          nota?: number | null
          observacoes?: string | null
          tipo_avaliacao_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          aluno_id?: string | null
          bimestre?: number | null
          created_at?: string | null
          id?: string
          nota?: number | null
          observacoes?: string | null
          tipo_avaliacao_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_tipo_avaliacao_id_fkey"
            columns: ["tipo_avaliacao_id"]
            isOneToOne: false
            referencedRelation: "tipos_avaliacao"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencia_fotos: {
        Row: {
          created_at: string
          id: string
          ocorrencia_id: string
          path: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          ocorrencia_id: string
          path: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          ocorrencia_id?: string
          path?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencia_fotos_ocorrencia_id_fkey"
            columns: ["ocorrencia_id"]
            isOneToOne: false
            referencedRelation: "ocorrencias_notebook"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencias_notebook: {
        Row: {
          alunos_envolvidos: string | null
          created_at: string | null
          data_ocorrencia: string
          descricao: string | null
          equipamento_danificado: boolean | null
          id: string
          internet_funcionou: boolean | null
          observacoes: string | null
          problema_encontrado: string | null
          quantidade_notebooks: number | null
          solucao_adotada: string | null
          turma_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alunos_envolvidos?: string | null
          created_at?: string | null
          data_ocorrencia?: string
          descricao?: string | null
          equipamento_danificado?: boolean | null
          id?: string
          internet_funcionou?: boolean | null
          observacoes?: string | null
          problema_encontrado?: string | null
          quantidade_notebooks?: number | null
          solucao_adotada?: string | null
          turma_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alunos_envolvidos?: string | null
          created_at?: string | null
          data_ocorrencia?: string
          descricao?: string | null
          equipamento_danificado?: boolean | null
          id?: string
          internet_funcionou?: boolean | null
          observacoes?: string | null
          problema_encontrado?: string | null
          quantidade_notebooks?: number | null
          solucao_adotada?: string | null
          turma_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencias_notebook_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_anexos: {
        Row: {
          created_at: string
          id: string
          mime_type: string | null
          nome_arquivo: string
          plano_id: string
          storage_path: string
          tamanho_bytes: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type?: string | null
          nome_arquivo: string
          plano_id: string
          storage_path: string
          tamanho_bytes?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string | null
          nome_arquivo?: string
          plano_id?: string
          storage_path?: string
          tamanho_bytes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_anexos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_aula"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_aula: {
        Row: {
          aprendizagem_essencial: string | null
          aprovado_por: string | null
          aulas_previstas: number | null
          avaliacao_aprendizagem: string | null
          bimestre: number
          comentario_aprovacao: string | null
          conteudo: string | null
          created_at: string | null
          data_aprovacao: string | null
          data_aula: string
          desenvolvimento: string | null
          dia_semana: string | null
          disciplina_id: string | null
          duplicado_de: string | null
          habilidades: string | null
          id: string
          material_digital: string | null
          numero_aulas: number | null
          objetivo_geral: string | null
          objetivos: string | null
          professor: string | null
          recursos: string | null
          status: string
          tipo: string
          turma_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          aprendizagem_essencial?: string | null
          aprovado_por?: string | null
          aulas_previstas?: number | null
          avaliacao_aprendizagem?: string | null
          bimestre?: number
          comentario_aprovacao?: string | null
          conteudo?: string | null
          created_at?: string | null
          data_aprovacao?: string | null
          data_aula: string
          desenvolvimento?: string | null
          dia_semana?: string | null
          disciplina_id?: string | null
          duplicado_de?: string | null
          habilidades?: string | null
          id?: string
          material_digital?: string | null
          numero_aulas?: number | null
          objetivo_geral?: string | null
          objetivos?: string | null
          professor?: string | null
          recursos?: string | null
          status?: string
          tipo?: string
          turma_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          aprendizagem_essencial?: string | null
          aprovado_por?: string | null
          aulas_previstas?: number | null
          avaliacao_aprendizagem?: string | null
          bimestre?: number
          comentario_aprovacao?: string | null
          conteudo?: string | null
          created_at?: string | null
          data_aprovacao?: string | null
          data_aula?: string
          desenvolvimento?: string | null
          dia_semana?: string | null
          disciplina_id?: string | null
          duplicado_de?: string | null
          habilidades?: string | null
          id?: string
          material_digital?: string | null
          numero_aulas?: number | null
          objetivo_geral?: string | null
          objetivos?: string | null
          professor?: string | null
          recursos?: string | null
          status?: string
          tipo?: string
          turma_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planos_aula_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_aula_duplicado_de_fkey"
            columns: ["duplicado_de"]
            isOneToOne: false
            referencedRelation: "planos_aula"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_aula_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          id: string
          nome?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      provas: {
        Row: {
          bimestre: number | null
          created_at: string | null
          data_aplicacao: string | null
          disciplina_id: string | null
          escola: string | null
          id: string
          numero_questoes: number
          observacoes: string | null
          professor: string | null
          titulo: string
          turma_id: string | null
          user_id: string
          valor_total: number | null
        }
        Insert: {
          bimestre?: number | null
          created_at?: string | null
          data_aplicacao?: string | null
          disciplina_id?: string | null
          escola?: string | null
          id?: string
          numero_questoes?: number
          observacoes?: string | null
          professor?: string | null
          titulo: string
          turma_id?: string | null
          user_id: string
          valor_total?: number | null
        }
        Update: {
          bimestre?: number | null
          created_at?: string | null
          data_aplicacao?: string | null
          disciplina_id?: string | null
          escola?: string | null
          id?: string
          numero_questoes?: number
          observacoes?: string | null
          professor?: string | null
          titulo?: string
          turma_id?: string | null
          user_id?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "provas_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      resultados_prova: {
        Row: {
          acertos: number | null
          ajuste_manual: boolean | null
          aluno_id: string | null
          created_at: string | null
          id: string
          nota: number | null
          observacoes: string | null
          prova_id: string | null
          respostas: Json | null
          user_id: string
        }
        Insert: {
          acertos?: number | null
          ajuste_manual?: boolean | null
          aluno_id?: string | null
          created_at?: string | null
          id?: string
          nota?: number | null
          observacoes?: string | null
          prova_id?: string | null
          respostas?: Json | null
          user_id: string
        }
        Update: {
          acertos?: number | null
          ajuste_manual?: boolean | null
          aluno_id?: string | null
          created_at?: string | null
          id?: string
          nota?: number | null
          observacoes?: string | null
          prova_id?: string | null
          respostas?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resultados_prova_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resultados_prova_prova_id_fkey"
            columns: ["prova_id"]
            isOneToOne: false
            referencedRelation: "provas"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_avaliacao: {
        Row: {
          bimestre: number | null
          created_at: string | null
          descricao: string | null
          disciplina_id: string | null
          id: string
          nome: string
          ordem: number | null
          peso: number | null
          turma_id: string | null
          user_id: string
        }
        Insert: {
          bimestre?: number | null
          created_at?: string | null
          descricao?: string | null
          disciplina_id?: string | null
          id?: string
          nome: string
          ordem?: number | null
          peso?: number | null
          turma_id?: string | null
          user_id: string
        }
        Update: {
          bimestre?: number | null
          created_at?: string | null
          descricao?: string | null
          disciplina_id?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          peso?: number | null
          turma_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tipos_avaliacao_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipos_avaliacao_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      turma_disciplinas: {
        Row: {
          created_at: string
          disciplina_id: string
          id: string
          turma_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          disciplina_id: string
          id?: string
          turma_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          disciplina_id?: string
          id?: string
          turma_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turma_disciplinas_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turma_disciplinas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      turmas: {
        Row: {
          ano_letivo: number
          capacidade: number | null
          created_at: string | null
          id: string
          nome: string
          observacoes: string | null
          serie: string
          turno: string
          updated_at: string | null
        }
        Insert: {
          ano_letivo?: number
          capacidade?: number | null
          created_at?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          serie: string
          turno?: string
          updated_at?: string | null
        }
        Update: {
          ano_letivo?: number
          capacidade?: number | null
          created_at?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          serie?: string
          turno?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_gestao: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "professor" | "coordenador" | "direcao" | "vice_direcao"
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
      app_role: ["professor", "coordenador", "direcao", "vice_direcao"],
    },
  },
} as const
