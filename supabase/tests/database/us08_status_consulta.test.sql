-- US-08: servidor registra o desfecho da consulta.
-- Tudo acontece em uma transação desfeita no final.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into public.unidade_saude (nome)
values ('Teste US-08');

select set_config(
    'us08.unidade',
    (select id::text from public.unidade_saude where nome = 'Teste US-08'),
    true
);

insert into auth.users (id, email) values
    ('08000000-0000-0000-0000-000000000001', 'servidor.us08@teste.dev'),
    ('08000000-0000-0000-0000-000000000002', 'paciente.us08@teste.dev');

insert into public.servidor (
    auth_user_id,
    unidade_saude_id,
    nome,
    email,
    matricula,
    perfil,
    ativo
) values (
    '08000000-0000-0000-0000-000000000001',
    current_setting('us08.unidade')::bigint,
    'Servidor US-08',
    'servidor.us08@teste.dev',
    'US08-1',
    'atendente',
    true
);

insert into public.paciente (auth_user_id, nome, cpf, email)
values (
    '08000000-0000-0000-0000-000000000002',
    'Paciente US-08',
    '08000000008',
    'paciente.us08@teste.dev'
);

insert into public.consulta (
    paciente_id,
    unidade_saude_id,
    data_hora,
    especialidade
)
select
    p.id,
    current_setting('us08.unidade')::bigint,
    dados.data_hora,
    dados.especialidade
from public.paciente p
cross join lateral (values
    ('2032-08-08T09:00:00-03:00'::timestamptz, 'US08-realizada'),
    ('2032-08-08T10:00:00-03:00'::timestamptz, 'US08-faltou')
) as dados(data_hora, especialidade)
where p.cpf = '08000000008';

select set_config(
    'us08.consulta_realizada',
    (select id::text from public.consulta where especialidade = 'US08-realizada'),
    true
);
select set_config(
    'us08.consulta_faltou',
    (select id::text from public.consulta where especialidade = 'US08-faltou'),
    true
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "08000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select is(
    (select status from public.portal_atualizar_status(current_setting('us08.consulta_realizada')::bigint, 'confirmada')),
    'confirmada',
    'servidor confirma a consulta'
);
select is(
    (select status from public.portal_atualizar_status(current_setting('us08.consulta_realizada')::bigint, 'realizada')),
    'realizada',
    'servidor marca a consulta como realizada'
);
select is(
    (select status from public.portal_atualizar_status(current_setting('us08.consulta_faltou')::bigint, 'confirmada')),
    'confirmada',
    'servidor confirma a consulta que será registrada como falta'
);
select is(
    (select status from public.portal_atualizar_status(current_setting('us08.consulta_faltou')::bigint, 'faltou')),
    'faltou',
    'servidor marca a ausência do paciente'
);
select throws_ok(
    format(
        $$select * from public.portal_atualizar_status(%s, 'faltou')$$,
        current_setting('us08.consulta_realizada')
    ),
    '22023',
    null,
    'consulta realizada não pode ser alterada para falta'
);

reset role;

select is(
    (select status from public.consulta where id = current_setting('us08.consulta_realizada')::bigint),
    'realizada',
    'status realizada permanece gravado na consulta'
);
select is(
    (select status from public.consulta where id = current_setting('us08.consulta_faltou')::bigint),
    'faltou',
    'status faltou permanece gravado na consulta'
);

select * from finish();
rollback;
