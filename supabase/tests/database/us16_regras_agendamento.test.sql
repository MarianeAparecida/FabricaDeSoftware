-- US-16: regras de agendamento (horario passado e cancelamento liberando o horario na lista).
-- Rode com `npm run db:test`.
-- Tudo acontece numa transacao desfeita no final: nao altera os dados do banco.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

-- ---------------------------------------------------------------------------
-- Preparacao: um paciente, uma unidade e um profissional com grade das 09:00
-- as 11:00 (2 horarios: 09:00 e 10:00).
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
    ('16161616-1616-1616-1616-161616161601', 'us16@teste.dev');

insert into public.paciente (auth_user_id, nome, cpf, email) values
    ('16161616-1616-1616-1616-161616161601', 'US16 Paciente', '16100016101', 'us16@teste.dev');

insert into public.unidade_saude (nome, fuso_horario)
values ('US16 Unidade', 'America/Sao_Paulo');

select set_config('us16.unidade', (select id::text from public.unidade_saude where nome = 'US16 Unidade'), true);
select set_config('us16.pac', (select id::text from public.paciente where cpf = '16100016101'), true);

insert into public.profissional (nome, especialidade, unidade_saude_id)
values ('US16 Profissional', 'Clinico Geral', current_setting('us16.unidade')::bigint);

select set_config('us16.prof', (select id::text from public.profissional where nome = 'US16 Profissional'), true);

-- A grade vale para o dia da semana de 07/01/2020 (data passada).
-- A data futura usada nos testes e 07/01/2020 + 4200 dias (600 semanas): mesmo dia da semana.
insert into public.grade_atendimento (
    unidade_saude_id, profissional_id, dia_semana, hora_inicio, hora_fim, intervalo_minutos, ativo
)
values (
    current_setting('us16.unidade')::bigint,
    current_setting('us16.prof')::bigint,
    extract(dow from date '2020-01-07')::smallint,
    time '09:00',
    time '11:00',
    60,
    true
);

-- ---------------------------------------------------------------------------
-- Criterios de aceite.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "16161616-1616-1616-1616-161616161601", "role": "authenticated"}';

-- 1) Horario passado: nenhum horario e oferecido.
select is(
    (select count(*) from public.buscar_disponibilidade_agenda(
        current_setting('us16.unidade')::bigint,
        current_setting('us16.prof')::bigint,
        date '2020-01-07'
    )),
    0::bigint,
    'horario retroativo (data passada) nao aparece como disponivel'
);

-- 2) Mesma grade, data futura: os 2 horarios aparecem.
select is(
    (select count(*) from public.buscar_disponibilidade_agenda(
        current_setting('us16.unidade')::bigint,
        current_setting('us16.prof')::bigint,
        date '2020-01-07' + 4200
    )),
    2::bigint,
    'a mesma grade em data futura oferece os 2 horarios (09:00 e 10:00)'
);

-- 3) O paciente agenda o horario das 09:00.
select lives_ok(
    format(
        $sql$
        insert into public.consulta (
            paciente_id, profissional_id, unidade_saude_id, status, data_hora, especialidade
        )
        select %s::bigint, %s::bigint, u.id, 'agendada',
               (date '2020-01-07' + 4200 + time '09:00') at time zone u.fuso_horario,
               'Clinico Geral'
        from public.unidade_saude u
        where u.id = %s::bigint
        $sql$,
        current_setting('us16.pac'),
        current_setting('us16.prof'),
        current_setting('us16.unidade')
    ),
    'paciente agenda o horario das 09:00 na data futura'
);

-- 4) O 09:00 some da lista.
select is(
    (select count(*) from public.buscar_disponibilidade_agenda(
        current_setting('us16.unidade')::bigint,
        current_setting('us16.prof')::bigint,
        date '2020-01-07' + 4200
    ) where horario = '09:00'),
    0::bigint,
    'horario ocupado nao aparece na lista'
);

-- 5) O paciente cancela a consulta.
select lives_ok(
    format(
        $sql$update public.consulta set status = 'cancelada' where paciente_id = %s::bigint$sql$,
        current_setting('us16.pac')
    ),
    'paciente cancela a propria consulta'
);

-- 6) Depois de cancelar, o 09:00 volta para a lista.
select is(
    (select count(*) from public.buscar_disponibilidade_agenda(
        current_setting('us16.unidade')::bigint,
        current_setting('us16.prof')::bigint,
        date '2020-01-07' + 4200
    ) where horario = '09:00'),
    1::bigint,
    'depois do cancelamento, o horario das 09:00 volta a aparecer na lista'
);

reset role;

select * from finish();
rollback;