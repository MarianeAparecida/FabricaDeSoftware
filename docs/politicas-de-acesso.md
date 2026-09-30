# Políticas de acesso aos dados (RLS)

> US-20 · Revisão concluída em 30/09/2026.
> Implementação: [`supabase/migrations/20260930120000_revisao_rls.sql`](../supabase/migrations/20260930120000_revisao_rls.sql) ·
> Testes: [`supabase/tests/database/rls.test.sql`](../supabase/tests/database/rls.test.sql) (`npm run db:test`)

**Regra de ouro:** um paciente nunca lê nem altera dados de outro paciente, e quem não está logado não lê dado de paciente nenhum.

## Como o acesso é controlado

O app fala direto com o banco pela API do Supabase, então quem está do outro lado pode ser qualquer pessoa com a chave pública (que vai dentro do app). Por isso a proteção fica **no banco**, em duas camadas:

1. **Privilégios (`GRANT`)**: definem *quais operações e colunas* cada papel pode usar. Tudo começa negado e só o necessário é liberado.
2. **Row Level Security (políticas)**: definem *quais linhas* cada usuário alcança dentro do que o privilégio permite.

Se uma camada falhar (ex.: alguém apaga uma política por engano), a outra continua limitando o estrago.

| Papel | Quem é | Observação |
|---|---|---|
| `anon` | Qualquer pessoa sem login | Só lê catálogos públicos. |
| `authenticated` | Paciente logado; `auth.uid()` é o id dele | Só alcança as próprias linhas. |
| `service_role` | Edge Functions no servidor | **Ignora o RLS.** A chave nunca vai para o app. |

## Resumo por tabela

✅ permitido · 🔒 permitido só nas próprias linhas · ❌ negado

| Tabela | Papel | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|---|
| `paciente` | anon | ❌ | ❌ | ❌ | ❌ |
| | authenticated | 🔒 | ❌ | 🔒 só dados cadastrais | ❌ |
| `consulta` | anon | ❌ | ❌ | ❌ | ❌ |
| | authenticated | 🔒 | 🔒 só como `agendada` | 🔒 só para cancelar | ❌ |
| `unidade_saude` | anon / authenticated | ✅ | ❌ | ❌ | ❌ |
| `profissional` | anon / authenticated | ✅ | ❌ | ❌ | ❌ |
| `medicamento` | anon / authenticated | ✅ | ❌ | ❌ | ❌ |
| `disponibilidade` | anon / authenticated | ✅ | ❌ | ❌ | ❌ |
| `servidor` | anon / authenticated | ❌ | ❌ | ❌ | ❌ |

Servidores das unidades (US-06) não leem nenhuma dessas tabelas direto: o portal usa só as funções `portal_*` (abaixo), que devolvem dados da unidade do servidor.

Nenhum papel do app tem `TRUNCATE`, `TRIGGER` ou `REFERENCES`. Escritas nos catálogos só pela `service_role` (painel/seed).

## Detalhe por tabela

### `paciente`

Dados pessoais (CPF, e-mail, telefone, endereço, cartão SUS, nascimento).

| Política | Operação | Condição |
|---|---|---|
| `paciente le o proprio registro` | SELECT | `auth_user_id = auth.uid()` |
| `paciente atualiza o proprio registro` | UPDATE | `auth_user_id = auth.uid()` (antes e depois) |

- **Colunas editáveis pelo app:** `nome`, `nome_social`, `genero`, `telefone`, `endereco`, `cartao_sus`, `data_nascimento`.
- **Não editáveis:** `cpf`, `email` e `auth_user_id` são a identidade do paciente (o login busca o e-mail pelo CPF). Se o paciente pudesse trocá-los, poderia "ocupar" o CPF de outra pessoa ou quebrar o próprio login.
- **Criação:** só pela Edge Function `register-paciente`. O app não insere pacientes.
- **Exclusão:** não existe pelo app. Apagar o usuário em `auth.users` apaga o paciente em cascata.
- **Anônimo:** recebe `permission denied` (código `42501`), e não uma lista vazia.

### `consulta`

Agendamentos de cada paciente.

| Política | Operação | Condição |
|---|---|---|
| `paciente le as proprias consultas` | SELECT | `paciente_id = meu_paciente_id()` |
| `paciente agenda para si` | INSERT | `paciente_id = meu_paciente_id()` **e** `status = 'agendada'` |
| `paciente cancela as proprias consultas` | UPDATE | antes: própria e `status in ('agendada','confirmada')`; depois: própria e `status = 'cancelada'` |

- **Colunas que o app pode enviar ao agendar:** `paciente_id`, `profissional_id`, `unidade_saude_id`, `status`, `data_hora`, `especialidade`.
- **Coluna que o app pode alterar:** só `status`, e só para `cancelada`. Remarcar, confirmar ou marcar como realizada/faltou é papel da unidade de saúde (servidor), não do paciente.
- **Consulta cancelada não volta:** a política de UPDATE nem enxerga linhas já canceladas.
- **Horário duplicado:** o índice único `consulta_profissional_horario_unico_idx` impede duas consultas que ocupam agenda (`agendada`/`confirmada`) para o mesmo profissional, unidade e horário. O mesmo horário pode existir na mesma unidade para profissionais diferentes.
- **Anônimo:** `permission denied`.

### Catálogos: `unidade_saude`, `profissional`, `medicamento`, `disponibilidade`

Informação pública (as telas de unidades e de medicamentos funcionam antes do login).

| Política | Operação | Condição |
|---|---|---|
| `leitura publica` | SELECT | sempre (`true`), para `anon` e `authenticated` |

Não há privilégio de escrita para o app; cadastros e estoque são mantidos pela `service_role`.

### `servidor`

Servidores das unidades, com unidade, perfil (`atendente`/`gestor`) e vínculo (`ativo`). RLS ativo **sem políticas** e sem privilégio para `anon`/`authenticated`: ninguém do app lê a tabela. Cadastro e desativação pela `service_role`. Regras do portal em [portal-da-unidade.md](portal-da-unidade.md).

## Funções do banco (`SECURITY DEFINER`)

Rodam com permissão de administrador, então cada uma foi revisada para devolver só o mínimo:

| Função | Quem executa | O que devolve | Por que existe |
|---|---|---|---|
| `meu_paciente_id()` | authenticated | O `id` do paciente logado | Usada nas políticas de `consulta` sem depender do RLS de `paciente`. |
| `buscar_disponibilidade_agenda(unidade, profissional, data)` | anon / authenticated | Horários disponíveis da grade do profissional na unidade/data | Unidade, profissional e data são obrigatórios. Horários ocupados filtram apenas consultas `agendada`/`confirmada` do profissional escolhido, sem esconder opções livres de outros profissionais da mesma unidade. |
| `horarios_ocupados(data, unidade)` | authenticated | Só os horários (`timestamptz`) já ocupados, com o "dia" contado no fuso da unidade | Função legada/de apoio: não devolve paciente, especialidade nem status. |

| `portal_meu_perfil()`, `portal_agenda(dia)`, `portal_atualizar_status(consulta, status)` | authenticated, mas só **servidor ativo** passa | Dados do servidor; agenda da unidade dele (nome, CPF mascarado e telefone do paciente); mudança de status de consulta da unidade dele | Portal da unidade (US-06). Paciente e servidor inativo recebem `42501`. |
| `portal_equipe()` | authenticated, mas só **gestor ativo** passa | Servidores da unidade do gestor | Portal da unidade, perfil gestor. |
| `exigir_servidor(perfis)` | ninguém do app (uso interno) | O servidor ativo logado, ou erro `42501` | Checagem central usada por todas as `portal_*`. |
| `custom_access_token_hook(evento)` | só `supabase_auth_admin` | O token, ou erro 403 | Hook do Supabase Auth: recusa login e renovação de token para servidor sem vínculo ativo. |

Todas têm `search_path` fixo (vazio) e `EXECUTE` negado para `anon`.

## Edge Functions (servidor)

Usam a `service_role` e **ignoram o RLS**, então a proteção depende do código delas:

| Função | Cuidados |
|---|---|
| `login-paciente` | Mesma mensagem para "CPF não existe" e "senha errada", para não revelar quais CPFs estão cadastrados. |
| `register-paciente` | Cria o usuário e o paciente. Verificações usam `.eq()`, nunca filtros montados com texto do usuário (veja brecha 5). |
| `send-email` | Sempre responde sucesso, exista o CPF ou não. |

## Brechas encontradas e corrigidas nesta revisão

| # | Brecha | Risco | Correção |
|---|---|---|---|
| 1 | `anon` e `authenticated` tinham **todos** os privilégios em todas as tabelas, inclusive `TRUNCATE` (que o RLS não filtra) | Só o RLS protegia; sem defesa em profundidade | `REVOKE ALL` e `GRANT` só do necessário; tabelas novas nascem fechadas |
| 2 | Anônimo lendo `paciente`/`consulta` recebia lista vazia | Critério "acesso negado" não atendido; mascara erros | Sem privilégio → `permission denied` |
| 3 | Paciente podia alterar o próprio `cpf` e `email` | Ocupar o CPF de outra pessoa; quebrar o login | `GRANT UPDATE` só nas colunas cadastrais |
| 4 | Paciente podia agendar já `confirmada`, marcar como `realizada`, remarcar e apagar consultas | Burlar o fluxo da unidade de saúde | INSERT só `agendada`; UPDATE só `status → cancelada`; sem DELETE |
| 5 | `register-paciente` montava o filtro `.or(\`cpf.eq.${cpf},email.eq.${email}\`)` com o e-mail digitado | **Qualquer pessoa sem login descobria CPFs cadastrados dígito a dígito** (ex.: e-mail `x@y.z,cpf.like.1*`) | Duas buscas com `.eq()` |

## Critérios de aceitação ↔ testes

`npm run db:test` roda 32 verificações com usuários de teste próprios, numa transação desfeita no final:

| Critério | O que é testado |
|---|---|
| Paciente autenticado recebe só os próprios registros | Vê só as próprias consultas e o próprio cadastro, nem buscando pelo id de outro; não agenda, cancela nem edita nada de outro paciente; não altera CPF/e-mail/vínculo; não confirma, remarca, apaga nem reativa consultas |
| Não autenticado tem acesso negado a dados de pacientes | `permission denied` em `paciente`, `consulta`, `horarios_ocupados()` e `meu_paciente_id()`; catálogos continuam públicos |
| Toda tabela tem política documentada | Toda tabela do schema `public` tem RLS ativo, `COMMENT ON TABLE` e toda política tem `COMMENT ON POLICY`. **Uma tabela nova sem isso quebra o teste.** |

## Checklist para criar uma tabela nova

1. Criar a tabela numa migration nova em `supabase/migrations/`.
2. `alter table ... enable row level security;`
3. Criar as políticas (`create policy ...`) pensando em cada operação: quem pode, em quais linhas.
4. Conceder os privilégios. Tabelas novas nascem **sem** acesso para `anon`/`authenticated`, então conceda só o que o app usa (de preferência por coluna no `INSERT`/`UPDATE`).
5. `comment on table` e `comment on policy` explicando a regra.
6. Adicionar a tabela a este documento e casos em `supabase/tests/database/rls.test.sql`.
7. `npm run db:reset && npm run db:test`.

## Riscos conhecidos (aceitos por ora)

- **O cadastro revela se um CPF já existe** ("Este CPF já está cadastrado"). É inerente a um formulário de cadastro; mitigar exigiria confirmação por e-mail antes de responder.
- **Tentativas de senha:** o limite de tentativas do Supabase Auth é por IP, e todas as tentativas chegam pelo IP da Edge Function `login-paciente`. Em produção, vale limitar tentativas por CPF na própria função.
- **Ocupação de horários** é usada para calcular disponibilidade sem identificar pacientes. Na agenda por profissional, um horário ocupado por um profissional não bloqueia outro profissional da mesma unidade.
