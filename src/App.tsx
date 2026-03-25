import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Sidebar, MobileSidebar } from "@/components/Sidebar";
import Dashboard from "@/pages/Dashboard";
import Turmas from "@/pages/Turmas";
import Alunos from "@/pages/Alunos";
import Notas from "@/pages/Notas";
import PlanoAula from "@/pages/PlanoAula";
import Ocorrencias from "@/pages/Ocorrencias";
import CorrecaoProvas from "@/pages/CorrecaoProvas";
import Relatorios from "@/pages/Relatorios";
import Configuracoes from "@/pages/Configuracoes";

const queryClient = new QueryClient();

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <MobileSidebar />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Toaster />
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/turmas" element={<Turmas />} />
          <Route path="/alunos" element={<Alunos />} />
          <Route path="/notas" element={<Notas />} />
          <Route path="/plano-aula" element={<PlanoAula />} />
          <Route path="/ocorrencias" element={<Ocorrencias />} />
          <Route path="/correcao-provas" element={<CorrecaoProvas />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
