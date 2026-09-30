-- US-02: disponibilidade por profissional escolhido.
-- Rode com `npm run db:test`.
-- Tudo acontece numa transacao desfeita no final: nao altera os dados do banco.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

-- ---------------------------------------------------------------------------
-- Preparacao: dois pacientes, uma unidade e dois profissionais com grade igual.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'us02-a@teste.dev'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'us02-b@teste.dev');

insert into public.paciente (auth_user_id, nome, cpf, email) values
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'US02 Paciente A', '55500055500', 'us02-a@teste.dev'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'US02 Paciente B', '66600066600', 'us02-b@teste.dev');

insert into public.unidade_saude (nome, fuso_horario)
values ('US02 Unidade', 'America/Sao_Paulo');

select set_config('us02.unidade', (select id::text from public.unidade_saude where nome = 'US02 Unidade'), true);
select set_config('us02.pac_a', (select id::text from public.paciente where cpf = '55500055500'), true);
select set_config('us02.pac_b', (select id::text from public.paciente where cpf = '66600066600'), true);

insert into public.profissional (nome, especialidade, unidade_saude_id) values
    ('US02 Profissional A', 'Clinico Geral', current_setting('us02.unidade')::bigint),
    ('US02 Profissional B', 'Clinico Geral', current_setting('us02.unidade')::bigint);

select set_config('us02.prof_a', (select id::text from public.profissional where nome = 'US02 Profissional A'), true);
select set_config('us02.prof_b', (select id::text from public.profissional where nome = 'US02 Profissional B'), true);

insert into public.grade_atendimento (
    unidade_saude_id, profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_minutos, ativo
)
select
    current_setting('us02.unidade')::bigint,
    p.id,
    extract(dow from date '2031-06-10')::smallint,
    time '09:00',
    time '10:00',
    60,
    true
from public.profissional p
where p.id in (current_setting('us02.prof_a')::bigint, current_setting('us02.prof_b')::bigint);

insert into public.consulta (
    paciente_id, profissional_id, unidade_saude_id, status, data_hora, especialidade
)
select
    current_setting('us02.pac_a')::bigint,
    current_setting('us02.prof_a')::bigint,
    u.id,
    'agendada',
    (date '2031-06-10' + time '09:00') at time zone u.fuso_horario,
    'Clinico Geral'
from public.unidade_saude u
where u.id = current_setting('us02.unidade')::bigint;

-- ---------------------------------------------------------------------------
-- Criterios de aceite.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", "role": "authenticated"}';

select is(
    (select count(*) from public.buscar_disponibilidade_agenda(
        current_setting('us02.unidade')::bigint,
        current_setting('us02.prof_b')::bigint,
        date '2031-06-10'
    ) where horario = '09:00'),
    1::bigint,
    '09:00 continua disponivel para outro profissional da mesma unidade'
);

select is(
    (select count(*) from public.buscar_disponibilidade_agenda(
        current_setting('us02.unidade')::bigint,
        current_setting('us02.prof_a')::bigint,
        date '2031-06-10'
    ) where horario = '09:00'),
    0::bigint,
    '09:00 nao aparece para o profissional que ja tem consulta ativa'
);

select throws_ok(
    format(
        $$select * from public.buscar_disponibilidade_agenda(null::bigint, %s::bigint, date '2031-06-10')$$,
        current_setting('us02.prof_b')
    ),
    '22023',
    'Parametro obrigatorio: unidade.',
    'sem unidade, a busca retorna erro de parametro obrigatorio'
);

-- ---------------------------------------------------------------------------
-- Protecao contra corrida de agendamento.
-- ---------------------------------------------------------------------------
reset role;

select lives_ok(
    format(
        $sql$
        insert into public.consulta (
            paciente_id, profissional_id, unidade_saude_id, status, data_hora, especialidade
        )
        select %s::bigint, %s::bigint, u.id, 'agendada',
               (date '2031-06-10' + time '09:00') at time zone u.fuso_horario,
               'Clinico Geral'
        from public.unidade_saude u
        where u.id = %s::bigint
        $sql$,
        current_setting('us02.pac_b'),
        current_setting('us02.prof_b'),
        current_setting('us02.unidade')
    ),
    'mesmo horario e unidade podem ser agendados para profissionais diferentes'
);

select throws_ok(
    format(
        $sql$
        insert into public.consulta (
            paciente_id, profissional_id, unidade_saude_id, status, data_hora, especialidade
        )
        select %s::bigint, %s::bigint, u.id, 'agendada',
               (date '2031-06-10' + time '09:00') at time zone u.fuso_horario,
               'Clinico Geral'
        from public.unidade_saude u
        where u.id = %s::bigint
        $sql$,
        current_setting('us02.pac_a'),
        current_setting('us02.prof_b'),
        current_setting('us02.unidade')
    ),
    '23505',
    null,
    'o mesmo profissional nao pode receber dois agendamentos ativos no mesmo horario'
);

select * from finish();
rollback;
