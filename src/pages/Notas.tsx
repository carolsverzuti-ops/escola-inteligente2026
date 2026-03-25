import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Download, GripVertical, AlertCircle, CheckCircle2 } from 'lucide-react';
import { PageHeader, FilterBar, BadgeSituacao, LoadingSpinner } from '@/components/ui-escola';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TipoAvaliacao {
  id: string;
  nome: string;
  peso: number;
  bimestre: number;
  disciplina_id?: string;
  turma_id?: string;
  ordem: number;
}

interface Nota {
  id?: string;
  aluno_id: string;
  tipo_avaliacao_id: string;
  nota: number | null;
  bimestre: number;
}

interface AlunoNota {
  id: string;
  nome: string;
  numero_chamada: number;
  notas: Record<string, number | null>;
  media: number | null;
  situacao: string;
}

function calcularMedia(notas: Record<string, number | null>, tipos: TipoAvaliacao[]): number | null {
  const validos = tipos.filter(t => notas[t.id] !== null && notas[t.id] !== undefined);
  if (validos.length === 0) return null;
  const totalPeso = validos.reduce((s, t) => s + t.peso, 0);
  const soma = validos.reduce((s, t) => s + (notas[t.id]! * t.peso), 0);
  return totalPeso > 0 ? soma / totalPeso : null;
}

function calcularSituacao(media: number | null): string {
  if (media === null) return '—';
  if (media >= 7) return 'Aprovado';
  if (media >= 5) return 'Recuperação';
  return 'Reprovado';
}

function gradeClass(nota: number | null): string {
  if (nota === null) return '';
  if (nota < 5) return 'grade-low';
  if (nota < 7) return 'grade-warning';
  return 'grade-ok';
}

export default function Notas() {
  const [turmas, setTurmas] = useState<any[]>([]);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [filterTurma, setFilterTurma] = useState('');
  const [filterDisciplina, setFilterDisciplina] = useState('');
  const [filterBimestre, setFilterBimestre] = useState('1');
  const [tiposAvaliacao, setTiposAvaliacao] = useState<TipoAvaliacao[]>([]);
  const [alunosNotas, setAlunosNotas] = useState<AlunoNota[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [dialogTipo, setDialogTipo] = useState(false);
  const [formTipo, setFormTipo] = useState({ nome: '', peso: 1.0, descricao: '' });
  const { toast } = useToast();

  useEffect(() => { loadFilters(); }, []);
  useEffect(() => { if (filterTurma && filterDisciplina) loadNotas(); }, [filterTurma, filterDisciplina, filterBimestre]);

  async function loadFilters() {
    const [{ data: t }, { data: d }] = await Promise.all([
      supabase.from('turmas').select('id, nome, serie').order('nome'),
      supabase.from('disciplinas').select('id, nome').order('nome'),
    ]);
    setTurmas(t || []);
    setDisciplinas(d || []);
    if (t?.length) setFilterTurma(t[0].id);
    if (d?.length) setFilterDisciplina(d[0].id);
  }

  async function loadNotas() {
    setLoading(true);
    const [{ data: tipos }, { data: alunos }, { data: notasData }] = await Promise.all([
      supabase.from('tipos_avaliacao')
        .select('*')
        .eq('turma_id', filterTurma)
        .eq('disciplina_id', filterDisciplina)
        .eq('bimestre', parseInt(filterBimestre))
        .order('ordem'),
      supabase.from('alunos').select('id, nome, numero_chamada').eq('turma_id', filterTurma).eq('ativo', true).order('numero_chamada'),
      supabase.from('notas').select('*').eq('bimestre', parseInt(filterBimestre))
        .in('aluno_id', []),
    ]);

    const tiposArr: TipoAvaliacao[] = tipos || [];
    setTiposAvaliacao(tiposArr);

    if (!alunos?.length) { setAlunosNotas([]); setLoading(false); return; }

    const { data: notasAll } = await supabase.from('notas')
      .select('*')
      .eq('bimestre', parseInt(filterBimestre))
      .in('aluno_id', alunos.map(a => a.id))
      .in('tipo_avaliacao_id', tiposArr.map(t => t.id));

    const notasMap: Record<string, Record<string, number | null>> = {};
    alunos.forEach(a => { notasMap[a.id] = {}; });
    (notasAll || []).forEach((n: any) => {
      if (notasMap[n.aluno_id]) notasMap[n.aluno_id][n.tipo_avaliacao_id] = n.nota;
    });

    const result: AlunoNota[] = alunos.map(a => {
      const notas = notasMap[a.id] || {};
      const media = calcularMedia(notas, tiposArr);
      return { ...a, notas, media, situacao: calcularSituacao(media) };
    });
    setAlunosNotas(result);
    setLoading(false);
  }

  const handleNotaChange = useCallback(async (alunoId: string, tipoId: string, value: string) => {
    const nota = value === '' ? null : Math.min(10, Math.max(0, parseFloat(value)));
    setAlunosNotas(prev => prev.map(a => {
      if (a.id !== alunoId) return a;
      const novas = { ...a.notas, [tipoId]: nota };
      const media = calcularMedia(novas, tiposAvaliacao);
      return { ...a, notas: novas, media, situacao: calcularSituacao(media) };
    }));

    const key = `${alunoId}-${tipoId}`;
    setSaving(s => ({ ...s, [key]: true }));
    if (nota === null) {
      await supabase.from('notas').delete().eq('aluno_id', alunoId).eq('tipo_avaliacao_id', tipoId);
    } else {
      await supabase.from('notas').upsert({ aluno_id: alunoId, tipo_avaliacao_id: tipoId, nota, bimestre: parseInt(filterBimestre) }, { onConflict: 'aluno_id,tipo_avaliacao_id' });
    }
    setSaving(s => ({ ...s, [key]: false }));
  }, [tiposAvaliacao, filterBimestre]);

  async function adicionarTipoAvaliacao() {
    if (!formTipo.nome) return;
    await supabase.from('tipos_avaliacao').insert({
      nome: formTipo.nome, peso: formTipo.peso, bimestre: parseInt(filterBimestre),
      disciplina_id: filterDisciplina, turma_id: filterTurma, ordem: tiposAvaliacao.length + 1
    });
    setDialogTipo(false);
    setFormTipo({ nome: '', peso: 1.0, descricao: '' });
    loadNotas();
    toast({ title: 'Avaliação adicionada!' });
  }

  async function removerTipo(id: string) {
    if (!confirm('Remover esta avaliação? As notas serão excluídas.')) return;
    await supabase.from('tipos_avaliacao').delete().eq('id', id);
    loadNotas();
  }

  function exportarNotas() {
    const header = ['Nº', 'Nome', ...tiposAvaliacao.map(t => t.nome), 'Média', 'Situação'].join(',');
    const rows = alunosNotas.map(a =>
      [a.numero_chamada, `"${a.nome}"`, ...tiposAvaliacao.map(t => a.notas[t.id] ?? ''), a.media?.toFixed(2) ?? '', a.situacao].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'notas.csv'; link.click();
  }

  const turmaAtual = turmas.find(t => t.id === filterTurma);
  const discAtual = disciplinas.find(d => d.id === filterDisciplina);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Lançamento de Notas" subtitle="Tabela estilo planilha com cálculo automático">
        <Button variant="outline" size="sm" onClick={exportarNotas}><Download className="w-4 h-4 mr-1.5" />Exportar</Button>
        <Button size="sm" onClick={() => setDialogTipo(true)}><Plus className="w-4 h-4 mr-1.5" />Nova Avaliação</Button>
      </PageHeader>

      <FilterBar>
        <Select value={filterTurma} onValueChange={setFilterTurma}>
          <SelectTrigger className="w-36 h-8 text-sm bg-background"><SelectValue placeholder="Turma" /></SelectTrigger>
          <SelectContent>{turmas.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterDisciplina} onValueChange={setFilterDisciplina}>
          <SelectTrigger className="w-44 h-8 text-sm bg-background"><SelectValue placeholder="Disciplina" /></SelectTrigger>
          <SelectContent>{disciplinas.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterBimestre} onValueChange={setFilterBimestre}>
          <SelectTrigger className="w-36 h-8 text-sm bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1º Bimestre</SelectItem>
            <SelectItem value="2">2º Bimestre</SelectItem>
            <SelectItem value="3">3º Bimestre</SelectItem>
            <SelectItem value="4">4º Bimestre</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto hidden sm:block">
          {turmaAtual?.nome} · {discAtual?.nome} · {filterBimestre}º Bimestre
        </span>
      </FilterBar>

      {/* Info dos tipos de avaliação */}
      {tiposAvaliacao.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {tiposAvaliacao.map(t => (
            <div key={t.id} className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-3 py-1.5 text-xs">
              <span className="font-semibold">{t.nome}</span>
              <span className="text-muted-foreground">Peso: {t.peso}</span>
              <button onClick={() => removerTipo(t.id)} className="ml-1 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {!filterTurma || !filterDisciplina ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-border rounded-xl">
          <AlertCircle className="w-10 h-10 text-muted-foreground/30 mb-2" />
          <p className="text-muted-foreground">Selecione a turma e a disciplina para visualizar as notas</p>
        </div>
      ) : loading ? <LoadingSpinner /> : (
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-secondary">
                  <th className="sticky left-0 z-20 bg-secondary px-3 py-2.5 text-left font-semibold text-muted-foreground border-b border-border w-8">Nº</th>
                  <th className="sticky left-8 z-20 bg-secondary px-3 py-2.5 text-left font-semibold text-muted-foreground border-b border-border min-w-[180px]">Nome</th>
                  {tiposAvaliacao.map(t => (
                    <th key={t.id} className="px-2 py-2.5 text-center font-semibold text-muted-foreground border-b border-border min-w-[90px]">
                      <div>{t.nome}</div>
                      <div className="text-xs font-normal opacity-60">Peso {t.peso}</div>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground border-b border-border min-w-[70px] bg-primary-light/30">Média</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground border-b border-border min-w-[100px]">Situação</th>
                </tr>
              </thead>
              <tbody>
                {alunosNotas.length === 0 ? (
                  <tr><td colSpan={tiposAvaliacao.length + 4} className="py-12 text-center text-muted-foreground">Nenhum aluno nesta turma</td></tr>
                ) : alunosNotas.map((aluno, i) => (
                  <tr key={aluno.id} className={cn('hover:bg-primary-light/10 transition-colors', i % 2 === 0 ? '' : 'bg-muted/15')}>
                    <td className="sticky left-0 z-10 bg-inherit px-3 py-1.5 font-mono text-xs text-muted-foreground border-b border-border/40">{aluno.numero_chamada}</td>
                    <td className="sticky left-8 z-10 bg-inherit px-3 py-1.5 font-medium border-b border-border/40">{aluno.nome}</td>
                    {tiposAvaliacao.map(tipo => {
                      const key = `${aluno.id}-${tipo.id}`;
                      const nota = aluno.notas[tipo.id];
                      return (
                        <td key={tipo.id} className="px-2 py-1 text-center border-b border-border/40">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            value={nota !== null && nota !== undefined ? nota : ''}
                            onChange={e => handleNotaChange(aluno.id, tipo.id, e.target.value)}
                            className={cn(
                              'w-16 text-center text-sm font-semibold rounded-md border border-transparent bg-transparent py-1 focus:outline-none focus:border-primary focus:bg-white transition-all',
                              nota !== null && nota !== undefined ? gradeClass(nota) : ''
                            )}
                            placeholder="—"
                          />
                          {saving[key] && <span className="ml-1 text-primary text-xs">...</span>}
                        </td>
                      );
                    })}
                    <td className={cn('px-3 py-1.5 text-center font-bold border-b border-border/40 bg-primary-light/20', aluno.media !== null ? gradeClass(aluno.media) : 'text-muted-foreground')}>
                      {aluno.media !== null ? aluno.media.toFixed(2) : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-center border-b border-border/40">
                      {aluno.media !== null ? <BadgeSituacao situacao={aluno.situacao} /> : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              {alunosNotas.length > 0 && (
                <tfoot>
                  <tr className="bg-secondary">
                    <td className="sticky left-0 bg-secondary" />
                    <td className="sticky left-8 bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground">Média da Turma</td>
                    {tiposAvaliacao.map(tipo => {
                      const vals = alunosNotas.map(a => a.notas[tipo.id]).filter(v => v !== null && v !== undefined) as number[];
                      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
                      return (
                        <td key={tipo.id} className="px-2 py-2 text-center text-xs font-bold text-muted-foreground">
                          {avg !== null ? avg.toFixed(1) : '—'}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center text-xs font-bold text-primary">
                      {(() => {
                        const medias = alunosNotas.map(a => a.media).filter(m => m !== null) as number[];
                        return medias.length ? (medias.reduce((a, b) => a + b, 0) / medias.length).toFixed(2) : '—';
                      })()}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialogTipo} onOpenChange={setDialogTipo}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nova Avaliação</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome da avaliação *</Label>
              <Input placeholder="Ex: Prova Bimestral, Trabalho, Projeto..." value={formTipo.nome} onChange={e => setFormTipo({ ...formTipo, nome: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Peso (para média ponderada)</Label>
              <Input type="number" min="0.1" max="10" step="0.1" value={formTipo.peso} onChange={e => setFormTipo({ ...formTipo, peso: parseFloat(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogTipo(false)}>Cancelar</Button>
            <Button onClick={adicionarTipoAvaliacao}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
