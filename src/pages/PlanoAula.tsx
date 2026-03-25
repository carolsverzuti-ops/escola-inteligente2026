import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit2, Trash2, Copy, Download, Search, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { PageHeader, FilterBar, EmptyState, LoadingSpinner } from '@/components/ui-escola';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const DIAS_SEMANA = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];

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
  turmas?: { nome: string };
  disciplinas?: { nome: string };
}

const emptyForm = {
  turma_id: '', disciplina_id: '', bimestre: 1, data_aula: new Date().toISOString().split('T')[0],
  dia_semana: 'Segunda-feira', numero_aulas: 2, aprendizagem_essencial: '', conteudo: '',
  objetivos: '', recursos: '', desenvolvimento: '', material_digital: '',
  avaliacao_aprendizagem: '', aulas_previstas: 20, professor: ''
};

export default function PlanoAula() {
  const [planos, setPlanos] = useState<PlanoAula[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTurma, setFilterTurma] = useState('all');
  const [filterBimestre, setFilterBimestre] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlano, setEditingPlano] = useState<PlanoAula | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [{ data: p }, { data: t }, { data: d }] = await Promise.all([
      supabase.from('planos_aula').select('*, turmas(nome), disciplinas(nome)').order('data_aula', { ascending: false }),
      supabase.from('turmas').select('id, nome').order('nome'),
      supabase.from('disciplinas').select('id, nome').order('nome'),
    ]);
    setPlanos(p as PlanoAula[] || []);
    setTurmas(t || []);
    setDisciplinas(d || []);
    setLoading(false);
  }

  function openNew() {
    setEditingPlano(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  }

  function openEdit(p: PlanoAula) {
    setEditingPlano(p);
    setForm({ turma_id: p.turma_id, disciplina_id: p.disciplina_id || '', bimestre: p.bimestre, data_aula: p.data_aula, dia_semana: p.dia_semana || '', numero_aulas: p.numero_aulas || 2, aprendizagem_essencial: p.aprendizagem_essencial || '', conteudo: p.conteudo || '', objetivos: p.objetivos || '', recursos: p.recursos || '', desenvolvimento: p.desenvolvimento || '', material_digital: p.material_digital || '', avaliacao_aprendizagem: p.avaliacao_aprendizagem || '', aulas_previstas: p.aulas_previstas || 20, professor: p.professor || '' });
    setDialogOpen(true);
  }

  async function duplicar(p: PlanoAula) {
    const { id, created_at, updated_at, turmas: t, disciplinas: d, ...rest } = p as any;
    await supabase.from('planos_aula').insert({ ...rest, data_aula: new Date().toISOString().split('T')[0], duplicado_de: p.id });
    toast({ title: 'Plano duplicado!' });
    loadData();
  }

  async function save() {
    if (!form.turma_id || !form.data_aula) return toast({ title: 'Preencha turma e data', variant: 'destructive' });
    setSaving(true);
    const payload = { ...form, disciplina_id: form.disciplina_id || null };
    if (editingPlano) {
      await supabase.from('planos_aula').update(payload).eq('id', editingPlano.id);
      toast({ title: 'Plano atualizado!' });
    } else {
      await supabase.from('planos_aula').insert(payload);
      toast({ title: 'Plano cadastrado!' });
    }
    setSaving(false);
    setDialogOpen(false);
    loadData();
  }

  async function remove(id: string) {
    if (!confirm('Excluir este plano de aula?')) return;
    await supabase.from('planos_aula').delete().eq('id', id);
    loadData();
  }

  const formatDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

  const filtered = planos.filter(p => {
    const matchSearch = (p.conteudo || '').toLowerCase().includes(search.toLowerCase()) || (p.disciplinas?.nome || '').toLowerCase().includes(search.toLowerCase());
    const matchTurma = filterTurma === 'all' || p.turma_id === filterTurma;
    const matchBim = filterBimestre === 'all' || p.bimestre === parseInt(filterBimestre);
    return matchSearch && matchTurma && matchBim;
  });

  const grouped = filtered.reduce((acc, p) => {
    const key = `${p.bimestre}º Bimestre`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {} as Record<string, PlanoAula[]>);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Plano de Aula" subtitle="Planejamento bimestral organizado">
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1.5" />Novo Plano</Button>
      </PageHeader>

      <FilterBar>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar conteúdo..." className="pl-8 h-8 text-sm bg-background" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterTurma} onValueChange={setFilterTurma}>
          <SelectTrigger className="w-36 h-8 text-sm bg-background"><SelectValue placeholder="Turma" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas turmas</SelectItem>{turmas.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterBimestre} onValueChange={setFilterBimestre}>
          <SelectTrigger className="w-36 h-8 text-sm bg-background"><SelectValue placeholder="Bimestre" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos bimestres</SelectItem>
            {[1,2,3,4].map(b => <SelectItem key={b} value={String(b)}>{b}º Bimestre</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterBar>

      {loading ? <LoadingSpinner /> : (
        <div className="space-y-4">
          {Object.entries(grouped).sort().map(([bim, planosBim]) => (
            <div key={bim}>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-sm font-bold text-foreground">{bim}</h2>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{planosBim.length} aulas</span>
              </div>
              <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-secondary">
                      <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground border-b border-border w-20">Data</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground border-b border-border w-24">Dia</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground border-b border-border w-36">Turma/Disc.</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground border-b border-border">Conteúdo / AE</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground border-b border-border w-12 text-center">Aulas</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground border-b border-border w-24">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planosBim.map((plano, i) => (
                      <React.Fragment key={plano.id}>
                        <tr
                          className={cn('hover:bg-primary-light/10 cursor-pointer transition-colors', i % 2 === 0 ? '' : 'bg-muted/10')}
                          onClick={() => setExpandedId(expandedId === plano.id ? null : plano.id)}
                        >
                          <td className="px-3 py-2.5 font-mono text-xs border-b border-border/40">{formatDate(plano.data_aula)}</td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground border-b border-border/40">{plano.dia_semana?.split('-')[0]}</td>
                          <td className="px-3 py-2.5 border-b border-border/40">
                            <div className="text-xs font-semibold">{plano.turmas?.nome}</div>
                            <div className="text-xs text-muted-foreground">{plano.disciplinas?.nome}</div>
                          </td>
                          <td className="px-3 py-2.5 border-b border-border/40">
                            <div className="font-medium truncate max-w-xs">{plano.conteudo}</div>
                            {plano.aprendizagem_essencial && <div className="text-xs text-muted-foreground truncate max-w-xs">{plano.aprendizagem_essencial}</div>}
                          </td>
                          <td className="px-3 py-2.5 text-center border-b border-border/40 font-semibold">{plano.numero_aulas}</td>
                          <td className="px-3 py-2.5 border-b border-border/40" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" onClick={() => openEdit(plano)} title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" onClick={() => duplicar(plano)} title="Duplicar"><Copy className="w-3.5 h-3.5" /></button>
                              <button className="p-1 rounded hover:bg-danger-light transition-colors text-muted-foreground hover:text-destructive" onClick={() => remove(plano.id)} title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                        {expandedId === plano.id && (
                          <tr>
                            <td colSpan={6} className="bg-secondary/50 px-4 py-4 border-b border-border">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                {plano.objetivos && <div><span className="font-semibold text-primary">Objetivos: </span>{plano.objetivos}</div>}
                                {plano.recursos && <div><span className="font-semibold text-primary">Recursos: </span>{plano.recursos}</div>}
                                {plano.desenvolvimento && <div className="md:col-span-2"><span className="font-semibold text-primary">Desenvolvimento: </span>{plano.desenvolvimento}</div>}
                                {plano.material_digital && <div><span className="font-semibold text-primary">Material Digital: </span>{plano.material_digital}</div>}
                                {plano.avaliacao_aprendizagem && <div><span className="font-semibold text-primary">Avaliação da Aprendizagem: </span>{plano.avaliacao_aprendizagem}</div>}
                                {plano.professor && <div><span className="font-semibold text-primary">Professor: </span>{plano.professor}</div>}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <EmptyState message="Nenhum plano de aula encontrado" icon={<BookOpen className="w-12 h-12" />} />}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingPlano ? 'Editar Plano de Aula' : 'Novo Plano de Aula'}</DialogTitle></DialogHeader>
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
                  <SelectContent>{disciplinas.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Bimestre</Label>
                <Select value={String(form.bimestre)} onValueChange={v => setForm({ ...form, bimestre: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4].map(b => <SelectItem key={b} value={String(b)}>{b}º Bimestre</SelectItem>)}</SelectContent>
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
            <div className="space-y-1.5">
              <Label>Aprendizagem Essencial (AE)</Label>
              <Textarea placeholder="O que o aluno deve aprender..." value={form.aprendizagem_essencial} onChange={e => setForm({ ...form, aprendizagem_essencial: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Conteúdo e Objetivos</Label>
              <Textarea placeholder="Descreva o conteúdo da aula e os objetivos..." value={form.conteudo} onChange={e => setForm({ ...form, conteudo: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Recursos</Label>
              <Input placeholder="Livro didático, quadro, notebook, projetor..." value={form.recursos} onChange={e => setForm({ ...form, recursos: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Desenvolvimento da Aula</Label>
              <Textarea placeholder="Como a aula será conduzida..." value={form.desenvolvimento} onChange={e => setForm({ ...form, desenvolvimento: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Material Digital</Label>
                <Input placeholder="Links, plataformas..." value={form.material_digital} onChange={e => setForm({ ...form, material_digital: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Aulas Previstas no Bimestre</Label>
                <Input type="number" value={form.aulas_previstas} onChange={e => setForm({ ...form, aulas_previstas: parseInt(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Avaliação da Aprendizagem</Label>
              <Textarea placeholder="Como será feita a avaliação..." value={form.avaliacao_aprendizagem} onChange={e => setForm({ ...form, avaliacao_aprendizagem: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Professor</Label>
              <Input placeholder="Nome do professor" value={form.professor} onChange={e => setForm({ ...form, professor: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Plano'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
