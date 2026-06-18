## Planejamento Bimestral — planilha única por bimestre

Hoje cada aula é um plano isolado. Vou agrupar tudo num **Planejamento Bimestral** (turma + disciplina + bimestre), exibido como uma planilha editável com uma linha por aula, com autosave, anexos por linha, validação única pela coordenação e PDF em tabela.

Nada será apagado: os planos existentes continuam funcionando e podem ser agrupados num planejamento bimestral retroativamente.

---

### 1. Banco

Migração nova (sem mexer nas tabelas existentes além de adicionar colunas):

- **`planejamentos_bimestrais`** (novo): `user_id`, `turma_id`, `disciplina_id`, `bimestre`, `ano`, `status` (`rascunho | aguardando_validacao | validado`), `validado_por`, `validado_em`, `observacao_validacao`. Único por (user_id, turma_id, disciplina_id, bimestre, ano). RLS: professor dono CRUD; gestão SELECT + UPDATE (apenas status/validação).
- **`planos_aula`**: adicionar `planejamento_id uuid` (FK → planejamentos_bimestrais, nullable). Backfill automático: para cada combinação existente de (user_id, turma_id, disciplina_id, bimestre) cria um planejamento com status `validado` se algum plano daquela combinação já estiver `aprovado`, senão `rascunho`, e liga os planos.
- **`plano_anexos`**: adicionar `tipo text default 'documento'` (`documento | adaptada`) para separar "Documento da aula" de "Atividade adaptada".
- GRANTs + RLS completos na nova tabela.

### 2. Página `/plano-aula` (reestruturada)

**Lista (entrada do módulo)** — cards agrupados:

```
1º Bimestre / 2026
  📘 Química — 1ºA      [12 aulas]  [validado ✓]
  📕 História — 1ºB     [10 aulas]  [aguardando validação]
[+ Novo Planejamento Bimestral]
```

Filtros por bimestre, disciplina, turma, status. Coordenação vê de todos os professores (com filtro por professor).

**Criar novo** → diálogo curto: disciplina, turma, bimestre (ano = atual). Cria o registro `planejamentos_bimestrais` e abre a planilha vazia.

**Planilha (tela principal do planejamento)**:

| Data | Dia | Aulas | Aprendizagem essencial | Conteúdo/Objetivo | Desenvolvimento | Recursos | Avaliação | 📎 Documento | 📎 Adaptada | ⋯ |

- Cada célula de texto é editável inline (`contentEditable`/textarea expansível). Salva sozinho com debounce de 800ms (mostra "salvando…" → "salvo").
- "Data" abre date picker, "Dia" é calculado.
- Botão **+ Adicionar aula** abaixo da tabela (uma ou várias datas).
- Botão **+ Datas em sequência** (escolhe dias da semana e período → cria várias linhas).
- Ações por linha (menu ⋯): **Duplicar**, **Copiar para baixo** (preenche linhas seguintes com os mesmos valores das colunas selecionadas: metodologia/recursos/avaliação), **Ajustar** (abre o ajuste PDCA existente), **Excluir**.
- Paste de tabela (Excel/Word) na primeira célula distribui valores nas linhas seguintes.
- Coluna de anexos: dois botões por linha (📎 documento / 📎 adaptada) com upload direto no bucket `plano-anexos` e badge com contagem.

**Cabeçalho da planilha**:
- Professor, Disciplina, Turma, Bimestre, Status.
- Botão **Exportar PDF** (tabela paisagem).
- Para o professor: **Enviar para validação** (muda status para `aguardando_validacao`).
- Para gestão: **Validar Planejamento** (status → `validado`, salva `validado_por`/`validado_em`) e **Solicitar ajustes** (volta para `rascunho` com observação).
- Bloqueio: quando `validado`, edição fica travada para o professor (botão "Solicitar reabertura" para gestão destravar).

**Visão da coordenação**: mesma planilha em modo leitura, sem aula-por-aula. Cabeçalho mostra professor/disciplina/turma/bimestre e o botão único "Validar Planejamento".

### 3. PDF

`src/lib/planoPdf.ts` já existe. Adicionar `exportPlanejamentoBimestral(planejamento, linhas)`: paisagem A4, cabeçalho com professor/disciplina/turma/bimestre/status, tabela com todas as colunas, quebra de página automática, ícone indicando anexos por linha.

### 4. Permissões

| Ação | Professor (dono) | Gestão | Admin |
|---|---|---|---|
| Criar/editar planejamento e linhas | sim | não | sim |
| Anexar arquivos | sim | não | sim |
| Ajuste PDCA por linha | sim | não | sim |
| Validar / solicitar ajustes | não | sim | sim |
| Ver todos | dele | todos | todos |
| Exportar PDF | sim | sim | sim |

### 5. Compatibilidade

- Planos antigos aparecem dentro do planejamento bimestral correspondente (criado pelo backfill).
- Aprovação antiga aula-por-aula continua funcionando, mas a UI nova trabalha pela validação do planejamento.
- O link da Agenda para o plano de uma aula específica continua válido (abre a linha correspondente na planilha).

### 6. Arquivos

**Migração**: criar `planejamentos_bimestrais` + colunas em `planos_aula`/`plano_anexos` + backfill + RLS/GRANTs.

**Novos**:
- `src/pages/PlanoAula.tsx` (reescrito; mantém o nome de rota `/plano-aula`)
- `src/components/plano/ListaPlanejamentos.tsx`
- `src/components/plano/PlanilhaPlanejamento.tsx`
- `src/components/plano/CelulaEditavel.tsx`
- `src/components/plano/AnexosLinha.tsx`
- `src/hooks/use-planejamento.ts`

**Editados**:
- `src/lib/planoPdf.ts` (nova função)
- `src/integrations/supabase/types.ts` (auto)

### 7. Fora do escopo
- Não toco em Notas, Agenda, Provas, PDI.
- Não removo nenhuma coluna existente de `planos_aula`.

Posso começar?
