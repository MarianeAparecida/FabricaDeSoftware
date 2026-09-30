-- US-03: concorrencia no agendamento.
-- Rode com `npm run db:test`.
-- Tudo acontece numa transacao desfeita no final: nao altera os dados do banco.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

-- ---------------------------------------------------------------------------
-- Preparacao: dois pacientes, uma unidade, um profissional e um horario de grade.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
    ('03030303-0303-0303-0303-030303030301', 'us03-a@teste.dev'),
    ('03030303-0303-0303-0303-030303030302', 'us03-b@teste.dev');

insert into public.paciente (auth_user_id, nome, cpf, email) values
    ('03030303-0303-0303-0303-030303030301', 'US03 Paciente A', '30300030301', 'us03-a@teste.dev'),
    ('03030303-0303-0303-0303-030303030302', 'US03 Paciente B', '30300030302', 'us03-b@teste.dev');

insert into public.unidade_saude (nome, fuso_horario)
values ('US03 Unidade', 'America/Sao_Paulo');

select set_config('us03.unidade', (select id::text from public.unidade_saude where nome = 'US03 Unidade'), true);
select set_config('us03.pac_a', (select id::text from public.paciente where cpf = '30300030301'), true);
select set_config('us03.pac_b', (select id::text from public.paciente where cpf = '30300030302'), true);

insert into public.profissional (nome, especialidade, unidade_saude_id)
values ('US03 Profissional', 'Clinico Geral', current_setting('us03.unidade')::bigint);

select set_config('us03.profissional', (select id::text from public.profissional where nome = 'US03 Profissional'), true);

insert into public.grade_atendimento (
    unidade_saude_id, profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_minutos, ativo
)
values (
    current_setting('us03.unidade')::bigint,
    current_setting('us03.profissional')::bigint,
    extract(dow from date '2031-06-10')::smallint,
    time '09:00',
    time '10:00',
    60,
    true
);

-- ---------------------------------------------------------------------------
-- Criterios de aceite.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "03030303-0303-0303-0303-030303030301", "role": "authenticated"}';

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
        current_setting('us03.pac_a'),
        current_setting('us03.profissional'),
        current_setting('us03.unidade')
    ),
    'primeiro paciente agenda o horario'
);

set local request.jwt.claims = '{"sub": "03030303-0303-0303-0303-030303030302", "role": "authenticated"}';

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
        current_setting('us03.pac_b'),
        current_setting('us03.profissional'),
        current_setting('us03.unidade')
    ),
    '23505',
    null,
    'segundo paciente no mesmo profissional/data/hora e recusado pelo banco'
);

reset role;

select is(
    (
        select count(*)
        from public.consulta
        where profissional_id = current_setting('us03.profissional')::bigint
          and data_hora = (
              select (date '2031-06-10' + time '09:00') at time zone u.fuso_horario
              from public.unidade_saude u
              where u.id = current_setting('us03.unidade')::bigint
          )
          and status in ('agendada', 'confirmada')
    ),
    1::bigint,
    'apenas uma consulta ativa fica gravada no horario'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "03030303-0303-0303-0303-030303030302", "role": "authenticated"}';

select is(
    (select count(*) from public.buscar_disponibilidade_agenda(
        current_setting('us03.unidade')::bigint,
        current_setting('us03.profissional')::bigint,
        date '2031-06-10'
    ) where horario = '09:00'),
    0::bigint,
    'lista recarregada nao mostra horario ocupado'
);

reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "03030303-0303-0303-0303-030303030301", "role": "authenticated"}';

select lives_ok(
    $$update public.consulta set status = 'cancelada' where especialidade = 'Clinico Geral'$$,
    'paciente cancela a consulta ativa'
);

set local request.jwt.claims = '{"sub": "03030303-0303-0303-0303-030303030302", "role": "authenticated"}';

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
        current_setting('us03.pac_b'),
        current_setting('us03.profissional'),
        current_setting('us03.unidade')
    ),
    'horario cancelado pode ser agendado por outro paciente'
);

reset role;

select is(
    (
        select count(*)
        from public.consulta
        where profissional_id = current_setting('us03.profissional')::bigint
          and data_hora = (
              select (date '2031-06-10' + time '09:00') at time zone u.fuso_horario
              from public.unidade_saude u
              where u.id = current_setting('us03.unidade')::bigint
          )
    ),
    2::bigint,
    'historico preserva a consulta cancelada e a nova consulta'
);

select * from finish();
rollback;
