# Agenda Escolar Anual — PEI

Construir um módulo único de **Agenda/Calendário** que substitui tabelas externas (Word/planilhas) e integra rotina do professor, agenda da gestão e apoio presencial. Nenhum dado existente é apagado.

---

## 1. Modelo de dados (novas tabelas)

### `horario_grade` — grade fixa PEI (compartilhada)
Blocos pré-configurados de 07:00 às 16:30 (aulas de 50min começando 07:30, mais intervalo, almoço, ATPC, planejamento).
- `id`, `ordem`, `rotulo` ("1ª aula", "Intervalo", "ATPC"...), `hora_inicio`, `hora_fim`, `tipo` (`aula | intervalo | almoco | planejamento | atpc | reuniao | outro`)
- Seed automático com a grade PEI padrão.

### `agenda_professor` — rotina semanal fixa de cada professor
- `user_id`, `dia_semana` (0–6), `horario_grade_id`, `disciplina_id` (nullable), `turma_id` (nullable), `atividade` (texto livre, ex.: "Planejamento"), `cor` (herda da disciplina)
- Único por (`user_id`, `dia_semana`, `horario_grade_id`)
- Esta é a fonte do "ano inteiro": o frontend projeta cada (dia_semana, horario) sobre todas as datas do ano letivo.

### `agenda_excecoes` — alterações pontuais ou em sequência futura
- `user_id`, `data` (date), `horario_grade_id`, `disciplina_id`, `turma_id`, `atividade`, `cancelado` (bool), `observacao`
- Sobrescreve a rotina fixa apenas naquela data. "Alterar sequência futura" = inserir múltiplas exceções a partir de uma data.

### `agenda_escola_eventos` — agenda geral da escola (gestão)
- `criado_por`, `titulo`, `descricao`, `tipo` (`reuniao | formacao | evento | avaliacao_externa | conselho | apoio_presencial | acompanhamento | observacao | visita | aviso`), `data_inicio` (timestamptz), `data_fim` (timestamptz), `dia_todo` (bool), `cor`
- Visível para todos os professores (RLS: SELECT para authenticated; INSERT/UPDATE/DELETE só para `is_gestao`).

### `apoio_presencial` — caso especial de evento
- `criado_por`, `data`, `horario_grade_id`, `professor_id` (acompanhado), `responsavel_id` (gestão), `observacao`
- Aparece tanto na agenda da escola quanto na agenda individual do `professor_id`.
- RLS: gestão CRUD; professor envolvido pode SELECT seus próprios.

### `ano_letivo`
- `ano` (int), `data_inicio`, `data_fim`, `ativo` (bool)
- Define o intervalo a projetar nas visões anual/mensal.

GRANTs explícitos para `authenticated` e `service_role` em todas, RLS habilitada com policies acima.

---

## 2. Página `src/pages/Agenda.tsx` (substitui/expande o calendário atual)

Tabs no topo:
- **Minha Agenda** (professor e gestão)
- **Agenda da Escola** (todos veem; gestão edita)
- **Apoio Presencial** (gestão gerencia; professor vê os seus)
- **Configurar Rotina** (professor define a semana-base uma única vez)

Seletor de visualização: **Dia / Semana / Mês / Ano**.

### Visão Semanal (principal)
Grade tipo planilha: linhas = blocos de `horario_grade`, colunas = seg–sex. Cada célula mostra disciplina + turma com a cor da matéria. Clique abre painel lateral.

### Visão Diária
Lista vertical dos blocos do dia com cards maiores e botões de plano de aula.

### Visão Mensal
Calendário tradicional com chips coloridos por dia (eventos da escola + apoios presenciais + contagem de aulas).

### Visão Anual
12 mini-meses, destacando feriados, eventos da escola e dias com apoio presencial.

### Configurar Rotina (aba dedicada)
Mesma grade semanal mas em modo de edição: para cada (dia, bloco) o professor escolhe disciplina + turma (selects que puxam de `disciplinas` e `turmas` já cadastradas) ou marca como "Planejamento/ATPC/livre". Salva em `agenda_professor`. Botão "Replicar segunda para todos os dias úteis" como atalho.

### Painel ao clicar numa aula
Mostra disciplina, turma, horário, data. Botões:
- **Criar plano de aula** → abre `PlanoAula` pré-preenchido
- **Ver plano** se existir
- Badge de status: `sem plano | pendente | aprovado | ajustado` (consulta `planos_aula` por turma+disciplina+data)
- **Alterar esta aula** (cria exceção da data) / **Alterar a partir desta data** (cria exceções até fim do ano)

---

## 3. Integração com módulos existentes

- **Matérias**: cor do card vem de `disciplinas.cor`.
- **Turmas**: select de turmas do professor.
- **Planos de aula**: lookup por `(turma_id, disciplina_id, data)` — link bidirecional.
- **Sidebar**: item "Agenda" já existe (ou adicionar) apontando para `/agenda`.

---

## 4. Permissões

| Ação | Professor | Gestão (coord/direção/vice) | Admin |
|---|---|---|---|
| Ver/editar própria rotina | sim | sim | sim |
| Ver agenda da escola | sim | sim | sim |
| Criar evento da escola | não | sim | sim |
| Criar apoio presencial | não | sim | sim |
| Ver apoio presencial ligado a si | sim | sim | sim |
| Ver agenda de outros professores | não | sim (filtros) | sim |

---

## 5. Exportação PDF
Usar `jsPDF` (já presente) para: agenda semanal do professor, agenda mensal, lista de apoio presencial, lista de eventos. Botão "Exportar PDF" em cada visão.

---

## 6. Detalhes técnicos

- Projeção da rotina: no frontend, dado um intervalo `[inicio, fim]`, iterar dias e mapear `dia_semana` → linhas de `agenda_professor`, sobrescrevendo com `agenda_excecoes` quando houver para aquela data.
- Sem cron job: tudo é projetado on-demand a partir das duas tabelas.
- Hook `useAgenda(intervalo)` centraliza fetch + merge.
- Seed da `horario_grade` PEI feito na própria migration.
- Seed do `ano_letivo` atual (2026) criado automaticamente.

---

## 7. Arquivos a criar/editar

**Migrations (1 só)**: criar tabelas, GRANTs, RLS, policies, seeds.

**Novos**:
- `src/pages/Agenda.tsx`
- `src/components/agenda/GradeSemanal.tsx`
- `src/components/agenda/VisaoMensal.tsx`
- `src/components/agenda/VisaoAnual.tsx`
- `src/components/agenda/VisaoDiaria.tsx`
- `src/components/agenda/ConfigurarRotina.tsx`
- `src/components/agenda/PainelAula.tsx`
- `src/components/agenda/AgendaEscola.tsx`
- `src/components/agenda/ApoioPresencial.tsx`
- `src/hooks/use-agenda.ts`
- `src/lib/agendaPdf.ts`

**Editados**:
- `src/App.tsx` (rota `/agenda`)
- `src/components/Sidebar.tsx` (item Agenda)

---

## 8. Fora do escopo (avisar)
- Nenhum dado é apagado.
- Não troco o módulo de Planos de Aula — apenas integro via links.
- Feriados nacionais não são importados automaticamente nesta versão (gestão pode lançar como evento "aviso/feriado").

Pronto para implementar?
