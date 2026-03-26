import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, X, Pin, PinOff, Check, AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// ── tipos ──────────────────────────────────────────────────────────
interface Lembrete {
  id: string;
  titulo: string;
  descricao?: string | null;
  data?: string | null;
  prioridade: 'baixa' | 'media' | 'alta';
  cor: string;
  turma_id?: string | null;
  disciplina_id?: string | null;
  concluido: boolean;
  fixado: boolean;
  posicao: number;
  created_at: string;
}

interface Turma { id: string; nome: string }
interface Disciplina { id: string; nome: string }

// ── mapeamento de cores ────────────────────────────────────────────
const COR_MAP: Record<string, { bg: string; border: string; header: string }> = {
  amarelo: { bg: 'bg-[#FEF9C3]', border: 'border-[#FDE047]', header: 'bg-[#FDE047]' },
  verde:   { bg: 'bg-[#DCFCE7]', border: 'border-[#86EFAC]', header: 'bg-[#86EFAC]' },
  azul:    { bg: 'bg-[#DBEAFE]', border: 'border-[#93C5FD]', header: 'bg-[#93C5FD]' },
  rosa:    { bg: 'bg-[#FCE7F3]', border: 'border-[#F9A8D4]', header: 'bg-[#F9A8D4]' },
  laranja: { bg: 'bg-[#FED7AA]', border: 'border-[#FB923C]', header: 'bg-[#FB923C]' },
  roxo:    { bg: 'bg-[#EDE9FE]', border: 'border-[#C4B5FD]', header: 'bg-[#C4B5FD]' },
};

const PRIORIDADE_LABEL: Record<string, string> = {
  baixa: '🟢 Baixa',
  media: '🟡 Média',
  alta:  '🔴 Alta',
};

const COR_DEFAULT_POR_PRIORIDADE: Record<string, string> = {
  baixa: 'verde',
  media: 'amarelo',
  alta:  'rosa',
};

// ── helper ─────────────────────────────────────────────────────────
function isToday(dateStr?: string | null) {
  if (!dateStr) return false;
  return new Date(dateStr + 'T12:00:00').toDateString() === new Date().toDateString();
}
function isPast(dateStr?: string | null) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T12:00:00');
  d.setHours(23, 59, 59, 999);
  return d < new Date();
}
function fmtDate(dateStr?: string | null) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// ── Formulário de criação ──────────────────────────────────────────
function NovoLembreteForm({
  turmas, disciplinas, onSave, onClose,
}: {
  turmas: Turma[]; disciplinas: Disciplina[];
  onSave: () => void; onClose: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    titulo: '', descricao: '', data: '', prioridade: 'media',
    cor: 'amarelo', turma_id: '', disciplina_id: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => {
    setForm(f => {
      const next = { ...f, [k]: v };
      if (k === 'prioridade') next.cor = COR_DEFAULT_POR_PRIORIDADE[v] || 'amarelo';
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) { toast({ title: 'Título obrigatório', variant: 'destructive' }); return; }
    setSaving(true);
    const { error } = await supabase.from('lembretes').insert({
      titulo: form.titulo.trim(),
      descricao: form.descricao || null,
      data: form.data || null,
      prioridade: form.prioridade as 'baixa' | 'media' | 'alta',
      cor: form.cor,
      turma_id: form.turma_id || null,
      disciplina_id: form.disciplina_id || null,
    });
    setSaving(false);
    if (error) { toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Lembrete criado!' });
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className={cn('rounded-xl border-2 shadow-elevated p-5 w-full max-w-sm animate-fade-in',
          COR_MAP[form.cor]?.bg, COR_MAP[form.cor]?.border)}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground">Novo Lembrete</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>

        <input
          autoFocus
          placeholder="Título do lembrete..."
          value={form.titulo}
          onChange={e => set('titulo', e.target.value)}
          className="w-full bg-white/60 border border-border rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <textarea
          placeholder="Descrição (opcional)..."
          value={form.descricao}
          onChange={e => set('descricao', e.target.value)}
          rows={2}
          className="w-full bg-white/60 border border-border rounded-lg px-3 py-2 text-sm mb-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-xs text-muted-foreground font-medium">Data</label>
            <input type="date" value={form.data} onChange={e => set('data', e.target.value)}
              className="w-full bg-white/60 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium">Prioridade</label>
            <select value={form.prioridade} onChange={e => set('prioridade', e.target.value)}
              className="w-full bg-white/60 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="baixa">🟢 Baixa</option>
              <option value="media">🟡 Média</option>
              <option value="alta">🔴 Alta</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-xs text-muted-foreground font-medium">Turma</label>
            <select value={form.turma_id} onChange={e => set('turma_id', e.target.value)}
              className="w-full bg-white/60 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Todas</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium">Disciplina</label>
            <select value={form.disciplina_id} onChange={e => set('disciplina_id', e.target.value)}
              className="w-full bg-white/60 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Todas</option>
              {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>
        </div>

        {/* Cor */}
        <div className="mb-3">
          <label className="text-xs text-muted-foreground font-medium block mb-1">Cor</label>
          <div className="flex gap-2">
            {Object.entries(COR_MAP).map(([key, val]) => (
              <button key={key} title={key}
                onClick={() => set('cor', key)}
                className={cn('w-6 h-6 rounded-full border-2 transition-transform', val.header,
                  form.cor === key ? 'border-foreground scale-125' : 'border-transparent')} />
            ))}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full bg-primary text-primary-foreground rounded-lg py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors">
          {saving ? 'Salvando...' : 'Criar Lembrete'}
        </button>
      </div>
    </div>
  );
}

// ── Card de lembrete ───────────────────────────────────────────────
function LembreteCard({
  lembrete, turmas, disciplinas, onRefresh,
}: {
  lembrete: Lembrete; turmas: Turma[]; disciplinas: Disciplina[]; onRefresh: () => void;
}) {
  const { toast } = useToast();
  const colors = COR_MAP[lembrete.cor] || COR_MAP['amarelo'];
  const today = isToday(lembrete.data);
  const past = isPast(lembrete.data) && !today;
  const turma = turmas.find(t => t.id === lembrete.turma_id);
  const disc = disciplinas.find(d => d.id === lembrete.disciplina_id);

  const toggle = async (field: 'concluido' | 'fixado') => {
    await supabase.from('lembretes').update({ [field]: !lembrete[field] }).eq('id', lembrete.id);
    onRefresh();
  };
  const remove = async () => {
    await supabase.from('lembretes').delete().eq('id', lembrete.id);
    toast({ title: 'Lembrete removido' });
    onRefresh();
  };

  return (
    <div className={cn(
      'rounded-xl border-2 shadow-card overflow-hidden transition-all duration-200 hover:shadow-elevated',
      colors.bg, colors.border,
      lembrete.concluido && 'opacity-60',
    )}>
      {/* header colorido */}
      <div className={cn('px-3 py-1.5 flex items-center justify-between gap-1', colors.header)}>
        <div className="flex items-center gap-1 min-w-0">
          {lembrete.fixado && <Pin className="w-3 h-3 flex-shrink-0 text-foreground/70" />}
          {today && <AlertTriangle className="w-3 h-3 flex-shrink-0 text-orange-600" />}
          <span className="text-xs font-bold text-foreground/80 truncate">{PRIORIDADE_LABEL[lembrete.prioridade]}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => toggle('fixado')} title={lembrete.fixado ? 'Desafixar' : 'Fixar'}
            className="p-1 hover:bg-black/10 rounded transition-colors">
            {lembrete.fixado ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
          </button>
          <button onClick={() => toggle('concluido')} title={lembrete.concluido ? 'Reabrir' : 'Concluir'}
            className="p-1 hover:bg-black/10 rounded transition-colors">
            <Check className={cn('w-3 h-3', lembrete.concluido && 'text-success')} />
          </button>
          <button onClick={remove} title="Excluir"
            className="p-1 hover:bg-black/10 rounded transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* corpo */}
      <div className="px-3 py-2">
        <p className={cn('text-sm font-semibold text-foreground leading-snug', lembrete.concluido && 'line-through')}>
          {lembrete.titulo}
        </p>
        {lembrete.descricao && (
          <p className="text-xs text-foreground/70 mt-1 leading-snug">{lembrete.descricao}</p>
        )}
        {/* meta */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {lembrete.data && (
            <span className={cn(
              'inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium',
              today ? 'bg-orange-100 text-orange-700' :
              past && !lembrete.concluido ? 'bg-red-100 text-destructive' :
              'bg-white/50 text-foreground/70'
            )}>
              <Clock className="w-3 h-3" />
              {today ? 'Hoje' : fmtDate(lembrete.data)}
              {past && !today && !lembrete.concluido && ' ⚠'}
            </span>
          )}
          {turma && (
            <span className="inline-flex text-xs px-1.5 py-0.5 rounded-full bg-white/50 text-foreground/70 font-medium">
              {turma.nome}
            </span>
          )}
          {disc && (
            <span className="inline-flex text-xs px-1.5 py-0.5 rounded-full bg-white/50 text-foreground/70 font-medium">
              {disc.nome}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Board principal ────────────────────────────────────────────────
interface PostItBoardProps {
  compact?: boolean;
}

export function PostItBoard({ compact = false }: PostItBoardProps) {
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filterPrioridade, setFilterPrioridade] = useState('');
  const [filterTurma, setFilterTurma] = useState('');
  const [showConcluidos, setShowConcluidos] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: l }, { data: t }, { data: d }] = await Promise.all([
      supabase.from('lembretes').select('*').order('fixado', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('turmas').select('id, nome'),
      supabase.from('disciplinas').select('id, nome'),
    ]);
    setLembretes((l as Lembrete[]) || []);
    setTurmas(t || []);
    setDisciplinas(d || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = lembretes.filter(l => {
    if (!showConcluidos && l.concluido) return false;
    if (filterPrioridade && l.prioridade !== filterPrioridade) return false;
    if (filterTurma && l.turma_id !== filterTurma) return false;
    return true;
  });

  const pendentes = filtered.filter(l => !l.concluido);
  const concluidos = filtered.filter(l => l.concluido);
  const hoje = filtered.filter(l => isToday(l.data) && !l.concluido).length;
  const atrasados = filtered.filter(l => isPast(l.data) && !isToday(l.data) && !l.concluido).length;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {hoje > 0 && (
            <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">
              🔔 {hoje} hoje
            </span>
          )}
          {atrasados > 0 && (
            <span className="text-xs bg-red-100 text-destructive font-semibold px-2 py-0.5 rounded-full">
              ⚠ {atrasados} atrasado{atrasados > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {!compact && (
          <div className="flex gap-2 flex-wrap">
            <select value={filterPrioridade} onChange={e => setFilterPrioridade(e.target.value)}
              className="bg-card border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="">Todas prioridades</option>
              <option value="alta">🔴 Alta</option>
              <option value="media">🟡 Média</option>
              <option value="baixa">🟢 Baixa</option>
            </select>
            <select value={filterTurma} onChange={e => setFilterTurma(e.target.value)}
              className="bg-card border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="">Todas turmas</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
        )}

        <button onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
          <Plus className="w-3.5 h-3.5" /> Novo
        </button>
      </div>

      {/* Grid de post-its */}
      {loading ? (
        <div className="text-center py-6 text-muted-foreground text-sm">Carregando...</div>
      ) : pendentes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">📌</p>
          <p className="text-sm text-muted-foreground">Nenhum lembrete ativo</p>
          <button onClick={() => setShowForm(true)} className="mt-2 text-xs text-primary hover:underline">
            Criar primeiro lembrete
          </button>
        </div>
      ) : (
        <div className={cn(
          'grid gap-3',
          compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        )}>
          {pendentes.map(l => (
            <LembreteCard key={l.id} lembrete={l} turmas={turmas} disciplinas={disciplinas} onRefresh={load} />
          ))}
        </div>
      )}

      {/* Concluídos (colapsável) */}
      {concluidos.length > 0 && (
        <div className="mt-4">
          <button onClick={() => setShowConcluidos(v => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2">
            {showConcluidos ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {concluidos.length} concluído{concluidos.length > 1 ? 's' : ''}
          </button>
          {showConcluidos && (
            <div className={cn('grid gap-3', compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4')}>
              {concluidos.map(l => (
                <LembreteCard key={l.id} lembrete={l} turmas={turmas} disciplinas={disciplinas} onRefresh={load} />
              ))}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <NovoLembreteForm turmas={turmas} disciplinas={disciplinas} onSave={load} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
