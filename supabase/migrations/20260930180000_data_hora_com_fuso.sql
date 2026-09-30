-- US-04: data e hora com fuso horário definido.
-- Documentação: docs/data-e-hora.md
--
-- Antes: consulta.data_hora era "timestamp" (sem fuso). O valor "14:00" não dizia de
-- onde era, e cada aparelho o interpretava no próprio fuso.
-- Agora: data_hora é "timestamptz" (um instante absoluto) e cada unidade de saúde
-- tem seu fuso. O app grava com o deslocamento explícito (ex.: 14:00-03:00) e exibe
-- sempre no fuso da unidade, então 14:00 em Dois Vizinhos aparece 14:00 em qualquer
-- aparelho.

-- ---------------------------------------------------------------------------
-- 1. Fuso horário de cada unidade
-- ---------------------------------------------------------------------------

-- Aceita apenas nomes da base IANA conhecidos pelo Postgres (ex.: America/Sao_Paulo).
-- Marcada IMMUTABLE para poder ser usada em CHECK; a base de fusos só muda com
-- atualização do Postgres.
create or replace function public.fuso_valido(p_fuso text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
    perform now() at time zone p_fuso;
    return p_fuso !~ '^[+-]?\d' and p_fuso ~ '/';  -- exige nome de região, não "UTC-3"
exception when others then
    return false;
end;
$$;

revoke execute on function public.fuso_valido(text) from public, anon, authenticated;

comment on function public.fuso_valido(text) is
    'Valida nome de fuso IANA (ex.: America/Sao_Paulo). Usada no CHECK de unidade_saude.';

alter table public.unidade_saude
    add column fuso_horario text not null default 'America/Sao_Paulo'
        constraint unidade_saude_fuso_valido check (public.fuso_valido(fuso_horario));

comment on column public.unidade_saude.fuso_horario is
    'Fuso IANA da unidade. Horários de consulta são exibidos neste fuso, não no do aparelho.';

-- ---------------------------------------------------------------------------
-- 2. Conversão de consulta.data_hora para timestamptz
-- ---------------------------------------------------------------------------

-- Os valores antigos são o horário de parede visto pelo paciente na unidade. Todas as
-- unidades existentes ficaram com America/Sao_Paulo acima, então "at time zone
-- 'America/Sao_Paulo'" preserva exatamente o horário percebido (14:00 continua 14:00
-- na unidade). O índice único de horário é recriado automaticamente pelo ALTER.
alter table public.consulta
    alter column data_hora type timestamptz
    using data_hora at time zone 'America/Sao_Paulo';

-- Compatibilidade com versões antigas do app, que ainda enviam "2026-10-15T14:00:00" sem
-- deslocamento: para os papéis do app, valor sem fuso é lido como horário de Brasília
-- (e não UTC, o que adiantaria a consulta em 3 horas). O PostgREST aplica essa
-- configuração ao assumir o papel; as respostas passam a vir com "-03:00".
alter role authenticated set timezone = 'America/Sao_Paulo';
alter role anon          set timezone = 'America/Sao_Paulo';

comment on column public.consulta.data_hora is
    'Instante da consulta (timestamptz). Gravar sempre com deslocamento explícito; '
    'exibir no fuso de unidade_saude.fuso_horario.';

-- ---------------------------------------------------------------------------
-- 3. horarios_ocupados: o "dia" passa a ser o dia no fuso da unidade
-- ---------------------------------------------------------------------------

drop function public.horarios_ocupados(date, bigint);

create function public.horarios_ocupados(p_data date, p_unidade_id bigint)
returns setof timestamptz
language sql
stable
security definer
set search_path = ''
as $$
    select c.data_hora
    from public.consulta c
    join public.unidade_saude u on u.id = c.unidade_saude_id
    where c.unidade_saude_id = p_unidade_id
      and c.status <> 'cancelada'
      and c.data_hora >= (p_data::timestamp       at time zone u.fuso_horario)
      and c.data_hora <  ((p_data + 1)::timestamp at time zone u.fuso_horario);
$$;

revoke execute on function public.horarios_ocupados(date, bigint) from public, anon;
grant  execute on function public.horarios_ocupados(date, bigint) to authenticated;

comment on function public.horarios_ocupados(date, bigint) is
    'Horários já ocupados de uma unidade num dia (dia no fuso da unidade), de qualquer '
    'paciente, devolvendo só o instante (sem paciente/especialidade). SECURITY DEFINER; '
    'só authenticated executa.';
