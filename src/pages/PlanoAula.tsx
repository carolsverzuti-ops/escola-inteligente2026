import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Plus, Edit2, Trash2, Copy, Search, BookOpen, Beaker, CheckCircle, Clock,
  FolderOpen, Folder, ChevronRight, ChevronDown, FileText, AlertTriangle, PenLine, Eye
} from 'lucide-react';
import { PageHeader, FilterBar, EmptyState, LoadingSpinner } from '@/components/ui-escola';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getDisciplinaDot } from '@/pages/Materias';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/contexts/AuthContext';

const DIAS_SEMANA = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];

const DISC_BORDER: Record<string, string> = {
  azul: 'border-l-blue-500', roxo: 'border-l-purple-500', verde: 'border-l-green-500',
  vermelho: 'border-l-red-500', laranja: 'border-l-orange-500', rosa: 'border-l-pink-500',
  amarelo: 'border-l-yellow-500', ciano: 'border-l-cyan-500', indigo: 'border-l-indigo-500', cinza: 'border-l-gray-500',
};

const MESES_NOMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const BIMESTRE_MESES: Record<number, number[]> = {
  1: [1, 2, 3],   // Fev, Mar, Abr
  2: [3, 4, 5],   // Abr, Mai, Jun
  3: [7, 8, 9],   // Ago, Set, Out
  4: [9, 10, 11], // Out, Nov, Dez
};

interface PlanoAula {
  id: string;
  turma_id: string;
  disciplina_id?: string;
  bimestre: number;
  data_aula: string;
  dia_semana?: string;
  numero_aulas?: number;
  aprendizagem_essencial?: string;
  conteudo?: string;
  objetivos?: string;
  recursos?: string;
  desenvolvimento?: string;
  material_digital?: string;
  avaliacao_aprendizagem?: string;
  aulas_previstas?: number;
  professor?: string;
  tipo?: string;
  status?: string;
  habilidades?: string;
  objetivo_geral?: string;
  aprovado_por?: string;
  data_aprovacao?: string;
  comentario_aprovacao?: string;
  turmas?: { nome: string };
  disciplinas?: { nome: string; cor?: string };
}

interface Ajuste {
  id: string;
  plano_id: string;
  descricao: string;
  created_at: string;
}

const emptyForm = {
  turma_id: '', disciplina_id: '', bimestre: 1, data_aula: new Date().toISOString().split('T')[0],
  dia_semana: 'Segunda-feira', numero_aulas: 2, aprendizagem_essencial: '', conteudo: '',
  objetivos: '', recursos: '', desenvolvimento: '', material_digital: '',
  avaliacao_aprendizagem: '', aulas_previstas: 20, professor: '', tipo: 'normal',
  habilidades: '', objetivo_geral: '',
};

const db = supabase as any;

export default function PlanoAula() {
  const [planos, setPlanos] = useState<PlanoAula[]>([]);
  const [ajustes, setAjustes] = useState<Ajuste[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTurma, setFilterTurma] = useState('all');
  const [filterBimestre, setFilterBimestre] = useState('all');
  const [filterDisc, setFilterDisc] = useState('all');
  const [filterMes, setFilterMes] = useState('all');
  const [tipoPlano, setTipoPlano] = useState('normal');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlano, setEditingPlano] = useState<PlanoAula | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [approvalDialog, setApprovalDialog] = useState<PlanoAula | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [openBimestres, setOpenBimestres] = useState<Set<number>>(new Set());
  const [openMeses, setOpenMeses] = useState<Set<string>>(new Set());
  const [ajusteDialog, setAjusteDialog] = useState<PlanoAula | null>(null);
  const [ajusteTexto, setAjusteTexto] = useState('');
  const [savingAjuste, setSavingAjuste] = useState(false);
  const { toast } = useToast();
  const { userId, canEdit, canApprove, readOnly } = usePermissions();
  const { profile } = useAuth();

  useEffect(() => { loadData(); }, []);

  // Auto-open current bimestre
  useEffect(() => {
    const now = new Date();
    const month = now.getMonth(); // 0-indexed
    let currentBim = 1;
    if (month >= 1 && month <= 3) currentBim = 1;
    else if (month >= 3 && month <= 5) currentBim = 2;
    else if (month >= 6 && month <= 8) currentBim = 3;
    else currentBim = 4;
    setOpenBimestres(new Set([currentBim]));
  }, []);

  async function loadData() {
    const [{ data: p }, { data: t }, { data: d }, { data: a }] = await Promise.all([
      db.from('planos_aula').select('*, turmas(nome), disciplinas(nome, cor)').order('data_aula', { ascending: true }),
      supabase.from('turmas').select('id, nome').order('nome'),
      db.from('disciplinas').select('id, nome, cor').order('nome'),
      db.from('ajustes_plano').select('*').order('created_at', { ascending: false }),
    ]);
    setPlanos(p as PlanoAula[] || []);
    setTurmas(t || []);
    setDisciplinas(d || []);
    setAjustes(a as Ajuste[] || []);
    setLoading(false);
  }

  function openNew() {
    setEditingPlano(null);
    setForm({ ...emptyForm, tipo: tipoPlano });
    setDialogOpen(true);
  }

  function openEdit(p: PlanoAula) {
    setEditingPlano(p);
    setForm({
      turma_id: p.turma_id, disciplina_id: p.disciplina_id || '', bimestre: p.bimestre,
      data_aula: p.data_aula, dia_semana: p.dia_semana || '', numero_aulas: p.numero_aulas || 2,
      aprendizagem_essencial: p.aprendizagem_essencial || '', conteudo: p.conteudo || '',
      objetivos: p.objetivos || '', recursos: p.recursos || '', desenvolvimento: p.desenvolvimento || '',
      material_digital: p.material_digital || '', avaliacao_aprendizagem: p.avaliacao_aprendizagem || '',
      aulas_previstas: p.aulas_previstas || 20, professor: p.professor || '',
      tipo: p.tipo || 'normal', habilidades: p.habilidades || '', objetivo_geral: p.objetivo_geral || '',
    });
    setDialogOpen(true);
  }

  async function duplicar(p: PlanoAula) {
    if (!canEdit || !userId) return;
    const { id, created_at, updated_at, turmas: t, disciplinas: d, status, aprovado_por, data_aprovacao, comentario_aprovacao, user_id: _u, ...rest } = p as any;
    await db.from('planos_aula').insert({ ...rest, data_aula: new Date().toISOString().split('T')[0], duplicado_de: p.id, status: 'pendente', user_id: userId });
    toast({ title: 'Plano duplicado!' });
    loadData();
  }

  async function save() {
    if (!form.turma_id || !form.data_aula) return toast({ title: 'Preencha turma e data', variant: 'destructive' });
    if (!canEdit || !userId) return;
    setSaving(true);
    const payload = { ...form, disciplina_id: form.disciplina_id || null };
    if (editingPlano) {
      await db.from('planos_aula').update(payload).eq('id', editingPlano.id);
      toast({ title: 'Plano atualizado!' });
    } else {
      await db.from('planos_aula').insert({ ...payload, user_id: userId });
      toast({ title: 'Plano cadastrado!' });
    }
    setSaving(false);
    setDialogOpen(false);
    loadData();
  }

  async function remove(id: string) {
    if (!canEdit) return;
    if (!confirm('Excluir este plano de aula?')) return;
    await supabase.from('planos_aula').delete().eq('id', id);
    loadData();
  }

  async function aprovarPlano(plano: PlanoAula) {
    if (!canApprove) return;
    const aprovador = profile?.nome || profile?.email || 'Coordenação';
    await db.from('planos_aula').update({
      status: 'aprovado', aprovado_por: aprovador,
      data_aprovacao: new Date().toISOString(), comentario_aprovacao: approvalComment || null,
    }).eq('id', plano.id);
    toast({ title: '✅ Plano aprovado!' });
    setApprovalDialog(null);
    setApprovalComment('');
    loadData();
  }

  async function salvarAjuste() {
    if (!ajusteDialog || !ajusteTexto.trim() || !canEdit) return;
    setSavingAjuste(true);
    await db.from('ajustes_plano').insert({ plano_id: ajusteDialog.id, descricao: ajusteTexto.trim() });
    toast({ title: '📝 Ajuste registrado!' });
    setAjusteDialog(null);
    setAjusteTexto('');
    setSavingAjuste(false);
    loadData();
  }

  const formatDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

  const filtered = planos.filter(p => {
    const matchSearch = (p.conteudo || '').toLowerCase().includes(search.toLowerCase()) || (p.disciplinas?.nome || '').toLowerCase().includes(search.toLowerCase());
    const matchTurma = filterTurma === 'all' || p.turma_id === filterTurma;
    const matchBim = filterBimestre === 'all' || p.bimestre === parseInt(filterBimestre);
    const matchDisc = filterDisc === 'all' || p.disciplina_id === filterDisc;
    const matchTipo = (p.tipo || 'normal') === tipoPlano;
    const matchMes = filterMes === 'all' || (new Date(p.data_aula + 'T12:00:00').getMonth() === parseInt(filterMes));
    return matchSearch && matchTurma && matchBim && matchDisc && matchTipo && matchMes;
  });

  // Group: bimestre → month → planos
  const folderTree = useMemo(() => {
    const tree: Record<number, Record<number, PlanoAula[]>> = {};
    for (const p of filtered) {
      const bim = p.bimestre;
      const month = new Date(p.data_aula + 'T12:00:00').getMonth(); // 0-indexed
      if (!tree[bim]) tree[bim] = {};
      if (!tree[bim][month]) tree[bim][month] = [];
      tree[bim][month].push(p);
    }
    // Sort planos within each month
    for (const bim in tree) {
      for (const month in tree[bim]) {
        tree[bim][month].sort((a, b) => a.data_aula.localeCompare(b.data_aula));
      }
    }
    return tree;
  }, [filtered]);

  const toggleBimestre = (bim: number) => {
    setOpenBimestres(prev => {
      const next = new Set(prev);
      next.has(bim) ? next.delete(bim) : next.add(bim);
      return next;
    });
  };

  const toggleMes = (key: string) => {
    setOpenMeses(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const getPlanoAjustes = (planoId: string) => ajustes.filter(a => a.plano_id === planoId);
  const planoTemAjuste = (planoId: string) => ajustes.some(a => a.plano_id === planoId);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Plano de Aula" subtitle={readOnly ? 'Modo gestão — visualizar e aprovar planos dos professores' : 'Planejamento organizado por bimestre e mês'}>
        {readOnly && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"><Eye className="w-3 h-3" /> Somente leitura · Pode aprovar</span>}
        {canEdit && <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1.5" />Novo Plano</Button>}
      </PageHeader>

      {/* Tabs tipo de plano */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTipoPlano('normal')}
          className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all border',
            tipoPlano === 'normal' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:bg-secondary')}>
          <BookOpen className="w-4 h-4" /> Plano Normal
        </button>
        <button onClick={() => setTipoPlano('experimental')}
          className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all border',
            tipoPlano === 'experimental' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:bg-secondary')}>
          <Beaker className="w-4 h-4" /> Práticas Experimentais
        </button>
      </div>

      <FilterBar>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar conteúdo..." className="pl-8 h-8 text-sm bg-background" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterTurma} onValueChange={setFilterTurma}>
          <SelectTrigger className="w-36 h-8 text-sm bg-background"><SelectValue placeholder="Turma" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas turmas</SelectItem>{turmas.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterDisc} onValueChange={setFilterDisc}>
          <SelectTrigger className="w-40 h-8 text-sm bg-background"><SelectValue placeholder="Disciplina" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas disciplinas</SelectItem>
            {disciplinas.map(d => (
              <SelectItem key={d.id} value={d.id}>
                <span className="flex items-center gap-2">
                  <span className={cn('w-2.5 h-2.5 rounded-full', getDisciplinaDot(d.cor))} />
                  {d.nome}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterBimestre} onValueChange={setFilterBimestre}>
          <SelectTrigger className="w-36 h-8 text-sm bg-background"><SelectValue placeholder="Bimestre" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos bimestres</SelectItem>
            {[1, 2, 3, 4].map(b => <SelectItem key={b} value={String(b)}>{b}º Bimestre</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterMes} onValueChange={setFilterMes}>
          <SelectTrigger className="w-36 h-8 text-sm bg-background"><SelectValue placeholder="Mês" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos meses</SelectItem>
            {MESES_NOMES.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterBar>

      {loading ? <LoadingSpinner /> : (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(bim => {
            const meses = folderTree[bim];
            if (!meses) {
              if (filterBimestre !== 'all' && parseInt(filterBimestre) !== bim) return null;
              if (filterBimestre === 'all' || parseInt(filterBimestre) === bim) {
                return (
                  <BimestreFolder key={bim} bim={bim} count={0} isOpen={openBimestres.has(bim)} onToggle={() => toggleBimestre(bim)}>
                    <div className="py-6 text-center text-sm text-muted-foreground">Nenhum plano neste bimestre</div>
                  </BimestreFolder>
                );
              }
              return null;
            }

            const totalPlanos = Object.values(meses).reduce((sum, arr) => sum + arr.length, 0);
            return (
              <BimestreFolder key={bim} bim={bim} count={totalPlanos} isOpen={openBimestres.has(bim)} onToggle={() => toggleBimestre(bim)}>
                <div className="space-y-1 pl-2">
                  {Object.keys(meses).sort((a, b) => Number(a) - Number(b)).map(monthStr => {
                    const month = Number(monthStr);
                    const planosDoMes = meses[month];
                    const mesKey = `${bim}-${month}`;
                    const mesAberto = openMeses.has(mesKey);

                    return (
                      <div key={mesKey}>
                        {/* Mes folder */}
                        <button
                          onClick={() => toggleMes(mesKey)}
                          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors text-left group"
                        >
                          {mesAberto ? <FolderOpen className="w-4 h-4 text-primary" /> : <Folder className="w-4 h-4 text-muted-foreground group-hover:text-primary" />}
                          <span className={cn('text-sm font-medium', mesAberto ? 'text-foreground' : 'text-muted-foreground')}>
                            {MESES_NOMES[month]}
                          </span>
                          <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">{planosDoMes.length}</span>
                          <ChevronRight className={cn('w-3.5 h-3.5 text-muted-foreground ml-auto transition-transform', mesAberto && 'rotate-90')} />
                        </button>

                        {/* Planos dentro do mês */}
                        {mesAberto && (
                          <div className="ml-6 mt-1 space-y-1">
                            {planosDoMes.map(plano => {
                              const discCor = plano.disciplinas?.cor || 'azul';
                              const isExpanded = expandedId === plano.id;
                              const temAjuste = planoTemAjuste(plano.id);
                              const planoAjustes = getPlanoAjustes(plano.id);

                              return (
                                <div key={plano.id} className={cn(
                                  'bg-card border rounded-lg overflow-hidden transition-all border-l-4',
                                  DISC_BORDER[discCor] || 'border-l-blue-500',
                                  temAjuste && 'ring-1 ring-warning/40',
                                )}>
                                  {/* Plano row */}
                                  <div
                                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-secondary/30 transition-colors"
                                    onClick={() => setExpandedId(isExpanded ? null : plano.id)}
                                  >
                                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    <span className="font-mono text-xs text-muted-foreground w-16 flex-shrink-0">{formatDate(plano.data_aula)}</span>
                                    <div className="flex items-center gap-1.5 w-28 flex-shrink-0">
                                      <span className={cn('w-2 h-2 rounded-full', getDisciplinaDot(discCor))} />
                                      <span className="text-xs text-muted-foreground truncate">{plano.disciplinas?.nome}</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground flex-shrink-0">{plano.turmas?.nome}</span>
                                    <span className="text-sm font-medium truncate flex-1">
                                      {tipoPlano === 'experimental' ? plano.objetivo_geral || plano.conteudo : plano.conteudo}
                                    </span>

                                    {temAjuste && (
                                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-warning/15 text-warning flex-shrink-0">
                                        Ajustado
                                      </span>
                                    )}

                                    {(plano.status || 'pendente') === 'aprovado' ? (
                                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-success/15 text-success flex-shrink-0">
                                        <CheckCircle className="w-3 h-3" /> OK
                                      </span>
                                    ) : (
                                      <button onClick={e => { e.stopPropagation(); setApprovalDialog(plano); }}
                                        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-warning/15 text-warning hover:bg-warning/25 transition-colors flex-shrink-0">
                                        <Clock className="w-3 h-3" /> Pendente
                                      </button>
                                    )}

                                    <div className="flex items-center gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                      <button className="p-1 rounded hover:bg-secondary" onClick={() => setAjusteDialog(plano)} title="Registrar ajuste">
                                        <PenLine className="w-3.5 h-3.5 text-muted-foreground hover:text-warning" />
                                      </button>
                                      <button className="p-1 rounded hover:bg-secondary" onClick={() => openEdit(plano)} title="Editar">
                                        <Edit2 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                                      </button>
                                      <button className="p-1 rounded hover:bg-secondary" onClick={() => duplicar(plano)} title="Duplicar">
                                        <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                                      </button>
                                      <button className="p-1 rounded hover:bg-destructive/10" onClick={() => remove(plano.id)} title="Excluir">
                                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                                      </button>
                                    </div>

                                    <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform flex-shrink-0', isExpanded && 'rotate-180')} />
                                  </div>

                                  {/* Expanded details */}
                                  {isExpanded && (
                                    <div className="border-t border-border bg-secondary/30 px-4 py-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                        {plano.aprendizagem_essencial && <Detail label="Aprendizagem Essencial" value={plano.aprendizagem_essencial} />}
                                        {plano.objetivos && <Detail label="Objetivos" value={plano.objetivos} />}
                                        {plano.recursos && <Detail label="Recursos" value={plano.recursos} />}
                                        {plano.desenvolvimento && <Detail label="Desenvolvimento" value={plano.desenvolvimento} full />}
                                        {plano.material_digital && <Detail label="Material Digital" value={plano.material_digital} />}
                                        {plano.avaliacao_aprendizagem && <Detail label="Avaliação" value={plano.avaliacao_aprendizagem} />}
                                        {plano.habilidades && <Detail label="Habilidades" value={plano.habilidades} />}
                                        {plano.objetivo_geral && <Detail label="Objetivo Geral" value={plano.objetivo_geral} />}
                                        {plano.professor && <Detail label="Professor" value={plano.professor} />}
                                        {plano.numero_aulas && <Detail label="Nº de Aulas" value={String(plano.numero_aulas)} />}
                                        {plano.aprovado_por && (
                                          <div className="md:col-span-2 p-2 bg-success/10 rounded-lg">
                                            <span className="font-semibold text-success">✅ Aprovado por: </span>{plano.aprovado_por}
                                            {plano.data_aprovacao && <span className="text-xs text-muted-foreground ml-2">em {new Date(plano.data_aprovacao).toLocaleDateString('pt-BR')}</span>}
                                            {plano.comentario_aprovacao && <p className="text-xs text-muted-foreground mt-1">"{plano.comentario_aprovacao}"</p>}
                                          </div>
                                        )}
                                      </div>

                                      {/* Ajustes section */}
                                      {planoAjustes.length > 0 && (
                                        <div className="mt-4 border-t border-border pt-3">
                                          <h4 className="text-xs font-bold text-warning uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                            <AlertTriangle className="w-3.5 h-3.5" /> Ajustes Realizados
                                          </h4>
                                          <div className="space-y-2">
                                            {planoAjustes.map(aj => (
                                              <div key={aj.id} className="flex items-start gap-2 bg-warning/10 rounded-lg p-2.5">
                                                <PenLine className="w-3.5 h-3.5 text-warning mt-0.5 flex-shrink-0" />
                                                <div>
                                                  <p className="text-sm text-foreground">{aj.descricao}</p>
                                                  <p className="text-xs text-muted-foreground mt-0.5">
                                                    {new Date(aj.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                  </p>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </BimestreFolder>
            );
          })}

          {filtered.length === 0 && <EmptyState message="Nenhum plano de aula encontrado" icon={<BookOpen className="w-12 h-12" />} />}
        </div>
      )}

      {/* Dialog de criação/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingPlano ? 'Editar Plano de Aula' : `Novo Plano — ${form.tipo === 'experimental' ? 'Prática Experimental' : 'Normal'}`}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>Turma *</Label>
                <Select value={form.turma_id} onValueChange={v => setForm({ ...form, turma_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Turma" /></SelectTrigger>
                  <SelectContent>{turmas.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Disciplina</Label>
                <Select value={form.disciplina_id} onValueChange={v => setForm({ ...form, disciplina_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Disciplina" /></SelectTrigger>
                  <SelectContent>
                    {disciplinas.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        <span className="flex items-center gap-2">
                          <span className={cn('w-2.5 h-2.5 rounded-full', getDisciplinaDot(d.cor))} />
                          {d.nome}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Bimestre</Label>
                <Select value={String(form.bimestre)} onValueChange={v => setForm({ ...form, bimestre: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1, 2, 3, 4].map(b => <SelectItem key={b} value={String(b)}>{b}º Bimestre</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nº de Aulas</Label>
                <Input type="number" min={1} value={form.numero_aulas} onChange={e => setForm({ ...form, numero_aulas: parseInt(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data da Aula *</Label>
                <Input type="date" value={form.data_aula} onChange={e => setForm({ ...form, data_aula: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Dia da Semana</Label>
                <Select value={form.dia_semana} onValueChange={v => setForm({ ...form, dia_semana: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DIAS_SEMANA.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {form.tipo === 'experimental' ? (
              <>
                <div className="space-y-1.5"><Label>Habilidades</Label><Textarea placeholder="Habilidades trabalhadas..." value={form.habilidades} onChange={e => setForm({ ...form, habilidades: e.target.value })} rows={2} /></div>
                <div className="space-y-1.5"><Label>Objetivo Geral do Projeto</Label><Textarea placeholder="Objetivo geral do projeto do bimestre..." value={form.objetivo_geral} onChange={e => setForm({ ...form, objetivo_geral: e.target.value })} rows={2} /></div>
                <div className="space-y-1.5"><Label>O que será feito nesta aula</Label><Textarea placeholder="Atividade da aula..." value={form.conteudo} onChange={e => setForm({ ...form, conteudo: e.target.value })} rows={2} /></div>
                <div className="space-y-1.5"><Label>Observações</Label><Textarea placeholder="Observações..." value={form.desenvolvimento} onChange={e => setForm({ ...form, desenvolvimento: e.target.value })} rows={2} /></div>
              </>
            ) : (
              <>
                <div className="space-y-1.5"><Label>Aprendizagem Essencial (AE)</Label><Textarea placeholder="O que o aluno deve aprender..." value={form.aprendizagem_essencial} onChange={e => setForm({ ...form, aprendizagem_essencial: e.target.value })} rows={2} /></div>
                <div className="space-y-1.5"><Label>Conteúdo e Objetivos</Label><Textarea placeholder="Conteúdo da aula e objetivos..." value={form.conteudo} onChange={e => setForm({ ...form, conteudo: e.target.value })} rows={2} /></div>
                <div className="space-y-1.5"><Label>Recursos</Label><Input placeholder="Livro didático, quadro, notebook, projetor..." value={form.recursos} onChange={e => setForm({ ...form, recursos: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Desenvolvimento da Aula</Label><Textarea placeholder="Como a aula será conduzida..." value={form.desenvolvimento} onChange={e => setForm({ ...form, desenvolvimento: e.target.value })} rows={3} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Material Digital</Label><Input placeholder="Links, plataformas..." value={form.material_digital} onChange={e => setForm({ ...form, material_digital: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Aulas Previstas no Bimestre</Label><Input type="number" value={form.aulas_previstas} onChange={e => setForm({ ...form, aulas_previstas: parseInt(e.target.value) })} /></div>
                </div>
                <div className="space-y-1.5"><Label>Avaliação da Aprendizagem</Label><Textarea placeholder="Como será feita a avaliação..." value={form.avaliacao_aprendizagem} onChange={e => setForm({ ...form, avaliacao_aprendizagem: e.target.value })} rows={2} /></div>
              </>
            )}
            <div className="space-y-1.5"><Label>Professor</Label><Input placeholder="Nome do professor" value={form.professor} onChange={e => setForm({ ...form, professor: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Plano'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de aprovação */}
      <Dialog open={!!approvalDialog} onOpenChange={() => setApprovalDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Aprovar Plano de Aula</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Plano: <strong className="text-foreground">{approvalDialog?.conteudo || approvalDialog?.objetivo_geral}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              {approvalDialog?.turmas?.nome} · {approvalDialog?.disciplinas?.nome}
            </p>
            <div className="space-y-1.5"><Label>Comentário (opcional)</Label><Textarea placeholder="Deixe um comentário..." value={approvalComment} onChange={e => setApprovalComment(e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog(null)}>Cancelar</Button>
            <Button onClick={() => approvalDialog && aprovarPlano(approvalDialog)} className="bg-success hover:bg-success/90 text-success-foreground">
              <CheckCircle className="w-4 h-4 mr-1.5" /> Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de ajuste */}
      <Dialog open={!!ajusteDialog} onOpenChange={() => setAjusteDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><PenLine className="w-5 h-5 text-warning" /> Registrar Ajuste</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {ajusteDialog?.turmas?.nome} · {ajusteDialog?.disciplinas?.nome} · {ajusteDialog?.data_aula && formatDate(ajusteDialog.data_aula)}
            </p>
            <p className="text-xs text-muted-foreground">
              Data do ajuste: <strong className="text-foreground">{new Date().toLocaleDateString('pt-BR')}</strong>
            </p>
            <div className="space-y-1.5">
              <Label>O que foi ajustado?</Label>
              <Textarea
                placeholder="Descreva a modificação realizada (ex: mudança na metodologia da aula)..."
                value={ajusteTexto}
                onChange={e => setAjusteTexto(e.target.value)}
                rows={3}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAjusteDialog(null)}>Cancelar</Button>
            <Button onClick={salvarAjuste} disabled={savingAjuste || !ajusteTexto.trim()} className="bg-warning hover:bg-warning/90 text-warning-foreground">
              <PenLine className="w-4 h-4 mr-1.5" /> Salvar Ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Sub-components ─── */

function BimestreFolder({ bim, count, isOpen, onToggle, children }: {
  bim: number; count: number; isOpen: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
      <button
        onClick={onToggle}
        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
      >
        {isOpen ? <FolderOpen className="w-5 h-5 text-primary" /> : <Folder className="w-5 h-5 text-muted-foreground" />}
        <span className="text-sm font-bold text-foreground">{bim}º Bimestre</span>
        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{count} aulas</span>
        <ChevronRight className={cn('w-4 h-4 text-muted-foreground ml-auto transition-transform', isOpen && 'rotate-90')} />
      </button>
      {isOpen && <div className="border-t border-border px-2 py-2">{children}</div>}
    </div>
  );
}

function Detail({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <span className="font-semibold text-primary text-xs uppercase tracking-wide">{label}: </span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
