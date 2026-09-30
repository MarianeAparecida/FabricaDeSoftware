# Portal da unidade (servidores das UBS)

> US-06 · 30/09/2026.
> Implementação: [`supabase/migrations/20260930210000_portal_servidor.sql`](../supabase/migrations/20260930210000_portal_servidor.sql) ·
> Telas: [`app/portal/`](../app/portal) · Serviço: [`src/services/portal.ts`](../src/services/portal.ts) ·
> Testes: [`supabase/tests/database/portal.test.sql`](../supabase/tests/database/portal.test.sql) (`npm run db:test`)

Área para os servidores das unidades operarem a agenda: **http://localhost:8081/portal** (também acessível pelo link "Sou servidor da unidade" na tela de login do app).

## Contas de teste (seed)

| E-mail | Senha | Unidade | Perfil | Situação |
|---|---|---|---|---|
| `recepcao.dv@agendasus.dev` | `Servidor@123` | UBS Centro - Dois Vizinhos | atendente | ativo |
| `gestor.central@agendasus.dev` | `Servidor@123` | UBS Central | gestor | ativo |
| `inativo.central@agendasus.dev` | `Servidor@123` | UBS Central | atendente | **sem vínculo ativo** (login recusado) |

O seed também cria o paciente **José Pereira** (sem conta no app) com consultas hoje e amanhã em Dois Vizinhos e hoje na UBS Central, para a agenda ter volume.

## Perfis

| Pode… | atendente | gestor |
|---|---|---|
| Ver a agenda da **própria** unidade (qualquer dia) | ✅ | ✅ |
| Confirmar, marcar realizada/faltou, cancelar consulta da própria unidade | ✅ | ✅ |
| Ver a equipe (servidores) da própria unidade | ❌ | ✅ |
| Ver qualquer coisa de **outra** unidade | ❌ | ❌ |

Na agenda, o paciente aparece com nome (ou nome social), **CPF mascarado** (`***.654.321-**`, suficiente para conferir o documento no balcão) e telefone. Endereço, cartão SUS e data de nascimento não saem do banco.

Transições de status pelo portal: `agendada → confirmada | cancelada` e `confirmada → realizada | faltou | cancelada`. Consultas já realizadas, faltosas ou canceladas não mudam.

## Como a segurança funciona

Três camadas independentes:

1. **Login (hook do Supabase Auth).** `custom_access_token_hook` roda antes de qualquer token ser emitido. Se o usuário é servidor com `ativo = false`, o token é recusado com 403 e a mensagem "Servidor sem vínculo ativo…". Vale para o login pelo portal, para chamadas diretas à API de autenticação e para a **renovação** do token (sessão aberta morre em até 1 hora).
2. **Dados só por funções do banco.** O portal não lê tabelas: usa `portal_meu_perfil`, `portal_agenda`, `portal_atualizar_status` e `portal_equipe`. Cada uma chama `exigir_servidor()`, que confere **a cada chamada** se o usuário logado é servidor com vínculo ativo (e, em `portal_equipe`, perfil gestor), e filtra tudo pela unidade dele. Quem não é servidor recebe `42501` (acesso negado). Consulta de outra unidade é tratada como "não encontrada", para não revelar que existe.
3. **Sem acesso direto.** A tabela `servidor` tem RLS sem políticas e nenhum privilégio para o app. Servidor não é paciente, então as políticas de `paciente`/`consulta` (US-20) não mostram nada a ele.

Nas telas, `app/portal/index.tsx` mostra "Acesso negado" para quem está logado mas não é servidor (ex.: paciente) e manda para `/portal/login` quem não está logado. Isso é só a interface; quem garante o acesso é o banco.

### Desativar um servidor

```sql
update servidor set ativo = false where email = 'fulano@...';
```

Efeito imediato no portal (as funções negam na próxima chamada), e o login e a renovação do token passam a ser recusados.

### Cadastrar um servidor

Ainda não há tela; é feito pela `service_role` (Studio ou SQL): criar o usuário em Authentication e depois

```sql
insert into servidor (auth_user_id, unidade_saude_id, nome, email, matricula, perfil)
values ('<id do usuário>', <id da unidade>, 'Nome', 'email@...', 'MAT-001', 'atendente');
```

Use uma conta **separada** da conta de paciente da mesma pessoa.

## Critérios de aceitação ↔ testes

| Critério | Banco (pgTAP, `portal.test.sql`) | API real e interface |
|---|---|---|
| Servidor autenticado vê apenas dados da unidade à qual está vinculado | Servidores A e B veem só a agenda da própria unidade; A não altera consulta de B; não leem `consulta`, `paciente` nem `servidor` direto; atendente não vê equipe; gestor vê só a equipe da unidade dele | Atendente de Dois Vizinhos vê as 2 consultas de lá e não a da UBS Central; confirma consulta; gestor da UBS Central vê só a consulta e a equipe de lá |
| Paciente autenticado tentando acessar o portal tem acesso negado | As 4 funções do portal devolvem `42501` para paciente e anônimo | Paciente logado abrindo `/portal` vê "Acesso negado", sem dados; paciente usando e-mail/senha no login do portal é recusado |
| Servidor sem vínculo ativo tem o login recusado | O hook recusa token para servidor inativo e emite para ativo e paciente; servidor desativado com sessão aberta é negado na hora e não renova o token | Login real do inativo volta 403 com a mensagem; na tela, a mensagem aparece e ele continua no login |

## Configuração fora do ambiente local

O hook está ativado em `supabase/config.toml` (`[auth.hook.custom_access_token]`). No Supabase hospedado, ative em **Authentication → Hooks → Customize Access Token**, apontando para `public.custom_access_token_hook`.

## Limitações conhecidas

- **Sessão no mesmo navegador:** app do paciente e portal compartilham a sessão do Supabase. Entrar no portal encerra a sessão de paciente **naquele aparelho** (não nos outros), e vice-versa.
- **No celular**, a sessão do portal não fica salva ao fechar o app. O portal foi pensado para o computador da recepção (web).
- Um servidor tem **uma** unidade. Quem trabalha em duas unidades precisa de duas contas, até existir uma história para vínculos múltiplos.
