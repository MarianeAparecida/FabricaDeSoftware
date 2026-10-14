# Status da consulta

> US-08 · 14/10/2026.
> Interface do servidor: [`app/portal/index.tsx`](../app/portal/index.tsx) ·
> Histórico do paciente: [`app/servicos/historico.tsx`](../app/servicos/historico.tsx) ·
> Testes: [`supabase/tests/database/us08_status_consulta.test.sql`](../supabase/tests/database/us08_status_consulta.test.sql) (`npm run db:test`)

O servidor da UBS opera os status pelo portal da unidade. O fluxo permanece:

```text
agendada → confirmada → realizada
                      ↘ faltou
```

Consultas canceladas, realizadas ou marcadas como falta são estados finais e não podem ser alteradas novamente.

## Histórico do paciente

O histórico não deduz que uma consulta aconteceu apenas porque o horário passou. O rótulo depende do status efetivamente gravado:

| Status no banco | Rótulo no histórico |
|---|---|
| `realizada` | Realizada |
| `faltou` | Faltou |
| `cancelada` | Cancelada |
| `agendada` ou `confirmada`, com horário passado | Sem registro |

Uma consulta com status final aparece no histórico assim que o servidor registra o desfecho, mesmo que o horário previsto ainda não tenha passado.

## Critérios de aceitação

| Critério | Verificação |
|---|---|
| Servidor marca como realizada | O teste confirma a consulta, registra `realizada` pelo RPC e verifica o valor persistido na tabela. |
| Servidor marca falta | O teste confirma a consulta, registra `faltou` pelo RPC e verifica o valor persistido na tabela. |
| Consulta passada sem desfecho | A tela converte somente `realizada` para “Realizada”; consultas passadas ainda `agendada` ou `confirmada` exibem “Sem registro”. |

## Validação manual

1. Entre em `/portal` com uma conta de servidor.
2. Abra a agenda do dia, confirme uma consulta e marque-a como **Realizada**.
3. Entre no aplicativo com a conta do paciente e abra **Histórico**; a consulta deve aparecer como **Realizada**.
4. Repita com outra consulta e marque **Faltou**; o histórico deve mostrar **Faltou**.
5. Abra no histórico uma consulta passada que permaneça `agendada` ou `confirmada`; ela deve mostrar **Sem registro**.
