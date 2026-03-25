import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  School, GraduationCap, ClipboardList, BookOpen,
  Laptop, AlertTriangle, TrendingUp, Calendar,
  Users, BarChart3, CheckCircle, XCircle, Clock
} from 'lucide-react';
import { StatCard, PageHeader, TableContainer, BadgeSituacao } from '@/components/ui-escola';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const [stats, setStats] = useState({
    turmas: 0, alunos: 0, planos: 0, ocorrencias: 0,
  });
  const [alunosBaixoDesempenho, setAlunosBaixoDesempenho] = useState<any[]>([]);
  const [proximosPlanos, setProximosPlanos] = useState<any[]>([]);
  const [ocorrenciasRecentes, setOcorrenciasRecentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [{ count: turmas }, { count: alunos }, { count: planos }, { count: ocorrencias }] = await Promise.all([
      supabase.from('turmas').select('*', { count: 'exact', head: true }),
      supabase.from('alunos').select('*', { count: 'exact', head: true }).eq('ativo', true),
      supabase.from('planos_aula').select('*', { count: 'exact', head: true }),
      supabase.from('ocorrencias_notebook').select('*', { count: 'exact', head: true }),
    ]);

    setStats({ turmas: turmas || 0, alunos: alunos || 0, planos: planos || 0, ocorrencias: ocorrencias || 0 });

    // Próximos planos
    const { data: planoData } = await supabase
      .from('planos_aula')
      .select('*, turmas(nome), disciplinas(nome)')
      .gte('data_aula', new Date().toISOString().split('T')[0])
      .order('data_aula', { ascending: true })
      .limit(4);
    setProximosPlanos(planoData || []);

    // Ocorrências recentes
    const { data: ocData } = await supabase
      .from('ocorrencias_notebook')
      .select('*, turmas(nome)')
      .order('data_ocorrencia', { ascending: false })
      .limit(4);
    setOcorrenciasRecentes(ocData || []);

    // Alunos com baixo desempenho (notas baixas)
    const { data: notasData } = await supabase
      .from('notas')
      .select('aluno_id, nota, alunos(nome, turmas(nome))')
      .lt('nota', 5)
      .order('nota', { ascending: true })
      .limit(6);
    setAlunosBaixoDesempenho(notasData || []);

    setLoading(false);
  }

  const formatDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle={`Bem-vindo! Hoje é ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Turmas Ativas" value={stats.turmas} icon={<School className="w-6 h-6" />} color="blue" subtitle="2025" />
        <StatCard title="Total de Alunos" value={stats.alunos} icon={<GraduationCap className="w-6 h-6" />} color="green" subtitle="matriculados" />
        <StatCard title="Planos de Aula" value={stats.planos} icon={<BookOpen className="w-6 h-6" />} color="yellow" subtitle="registrados" />
        <StatCard title="Ocorrências" value={stats.ocorrencias} icon={<Laptop className="w-6 h-6" />} color="red" subtitle="de notebook" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Próximas aulas */}
        <div className="bg-card border border-border rounded-xl shadow-card">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Calendar className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">Próximas Aulas Planejadas</h2>
          </div>
          <div className="divide-y divide-border/50">
            {proximosPlanos.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4 text-center">Nenhum plano futuro</p>
            ) : proximosPlanos.map((p) => (
              <div key={p.id} className="px-4 py-3 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-light flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary leading-tight">{formatDate(p.data_aula).split('/')[0]}</span>
                  <span className="text-xs text-primary/70 leading-tight">{formatDate(p.data_aula).split('/')[1]}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.disciplinas?.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.turmas?.nome} · {p.conteudo}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alunos baixo desempenho */}
        <div className="bg-card border border-border rounded-xl shadow-card">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <h2 className="font-semibold text-sm">Alunos com Baixo Rendimento</h2>
          </div>
          <div className="divide-y divide-border/50">
            {alunosBaixoDesempenho.length === 0 ? (
              <div className="p-4 text-center">
                <CheckCircle className="w-8 h-8 text-success mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Todos com notas boas!</p>
              </div>
            ) : alunosBaixoDesempenho.map((n, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-danger-light flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-destructive">{n.nota?.toFixed(1)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{(n.alunos as any)?.nome}</p>
                  <p className="text-xs text-muted-foreground">{(n.alunos as any)?.turmas?.nome}</p>
                </div>
                <BadgeSituacao situacao={n.nota >= 7 ? 'Aprovado' : n.nota >= 5 ? 'Recuperação' : 'Reprovado'} />
              </div>
            ))}
          </div>
        </div>

        {/* Ocorrências recentes */}
        <div className="bg-card border border-border rounded-xl shadow-card">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Laptop className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">Ocorrências Recentes</h2>
          </div>
          <div className="divide-y divide-border/50">
            {ocorrenciasRecentes.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4 text-center">Nenhuma ocorrência</p>
            ) : ocorrenciasRecentes.map((oc) => (
              <div key={oc.id} className="px-4 py-3 flex items-start gap-3">
                <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', oc.equipamento_danificado ? 'bg-destructive' : 'bg-warning')}>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{oc.problema_encontrado}</p>
                  <p className="text-xs text-muted-foreground">{oc.turmas?.nome} · {formatDate(oc.data_ocorrencia)}</p>
                  {oc.equipamento_danificado && (
                    <span className="text-xs text-destructive font-medium">⚠ Equipamento danificado</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resumo bimestral */}
      <div className="mt-4 bg-gradient-to-r from-primary to-primary-glow rounded-xl p-4 text-primary-foreground">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-5 h-5" />
          <h2 className="font-semibold">Resumo do 1º Bimestre 2025</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Aulas Planejadas', value: stats.planos, icon: <BookOpen className="w-4 h-4" /> },
            { label: 'Avaliações', value: '4', icon: <ClipboardList className="w-4 h-4" /> },
            { label: 'Ocorrências', value: stats.ocorrencias, icon: <Laptop className="w-4 h-4" /> },
            { label: 'Alunos Ativos', value: stats.alunos, icon: <Users className="w-4 h-4" /> },
          ].map((item) => (
            <div key={item.label} className="bg-white/10 rounded-lg p-3 text-center">
              <div className="flex justify-center mb-1 opacity-80">{item.icon}</div>
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs opacity-75">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
