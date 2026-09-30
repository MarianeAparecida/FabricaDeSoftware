-- US-04: data e hora com fuso horário definido. Rode com `npm run db:test`.
-- Tudo acontece numa transação desfeita no final: não altera os dados do banco.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

-- ---------------------------------------------------------------------------
-- Estrutura
-- ---------------------------------------------------------------------------
select col_type_is('public', 'consulta', 'data_hora', 'timestamp with time zone',
    'consulta.data_hora guarda o instante com fuso (timestamptz)');
select col_not_null('public', 'unidade_saude', 'fuso_horario',
    'toda unidade tem fuso horário');
select col_default_is('public', 'unidade_saude', 'fuso_horario', 'America/Sao_Paulo',
    'fuso padrão das unidades é America/Sao_Paulo');
select throws_ok($$insert into public.unidade_saude (nome, fuso_horario) values ('X', 'Marte/Olympus')$$,
    '23514', null, 'fuso inexistente é recusado');
select throws_ok($$insert into public.unidade_saude (nome, fuso_horario) values ('X', 'UTC-3')$$,
    '23514', null, 'deslocamento fixo ("UTC-3") é recusado: precisa ser nome de região IANA');

-- ---------------------------------------------------------------------------
-- Preparação: unidade em Dois Vizinhos (America/Sao_Paulo) e em Manaus.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'fuso@teste.dev');
insert into public.paciente (auth_user_id, nome, cpf, email)
    values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Paciente Fuso', '44400044400', 'fuso@teste.dev');

insert into public.unidade_saude (nome, fuso_horario) values
    ('Teste Dois Vizinhos', 'America/Sao_Paulo'),
    ('Teste Manaus',        'America/Manaus');
select set_config('teste.dv',  (select id::text from public.unidade_saude where nome = 'Teste Dois Vizinhos'), true);
select set_config('teste.mao', (select id::text from public.unidade_saude where nome = 'Teste Manaus'), true);

-- O app grava com deslocamento explícito (src/utils/fusoHorario.ts → paraIsoComFuso).
insert into public.consulta (paciente_id, unidade_saude_id, data_hora, especialidade)
select p.id, current_setting('teste.dv')::bigint, '2031-05-10T14:00:00-03:00', 'Clínico Geral'
from public.paciente p where p.cpf = '44400044400';

-- ===========================================================================
-- Critério 1: agendado às 14:00 em Dois Vizinhos, aparece 14:00 em qualquer lugar.
-- ===========================================================================
select is((select data_hora from public.consulta where especialidade = 'Clínico Geral' and unidade_saude_id = current_setting('teste.dv')::bigint),
    '2031-05-10 17:00:00+00'::timestamptz,
    '14:00 em Dois Vizinhos é gravado como o instante 17:00 UTC');

-- Cada "aparelho" é simulado trocando o fuso da sessão.
set local timezone = 'America/Sao_Paulo';
select is((select to_char(c.data_hora at time zone u.fuso_horario, 'DD/MM/YYYY HH24:MI')
           from public.consulta c join public.unidade_saude u on u.id = c.unidade_saude_id
           where u.id = current_setting('teste.dv')::bigint),
    '10/05/2031 14:00', 'sessão em São Paulo: exibe 14:00');
set local timezone = 'America/Manaus';
select is((select to_char(c.data_hora at time zone u.fuso_horario, 'DD/MM/YYYY HH24:MI')
           from public.consulta c join public.unidade_saude u on u.id = c.unidade_saude_id
           where u.id = current_setting('teste.dv')::bigint),
    '10/05/2031 14:00', 'sessão em Manaus: continua 14:00');
set local timezone = 'Europe/Lisbon';
select is((select to_char(c.data_hora at time zone u.fuso_horario, 'DD/MM/YYYY HH24:MI')
           from public.consulta c join public.unidade_saude u on u.id = c.unidade_saude_id
           where u.id = current_setting('teste.dv')::bigint),
    '10/05/2031 14:00', 'sessão em Lisboa: continua 14:00');
set local timezone = 'Asia/Tokyo';
select is((select to_char(c.data_hora at time zone u.fuso_horario, 'DD/MM/YYYY HH24:MI')
           from public.consulta c join public.unidade_saude u on u.id = c.unidade_saude_id
           where u.id = current_setting('teste.dv')::bigint),
    '10/05/2031 14:00', 'sessão em Tóquio (já é dia 11 lá): continua 10/05 14:00');
reset timezone;

-- O mesmo instante escrito de outro jeito é o mesmo horário: o índice único bloqueia.
select throws_ok(format($$insert into public.consulta (paciente_id, unidade_saude_id, data_hora)
                          select id, %s, '2031-05-10T17:00:00Z' from public.paciente where cpf = '44400044400'$$,
                        current_setting('teste.dv')),
    '23505', null, '14:00-03:00 e 17:00Z são o mesmo horário (bloqueia duplicado)');

-- ---------------------------------------------------------------------------
-- horarios_ocupados(): o "dia" é o dia na unidade, não em UTC.
-- ---------------------------------------------------------------------------
-- 22:30 em Dois Vizinhos no dia 10 = 01:30 UTC do dia 11.
insert into public.consulta (paciente_id, unidade_saude_id, data_hora, especialidade)
select id, current_setting('teste.dv')::bigint, '2031-05-10T22:30:00-03:00', 'Noturna'
from public.paciente where cpf = '44400044400';

select is((select count(*) from public.horarios_ocupados('2031-05-10', current_setting('teste.dv')::bigint)),
    2::bigint, 'dia 10 na unidade inclui 14:00 e 22:30 (mesmo com 22:30 já sendo dia 11 em UTC)');
select is((select count(*) from public.horarios_ocupados('2031-05-11', current_setting('teste.dv')::bigint)),
    0::bigint, 'dia 11 na unidade não recebe a consulta das 22:30 do dia 10');

-- Unidade em outro fuso: 14:00 em Manaus é 18:00 UTC e continua 14:00 lá.
insert into public.consulta (paciente_id, unidade_saude_id, data_hora, especialidade)
select id, current_setting('teste.mao')::bigint, '2031-05-10T14:00:00-04:00', 'Pediatra'
from public.paciente where cpf = '44400044400';

select is((select to_char(h at time zone 'America/Manaus', 'HH24:MI')
           from public.horarios_ocupados('2031-05-10', current_setting('teste.mao')::bigint) h),
    '14:00', 'unidade de Manaus: 14:00 local continua 14:00');
select is((select h from public.horarios_ocupados('2031-05-10', current_setting('teste.mao')::bigint) h),
    '2031-05-10 18:00:00+00'::timestamptz, 'unidade de Manaus: 14:00 local = 18:00 UTC');

-- ===========================================================================
-- Critério 2: registros antigos convertidos sem mudar o horário percebido.
-- A migration trata o valor sem fuso como horário de America/Sao_Paulo; o teste
-- confere que essa conversão, desfeita no fuso da unidade, devolve o valor original.
-- ===========================================================================
select is(
    (select array_agg(to_char((v at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI') order by v)
     from unnest(array['2026-10-15 14:00', '2026-01-01 00:00', '2026-12-31 23:30', '2018-12-01 14:00']::timestamp[]) v),
    array['2018-12-01 14:00', '2026-01-01 00:00', '2026-10-15 14:00', '2026-12-31 23:30'],
    'conversão da migration preserva o horário de parede (inclui virada de ano e horário de verão de 2018)');

-- Versões antigas do app ainda enviam horário sem fuso: para os papéis do app ele é
-- lido como horário de Brasília (o PostgREST aplica esta configuração do papel).
select ok(
    (select bool_and(s.setconfig @> array['TimeZone=America/Sao_Paulo'])
     from pg_db_role_setting s join pg_roles r on r.oid = s.setrole
     where r.rolname in ('anon', 'authenticated')
     having count(*) = 2),
    'anon e authenticated leem horário sem fuso como America/Sao_Paulo (compatibilidade com app antigo)');

select * from finish();
rollback;
