# Relatorio de correcao das migrations Supabase

Data: 2026-09-30

## Objetivo

Corrigir a falha ao subir o Supabase local do zero:

```txt
ERROR: relation "public.unidade_saude" does not exist (SQLSTATE 42P01)
Migration: 20260930_us01_grade_atendimento_rpc.sql
```

## Alteracoes realizadas

1. A migration da US-01 foi renomeada para entrar na ordem correta:

```txt
de:   supabase/migrations/20260930_us01_grade_atendimento_rpc.sql
para: supabase/migrations/20260930190000_us01_grade_atendimento_rpc.sql
```

2. O comentario de execucao manual via SQL Editor foi removido da migration US-01, pois o arquivo esta dentro de `supabase/migrations` e deve rodar automaticamente.

3. O `seed.sql` foi alinhado com o schema inicial:

```sql
-- antes
insert into public.disponibilidade (id_medicamento, id_unidade_saude, unidades_disponiveis)

-- depois
insert into public.disponibilidade (id_medicamento, id_unidade, unidades_disponiveis)
```

## Ordem esperada das migrations

```txt
20260930000000_schema_inicial.sql
20260930120000_revisao_rls.sql
20260930180000_data_hora_com_fuso.sql
20260930190000_us01_grade_atendimento_rpc.sql
20260930210000_portal_servidor.sql
20260930220000_us02_disponibilidade_por_profissional.sql
20260930223000_us03_concorrencia_agendamento.sql
```

Essa ordem garante que:

- `unidade_saude` e `profissional` existam antes da US-01.
- `unidade_saude.fuso_horario` exista antes da funcao `buscar_disponibilidade_agenda`.
- US-02 e US-03 continuem podendo sobrescrever/evoluir a funcao criada pela US-01.

## Validacoes executadas

Passou:

- Listagem ordenada de `supabase/migrations` confirmou a nova ordem.
- Busca por referencias antigas nao encontrou:
  - `20260930_us01`
  - `id_unidade_saude`
  - `Copie e cole este arquivo no SQL Editor`

Nao executado completamente neste ambiente:

- `npm.cmd run build`: o projeto nao possui script `build`.
- `npx.cmd tsc --noEmit`: falhou por incluir Edge Functions Deno (`Deno`, imports `npm:` e imports `.ts`) no TypeScript Node do app. Nao indica erro nas migrations.
- `npm.cmd run db:status`: falhou porque Docker/Podman nao esta instalado ou nao esta no PATH deste ambiente.

## Proximo passo recomendado

Em uma maquina com Docker Desktop aberto e disponivel no PATH, validar com:

```bash
npm run db:reset
npm run db:test
npm run db:status
```

Se `db:reset` passar, copiar o `ANON_KEY` exibido em `db:status` para `.env.local`.

Para Android Emulator:

```txt
EXPO_PUBLIC_SUPABASE_URL=http://10.0.2.2:54321
```

Para web/iOS simulator:

```txt
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
```
