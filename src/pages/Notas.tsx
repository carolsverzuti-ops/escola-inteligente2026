import React, { useState, useEffect, useCallback, useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Download, AlertCircle, FileSpreadsheet, Pencil, ChevronLeft, ChevronRight, Check, Clipboard, Info, Eye } from 'lucide-react';
import { PageHeader, FilterBar, BadgeSituacao, LoadingSpinner } from '@/components/ui-escola';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getDisciplinaDot } from '@/pages/Materias';
import { usePermissions } from '@/hooks/use-permissions';

interface TipoAvaliacao {
  id: string;
  nome: string;
  peso: number;
  bimestre: number;
  disciplina_id?: string;
  turma_id?: string;
  ordem: number;
}

interface AlunoNota {
  id: string;
  nome: string;
  numero_chamada: number;
  notas: Record<string, number | null>;
  media: number | null;
  situacao: string;
}

const DISC_BG: Record<string, string> = {
  azul: 'bg-blue-500', roxo: 'bg-purple-500', verde: 'bg-green-500',
  vermelho: 'bg-red-500', laranja: 'bg-orange-500', rosa: 'bg-pink-500',
  amarelo: 'bg-yellow-500', ciano: 'bg-cyan-500', indigo: 'bg-indigo-500', cinza: 'bg-gray-500',
};

const DISC_BG_LIGHT: Record<string, string> = {
  azul: 'bg-blue-50 dark:bg-blue-950/30', roxo: 'bg-purple-50 dark:bg-purple-950/30', verde: 'bg-green-50 dark:bg-green-950/30',
  vermelho: 'bg-red-50 dark:bg-red-950/30', laranja: 'bg-orange-50 dark:bg-orange-950/30', rosa: 'bg-pink-50 dark:bg-pink-950/30',
  amarelo: 'bg-yellow-50 dark:bg-yellow-950/30', ciano: 'bg-cyan-50 dark:bg-cyan-950/30', indigo: 'bg-indigo-50 dark:bg-indigo-950/30', cinza: 'bg-gray-50 dark:bg-gray-950/30',
};

const DISC_TEXT: Record<string, string> = {
  azul: 'text-blue-700 dark:text-blue-300', roxo: 'text-purple-700 dark:text-purple-300', verde: 'text-green-700 dark:text-green-300',
  vermelho: 'text-red-700 dark:text-red-300', laranja: 'text-orange-700 dark:text-orange-300', rosa: 'text-pink-700 dark:text-pink-300',
  amarelo: 'text-yellow-700 dark:text-yellow-300', ciano: 'text-cyan-700 dark:text-cyan-300', indigo: 'text-indigo-700 dark:text-indigo-300', cinza: 'text-gray-700 dark:text-gray-300',
};

const DISC_BORDER: Record<string, string> = {
  azul: 'border-blue-500', roxo: 'border-purple-500', verde: 'border-green-500',
  vermelho: 'border-red-500', laranja: 'border-orange-500', rosa: 'border-pink-500',
  amarelo: 'border-yellow-500', ciano: 'border-cyan-500', indigo: 'border-indigo-500', cinza: 'border-gray-500',
};

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
  return 'Abaixo da média';
}

function gradeClass(nota: number | null): string {
  if (nota === null) return '';
  if (nota < 5) return 'text-red-600 dark:text-red-400';
  if (nota < 7) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

function recalcularAlunos(alunos: AlunoNota[], tipos: TipoAvaliacao[]): AlunoNota[] {
  return alunos.map(a => {
    const media = calcularMedia(a.notas, tipos);
    return { ...a, media, situacao: calcularSituacao(media) };
  });
}

function parseNota(raw: string): number | null {
  const cleaned = raw.replace(',', '.').trim();
  if (cleaned === '' || cleaned === '—' || cleaned === '-') return null;
  const val = parseFloat(cleaned);
  if (isNaN(val)) return null;
  return Math.min(10, Math.max(0, Math.round(val * 10) / 10));
}

/** Aceita "1", "0,5", "0.5", "25%", "40 %", "2,5" etc. Retorna número (sem clamp) ou null. */
function parsePeso(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;
  const isPct = s.includes('%');
  s = s.replace('%', '').replace(',', '.').trim();
  const val = parseFloat(s);
  if (isNaN(val) || val <= 0) return null;
  const result = isPct ? val / 100 : val;
  return Math.round(result * 1000) / 1000; // 3 casas
}

/* ─── Inline column editor popover ─── */
function ColunaTipoEditor({
  tipo, cor, index, total,
  onUpdate, onDelete, onMove,
}: {
  tipo: TipoAvaliacao; cor: string; index: number; total: number;
  onUpdate: (id: string, nome: string, peso: number) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(tipo.nome);
  const [peso, setPeso] = useState(tipo.peso);

  useEffect(() => { setNome(tipo.nome); setPeso(tipo.peso); }, [tipo]);

  const salvar = () => {
    if (!nome.trim()) return;
    onUpdate(tipo.id, nome.trim(), peso);
    setOpen(false);
  };

  return (
    <th className={cn('px-2 py-2.5 text-center font-semibold border-b border-border min-w-[100px]', DISC_TEXT[cor])}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="group flex flex-col items-center w-full hover:opacity-80 transition-opacity">
            <span className="flex items-center gap-1">
              {tipo.nome}
              <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
            </span>
            <span className="text-xs font-normal opacity-60">Peso {tipo.peso}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="center">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} className="h-8 text-sm" autoFocus />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Peso</Label>
              <Input type="number" min="0.1" max="10" step="0.1" value={peso} onChange={e => setPeso(parseFloat(e.target.value) || 1)} className="h-8 text-sm" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={() => { onMove(tipo.id, -1); setOpen(false); }}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === total - 1} onClick={() => { onMove(tipo.id, 1); setOpen(false); }}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { onDelete(tipo.id); setOpen(false); }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" className="h-7 text-xs px-3" onClick={salvar}>
                  <Check className="w-3.5 h-3.5 mr-1" />Salvar
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </th>
  );
}

/* ─── Spreadsheet Cell ─── */
function SpreadsheetCell({
  value, isFocused, onFocus, onChange, onKeyDown, onPaste, inputRef, saving,
}: {
  value: number | null;
  isFocused: boolean;
  onFocus: () => void;
  onChange: (val: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: ClipboardEvent<HTMLInputElement>) => void;
  inputRef: (el: HTMLInputElement | null) => void;
  saving: boolean;
}) {
  return (
    <td className={cn(
      'px-0 py-0 text-center border border-border/30 relative transition-all',
      isFocused && 'ring-2 ring-primary ring-inset z-10'
    )}>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={value !== null && value !== undefined ? value : ''}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        className={cn(
          'w-full h-9 text-center text-sm font-semibold bg-transparent focus:outline-none focus:bg-background transition-colors',
          value !== null && value !== undefined ? gradeClass(value) : 'text-muted-foreground'
        )}
        placeholder="—"
      />
      {saving && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
    </td>
  );
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
  const [formTipo, setFormTipo] = useState({ nome: '', peso: 1.0 });
  const [focusCell, setFocusCell] = useState<{ row: number; col: number } | null>(null);
  const [pasteCount, setPasteCount] = useState(0);
  const { toast } = useToast();
  const { userId, canEdit, readOnly } = usePermissions();

  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const tiposRef = useRef(tiposAvaliacao);
  tiposRef.current = tiposAvaliacao;
  const alunosRef = useRef(alunosNotas);
  alunosRef.current = alunosNotas;

  const getCellKey = (row: number, col: number) => `${row}-${col}`;
  const setCellRef = (row: number, col: number) => (el: HTMLInputElement | null) => {
    const key = getCellKey(row, col);
    if (el) cellRefs.current.set(key, el);
    else cellRefs.current.delete(key);
  };

  const focusCellAt = useCallback((row: number, col: number) => {
    const maxRow = alunosRef.current.length - 1;
    const maxCol = tiposRef.current.length - 1;
    if (row < 0 || row > maxRow || col < 0 || col > maxCol) return;
    setFocusCell({ row, col });
    setTimeout(() => {
      const el = cellRefs.current.get(getCellKey(row, col));
      if (el) { el.focus(); el.select(); }
    }, 0);
  }, []);

  // Carrega apenas turmas onde o professor logado tem ao menos uma matéria vinculada
  useEffect(() => { if (userId) loadTurmas(); }, [userId, readOnly]);

  // Quando muda a turma, carrega APENAS as matérias vinculadas a essa turma para esse professor
  useEffect(() => {
    if (filterTurma && userId) loadDisciplinasDaTurma();
    else { setDisciplinas([]); setFilterDisciplina(''); }
  }, [filterTurma, userId, readOnly]);

  useEffect(() => { if (filterTurma && filterDisciplina) loadNotas(); else setAlunosNotas([]); }, [filterTurma, filterDisciplina, filterBimestre]);

  async function loadTurmas() {
    if (readOnly) {
      // Gestão vê todas as turmas
      const { data: t } = await supabase.from('turmas').select('id, nome, serie').order('nome');
      setTurmas(t || []);
      if (t?.length && !filterTurma) setFilterTurma(t[0].id);
      return;
    }
    // Professor: apenas turmas em que tem matéria vinculada
    const { data: vinculos } = await supabase
      .from('turma_disciplinas')
      .select('turma_id, turmas:turma_id(id, nome, serie)')
      .eq('user_id', userId!);
    const turmasUnicas = new Map<string, any>();
    (vinculos || []).forEach((v: any) => {
      if (v.turmas) turmasUnicas.set(v.turmas.id, v.turmas);
    });
    const lista = Array.from(turmasUnicas.values()).sort((a, b) => a.nome.localeCompare(b.nome));
    setTurmas(lista);
    if (lista.length && !filterTurma) setFilterTurma(lista[0].id);
    else if (!lista.length) setFilterTurma('');
  }

  async function loadDisciplinasDaTurma() {
    // Busca apenas as disciplinas vinculadas à turma selecionada para o professor logado
    let query = supabase
      .from('turma_disciplinas')
      .select('disciplina_id, disciplinas:disciplina_id(id, nome, cor, user_id)')
      .eq('turma_id', filterTurma);

    // Professor: filtrar pelo seu user_id. Gestão: ver todos.
    if (!readOnly) query = query.eq('user_id', userId!);

    const { data } = await query;
    const disciplinasUnicas = new Map<string, any>();
    (data || []).forEach((v: any) => {
      if (v.disciplinas) disciplinasUnicas.set(v.disciplinas.id, v.disciplinas);
    });
    const lista = Array.from(disciplinasUnicas.values()).sort((a, b) => a.nome.localeCompare(b.nome));
    setDisciplinas(lista);

    // Auto-selecionar única disciplina, ou limpar se não estiver mais disponível
    if (lista.length === 1) setFilterDisciplina(lista[0].id);
    else if (lista.length === 0) setFilterDisciplina('');
    else if (filterDisciplina && !lista.find(d => d.id === filterDisciplina)) setFilterDisciplina('');
  }

  async function loadNotas() {
    setLoading(true);
    setFocusCell(null);
    const [{ data: tipos }, { data: alunos }] = await Promise.all([
      supabase.from('tipos_avaliacao').select('*')
        .eq('turma_id', filterTurma).eq('disciplina_id', filterDisciplina)
        .eq('bimestre', parseInt(filterBimestre)).order('ordem'),
      supabase.from('alunos').select('id, nome, numero_chamada')
        .eq('turma_id', filterTurma).eq('ativo', true).order('numero_chamada'),
    ]);
    const tiposArr: TipoAvaliacao[] = tipos || [];
    setTiposAvaliacao(tiposArr);
    if (!alunos?.length) { setAlunosNotas([]); setLoading(false); return; }

    const { data: notasAll } = await supabase.from('notas').select('*')
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

  const persistNota = useCallback(async (alunoId: string, tipoId: string, nota: number | null) => {
    if (!canEdit || !userId) return;
    const key = `${alunoId}-${tipoId}`;
    setSaving(s => ({ ...s, [key]: true }));
    if (nota === null) {
      await supabase.from('notas').delete().eq('aluno_id', alunoId).eq('tipo_avaliacao_id', tipoId);
    } else {
      await (supabase as any).from('notas').upsert(
        { aluno_id: alunoId, tipo_avaliacao_id: tipoId, nota, bimestre: parseInt(filterBimestre), user_id: userId },
        { onConflict: 'aluno_id,tipo_avaliacao_id' }
      );
    }
    setSaving(s => ({ ...s, [key]: false }));
  }, [filterBimestre, canEdit, userId]);

  const handleCellChange = useCallback((rowIdx: number, colIdx: number, rawValue: string) => {
    const nota = parseNota(rawValue);
    const aluno = alunosRef.current[rowIdx];
    const tipo = tiposRef.current[colIdx];
    if (!aluno || !tipo) return;

    setAlunosNotas(prev => prev.map((a, i) => {
      if (i !== rowIdx) return a;
      const novas = { ...a.notas, [tipo.id]: nota };
      const media = calcularMedia(novas, tiposRef.current);
      return { ...a, notas: novas, media, situacao: calcularSituacao(media) };
    }));

    persistNota(aluno.id, tipo.id, nota);
  }, [persistNota]);

  const handleCellKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
    const maxRow = alunosRef.current.length - 1;
    const maxCol = tiposRef.current.length - 1;

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        focusCellAt(Math.min(row + 1, maxRow), col);
        break;
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          if (col > 0) focusCellAt(row, col - 1);
          else if (row > 0) focusCellAt(row - 1, maxCol);
        } else {
          if (col < maxCol) focusCellAt(row, col + 1);
          else if (row < maxRow) focusCellAt(row + 1, 0);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        focusCellAt(Math.min(row + 1, maxRow), col);
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusCellAt(Math.max(row - 1, 0), col);
        break;
      case 'ArrowRight':
        if ((e.target as HTMLInputElement).selectionStart === (e.target as HTMLInputElement).value.length) {
          e.preventDefault();
          focusCellAt(row, Math.min(col + 1, maxCol));
        }
        break;
      case 'ArrowLeft':
        if ((e.target as HTMLInputElement).selectionStart === 0) {
          e.preventDefault();
          focusCellAt(row, Math.max(col - 1, 0));
        }
        break;
      case 'Escape':
        (e.target as HTMLInputElement).blur();
        setFocusCell(null);
        break;
    }
  }, [focusCellAt]);

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>, startRow: number, startCol: number) => {
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;

    const rows = text.split(/\r?\n/).filter(r => r.trim() !== '');
    // If only one value, let the default input behavior handle it
    if (rows.length === 1 && !rows[0].includes('\t')) return;

    e.preventDefault();

    const maxRow = alunosRef.current.length;
    const maxCol = tiposRef.current.length;
    let count = 0;
    const updates: { rowIdx: number; colIdx: number; nota: number | null }[] = [];

    rows.forEach((rowStr, ri) => {
      const cells = rowStr.split('\t');
      cells.forEach((cellStr, ci) => {
        const r = startRow + ri;
        const c = startCol + ci;
        if (r >= maxRow || c >= maxCol) return;
        const nota = parseNota(cellStr);
        updates.push({ rowIdx: r, colIdx: c, nota });
        count++;
      });
    });

    if (updates.length === 0) return;

    // Apply all at once
    setAlunosNotas(prev => {
      const copy = [...prev];
      updates.forEach(({ rowIdx, colIdx, nota }) => {
        const aluno = copy[rowIdx];
        const tipo = tiposRef.current[colIdx];
        if (!aluno || !tipo) return;
        const novas = { ...aluno.notas, [tipo.id]: nota };
        const media = calcularMedia(novas, tiposRef.current);
        copy[rowIdx] = { ...aluno, notas: novas, media, situacao: calcularSituacao(media) };
      });
      return copy;
    });

    // Persist all
    updates.forEach(({ rowIdx, colIdx, nota }) => {
      const aluno = alunosRef.current[rowIdx];
      const tipo = tiposRef.current[colIdx];
      if (aluno && tipo) persistNota(aluno.id, tipo.id, nota);
    });

    setPasteCount(count);
    toast({ title: `${count} notas coladas com sucesso!`, description: 'As notas foram distribuídas automaticamente.' });
  }, [persistNota, toast]);

  async function adicionarTipoAvaliacao() {
    if (!formTipo.nome || !canEdit || !userId) return;
    await (supabase as any).from('tipos_avaliacao').insert({
      nome: formTipo.nome, peso: formTipo.peso, bimestre: parseInt(filterBimestre),
      disciplina_id: filterDisciplina, turma_id: filterTurma, ordem: tiposAvaliacao.length + 1,
      user_id: userId,
    });
    setDialogTipo(false);
    setFormTipo({ nome: '', peso: 1.0 });
    loadNotas();
    toast({ title: 'Avaliação adicionada!' });
  }

  async function atualizarTipo(id: string, nome: string, peso: number) {
    await supabase.from('tipos_avaliacao').update({ nome, peso }).eq('id', id);
    setTiposAvaliacao(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, nome, peso } : t);
      setAlunosNotas(old => recalcularAlunos(old, updated));
      return updated;
    });
    toast({ title: 'Avaliação atualizada!' });
  }

  async function moverTipo(id: string, dir: -1 | 1) {
    const idx = tiposAvaliacao.findIndex(t => t.id === id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= tiposAvaliacao.length) return;
    const copy = [...tiposAvaliacao];
    [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
    const updates = copy.map((t, i) => ({ ...t, ordem: i + 1 }));
    setTiposAvaliacao(updates);
    await Promise.all(updates.map(t => supabase.from('tipos_avaliacao').update({ ordem: t.ordem }).eq('id', t.id)));
  }

  async function removerTipo(id: string) {
    if (!confirm('Remover esta avaliação? As notas serão excluídas.')) return;
    await supabase.from('tipos_avaliacao').delete().eq('id', id);
    loadNotas();
  }

  function exportarCSV() {
    const header = ['Nº', 'Nome', ...tiposAvaliacao.map(t => t.nome), 'Média', 'Situação'].join(',');
    const rows = alunosNotas.map(a =>
      [a.numero_chamada, `"${a.nome}"`, ...tiposAvaliacao.map(t => a.notas[t.id] ?? ''), a.media?.toFixed(2) ?? '', a.situacao].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `notas_${discAtual?.nome || 'geral'}_${filterBimestre}bim.csv`; link.click();
  }

  function exportarExcel() {
    const discNome = discAtual?.nome || '';
    const turmaNome = turmaAtual?.nome || '';
    const header = `Notas - ${discNome} - ${turmaNome} - ${filterBimestre}º Bimestre\n\n`;
    const cols = ['Nº', 'Nome', ...tiposAvaliacao.map(t => `${t.nome} (Peso ${t.peso})`), 'Média', 'Situação'].join('\t');
    const rows = alunosNotas.map(a =>
      [a.numero_chamada, a.nome, ...tiposAvaliacao.map(t => a.notas[t.id] ?? ''), a.media?.toFixed(2) ?? '', a.situacao].join('\t')
    );
    const avgRow = ['', 'Média da Turma', ...tiposAvaliacao.map(tipo => {
      const vals = alunosNotas.map(a => a.notas[tipo.id]).filter(v => v !== null && v !== undefined) as number[];
      return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '';
    }), (() => {
      const medias = alunosNotas.map(a => a.media).filter(m => m !== null) as number[];
      return medias.length ? (medias.reduce((a, b) => a + b, 0) / medias.length).toFixed(2) : '';
    })(), ''].join('\t');

    const content = header + [cols, ...rows, '', avgRow].join('\n');
    const blob = new Blob(['\uFEFF' + content], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `notas_${discNome}_${filterBimestre}bim.xls`; link.click();
  }

  const turmaAtual = turmas.find(t => t.id === filterTurma);
  const discAtual = disciplinas.find(d => d.id === filterDisciplina);
  const cor = discAtual?.cor || 'azul';

  const abaixoMedia = alunosNotas.filter(a => a.media !== null && a.media < 5).length;
  const emRecuperacao = alunosNotas.filter(a => a.media !== null && a.media >= 5 && a.media < 7).length;
  const aprovados = alunosNotas.filter(a => a.media !== null && a.media >= 7).length;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Lançamento de Notas" subtitle={readOnly ? 'Modo gestão — visualizando notas dos professores' : 'Planilha de notas — use Tab, Enter, setas e cole notas do Excel'}>
        <div className="flex items-center gap-2">
          {readOnly && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"><Eye className="w-3 h-3" /> Somente leitura</span>}
          <Button variant="outline" size="sm" onClick={exportarCSV}><Download className="w-4 h-4 mr-1.5" />CSV</Button>
          <Button variant="outline" size="sm" onClick={exportarExcel}><FileSpreadsheet className="w-4 h-4 mr-1.5" />Excel</Button>
          {canEdit && <Button size="sm" onClick={() => setDialogTipo(true)}><Plus className="w-4 h-4 mr-1.5" />Nova Avaliação</Button>}
        </div>
      </PageHeader>

      <FilterBar>
        <Select value={filterTurma} onValueChange={setFilterTurma}>
          <SelectTrigger className="w-36 h-8 text-sm bg-background"><SelectValue placeholder="Turma" /></SelectTrigger>
          <SelectContent>
            {turmas.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma turma vinculada</div>
            ) : turmas.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterDisciplina} onValueChange={setFilterDisciplina} disabled={!filterTurma || disciplinas.length === 0}>
          <SelectTrigger className="w-48 h-8 text-sm bg-background"><SelectValue placeholder="Disciplina" /></SelectTrigger>
          <SelectContent>
            {disciplinas.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma matéria vinculada a esta turma</div>
            ) : disciplinas.map(d => (
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
          <SelectTrigger className="w-36 h-8 text-sm bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1º Bimestre</SelectItem>
            <SelectItem value="2">2º Bimestre</SelectItem>
            <SelectItem value="3">3º Bimestre</SelectItem>
            <SelectItem value="4">4º Bimestre</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {/* Discipline header banner */}
      {filterTurma && filterDisciplina && (
        <div className={cn('rounded-xl p-4 mb-4 border-2 flex items-center justify-between flex-wrap gap-3', DISC_BG_LIGHT[cor], DISC_BORDER[cor])}>
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg', DISC_BG[cor])}>
              {discAtual?.nome?.charAt(0) || '?'}
            </div>
            <div>
              <h2 className={cn('text-lg font-bold', DISC_TEXT[cor])}>{discAtual?.nome}</h2>
              <p className="text-xs text-muted-foreground">{turmaAtual?.nome} · {filterBimestre}º Bimestre · {tiposAvaliacao.length} avaliações</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {alunosNotas.length > 0 && (
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="text-green-600 dark:text-green-400">✓ {aprovados} aprovados</span>
                <span className="text-yellow-600 dark:text-yellow-400">⚠ {emRecuperacao} recuperação</span>
                <span className="text-red-600 dark:text-red-400">✗ {abaixoMedia} abaixo</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Paste tip */}
      {filterTurma && filterDisciplina && tiposAvaliacao.length > 0 && alunosNotas.length > 0 && (
        <div className="flex items-center gap-2 mb-3 px-1 text-xs text-muted-foreground">
          <Clipboard className="w-3.5 h-3.5" />
          <span>
            <strong>Dica:</strong> Copie notas do Excel e cole diretamente na célula — as notas serão distribuídas automaticamente.
            Use <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono mx-0.5">Tab</kbd> 
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono mx-0.5">Enter</kbd> 
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono mx-0.5">↑↓←→</kbd> para navegar.
          </span>
        </div>
      )}

      {!filterTurma || !filterDisciplina ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-border rounded-xl">
          <AlertCircle className="w-10 h-10 text-muted-foreground/30 mb-2" />
          {turmas.length === 0 ? (
            <>
              <p className="text-muted-foreground font-medium">Nenhuma turma vinculada a você</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Vá até <strong>Matérias</strong> e vincule as suas matérias às turmas em que você leciona.</p>
            </>
          ) : filterTurma && disciplinas.length === 0 ? (
            <>
              <p className="text-muted-foreground font-medium">Nenhuma matéria vinculada a esta turma para este professor</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Vá até <strong>Matérias</strong> para vincular suas matérias a esta turma.</p>
            </>
          ) : (
            <p className="text-muted-foreground">Selecione a turma e a disciplina para visualizar as notas</p>
          )}
        </div>
      ) : loading ? <LoadingSpinner /> : (
        <div className={cn('bg-card border-2 rounded-xl shadow-card overflow-hidden', DISC_BORDER[cor])}>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className={cn(DISC_BG_LIGHT[cor])}>
                  <th className={cn('sticky left-0 z-20 px-3 py-2.5 text-left font-semibold border-b border-border w-8', DISC_BG_LIGHT[cor], DISC_TEXT[cor])}>Nº</th>
                  <th className={cn('sticky left-8 z-20 px-3 py-2.5 text-left font-semibold border-b border-border min-w-[180px]', DISC_BG_LIGHT[cor], DISC_TEXT[cor])}>Nome do Aluno</th>
                  {tiposAvaliacao.map((t, i) => (
                    <ColunaTipoEditor
                      key={t.id}
                      tipo={t}
                      cor={cor}
                      index={i}
                      total={tiposAvaliacao.length}
                      onUpdate={atualizarTipo}
                      onDelete={removerTipo}
                      onMove={moverTipo}
                    />
                  ))}
                  <th className={cn('px-3 py-2.5 text-center font-bold border-b border-border min-w-[70px]', DISC_BG[cor], 'text-white')}>Média</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground border-b border-border min-w-[130px]">Situação</th>
                </tr>
              </thead>
              <tbody>
                {alunosNotas.length === 0 ? (
                  <tr><td colSpan={tiposAvaliacao.length + 4} className="py-12 text-center text-muted-foreground">Nenhum aluno nesta turma</td></tr>
                ) : alunosNotas.map((aluno, rowIdx) => {
                  const isLow = aluno.media !== null && aluno.media < 5;
                  return (
                    <tr key={aluno.id} className={cn(
                      'transition-colors',
                      rowIdx % 2 === 0 ? '' : 'bg-muted/10',
                      isLow && 'bg-red-50/50 dark:bg-red-950/20'
                    )}>
                      <td className="sticky left-0 z-10 bg-inherit px-3 py-1.5 font-mono text-xs text-muted-foreground border-b border-border/40">{aluno.numero_chamada}</td>
                      <td className={cn('sticky left-8 z-10 bg-inherit px-3 py-1.5 font-medium border-b border-border/40', isLow && 'text-red-600 dark:text-red-400')}>
                        {aluno.nome}
                        {isLow && <span className="ml-1.5 text-[10px] bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full">⚠</span>}
                      </td>
                      {tiposAvaliacao.map((tipo, colIdx) => {
                        const savingKey = `${aluno.id}-${tipo.id}`;
                        return (
                          <SpreadsheetCell
                            key={tipo.id}
                            value={aluno.notas[tipo.id] ?? null}
                            isFocused={focusCell?.row === rowIdx && focusCell?.col === colIdx}
                            onFocus={() => setFocusCell({ row: rowIdx, col: colIdx })}
                            onChange={(val) => canEdit && handleCellChange(rowIdx, colIdx, val)}
                            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, colIdx)}
                            onPaste={(e) => canEdit && handlePaste(e, rowIdx, colIdx)}
                            inputRef={setCellRef(rowIdx, colIdx)}
                            saving={!!saving[savingKey]}
                          />
                        );
                      })}
                      <td className={cn('px-3 py-1.5 text-center font-bold text-base border-b border-border/40', DISC_BG_LIGHT[cor], aluno.media !== null ? gradeClass(aluno.media) : 'text-muted-foreground')}>
                        {aluno.media !== null ? aluno.media.toFixed(2) : '—'}
                      </td>
                      <td className="px-3 py-1.5 text-center border-b border-border/40">
                        {aluno.media !== null ? <BadgeSituacao situacao={aluno.situacao} /> : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {alunosNotas.length > 0 && (
                <tfoot>
                  <tr className={cn(DISC_BG_LIGHT[cor])}>
                    <td className={cn('sticky left-0', DISC_BG_LIGHT[cor])} />
                    <td className={cn('sticky left-8 px-3 py-2 text-xs font-bold', DISC_BG_LIGHT[cor], DISC_TEXT[cor])}>Média da Turma</td>
                    {tiposAvaliacao.map(tipo => {
                      const vals = alunosNotas.map(a => a.notas[tipo.id]).filter(v => v !== null && v !== undefined) as number[];
                      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
                      return (
                        <td key={tipo.id} className={cn('px-2 py-2 text-center text-xs font-bold border border-border/30', DISC_TEXT[cor])}>
                          {avg !== null ? avg.toFixed(1) : '—'}
                        </td>
                      );
                    })}
                    <td className={cn('px-3 py-2 text-center text-sm font-bold', DISC_BG[cor], 'text-white')}>
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
              <Input placeholder="Ex: Prova, Trabalho, Projeto, Participação..." value={formTipo.nome} onChange={e => setFormTipo({ ...formTipo, nome: e.target.value })} />
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
