import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Plus, Edit2, Trash2, Copy, Search, BookOpen, Beaker, CheckCircle, Clock,
  FolderOpen, Folder, ChevronRight, ChevronDown, FileText, AlertTriangle, PenLine, Eye,
  Paperclip, Download, X as XIcon, Upload, FileDown
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
import { exportPlanoIndividual, exportPlanos, diaDaSemana, type PlanoPdfData } from '@/lib/planoPdf';

const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

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

interface Anexo {
  id: string;
  plano_id: string;
  nome_arquivo: string;
  storage_path: string;
  mime_type?: string;
  tamanho_bytes?: number;
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
  const [anexos, setAnexos] = useState<Anexo[]>([]);
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
  const [anexosDialog, setAnexosDialog] = useState<PlanoAula | null>(null);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);
  // Arquivos selecionados antes do plano existir (modo "novo plano")
  const [pendingAnexos, setPendingAnexos] = useState<File[]>([]);
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
    const [{ data: p }, { data: t }, { data: d }, { data: a }, { data: ax }] = await Promise.all([
      db.from('planos_aula').select('*, turmas(nome), disciplinas(nome, cor)').order('data_aula', { ascending: true }),
      supabase.from('turmas').select('id, nome').order('nome'),
      db.from('disciplinas').select('id, nome, cor').order('nome'),
      db.from('ajustes_plano').select('*').order('created_at', { ascending: false }),
      db.from('plano_anexos').select('*').order('created_at', { ascending: false }),
    ]);
    setPlanos(p as PlanoAula[] || []);
    setTurmas(t || []);
    setDisciplinas(d || []);
    setAjustes(a as Ajuste[] || []);
    setAnexos((ax as Anexo[]) || []);
    setLoading(false);
  }

  function openNew() {
    setEditingPlano(null);
    setForm({ ...emptyForm, tipo: tipoPlano });
    setPendingAnexos([]);
    setDialogOpen(true);
  }

  function openEdit(p: PlanoAula) {
    setEditingPlano(p);
    setPendingAnexos([]);
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
      // Sobe anexos pendentes (caso ainda restem)
      if (pendingAnexos.length > 0) {
        for (const f of pendingAnexos) {
          await uploadAnexo(editingPlano, f);
        }
        setPendingAnexos([]);
      }
      toast({ title: 'Plano atualizado!' });
      setSaving(false);
      setDialogOpen(false);
      loadData();
    } else {
      const { data: novo } = await db
        .from('planos_aula')
        .insert({ ...payload, user_id: userId })
        .select('*, turmas(nome), disciplinas(nome, cor)')
        .single();
      // Sobe os PDFs selecionados durante a criação
      let anexosCount = 0;
      if (novo && pendingAnexos.length > 0) {
        for (const f of pendingAnexos) {
          await uploadAnexo(novo as PlanoAula, f);
          anexosCount++;
        }
        setPendingAnexos([]);
      }
      toast({
        title: anexosCount > 0
          ? `Plano cadastrado com ${anexosCount} atividade(s) adaptada(s)!`
          : 'Plano cadastrado!',
      });
      setSaving(false);
      setDialogOpen(false);
      await loadData();
      return;
    }
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

  /* ─── Atividades adaptadas (anexos PDF) ─── */
  function getPlanoAnexos(planoId: string) {
    return anexos.filter(a => a.plano_id === planoId);
  }

  async function uploadAnexo(plano: PlanoAula, file: File) {
    if (!canEdit || !userId) return;
    if (file.type !== 'application/pdf') {
      toast({ title: 'Apenas arquivos PDF', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande (máx 10MB)', variant: 'destructive' });
      return;
    }
    setUploadingAnexo(true);
    const ts = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${userId}/${plano.id}/${ts}_${safeName}`;
    const { error: upErr } = await supabase.storage.from('plano-anexos').upload(path, file, {
      cacheControl: '3600',
      contentType: 'application/pdf',
    });
    if (upErr) {
      toast({ title: 'Erro ao enviar', description: upErr.message, variant: 'destructive' });
      setUploadingAnexo(false);
      return;
    }
    const { error: insErr } = await db.from('plano_anexos').insert({
      plano_id: plano.id,
      user_id: userId,
      nome_arquivo: file.name,
      storage_path: path,
      mime_type: file.type,
      tamanho_bytes: file.size,
    });
    if (insErr) {
      await supabase.storage.from('plano-anexos').remove([path]);
      toast({ title: 'Erro ao salvar registro', description: insErr.message, variant: 'destructive' });
    } else {
      toast({ title: '📎 Atividade adaptada anexada!' });
      await loadData();
    }
    setUploadingAnexo(false);
  }

  async function abrirAnexo(anexo: Anexo) {
    const { data, error } = await supabase.storage
      .from('plano-anexos')
      .createSignedUrl(anexo.storage_path, 60 * 10);
    if (error || !data) return toast({ title: 'Erro ao abrir', variant: 'destructive' });
    window.open(data.signedUrl, '_blank');
  }

  async function baixarAnexo(anexo: Anexo) {
    const { data, error } = await supabase.storage
      .from('plano-anexos')
      .createSignedUrl(anexo.storage_path, 60 * 10, { download: anexo.nome_arquivo });
    if (error || !data) return toast({ title: 'Erro ao baixar', variant: 'destructive' });
    window.open(data.signedUrl, '_blank');
  }

  async function removerAnexo(anexo: Anexo) {
    if (!canEdit) return;
    if (!confirm(`Excluir o anexo "${anexo.nome_arquivo}"?`)) return;
    await supabase.storage.from('plano-anexos').remove([anexo.storage_path]);
    await db.from('plano_anexos').delete().eq('id', anexo.id);
    toast({ title: 'Anexo removido' });
    loadData();
  }

  /* ─── Exportação PDF ─── */
  function planoToPdfData(p: PlanoAula): PlanoPdfData {
    const turma = turmas.find(t => t.id === p.turma_id);
    return {
      data_aula: p.data_aula,
      dia_semana: p.dia_semana || diaDaSemana(p.data_aula),
      turma_nome: p.turmas?.nome || turma?.nome,
      serie: turma?.serie,
      disciplina_nome: p.disciplinas?.nome,
      professor: p.professor,
      bimestre: p.bimestre,
      numero_aulas: p.numero_aulas,
      aulas_previstas: p.aulas_previstas,
      aprendizagem_essencial: p.aprendizagem_essencial,
      conteudo: p.conteudo,
      objetivos: p.objetivos,
      recursos: p.recursos,
      desenvolvimento: p.desenvolvimento,
      material_digital: p.material_digital,
      avaliacao_aprendizagem: p.avaliacao_aprendizagem,
      habilidades: p.habilidades,
      objetivo_geral: p.objetivo_geral,
      status: p.status,
      aprovado_por: p.aprovado_por,
      data_aprovacao: p.data_aprovacao,
      comentario_aprovacao: p.comentario_aprovacao,
      ajustes: getPlanoAjustes(p.id).map(a => ({ descricao: a.descricao, created_at: a.created_at })),
      anexos: getPlanoAnexos(p.id).map(a => ({ nome_arquivo: a.nome_arquivo })),
    };
  }

  function exportarPlanoPdf(p: PlanoAula) {
    const fname = `plano-${p.data_aula}-${(p.disciplinas?.nome || 'plano').replace(/\s+/g, '_')}.pdf`;
    exportPlanoIndividual(planoToPdfData(p), fname);
    toast({ title: '📄 PDF gerado!' });
  }

  function exportarMes(bim: number, mes: number, lista: PlanoAula[]) {
    if (!lista.length) return;
    const titulo = `${MESES_NOMES[mes]} — ${bim}º Bimestre`;
    exportPlanos(lista.map(planoToPdfData), titulo, `planos-${MESES_NOMES[mes].toLowerCase()}-bim${bim}.pdf`);
    toast({ title: `📄 ${lista.length} planos exportados!` });
  }

  function exportarBimestre(bim: number, meses: Record<number, PlanoAula[]>) {
    const lista = Object.keys(meses)
      .sort((a, b) => Number(a) - Number(b))
      .flatMap(m => meses[Number(m)]);
    if (!lista.length) return;
    exportPlanos(lista.map(planoToPdfData), `${bim}º Bimestre — Planos de Aula`, `planos-bim${bim}.pdf`);
    toast({ title: `📄 ${lista.length} planos exportados!` });
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
                <div className="flex justify-end px-2 pb-2">
                  <button
                    onClick={() => exportarBimestre(bim, meses)}
                    className="text-xs px-2.5 py-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors flex items-center gap-1.5 border border-primary/20"
                    title="Exportar bimestre completo em PDF"
                  >
                    <FileDown className="w-3.5 h-3.5" /> Exportar Bimestre em PDF
                  </button>
                </div>
                <div className="space-y-1 pl-2">
                  {Object.keys(meses).sort((a, b) => Number(a) - Number(b)).map(monthStr => {
                    const month = Number(monthStr);
                    const planosDoMes = meses[month];
                    const mesKey = `${bim}-${month}`;
                    const mesAberto = openMeses.has(mesKey);

                    return (
                      <div key={mesKey}>
                        {/* Mes folder */}
                        <div className="flex items-center gap-1 w-full px-1 rounded-lg hover:bg-secondary/60 transition-colors">
                          <button
                            onClick={() => toggleMes(mesKey)}
                            className="flex items-center gap-2 flex-1 px-2 py-2 text-left group"
                          >
                            {mesAberto ? <FolderOpen className="w-4 h-4 text-primary" /> : <Folder className="w-4 h-4 text-muted-foreground group-hover:text-primary" />}
                            <span className={cn('text-sm font-medium', mesAberto ? 'text-foreground' : 'text-muted-foreground')}>
                              {MESES_NOMES[month]}
                            </span>
                            <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">{planosDoMes.length}</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); exportarMes(bim, month, planosDoMes); }}
                            className="text-xs px-2 py-1 rounded-md text-primary hover:bg-primary/10 transition-colors flex items-center gap-1"
                            title="Exportar planos do mês em PDF"
                          >
                            <FileDown className="w-3.5 h-3.5" /> PDF
                          </button>
                          <ChevronRight className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform mr-2', mesAberto && 'rotate-90')} />
                        </div>

                        {/* Planos dentro do mês */}
                        {mesAberto && (
                          <div className="ml-6 mt-1 space-y-1">
                            {planosDoMes.map(plano => {
                              const discCor = plano.disciplinas?.cor || 'azul';
                              const isExpanded = expandedId === plano.id;
                              const temAjuste = planoTemAjuste(plano.id);
                              const planoAjustes = getPlanoAjustes(plano.id);
                              const planoAnexos = getPlanoAnexos(plano.id);

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
                                    ) : canApprove ? (
                                      <button onClick={e => { e.stopPropagation(); setApprovalDialog(plano); }}
                                        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-warning/15 text-warning hover:bg-warning/25 transition-colors flex-shrink-0">
                                        <Clock className="w-3 h-3" /> Aprovar
                                      </button>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-warning/15 text-warning flex-shrink-0">
                                        <Clock className="w-3 h-3" /> Pendente
                                      </span>
                                    )}

                                    <div className="flex items-center gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                      <button className="p-1 rounded hover:bg-secondary relative" onClick={() => setAnexosDialog(plano)} title="Atividades adaptadas (PDF)">
                                        <Paperclip className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                                        {planoAnexos.length > 0 && (
                                          <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">{planoAnexos.length}</span>
                                        )}
                                      </button>
                                      <button className="p-1 rounded hover:bg-secondary" onClick={() => exportarPlanoPdf(plano)} title="Exportar PDF">
                                        <FileDown className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                                      </button>
                                      {canEdit && (
                                        <>
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
                                        </>
                                      )}
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

                                      {/* Anexos PEI */}
                                      {planoAnexos.length > 0 && (
                                        <div className="mt-4 border-t border-border pt-3">
                                          <h4 className="text-xs font-bold text-primary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                            <Paperclip className="w-3.5 h-3.5" /> Atividades Adaptadas (PEI)
                                          </h4>
                                          <div className="space-y-1.5">
                                            {planoAnexos.map(ax => (
                                              <div key={ax.id} className="flex items-center gap-2 bg-primary/5 rounded-lg p-2 border border-primary/10">
                                                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                                                <span className="text-sm flex-1 truncate">{ax.nome_arquivo}</span>
                                                <button onClick={() => abrirAnexo(ax)} className="p-1 rounded hover:bg-primary/10" title="Visualizar"><Eye className="w-3.5 h-3.5 text-primary" /></button>
                                                <button onClick={() => baixarAnexo(ax)} className="p-1 rounded hover:bg-primary/10" title="Baixar"><Download className="w-3.5 h-3.5 text-primary" /></button>
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
                <Input
                  type="date"
                  value={form.data_aula}
                  onChange={e => {
                    const novaData = e.target.value;
                    setForm({ ...form, data_aula: novaData, dia_semana: novaData ? diaDaSemana(novaData) : '' });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Dia da Semana</Label>
                <Input
                  value={form.dia_semana || (form.data_aula ? diaDaSemana(form.data_aula) : '')}
                  readOnly
                  className="bg-muted/50 cursor-not-allowed"
                  placeholder="Selecione a data"
                />
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

             {/* ─── Atividade Adaptada (PEI) ─── */}
             <div className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
               <div className="flex items-center gap-2">
                 <Paperclip className="w-4 h-4 text-primary" />
                 <Label className="text-sm font-semibold text-foreground">Atividade Adaptada (PEI)</Label>
                 {(() => {
                   const total = (editingPlano ? getPlanoAnexos(editingPlano.id).length : 0) + pendingAnexos.length;
                   return total > 0 ? (
                     <span className="text-xs px-2 py-0.5 rounded-full bg-success/15 text-success font-medium">
                       {total} anexo(s)
                     </span>
                   ) : null;
                 })()}
               </div>
               <p className="text-xs text-muted-foreground">
                 Anexe arquivos PDF com atividades adaptadas para alunos com PEI. A coordenação pode visualizar os anexos.
               </p>

               <>
                   {/* Anexos já salvos (apenas em edição) */}
                   {editingPlano && getPlanoAnexos(editingPlano.id).length > 0 && (
                     <div className="space-y-1.5">
                       {getPlanoAnexos(editingPlano.id).map(anexo => (
                         <div key={anexo.id} className="flex items-center gap-2 bg-background rounded p-2 border border-border text-sm">
                           <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                           <span className="flex-1 truncate" title={anexo.nome_arquivo}>{anexo.nome_arquivo}</span>
                           <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => abrirAnexo(anexo)} title="Visualizar">
                             <Eye className="w-3.5 h-3.5" />
                           </Button>
                           <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => baixarAnexo(anexo)} title="Baixar">
                             <Download className="w-3.5 h-3.5" />
                           </Button>
                           {canEdit && (
                             <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => removerAnexo(anexo)} title="Remover">
                               <XIcon className="w-3.5 h-3.5" />
                             </Button>
                           )}
                         </div>
                       ))}
                     </div>
                   )}
                   {/* Arquivos pendentes (selecionados, ainda não enviados) */}
                   {pendingAnexos.length > 0 && (
                     <div className="space-y-1.5">
                       {pendingAnexos.map((file, idx) => (
                         <div key={idx} className="flex items-center gap-2 bg-background rounded p-2 border border-dashed border-primary/40 text-sm">
                           <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                           <span className="flex-1 truncate" title={file.name}>
                             {file.name}
                             <span className="ml-2 text-[10px] uppercase tracking-wide text-primary font-semibold">aguardando salvar</span>
                           </span>
                           <Button
                             type="button"
                             size="sm"
                             variant="ghost"
                             className="h-7 px-2"
                             onClick={() => {
                               const url = URL.createObjectURL(file);
                               window.open(url, '_blank');
                             }}
                             title="Visualizar"
                           >
                             <Eye className="w-3.5 h-3.5" />
                           </Button>
                           <Button
                             type="button"
                             size="sm"
                             variant="ghost"
                             className="h-7 px-2 text-destructive hover:text-destructive"
                             onClick={() => setPendingAnexos(prev => prev.filter((_, i) => i !== idx))}
                             title="Remover"
                           >
                             <XIcon className="w-3.5 h-3.5" />
                           </Button>
                         </div>
                       ))}
                     </div>
                   )}
                   {canEdit && (
                     <div>
                       <input
                         type="file"
                         accept="application/pdf"
                         id="atividade-adaptada-upload"
                         className="hidden"
                         onChange={async (e) => {
                           const file = e.target.files?.[0];
                           if (!file) return;
                           if (file.size > 10 * 1024 * 1024) {
                             toast({ title: 'Arquivo muito grande (máx 10MB)', variant: 'destructive' });
                             e.target.value = '';
                             return;
                           }
                           if (editingPlano) {
                             // Plano já existe → upload imediato
                             await uploadAnexo(editingPlano, file);
                           } else {
                             // Plano novo → segura em memória até salvar
                             setPendingAnexos(prev => [...prev, file]);
                           }
                           e.target.value = '';
                         }}
                         disabled={uploadingAnexo}
                       />
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         disabled={uploadingAnexo}
                         onClick={() => document.getElementById('atividade-adaptada-upload')?.click()}
                         className="w-full border-primary/40 hover:bg-primary/10"
                       >
                         <Upload className="w-4 h-4 mr-1.5" />
                         {uploadingAnexo
                           ? 'Enviando...'
                           : (((editingPlano ? getPlanoAnexos(editingPlano.id).length : 0) + pendingAnexos.length) > 0
                               ? 'Adicionar outro PDF'
                               : 'Anexar PDF da atividade adaptada')}
                       </Button>
                       {!editingPlano && pendingAnexos.length > 0 && (
                         <p className="text-[11px] italic text-muted-foreground mt-1.5">
                           O(s) arquivo(s) será(ão) enviado(s) ao clicar em <b>Salvar Plano</b>.
                         </p>
                       )}
                     </div>
                   )}
               </>
             </div>
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

      {/* Dialog de anexos (atividades adaptadas - PEI) */}
      <Dialog open={!!anexosDialog} onOpenChange={() => setAnexosDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="w-5 h-5 text-primary" /> Atividades Adaptadas (PEI)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              {anexosDialog?.turmas?.nome} · {anexosDialog?.disciplinas?.nome} · {anexosDialog?.data_aula && formatDate(anexosDialog.data_aula)}
            </p>

            {anexosDialog && (() => {
              const lista = getPlanoAnexos(anexosDialog.id);
              return lista.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                  Nenhuma atividade anexada ainda
                </p>
              ) : (
                <div className="space-y-2">
                  {lista.map(ax => (
                    <div key={ax.id} className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2.5 border border-border">
                      <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ax.nome_arquivo}</p>
                        {ax.tamanho_bytes && (
                          <p className="text-xs text-muted-foreground">{(ax.tamanho_bytes / 1024).toFixed(0)} KB</p>
                        )}
                      </div>
                      <button onClick={() => abrirAnexo(ax)} className="p-1.5 rounded hover:bg-primary/10" title="Visualizar">
                        <Eye className="w-4 h-4 text-primary" />
                      </button>
                      <button onClick={() => baixarAnexo(ax)} className="p-1.5 rounded hover:bg-primary/10" title="Baixar">
                        <Download className="w-4 h-4 text-primary" />
                      </button>
                      {canEdit && (
                        <button onClick={() => removerAnexo(ax)} className="p-1.5 rounded hover:bg-destructive/10" title="Excluir">
                          <XIcon className="w-4 h-4 text-destructive" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}

            {canEdit && anexosDialog && (
              <label className={cn(
                'flex items-center justify-center gap-2 px-3 py-3 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:bg-primary/5 transition-colors',
                uploadingAnexo && 'opacity-50 pointer-events-none'
              )}>
                <Upload className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary font-medium">
                  {uploadingAnexo ? 'Enviando...' : 'Anexar PDF'}
                </span>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  disabled={uploadingAnexo}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file && anexosDialog) await uploadAnexo(anexosDialog, file);
                    e.target.value = '';
                  }}
                />
              </label>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Apenas PDF, máximo 10MB. Visível para a coordenação e gestão.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnexosDialog(null)}>Fechar</Button>
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
