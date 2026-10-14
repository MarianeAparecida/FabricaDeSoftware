# Envio de e-mails (SMTP externo)

> [BE] Integrar o sistema de envio de e-mails do banco de dados com um serviço SMTP externo · 14/10/2026.
> Script: [`scripts/configurar-smtp.mjs`](../scripts/configurar-smtp.mjs) ·
> Template: [`supabase/templates/recuperacao.html`](../supabase/templates/recuperacao.html) ·
> Testes: [`scripts/configurar-smtp.test.mjs`](../scripts/configurar-smtp.test.mjs) (`npm run smtp:test`)

## Como o e-mail sai hoje

```
App (recuperar senha) ──▶ Edge Function send-email ──▶ Supabase Auth ──▶ SMTP ──▶ caixa do paciente
                           (acha o e-mail pelo CPF)     resetPasswordForEmail
```

Quem envia é o **Supabase Auth**. Sem SMTP próprio, o projeto usa o servidor de testes do Supabase, que só
entrega para membros da organização e permite poucos e-mails por hora. Com o SMTP externo ligado, o Auth passa
a entregar para qualquer paciente, com o remetente e o template do AgendaSUS.

| Ambiente | Para onde vai o e-mail |
|---|---|
| Local (`npm run db:start`) | Mailpit: http://127.0.0.1:54324 (nada sai para a internet) |
| Nuvem (`szbcloiswybqiwyyejdj`) | SMTP externo configurado por `npm run smtp:configurar` |

O assunto e o HTML do e-mail de recuperação ficam no repositório (`[auth.email.template.recovery]` em
`supabase/config.toml`). O ambiente local e a nuvem usam o mesmo template.

## Servidor SMTP atual

Situação em 14/10/2026: o projeto da nuvem já envia pelo **Gmail** da equipe (`smtp.gmail.com:587`, nome
"AgendaSUS"), configurado pelo painel. Os logs do Auth confirmam a entrega (`POST /auth/v1/recover` → 200), então
ele foi mantido. Para conferir a qualquer momento: `npm run smtp:configurar -- --status`.

**Alternativa pronta:** enquanto o AgendaSUS não tem domínio e caixa próprios, dá para trocar para a caixa do
**SetupBarato** na Hostinger (`smtp.hostinger.com`, porta 465/SSL) preenchendo `.env.smtp` e rodando o script.
O remetente (`SMTP_ADMIN_EMAIL`) precisa ser a própria caixa autenticada ou um alias dela; a Hostinger recusa
outros endereços. Atenção: trocar o SMTP descarta a senha de app do Gmail (a API não a devolve).

Quando houver domínio próprio, basta trocar as variáveis em `.env.smtp` e rodar o script de novo.

## Configurar o projeto da nuvem

1. Gere um **Personal Access Token** em https://supabase.com/dashboard/account/tokens (Account → Access Tokens →
   Generate new token). As chaves anon, service_role, `sb_publishable` e `sb_secret` **não servem**: elas acessam
   só a API de dados, não a Management API.
2. Copie `.env.smtp.example` para `.env.smtp` (fica fora do git) e preencha o token e as credenciais SMTP.
3. Confira o que será enviado (senha mascarada):
   ```bash
   npm run smtp:configurar -- --dry-run
   ```
4. Aplique e confira:
   ```bash
   npm run smtp:configurar
   npm run smtp:configurar -- --status
   ```

O script altera **somente** os campos de SMTP, o limite de e-mails por hora (padrão 30) e o template de
recuperação. `site_url`, URLs de redirecionamento e demais configurações do Auth ficam como estão.

Para manter o SMTP atual e só publicar o e-mail em português (assunto + HTML):

```bash
npm run smtp:configurar -- --so-template --dry-run   # confere
npm run smtp:configurar -- --so-template             # aplica
```

Alternativa sem token: painel do Supabase → Authentication → Emails → SMTP Settings, preenchendo os mesmos
valores de `.env.smtp`.

## Recuperação de senha pela web (US-11)

Para onde o link do e-mail leva:

| Quem pede | `redirectTo` enviado | Link do e-mail abre |
|---|---|---|
| App (Android/iOS) | nenhum | `agendasus://recuperarSenha/alterar` (padrão, inalterado) |
| Web | `<origem>/recuperarSenha/alterar` | a própria versão web |

- O cliente monta o pedido em [`src/services/recuperacaoSenha.ts`](../src/services/recuperacaoSenha.ts).
- A Edge Function `send-email` **da nuvem** (v27) só aceita destinos de uma lista fixa (hoje
  `https://agendasus.147.93.36.47.sslip.io/recuperarSenha/alterar`, ampliável pelo secret
  `RESET_REDIRECT_URLS_WEB`); qualquer outro valor cai no deep link. Ela também responde CORS, exigido pelo navegador.
- O destino precisa estar em Authentication → URL Configuration → Redirect URLs (`uri_allow_list`), junto com o
  deep link do app.
- Link expirado ou já usado: o Supabase devolve `#error_code=otp_expired`; a tela `alterar` mostra "Este link de
  recuperação expirou ou já foi usado..." e leva de volta para pedir um novo e-mail.
- Na web, `Alert.alert` não faz nada; as telas de recuperação usam [`src/utils/alerta.ts`](../src/utils/alerta.ts).

Atenção: a `send-email` publicada na nuvem **não é** a mesma de `supabase/functions/send-email` (a do repositório é
a versão do ambiente local, que redireciona para `localhost:8081`). Não publique a do repositório na nuvem sem
antes unificar as duas, ou o link do app deixa de abrir o aplicativo.

Validação ponta a ponta feita em 14/10/2026 na nuvem (usuário temporário, removido ao final): link gerado aponta
para a web com token de recuperação; senha nova aceita; senha antiga recusada no `login-paciente`; segundo uso do
mesmo link recusado com `otp_expired`.

## Testar

- Unitário (sem rede): `npm run smtp:test`.
- Ponta a ponta na nuvem: no app, "Esqueci minha senha" com o CPF de um paciente cujo e-mail você acessa. Se não
  chegar, veja Logs → Auth no painel do Supabase (erros de SMTP aparecem lá, ex.: autenticação recusada).
