# Variáveis de ambiente e segredos

> US-21 · 30/09/2026.
> Modelos: [`.env.example`](../.env.example) (app) · [`supabase/functions/.env.example`](../supabase/functions/.env.example) (Edge Functions) ·
> Build: [`eas.json`](../eas.json) ·
> Verificação: [`scripts/verificar-credenciais.js`](../scripts/verificar-credenciais.js) (`npm run check:credenciais`)

**Regra:** nenhuma URL nem chave de serviço fica escrita no código. O código só lê variáveis; os valores ficam fora do git: em `.env.local` e `supabase/functions/.env` na máquina de cada um, e nos ambientes do EAS e nos segredos do Supabase para builds e produção.

## Variáveis

| Variável | Quem usa | Na sua máquina | Build no EAS / produção | É segredo? |
|---|---|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | App ([`src/services/supabase.ts`](../src/services/supabase.ts)) | `.env.local` | Ambiente do EAS, visibilidade `plaintext` | Não |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | App | `.env.local` | Ambiente do EAS, visibilidade `sensitive` | Não: vai dentro do app, e os dados são protegidos pelas [políticas de acesso](politicas-de-acesso.md) |
| `RESET_REDIRECT_URL` | Edge Function `send-email` | `supabase/functions/.env` | `npx supabase secrets set` | Não |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | Injetadas pelo `npm run db:start` | Injetadas pelo Supabase hospedado | **Sim** (`service_role` ignora o RLS) |

Tudo que começa com `EXPO_PUBLIC_` é trocado pelo valor na hora de gerar o app, então fica legível para quem instalar o app. Por isso:

- **Nunca** coloque a `service_role` (ou qualquer segredo) numa variável `EXPO_PUBLIC_`. Segredos de verdade ficam só no servidor, nas Edge Functions.
- No EAS, a visibilidade `secret` não protegeria nada nessas variáveis (o valor vai dentro do app). Use `sensitive` para a chave anon, que só esconde o valor nos logs e no painel.

## Na sua máquina (novo integrante)

1. `cp supabase/functions/.env.example supabase/functions/.env`. Os valores padrão já servem para rodar localmente.
2. `npm run db:start`. Ele carrega o `supabase/functions/.env` sozinho; se mudar o arquivo depois, rode `npm run db:stop` e `npm run db:start` de novo.
3. `cp .env.example .env.local` e preencha com os valores de `npx supabase status -o env` (`API_URL` e `ANON_KEY`). O `.env.example` explica qual URL usar no emulador Android e no celular.

`.env`, `.env.local` e afins estão no `.gitignore`; só os `.env.example` vão para o git.

## Build no EAS

Cada perfil do `eas.json` lê as variáveis de um ambiente do EAS (campo `environment`):

| Perfil | Ambiente do EAS | Observação |
|---|---|---|
| `development` | `development` | Development client |
| `preview` | `preview` | Usado pelo workflow [`.eas/workflows/build-dev.yml`](../.eas/workflows/build-dev.yml) (push na `dev`) |
| `apk` | `preview` | APK para instalar direto no aparelho |
| `production` | `production` | Loja |

Para cadastrar os valores (uma vez por ambiente; precisa de acesso ao projeto `agendasus` no expo.dev e do eas-cli atualizado, `npm i -g eas-cli`):

```sh
eas login
eas env:set --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value "<URL do projeto Supabase>" --visibility plaintext
eas env:set --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<chave anon>" --visibility sensitive
eas env:list preview --include-sensitive   # confere
```

Repita com `--environment development` e `--environment production` (pode repetir a flag para gravar em vários ambientes de uma vez). Também dá para cadastrar pelo painel: expo.dev → projeto → **Environment variables**. Use a URL e a chave de um projeto Supabase que o celular alcance (hospedado, com `https`): `127.0.0.1` e `10.0.2.2` só existem no seu computador e no emulador.

Como a build lê os valores:

1. O EAS coloca as variáveis do ambiente do perfil no servidor de build. O `.env.local` **não** é enviado (está no `.gitignore`), então os valores só podem vir do EAS.
2. No começo da build, o script `eas-build-pre-install` do `package.json` roda `scripts/verificar-credenciais.js`. Se faltar `EXPO_PUBLIC_SUPABASE_URL` ou `EXPO_PUBLIC_SUPABASE_ANON_KEY`, a build para ali, dizendo qual variável falta, em qual ambiente, e o comando para cadastrá-la. Sem essa checagem, a build terminaria e o app fecharia ao abrir.
3. O bundler embute os valores no app.

## Edge Functions no projeto hospedado

`SUPABASE_URL` e as chaves são injetadas pelo Supabase. O resto é cadastrado como segredo:

```sh
npx supabase secrets set RESET_REDIRECT_URL="<URL da tela recuperarSenha/alterar do app publicado>"
npx supabase secrets list
```

A mesma URL precisa estar em **Authentication → URL Configuration → Redirect URLs** no painel do Supabase (localmente, em `additional_redirect_urls` do `supabase/config.toml`). Se `RESET_REDIRECT_URL` não estiver definida, a função `send-email` não sobe e registra no log qual variável falta.

## Verificação automática

`npm run check:credenciais` olha os arquivos versionados e os novos ainda não commitados (ignora o que está no `.gitignore`, como o `.env.local`):

- **Qualquer arquivo:** token JWT (formato antigo das chaves anon e `service_role` do Supabase), chave nova do Supabase (prefixos `sb_publishable` e `sb_secret`), URL de projeto `*.supabase.co` e chave privada (`BEGIN ... PRIVATE KEY`).
- **Código** (`.js`, `.ts`, `.tsx`...): qualquer URL `http://` ou `https://`, até em comentário. Endereços de exemplo ficam nos `.env.example` e na documentação.

Ele roda sozinho no começo de toda build do EAS, então uma credencial escrita no código também impede a build.

## Critérios de aceitação

| Critério | Como é atendido |
|---|---|
| O código não tem URL nem chave de serviço escrita | App e Edge Functions só leem variáveis. O endereço fixo que o `send-email` usava como padrão foi removido. `npm run check:credenciais` confere isso e roda em toda build do EAS. |
| Quem clona sabe quais variáveis configurar | `.env.example` (app) e `supabase/functions/.env.example` (Edge Functions) dizem de onde vem cada valor; passo a passo acima e no README. |
| A build no EAS lê as variáveis dos segredos configurados | Cada perfil do `eas.json` aponta para um ambiente do EAS. A build falha logo no início se uma variável obrigatória não estiver cadastrada. |

## Histórico do git

As versões de `src/services/supabase.ts` anteriores ao commit `33b6fde` têm a URL e a chave anon do projeto Supabase original escritas no código. Esse projeto não existe mais (o endereço não responde), então a chave não dá acesso a nada, e o histórico não foi reescrito.

Se uma chave de um projeto ativo for commitada por engano, **troque a chave** no painel do Supabase. Apagar do código não basta: ela continua no histórico do git.
