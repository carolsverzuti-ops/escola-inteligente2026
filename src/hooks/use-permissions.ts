import { useAuth } from '@/contexts/AuthContext';

/**
 * Permissões baseadas no papel do usuário.
 *
 * - Professor: cria, edita, apaga apenas seus próprios dados (RLS garante).
 * - Coordenador (gestão): visualiza tudo, mas só pode aprovar planos de aula.
 *   Não edita notas, planos, ocorrências, lembretes, provas, etc.
 */
export function usePermissions() {
  const { role, user } = useAuth();
  const isCoordenador = role === 'coordenador';
  const isProfessor = role === 'professor' || (!role && !!user);
  return {
    role,
    userId: user?.id ?? null,
    isCoordenador,
    isProfessor,
    /** Pode criar/editar/apagar dados operacionais (notas, planos, etc.) */
    canEdit: isProfessor,
    /** Pode aprovar planos de aula */
    canApprove: isCoordenador,
    /** Apenas leitura */
    readOnly: isCoordenador,
  };
}
