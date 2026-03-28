import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings, Plus, Edit2, Trash2 } from 'lucide-react';
import { PageHeader, TableContainer } from '@/components/ui-escola';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const CORES_DISCIPLINA: { value: string; label: string; dot: string }[] = [
  { value: 'azul', label: 'Azul', dot: 'bg-blue-500' },
  { value: 'roxo', label: 'Roxo', dot: 'bg-purple-500' },
  { value: 'verde', label: 'Verde', dot: 'bg-green-500' },
  { value: 'vermelho', label: 'Vermelho', dot: 'bg-red-500' },
  { value: 'laranja', label: 'Laranja', dot: 'bg-orange-500' },
  { value: 'rosa', label: 'Rosa', dot: 'bg-pink-500' },
  { value: 'amarelo', label: 'Amarelo', dot: 'bg-yellow-500' },
  { value: 'ciano', label: 'Ciano', dot: 'bg-cyan-500' },
  { value: 'indigo', label: 'Índigo', dot: 'bg-indigo-500' },
  { value: 'cinza', label: 'Cinza', dot: 'bg-gray-500' },
];

export function getDisciplinaDot(cor?: string) {
  return CORES_DISCIPLINA.find(c => c.value === cor)?.dot || 'bg-blue-500';
}

export default function Configuracoes() {
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ nome: '', professor: '', carga_horaria: 60, cor: 'azul' });
  const { toast } = useToast();

  useEffect(() => { loadDisciplinas(); }, []);

  async function loadDisciplinas() {
    const { data } = await supabase.from('disciplinas').select('*').order('nome');
    setDisciplinas(data || []);
  }

  async function save() {
    if (!form.nome) return;
    if (editing) { await supabase.from('disciplinas').update(form).eq('id', editing.id); toast({ title: 'Atualizado!' }); }
    else { await supabase.from('disciplinas').insert(form); toast({ title: 'Disciplina criada!' }); }
    setDialogOpen(false); loadDisciplinas();
  }

  async function remove(id: string) {
    if (!confirm('Excluir disciplina?')) return;
    await supabase.from('disciplinas').delete().eq('id', id);
    loadDisciplinas();
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Configurações" subtitle="Gerencie disciplinas e configurações do sistema">
        <Button size="sm" onClick={() => { setEditing(null); setForm({ nome: '', professor: '', carga_horaria: 60, cor: 'azul' }); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1.5" />Nova Disciplina</Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h2 className="text-sm font-semibold mb-3 text-foreground">Disciplinas Cadastradas</h2>
          <TableContainer>
            <table className="table-sheet">
              <thead><tr><th>Cor</th><th>Disciplina</th><th>Professor</th><th className="text-center">CH</th><th className="w-20 text-center">Ações</th></tr></thead>
              <tbody>
                {disciplinas.map((d, i) => (
                  <tr key={d.id} className={i % 2 ? 'bg-muted/10' : ''}>
                    <td className="w-10">
                      <span className={cn('inline-block w-4 h-4 rounded-full', getDisciplinaDot(d.cor))} />
                    </td>
                    <td className="font-medium">{d.nome}</td>
                    <td className="text-sm text-muted-foreground">{d.professor || '—'}</td>
                    <td className="text-center text-sm">{d.carga_horaria}h</td>
                    <td><div className="flex items-center justify-center gap-1">
                      <button onClick={() => { setEditing(d); setForm({ nome: d.nome, professor: d.professor || '', carga_horaria: d.carga_horaria || 60, cor: d.cor || 'azul' }); setDialogOpen(true); }} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => remove(d.id)} className="p-1 rounded hover:bg-danger-light text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-card">
          <h2 className="font-semibold mb-4">Sobre o Sistema</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-3 p-3 bg-primary-light/40 rounded-lg">
              <Settings className="w-5 h-5 text-primary" />
              <div>
                <p className="font-semibold text-foreground">Painel Escolar Inteligente</p>
                <p>Sistema completo de gestão escolar</p>
              </div>
            </div>
            <p>✅ Cadastro de turmas e alunos</p>
            <p>✅ Lançamento de notas com cálculo automático</p>
            <p>✅ Planejamento bimestral de aulas</p>
            <p>✅ Registro de ocorrências de notebook</p>
            <p>✅ Correção de provas com gabarito</p>
            <p>✅ Relatórios completos com exportação</p>
            <p>✅ Importação via CSV/Excel</p>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? 'Editar Disciplina' : 'Nova Disciplina'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5"><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Química" /></div>
            <div className="space-y-1.5"><Label>Professor</Label><Input value={form.professor} onChange={e => setForm({ ...form, professor: e.target.value })} placeholder="Prof. Nome" /></div>
            <div className="space-y-1.5"><Label>Carga Horária (h)</Label><Input type="number" value={form.carga_horaria} onChange={e => setForm({ ...form, carga_horaria: parseInt(e.target.value) })} /></div>
            <div className="space-y-1.5">
              <Label>Cor da Disciplina</Label>
              <div className="flex flex-wrap gap-2">
                {CORES_DISCIPLINA.map(c => (
                  <button key={c.value} title={c.label} onClick={() => setForm({ ...form, cor: c.value })}
                    className={cn('w-8 h-8 rounded-full border-2 transition-all', c.dot,
                      form.cor === c.value ? 'border-foreground scale-110 shadow-md' : 'border-transparent')}>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
