import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { School, LogIn, UserPlus, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const ALLOWED_DOMAIN = '@prof.educacao.sp.gov.br';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const validateDomain = (email: string) => email.toLowerCase().endsWith(ALLOWED_DOMAIN);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDomain(email)) {
      toast({ title: 'Acesso restrito', description: `Apenas e-mails ${ALLOWED_DOMAIN} são permitidos.`, variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.toLowerCase().trim(), password });
    setLoading(false);
    if (error) {
      toast({ title: 'Erro ao entrar', description: error.message, variant: 'destructive' });
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(var(--background))] via-[hsl(var(--secondary))] to-[hsl(var(--primary-light))] p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <School className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Painel Escolar Inteligente</CardTitle>
          <CardDescription className="text-muted-foreground">
            Acesso restrito a professores da rede estadual de São Paulo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail institucional</Label>
              <Input
                id="email"
                type="email"
                placeholder={`seu.nome${ALLOWED_DOMAIN}`}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <LogIn className="w-4 h-4 mr-2" />
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
          <div className="mt-4 flex flex-col gap-2 text-center text-sm">
            <Link to="/cadastro" className="text-primary hover:underline inline-flex items-center justify-center gap-1">
              <UserPlus className="w-3.5 h-3.5" /> Criar conta
            </Link>
            <Link to="/recuperar-senha" className="text-muted-foreground hover:underline inline-flex items-center justify-center gap-1">
              <KeyRound className="w-3.5 h-3.5" /> Esqueci minha senha
            </Link>
          </div>
          <p className="mt-6 text-xs text-center text-muted-foreground">
            Acesso permitido apenas para e-mails <strong>{ALLOWED_DOMAIN}</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
