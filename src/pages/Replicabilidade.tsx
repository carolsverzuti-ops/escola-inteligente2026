import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Sparkles, Plus, Camera, Upload, X, Pencil, Trash2, ImageIcon, Search,
} from 'lucide-react';

type Foto = { id: string; storage_path: string; nome: string | null; ordem: number };
type Replic = {
  id: string;
  user_id: string;
  titulo: string;
  descricao: string | null;
  created_at: string;
  fotos?: Foto[];
};
type Profile = { id: string; nome: string };

async function signUrl(path: string): Promise<string> {
  const { data } = await supabase.storage
    .from('replicabilidade-fotos')
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl || '';
}

export default function Replicabilidade() {
  const { user } = useAuth();
  const { isGestao, isAdmin } = usePermissions();
  const { toast } = useToast();

  const [items, setItems] = useState<Replic[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fProf, setFProf] = useState<string>('todos');

  // form
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Replic | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [novasFotos, setNovasFotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // view
  const [viewing, setViewing] = useState<Replic | null>(null);
  const [viewUrls, setViewUrls] = useState<string[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function loadAll() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('replicabilidades' as any)
      .select('*, fotos:replicabilidade_fotos(*)')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    const list = (data as any[]) || [];
    setItems(list as Replic[]);

    if (isGestao && list.length) {
      const ids = Array.from(new Set(list.map((r) => r.user_id)));
      const { data: pf } = await supabase.from('profiles').select('id, nome').in('id', ids);
      const map: Record<string, Profile> = {};
      (pf || []).forEach((p: any) => (map[p.id] = p));
      setProfiles(map);
    }

    const t: Record<string, string> = {};
    await Promise.all(
      list.map(async (r: any) => {
        const f = (r.fotos || []).sort((a: Foto, b: Foto) => a.ordem - b.ordem)[0];
        if (f?.storage_path) t[r.id] = await signUrl(f.storage_path);
      }),
    );
    setThumbs(t);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((r) => {
      if (q && !r.titulo.toLowerCase().includes(q) && !(r.descricao || '').toLowerCase().includes(q)) return false;
      if (fProf !== 'todos' && r.user_id !== fProf) return false;
      return true;
    });
  }, [items, search, fProf]);

  function openNew() {
    setEditing(null);
    setTitulo('');
    setDescricao('');
    setNovasFotos([]);
    setPreviews([]);
    setFormOpen(true);
  }

  function openEdit(r: Replic) {
    setEditing(r);
    setTitulo(r.titulo);
    setDescricao(r.descricao || '');
    setNovasFotos([]);
    setPreviews([]);
    setFormOpen(true);
  }

  function onPickFiles(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    setNovasFotos((prev) => [...prev, ...arr]);
    setPreviews((prev) => [...prev, ...arr.map((f) => URL.createObjectURL(f))]);
  }

  function removeNova(i: number) {
    setNovasFotos((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function removeFotoExistente(foto: Foto) {
    if (!editing) return;
    if (!confirm('Remover esta foto?')) return;
    await supabase.storage.from('replicabilidade-fotos').remove([foto.storage_path]);
    await supabase.from('replicabilidade_fotos' as any).delete().eq('id', foto.id);
    setEditing({ ...editing, fotos: editing.fotos?.filter((f) => f.id !== foto.id) });
    void loadAll();
  }

  async function uploadFotos(replicId: string) {
    if (!user || !novasFotos.length) return;
    let ordem = (editing?.fotos?.length || 0);
    for (const f of novasFotos) {
      const path = `${user.id}/${replicId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${f.name}`;
      const { error } = await supabase.storage
        .from('replicabilidade-fotos')
        .upload(path, f, { upsert: false, contentType: f.type });
      if (error) {
        toast({ title: 'Erro no upload', description: `${f.name}: ${error.message}`, variant: 'destructive' });
        continue;
      }
      await supabase.from('replicabilidade_fotos' as any).insert({
        replicabilidade_id: replicId,
        storage_path: path,
        nome: f.name,
        ordem: ordem++,
      });
    }
  }

  async function save() {
    if (!user) return;
    if (!titulo.trim()) {
      toast({ title: 'Informe o título', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      let id = editing?.id;
      if (editing) {
        const { error } = await supabase
          .from('replicabilidades' as any)
          .update({ titulo, descricao: descricao || null })
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('replicabilidades' as any)
          .insert({ user_id: user.id, titulo, descricao: descricao || null })
          .select('id').single();
        if (error) throw error;
        id = (data as any).id;
      }
      if (id) await uploadFotos(id);
      toast({ title: editing ? 'Atualizado!' : 'Registro criado!' });
      setFormOpen(false);
      await loadAll();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function remove(r: Replic) {
    if (!confirm(`Apagar "${r.titulo}"? Esta ação não pode ser desfeita.`)) return;
    if (r.fotos?.length) {
      await supabase.storage.from('replicabilidade-fotos').remove(r.fotos.map((f) => f.storage_path));
    }
    const { error } = await supabase.from('replicabilidades' as any).delete().eq('id', r.id);
    if (error) {
      toast({ title: 'Erro ao apagar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Registro apagado' });
    await loadAll();
  }

  async function openView(r: Replic) {
    setViewing(r);
    const sorted = (r.fotos || []).slice().sort((a, b) => a.ordem - b.ordem);
    const urls = await Promise.all(sorted.map((f) => signUrl(f.storage_path)));
    setViewUrls(urls);
  }

  const canEdit = (r: Replic) => isAdmin || r.user_id === user?.id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Replicabilidade</h1>
            <p className="text-sm text-muted-foreground">Mural de boas práticas — registre rapidamente ações realizadas em sala.</p>
          </div>
        </div>
        {!isGestao && (
          <Button onClick={openNew} size="lg" className="gap-2">
            <Plus className="w-4 h-4" /> Nova Replicabilidade
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {isGestao && Object.keys(profiles).length > 0 && (
          <Select value={fProf} onValueChange={setFProf}>
            <SelectTrigger className="md:w-64"><SelectValue placeholder="Professor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os professores</SelectItem>
              {Object.values(profiles).map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-center text-muted-foreground py-12">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Nenhuma replicabilidade ainda.</p>
            {!isGestao && <p className="text-sm mt-1">Clique em "Nova Replicabilidade" para registrar a primeira ação.</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <Card
              key={r.id}
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => openView(r)}
            >
              <div className="aspect-video bg-muted relative overflow-hidden">
                {thumbs[r.id] ? (
                  <img src={thumbs[r.id]} alt={r.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="w-12 h-12 opacity-40" />
                  </div>
                )}
                {(r.fotos?.length || 0) > 1 && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-xs font-medium">
                    +{(r.fotos!.length - 1)} fotos
                  </span>
                )}
              </div>
              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold leading-tight line-clamp-2">{r.titulo}</h3>
                {r.descricao && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{r.descricao}</p>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">
                    {isGestao ? (profiles[r.user_id]?.nome || '—') : new Date(r.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  {canEdit(r) && (
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(r)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(r)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Replicabilidade' : 'Nova Replicabilidade'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título da ação *</Label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Aula prática: Extração do DNA do morango"
              />
            </div>
            <div className="space-y-2">
              <Label>Breve descrição</Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Conte rapidamente o que foi feito, como aconteceu e o objetivo da ação."
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label>Fotos</Label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  onPickFiles(e.dataTransfer.files);
                }}
                className={`flex flex-wrap gap-2 rounded-lg p-1 transition-colors ${dragOver ? 'bg-primary/10 ring-2 ring-primary ring-offset-2' : ''}`}
              >
                {dragOver && (
                  <div className="w-full text-center text-sm font-medium text-primary py-2">
                    Solte as imagens aqui para enviar
                  </div>
                )}
                <label className="flex-1 min-w-[160px]">
                  <input
                    type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => { onPickFiles(e.target.files); e.target.value = ''; }}
                  />
                  <div className="cursor-pointer border-2 border-dashed border-input rounded-lg p-4 text-center hover:bg-accent transition-colors flex flex-col items-center gap-1">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium">+ Inserir fotos</span>
                    <span className="text-xs text-muted-foreground">clique ou arraste imagens</span>
                  </div>
                </label>
                <label className="flex-1 min-w-[160px]">
                  <input
                    type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={(e) => { onPickFiles(e.target.files); e.target.value = ''; }}
                  />
                  <div className="cursor-pointer border-2 border-dashed border-input rounded-lg p-4 text-center hover:bg-accent transition-colors flex flex-col items-center gap-1">
                    <Camera className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Tirar foto</span>
                    <span className="text-xs text-muted-foreground">pelo celular</span>
                  </div>
                </label>
              </div>

              {/* Fotos já salvas */}
              {editing?.fotos && editing.fotos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                  {editing.fotos.map((f) => (
                    <FotoSalvaThumb key={f.id} foto={f} onRemove={() => removeFotoExistente(f)} />
                  ))}
                </div>
              )}

              {/* Novas fotos (previews) */}
              {previews.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                  {previews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-md overflow-hidden border bg-muted">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeNova(i)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-black"
                        type="button"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} size="lg">
              {saving ? 'Salvando...' : 'Salvar Replicabilidade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => { if (!o) { setViewing(null); setViewUrls([]); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{viewing.titulo}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {isGestao && (profiles[viewing.user_id]?.nome ? `${profiles[viewing.user_id].nome} · ` : '')}
                  {new Date(viewing.created_at).toLocaleDateString('pt-BR')}
                </p>
              </DialogHeader>
              {viewing.descricao && (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{viewing.descricao}</p>
              )}
              {viewUrls.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {viewUrls.map((u, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLightbox(u)}
                      className="aspect-square rounded-md overflow-hidden bg-muted hover:opacity-90"
                    >
                      <img src={u} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain" />
          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function FotoSalvaThumb({ foto, onRemove }: { foto: Foto; onRemove: () => void }) {
  const [url, setUrl] = useState<string>('');
  useEffect(() => { void signUrl(foto.storage_path).then(setUrl); }, [foto.storage_path]);
  return (
    <div className="relative aspect-square rounded-md overflow-hidden border bg-muted">
      {url && <img src={url} alt="" className="w-full h-full object-cover" />}
      <button
        onClick={onRemove}
        type="button"
        className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-black"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}