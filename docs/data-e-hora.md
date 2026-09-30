# Data e hora com fuso horário

> US-04 · 30/09/2026.
> Implementação: [`supabase/migrations/20260930180000_data_hora_com_fuso.sql`](../supabase/migrations/20260930180000_data_hora_com_fuso.sql) ·
> [`src/utils/fusoHorario.ts`](../src/utils/fusoHorario.ts) ·
> Testes: [`supabase/tests/database/fuso_horario.test.sql`](../supabase/tests/database/fuso_horario.test.sql) (`npm run db:test`)

**Regra:** o horário de uma consulta é o horário **da unidade de saúde**. Agendada às 14:00 em Dois Vizinhos, ela aparece às 14:00 em qualquer aparelho, esteja ele em Dois Vizinhos, Manaus ou Lisboa.

## O problema que existia

`consulta.data_hora` era `timestamp` **sem fuso**. O banco guardava só "14:00", sem dizer de onde, e cada aparelho interpretava esse valor como horário **local dele**. O texto "14:00" aparecia igual, mas representava um instante diferente em cada aparelho: em Manaus a consulta "acontecia" 1 hora depois, e as contas de "já passou?" e "é hoje?" davam resultados diferentes conforme o aparelho. Além disso, "hoje" era calculado em UTC (`toISOString()`), então a partir das 21:00 em Brasília o app já considerava o dia seguinte.

Trocar só o banco para `timestamptz` não bastava: o app converte a hora para o fuso do aparelho. Medido no navegador com fuso emulado, com o banco já migrado:

| Aparelho em | App antigo | App novo |
|---|---|---|
| America/Sao_Paulo (Dois Vizinhos) | 14:00 | 14:00 |
| America/Manaus | **13:00** | 14:00 |
| Europe/Lisbon | **18:00** | 14:00 |
| Asia/Tokyo | não medido | 14:00 |

## Como funciona agora

```
paciente escolhe 15/10 14:00 na UBS de Dois Vizinhos
        │  paraIsoComFuso("2026-10-15", "14:00", "America/Sao_Paulo")
        ▼
app grava  "2026-10-15T14:00:00-03:00"     ← deslocamento explícito
        ▼
banco guarda o instante (timestamptz)  =  17:00 UTC
        ▼
banco devolve "2026-10-15T14:00:00-03:00"  (qualquer aparelho)
        │  noFuso(data_hora, fusoDaConsulta(c))  → { data: "2026-10-15", hora: "14:00" }
        ▼
tela mostra 15/10/2026 14:00
```

| Onde | O quê |
|---|---|
| `consulta.data_hora` | `timestamptz`: um instante absoluto, sem ambiguidade. |
| `unidade_saude.fuso_horario` | Nome IANA do fuso da unidade (padrão `America/Sao_Paulo`). Só aceita nomes de região válidos: `America/Manaus` sim, `UTC-3` não (deslocamento fixo ignora horário de verão). |
| `horarios_ocupados(dia, unidade)` | O "dia" é o dia **na unidade**: uma consulta às 22:30 do dia 10 em Dois Vizinhos (01:30 UTC do dia 11) conta no dia 10. |
| Papéis `anon` e `authenticated` | Fuso da sessão `America/Sao_Paulo`: respostas vêm com `-03:00`, e um valor enviado **sem** fuso é lido como horário de Brasília (veja "Compatibilidade"). |

## Regras para quem mexe no código

**Gravar:** sempre com deslocamento explícito, gerado a partir do fuso da unidade.

```ts
import { combinarDataHora } from "src/services/consultas";
combinarDataHora("2026-10-15", "14:00", unidade.fuso_horario); // "2026-10-15T14:00:00-03:00"
```

**Exibir:** sempre no fuso da unidade, nunca no do aparelho.

```ts
import { fusoDaConsulta } from "src/services/consultas";
import { noFuso } from "src/utils/fusoHorario";
const { data, hora } = noFuso(consulta.data_hora, fusoDaConsulta(consulta)); // "2026-10-15", "14:00"
```

Para isso, a consulta precisa vir com o fuso da unidade no `select`: `unidade_saude:unidade_saude_id (id, nome, endereco, fuso_horario)`. Sem ele, `fusoDaConsulta` usa `America/Sao_Paulo`.

**"Hoje":** `hojeNoFuso(fuso)`, e não `new Date().toISOString().split("T")[0]`, que devolve o dia em UTC.

**Evite com `data_hora`:** `.split("T")`, `toLocaleTimeString()` sem `timeZone`, `getHours()` e `getDate()`. Todos usam o fuso do aparelho ou do texto recebido.

**Comparar instantes está liberado:** `new Date(c.data_hora) >= new Date()` e ordenar por `data_hora` funcionam em qualquer fuso, porque o valor tem deslocamento.

`src/utils/fusoHorario.ts` usa só a API `Intl` do JavaScript, sem biblioteca nova, e trata horário de verão e fusos de meia hora.

## Migração dos registros antigos

Os valores antigos eram o horário que o paciente viu na unidade. Todas as unidades existentes recebem `America/Sao_Paulo`, e a migration converte com:

```sql
alter table consulta alter column data_hora type timestamptz
    using data_hora at time zone 'America/Sao_Paulo';
```

`at time zone` com nome de região usa as regras históricas. Registros da época do horário de verão (até 2019) também preservam o horário percebido.

Verificação feita no banco local antes e depois da migration: os 6 registros existentes, entre eles um "legado" de 14:00, mantiveram exatamente o horário percebido, e o de 14:00 passou a ser o instante 17:00 UTC. Para conferir em outro banco, rode antes e depois:

```sql
-- antes (coluna sem fuso)
select id, to_char(data_hora, 'YYYY-MM-DD HH24:MI') from consulta order by id;
-- depois (tem que dar o mesmo resultado)
select c.id, to_char(c.data_hora at time zone u.fuso_horario, 'YYYY-MM-DD HH24:MI')
from consulta c join unidade_saude u on u.id = c.unidade_saude_id order by c.id;
```

## Compatibilidade com versões antigas do app

Celulares que ainda não atualizaram continuam enviando `"2026-10-15T14:00:00"` sem fuso. Sem cuidado, o banco leria como 14:00 **UTC** e a consulta ficaria 3 horas adiantada (11:00 em Dois Vizinhos). Por isso os papéis `anon` e `authenticated` têm `timezone = America/Sao_Paulo`, e valor sem fuso é lido como horário de Brasília.

Limite: em uma unidade de **outro** fuso (ex.: Manaus), a versão antiga do app ainda gravaria com 1 hora de diferença. A versão nova sempre envia o deslocamento correto.

## Critérios de aceitação ↔ testes

| Critério | Como foi verificado |
|---|---|
| Agendado às 14:00 em Dois Vizinhos aparece 14:00 em outro aparelho | pgTAP: o mesmo registro lido com a sessão em São Paulo, Manaus, Lisboa e Tóquio dá sempre 10/05 14:00. Interface (Edge headless com fuso emulado): agendado às 14:00 por um aparelho em Manaus, exibido às 14:00 em Lisboa, Tóquio e São Paulo; o horário deixa de ser oferecido para aparelhos em Tóquio, Manaus e Lisboa. |
| Registro antigo sem fuso é convertido sem alterar o horário percebido | Banco local antes/depois da migration (acima). pgTAP: a conversão preserva o horário de parede, inclusive na virada de ano e no horário de verão de 2018. |
