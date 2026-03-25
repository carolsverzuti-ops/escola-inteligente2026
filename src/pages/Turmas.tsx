import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit2, Trash2, Search, Users, BookOpen, X } from 'lucide-react';
import { PageHeader, FilterBar, TableContainer, EmptyState, LoadingSpinner } from '@/components/ui-escola';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const TURNOS = ['Manhã', 'Tarde', 'Noturno', 'Integral'];
const SERIES = ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano', '6º Ano', '7º Ano', '8º Ano', '9º Ano'];

interface Turma {
  id: string;
  nome: string;
  serie: string;
  turno: string;
  ano_letivo: number;
  capacidade: number;
  observacoes?: string;
  alunos_count?: number;
}

export default function Turmas() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTurno, setFilterTurno] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTurma, setEditingTurma] = useState<Turma | null>(null);
  const [form, setForm] = useState({ nome: '', serie: '', turno: 'Manhã', ano_letivo: 2025, capacidade: 35, observacoes: '' });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadTurmas(); }, []);

  async function loadTurmas() {
    const { data } = await supabase.from('turmas').select('*, alunos(count)').order('nome');
    if (data) {
      setTurmas(data.map(t => ({ ...t, alunos_count: (t.alunos as any)?.[0]?.count || 0 })));
    }
    setLoading(false);
  }

  function openNew() {
    setEditingTurma(null);
    setForm({ nome: '', serie: '', turno: 'Manhã', ano_letivo: 2025, capacidade: 35, observacoes: '' });
    setDialogOpen(true);
  }

  function openEdit(t: Turma) {
    setEditingTurma(t);
    setForm({ nome: t.nome, serie: t.serie, turno: t.turno, ano_letivo: t.ano_letivo, capacidade: t.capacidade, observacoes: t.observacoes || '' });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.nome || !form.serie) return toast({ title: 'Preencha nome e série', variant: 'destructive' });
    setSaving(true);
    if (editingTurma) {
      await supabase.from('turmas').update(form).eq('id', editingTurma.id);
      toast({ title: 'Turma atualizada!' });
    } else {
      await supabase.from('turmas').insert(form);
      toast({ title: 'Turma cadastrada!' });
    }
    setSaving(false);
    setDialogOpen(false);
    loadTurmas();
  }

  async function remove(id: string) {
    if (!confirm('Excluir esta turma? Todos os alunos vinculados serão removidos.')) return;
    await supabase.from('turmas').delete().eq('id', id);
    toast({ title: 'Turma excluída' });
    loadTurmas();
  }

  const filtered = turmas.filter(t => {
    const matchSearch = t.nome.toLowerCase().includes(search.toLowerCase()) || t.serie.toLowerCase().includes(search.toLowerCase());
    const matchTurno = filterTurno === 'all' || t.turno === filterTurno;
    return matchSearch && matchTurno;
  });

  const turnoColors: Record<string, string> = {
    'Manhã': 'bg-primary-light text-primary',
    'Tarde': 'bg-warning-light text-warning',
    'Noturno': 'bg-sidebar/10 text-sidebar',
    'Integral': 'bg-success-light text-success',
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Turmas" subtitle={`${turmas.length} turmas cadastradas`}>
        <Button onClick={openNew} size="sm">
          <Plus className="w-4 h-4 mr-1.5" /> Nova Turma
        </Button>
      </PageHeader>

      <FilterBar>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar turma..."
            className="pl-8 h-8 text-sm bg-background"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterTurno} onValueChange={setFilterTurno}>
          <SelectTrigger className="w-36 h-8 text-sm bg-background">
            <SelectValue placeholder="Turno" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os turnos</SelectItem>
            {TURNOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterBar>

      {loading ? <LoadingSpinner /> : (
        <>
          {/* Cards de turma */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(turma => (
              <div key={turma.id} className="bg-card border border-border rounded-xl shadow-card hover:shadow-elevated transition-all group animate-fade-in">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{turma.nome}</h3>
                      <p className="text-sm text-muted-foreground">{turma.serie} · {turma.ano_letivo}</p>
                    </div>
                    <span className={cn('text-xs font-semibold px-2 py-1 rounded-full', turnoColors[turma.turno] || 'bg-secondary text-secondary-foreground')}>
                      {turma.turno}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span><strong className="text-foreground">{turma.alunos_count}</strong>/{turma.capacidade} alunos</span>
                    </div>
                  </div>
                  {/* Progress bar de capacidade */}
                  <div className="h-1.5 bg-secondary rounded-full mb-4">
                    <div
                      className="h-1.5 bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(((turma.alunos_count || 0) / turma.capacidade) * 100, 100)}%` }}
                    />
                  </div>
                  {turma.observacoes && <p className="text-xs text-muted-foreground mb-3 truncate">{turma.observacoes}</p>}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => openEdit(turma)}>
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => remove(turma.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full">
                <EmptyState message="Nenhuma turma encontrada" icon={<BookOpen className="w-12 h-12" />} />
              </div>
            )}
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTurma ? 'Editar Turma' : 'Nova Turma'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome da turma *</Label>
                <Input placeholder="Ex: 7º A" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Série/Ano *</Label>
                <Select value={form.serie} onValueChange={v => setForm({ ...form, serie: v })}>
                  <SelectTrigger><SelectValue placeholder="Série" /></SelectTrigger>
                  <SelectContent>
                    {SERIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Turno</Label>
                <Select value={form.turno} onValueChange={v => setForm({ ...form, turno: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TURNOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ano letivo</Label>
                <Input type="number" value={form.ano_letivo} onChange={e => setForm({ ...form, ano_letivo: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Capacidade</Label>
                <Input type="number" value={form.capacidade} onChange={e => setForm({ ...form, capacidade: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea placeholder="Observações sobre a turma..." value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
