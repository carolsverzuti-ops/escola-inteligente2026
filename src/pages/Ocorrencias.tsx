import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit2, Trash2, Search, Laptop } from 'lucide-react';
import { PageHeader, FilterBar, TableContainer, EmptyState, LoadingSpinner } from '@/components/ui-escola';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function Ocorrencias() {
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTurma, setFilterTurma] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ turma_id: '', data_ocorrencia: new Date().toISOString().split('T')[0], quantidade_notebooks: 0, alunos_envolvidos: '', problema_encontrado: '', descricao: '', equipamento_danificado: false, internet_funcionou: true, solucao_adotada: '', observacoes: '' });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [{ data: oc }, { data: t }] = await Promise.all([
      supabase.from('ocorrencias_notebook').select('*, turmas(nome)').order('data_ocorrencia', { ascending: false }),
      supabase.from('turmas').select('id, nome').order('nome'),
    ]);
    setOcorrencias(oc || []);
    setTurmas(t || []);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({ turma_id: '', data_ocorrencia: new Date().toISOString().split('T')[0], quantidade_notebooks: 0, alunos_envolvidos: '', problema_encontrado: '', descricao: '', equipamento_danificado: false, internet_funcionou: true, solucao_adotada: '', observacoes: '' });
    setDialogOpen(true);
  }

  function openEdit(o: any) {
    setEditing(o);
    setForm({ turma_id: o.turma_id || '', data_ocorrencia: o.data_ocorrencia, quantidade_notebooks: o.quantidade_notebooks, alunos_envolvidos: o.alunos_envolvidos || '', problema_encontrado: o.problema_encontrado || '', descricao: o.descricao || '', equipamento_danificado: o.equipamento_danificado, internet_funcionou: o.internet_funcionou, solucao_adotada: o.solucao_adotada || '', observacoes: o.observacoes || '' });
    setDialogOpen(true);
  }

  async function save() {
    setSaving(true);
    const payload = { ...form, turma_id: form.turma_id || null };
    if (editing) { await supabase.from('ocorrencias_notebook').update(payload).eq('id', editing.id); toast({ title: 'Ocorrência atualizada!' }); }
    else { await supabase.from('ocorrencias_notebook').insert(payload); toast({ title: 'Ocorrência registrada!' }); }
    setSaving(false); setDialogOpen(false); loadData();
  }

  async function remove(id: string) {
    if (!confirm('Excluir esta ocorrência?')) return;
    await supabase.from('ocorrencias_notebook').delete().eq('id', id);
    loadData();
  }

  const formatDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
  const filtered = ocorrencias.filter(o => {
    const ms = (o.problema_encontrado || '').toLowerCase().includes(search.toLowerCase()) || (o.descricao || '').toLowerCase().includes(search.toLowerCase());
    const mt = filterTurma === 'all' || o.turma_id === filterTurma;
    return ms && mt;
  });

  return (
    <div className="animate-fade-in">
      <PageHeader title="Ocorrências de Notebook" subtitle={`${ocorrencias.length} ocorrências registradas`}>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1.5" />Nova Ocorrência</Button>
      </PageHeader>
      <FilterBar>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-8 h-8 text-sm bg-background" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterTurma} onValueChange={setFilterTurma}>
          <SelectTrigger className="w-36 h-8 text-sm bg-background"><SelectValue placeholder="Turma" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas turmas</SelectItem>{turmas.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
        </Select>
      </FilterBar>
      {loading ? <LoadingSpinner /> : (
        <TableContainer>
          <table className="table-sheet">
            <thead>
              <tr>
                <th>Data</th><th>Turma</th><th>Qtd. Notebooks</th><th>Problema</th><th>Danificado</th><th>Internet</th><th>Solução</th><th className="w-20 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">Nenhuma ocorrência</td></tr>
              : filtered.map((o, i) => (
                <tr key={o.id} className={cn(i % 2 ? 'bg-muted/10' : '')}>
                  <td className="font-mono text-xs">{formatDate(o.data_ocorrencia)}</td>
                  <td className="font-medium">{o.turmas?.nome || '—'}</td>
                  <td className="text-center">{o.quantidade_notebooks}</td>
                  <td className="max-w-xs"><div className="font-medium truncate">{o.problema_encontrado}</div><div className="text-xs text-muted-foreground truncate">{o.alunos_envolvidos}</div></td>
                  <td className="text-center"><span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', o.equipamento_danificado ? 'bg-danger-light text-destructive' : 'bg-success-light text-success')}>{o.equipamento_danificado ? 'Sim' : 'Não'}</span></td>
                  <td className="text-center"><span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', o.internet_funcionou ? 'bg-success-light text-success' : 'bg-danger-light text-destructive')}>{o.internet_funcionou ? 'Sim' : 'Não'}</span></td>
                  <td className="text-xs text-muted-foreground max-w-[150px] truncate">{o.solucao_adotada || '—'}</td>
                  <td><div className="flex items-center justify-center gap-1">
                    <button onClick={() => openEdit(o)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => remove(o.id)} className="p-1 rounded hover:bg-danger-light text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableContainer>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Ocorrência' : 'Nova Ocorrência'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={form.data_ocorrencia} onChange={e => setForm({ ...form, data_ocorrencia: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Turma</Label>
                <Select value={form.turma_id} onValueChange={v => setForm({ ...form, turma_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{turmas.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Qtd. Notebooks</Label><Input type="number" min={0} value={form.quantidade_notebooks} onChange={e => setForm({ ...form, quantidade_notebooks: parseInt(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Problema</Label><Input placeholder="Sem internet, travando..." value={form.problema_encontrado} onChange={e => setForm({ ...form, problema_encontrado: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Alunos Envolvidos</Label><Input placeholder="Nomes dos alunos" value={form.alunos_envolvidos} onChange={e => setForm({ ...form, alunos_envolvidos: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Descrição</Label><Textarea rows={2} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Solução Adotada</Label><Textarea rows={2} value={form.solucao_adotada} onChange={e => setForm({ ...form, solucao_adotada: e.target.value })} /></div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.equipamento_danificado} onChange={e => setForm({ ...form, equipamento_danificado: e.target.checked })} />Equipamento Danificado</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.internet_funcionou} onChange={e => setForm({ ...form, internet_funcionou: e.target.checked })} />Internet Funcionou</label>
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
