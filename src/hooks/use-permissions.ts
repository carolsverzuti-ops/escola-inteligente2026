import { useAuth } from '@/contexts/AuthContext';

/**
 * Permissões baseadas no papel do usuário.
 *
 * - Professor: cria, edita, apaga apenas seus próprios dados (RLS garante).
 * - Gestão (Coordenação, Direção, Vice-direção): visualiza tudo,
 *   pode aprovar planos de aula, mas NÃO edita notas, planos,
 *   ocorrências, lembretes, provas, etc.
 */
export function usePermissions() {
  const { role, user } = useAuth();
  const isCoordenador = role === 'coordenador';
  const isDirecao = role === 'direcao';
  const isViceDirecao = role === 'vice_direcao';
  const isGestao = isCoordenador || isDirecao || isViceDirecao;
  const isProfessor = role === 'professor' || (!role && !!user && !isGestao);
  return {
    role,
    userId: user?.id ?? null,
    isCoordenador,
    isDirecao,
    isViceDirecao,
    isGestao,
    isProfessor,
    /** Pode criar/editar/apagar dados operacionais (notas, planos, etc.) */
    canEdit: isProfessor,
    /** Pode aprovar planos de aula (toda a equipe gestora) */
    canApprove: isGestao,
    /** Apenas leitura */
    readOnly: isGestao,
  };
}
