import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, CheckCircle, XCircle, AlertCircle, ScanLine, Download } from 'lucide-react';
import { PageHeader, FilterBar, LoadingSpinner, EmptyState } from '@/components/ui-escola';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const ALTERNATIVAS = ['A', 'B', 'C', 'D', 'E'];

export default function CorrecaoProvas() {
  const [provas, setProvas] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [selectedProva, setSelectedProva] = useState<any>(null);
  const [gabarito, setGabarito] = useState<any[]>([]);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [respostas, setRespostas] = useState<Record<string, Record<number, string>>>({});
  const [loading, setLoading] = useState(false);
  const [dialogProva, setDialogProva] = useState(false);
  const [formProva, setFormProva] = useState({ turma_id: '', disciplina_id: '', bimestre: 1, titulo: '', numero_questoes: 10, data_aplicacao: new Date().toISOString().split('T')[0] });
  const [gabForm, setGabForm] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (selectedProva) loadProvaDetails(); }, [selectedProva]);

  async function loadData() {
    const [{ data: p }, { data: t }, { data: d }] = await Promise.all([
      supabase.from('provas').select('*, turmas(nome), disciplinas(nome)').order('created_at', { ascending: false }),
      supabase.from('turmas').select('id, nome').order('nome'),
      supabase.from('disciplinas').select('id, nome').order('nome'),
    ]);
    setProvas(p || []); setTurmas(t || []); setDisciplinas(d || []);
  }

  async function loadProvaDetails() {
    if (!selectedProva) return;
    setLoading(true);
    const [{ data: gab }, { data: al }, { data: res }] = await Promise.all([
      supabase.from('gabaritos').select('*').eq('prova_id', selectedProva.id).order('numero_questao'),
      supabase.from('alunos').select('id, nome, numero_chamada').eq('turma_id', selectedProva.turma_id).eq('ativo', true).order('numero_chamada'),
      supabase.from('resultados_prova').select('*').eq('prova_id', selectedProva.id),
    ]);
    setGabarito(gab || []);
    setAlunos(al || []);
    const gabMap: Record<number, string> = {};
    (gab || []).forEach((g: any) => { gabMap[g.numero_questao] = g.resposta_correta; });
    setGabForm(gabMap);
    const resMap: Record<string, Record<number, string>> = {};
    (res || []).forEach((r: any) => { resMap[r.aluno_id] = r.respostas || {}; });
    setRespostas(resMap);
    setLoading(false);
  }

  async function salvarGabarito() {
    const upserts = Object.entries(gabForm).map(([q, r]) => ({ prova_id: selectedProva.id, numero_questao: parseInt(q), resposta_correta: r, peso: 1.0 }));
    await supabase.from('gabaritos').upsert(upserts, { onConflict: 'prova_id,numero_questao' });
    toast({ title: 'Gabarito salvo!' });
    loadProvaDetails();
  }

  async function salvarRespostas(alunoId: string) {
    const resAl = respostas[alunoId] || {};
    let acertos = 0;
    gabarito.forEach(g => { if (resAl[g.numero_questao] === g.resposta_correta) acertos++; });
    const nota = gabarito.length > 0 ? (acertos / gabarito.length) * 10 : 0;
    await supabase.from('resultados_prova').upsert({ prova_id: selectedProva.id, aluno_id: alunoId, respostas: resAl, acertos, nota }, { onConflict: 'prova_id,aluno_id' });
    toast({ title: `Nota ${nota.toFixed(1)} salva!` });
  }

  async function criarProva() {
    setSaving(true);
    const { data } = await supabase.from('provas').insert({ ...formProva, disciplina_id: formProva.disciplina_id || null }).select().single();
    setSaving(false); setDialogProva(false);
    if (data) { loadData(); setSelectedProva(data); }
    toast({ title: 'Prova criada!' });
  }

  function downloadModeloCartao() {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cartão Resposta</title><style>body{font-family:Arial;margin:20px}h2{text-align:center}table{width:100%;border-collapse:collapse;margin-top:10px}td,th{border:1px solid #333;padding:8px;text-align:center;width:60px}th{background:#eee}.resp{display:inline-block;width:28px;height:28px;border:2px solid #333;border-radius:50%;line-height:26px;font-weight:bold;margin:2px;cursor:pointer}</style></head><body><h2>CARTÃO RESPOSTA</h2><div style="margin:10px 0">Nome: ____________________________ Turma: ________ Data: ________ </div><table><tr><th>Questão</th>${ALTERNATIVAS.map(a=>`<th>${a}</th>`).join('')}</tr>${Array.from({length:20},(_,i)=>`<tr><td>${i+1}</td>${ALTERNATIVAS.map(a=>`<td><div class="resp">${a}</div></td>`).join('')}</tr>`).join('')}</table></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'cartao_resposta.html'; link.click();
  }

  const questoes = selectedProva ? Array.from({ length: selectedProva.numero_questoes }, (_, i) => i + 1) : [];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Correção de Provas" subtitle="Gabarito e lançamento de respostas">
        <Button variant="outline" size="sm" onClick={downloadModeloCartao}><Download className="w-4 h-4 mr-1.5" />Modelo Cartão</Button>
        <Button size="sm" onClick={() => setDialogProva(true)}><Plus className="w-4 h-4 mr-1.5" />Nova Prova</Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Lista de provas */}
        <div className="bg-card border border-border rounded-xl shadow-card">
          <div className="px-4 py-3 border-b border-border"><h2 className="font-semibold text-sm">Provas Cadastradas</h2></div>
          <div className="divide-y divide-border/50">
            {provas.length === 0 ? <p className="text-xs text-muted-foreground p-4 text-center">Nenhuma prova</p>
            : provas.map(p => (
              <button key={p.id} onClick={() => setSelectedProva(p)} className={cn('w-full px-4 py-3 text-left hover:bg-secondary/50 transition-colors', selectedProva?.id === p.id ? 'bg-primary-light/30 border-l-2 border-primary' : '')}>
                <p className="text-sm font-medium leading-tight truncate">{p.titulo}</p>
                <p className="text-xs text-muted-foreground">{p.turmas?.nome} · {p.bimestre}º Bim · {p.numero_questoes} questões</p>
              </button>
            ))}
          </div>
        </div>

        {/* Detalhes da prova selecionada */}
        <div className="lg:col-span-3">
          {!selectedProva ? (
            <div className="flex flex-col items-center justify-center py-24 bg-card border border-border rounded-xl text-center">
              <ScanLine className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Selecione uma prova para configurar o gabarito</p>
            </div>
          ) : loading ? <LoadingSpinner /> : (
            <div className="space-y-4">
              {/* Gabarito */}
              <div className="bg-card border border-border rounded-xl shadow-card">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h2 className="font-semibold text-sm">Gabarito Oficial</h2>
                  <Button size="sm" variant="outline" onClick={salvarGabarito}>Salvar Gabarito</Button>
                </div>
                <div className="p-4 flex flex-wrap gap-2">
                  {questoes.map(q => (
                    <div key={q} className="flex flex-col items-center gap-1">
                      <span className="text-xs font-semibold text-muted-foreground">{q}</span>
                      <div className="flex gap-0.5">
                        {ALTERNATIVAS.map(alt => (
                          <button key={alt} onClick={() => setGabForm(g => ({ ...g, [q]: alt }))}
                            className={cn('w-7 h-7 text-xs font-bold rounded-full border-2 transition-all', gabForm[q] === alt ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50')}>
                            {alt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Respostas dos alunos */}
              <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <h2 className="font-semibold text-sm">Respostas dos Alunos</h2>
                  <p className="text-xs text-muted-foreground">Selecione as respostas e salve para calcular a nota automaticamente</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-secondary">
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground border-b border-border sticky left-0 bg-secondary z-10 min-w-[150px]">Aluno</th>
                        {questoes.map(q => <th key={q} className="px-1 py-2 text-center font-semibold text-muted-foreground border-b border-border min-w-[130px]">Q{q}</th>)}
                        <th className="px-3 py-2 text-center font-semibold text-muted-foreground border-b border-border">Nota</th>
                        <th className="px-3 py-2 text-center font-semibold text-muted-foreground border-b border-border">Salvar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alunos.map((aluno, i) => {
                        const resAl = respostas[aluno.id] || {};
                        let acertos = 0;
                        gabarito.forEach(g => { if (resAl[g.numero_questao] === g.resposta_correta) acertos++; });
                        const nota = gabarito.length > 0 ? (acertos / gabarito.length) * 10 : null;
                        return (
                          <tr key={aluno.id} className={cn(i % 2 ? 'bg-muted/10' : '')}>
                            <td className="px-3 py-2 sticky left-0 bg-inherit font-medium border-b border-border/40 z-10">{aluno.nome}</td>
                            {questoes.map(q => (
                              <td key={q} className="px-1 py-1.5 text-center border-b border-border/40">
                                <div className="flex gap-0.5 justify-center">
                                  {ALTERNATIVAS.map(alt => {
                                    const gab = gabForm[q];
                                    const sel = resAl[q] === alt;
                                    const isCorrect = gab && sel && gab === alt;
                                    const isWrong = gab && sel && gab !== alt;
                                    return (
                                      <button key={alt}
                                        onClick={() => setRespostas(r => ({ ...r, [aluno.id]: { ...r[aluno.id], [q]: alt } }))}
                                        className={cn('w-6 h-6 text-xs font-bold rounded-full border transition-all',
                                          isCorrect ? 'bg-success text-success-foreground border-success' :
                                          isWrong ? 'bg-destructive text-destructive-foreground border-destructive' :
                                          sel ? 'bg-primary text-primary-foreground border-primary' :
                                          'border-border text-muted-foreground hover:border-primary/50')}>
                                        {alt}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                            ))}
                            <td className={cn('px-3 py-2 text-center font-bold border-b border-border/40', nota !== null ? (nota >= 7 ? 'text-success' : nota >= 5 ? 'text-warning' : 'text-destructive') : 'text-muted-foreground')}>
                              {nota !== null ? nota.toFixed(1) : '—'}
                            </td>
                            <td className="px-3 py-2 text-center border-b border-border/40">
                              <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => salvarRespostas(aluno.id)}>Salvar</Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogProva} onOpenChange={setDialogProva}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova Prova</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5"><Label>Título *</Label><Input placeholder="Ex: Prova Bimestral de Matemática" value={formProva.titulo} onChange={e => setFormProva({ ...formProva, titulo: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Turma</Label>
                <Select value={formProva.turma_id} onValueChange={v => setFormProva({ ...formProva, turma_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Turma" /></SelectTrigger>
                  <SelectContent>{turmas.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Disciplina</Label>
                <Select value={formProva.disciplina_id} onValueChange={v => setFormProva({ ...formProva, disciplina_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Disciplina" /></SelectTrigger>
                  <SelectContent>{disciplinas.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Bimestre</Label>
                <Select value={String(formProva.bimestre)} onValueChange={v => setFormProva({ ...formProva, bimestre: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4].map(b => <SelectItem key={b} value={String(b)}>{b}º Bim</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Questões</Label><Input type="number" min={1} max={50} value={formProva.numero_questoes} onChange={e => setFormProva({ ...formProva, numero_questoes: parseInt(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={formProva.data_aplicacao} onChange={e => setFormProva({ ...formProva, data_aplicacao: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogProva(false)}>Cancelar</Button>
            <Button onClick={criarProva} disabled={saving}>{saving ? 'Criando...' : 'Criar Prova'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
