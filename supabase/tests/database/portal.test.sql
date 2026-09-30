-- US-06: servidor da unidade com perfil de acesso. Rode com `npm run db:test`.
-- Tudo acontece numa transação desfeita no final: não altera os dados do banco.
begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

-- ---------------------------------------------------------------------------
-- Preparação: unidades A e B; servidores; um paciente com consultas nas duas.
-- ---------------------------------------------------------------------------
insert into public.unidade_saude (nome) values ('Teste Unidade A'), ('Teste Unidade B');
select set_config('t.ua', (select id::text from public.unidade_saude where nome = 'Teste Unidade A'), true);
select set_config('t.ub', (select id::text from public.unidade_saude where nome = 'Teste Unidade B'), true);

insert into auth.users (id, email) values
    ('a0000000-0000-0000-0000-00000000000a', 'atendente.a@teste.dev'),
    ('a0000000-0000-0000-0000-00000000000b', 'gestor.a@teste.dev'),
    ('a0000000-0000-0000-0000-00000000000c', 'inativo.a@teste.dev'),
    ('b0000000-0000-0000-0000-00000000000a', 'atendente.b@teste.dev'),
    ('c0000000-0000-0000-0000-00000000000a', 'paciente@teste.dev');

insert into public.servidor (auth_user_id, unidade_saude_id, nome, email, matricula, perfil, ativo) values
    ('a0000000-0000-0000-0000-00000000000a', current_setting('t.ua')::bigint, 'Atendente A', 'atendente.a@teste.dev', 'T-A1', 'atendente', true),
    ('a0000000-0000-0000-0000-00000000000b', current_setting('t.ua')::bigint, 'Gestor A',    'gestor.a@teste.dev',    'T-A2', 'gestor',    true),
    ('a0000000-0000-0000-0000-00000000000c', current_setting('t.ua')::bigint, 'Inativo A',   'inativo.a@teste.dev',   'T-A3', 'atendente', false),
    ('b0000000-0000-0000-0000-00000000000a', current_setting('t.ub')::bigint, 'Atendente B', 'atendente.b@teste.dev', 'T-B1', 'atendente', true);

insert into public.paciente (auth_user_id, nome, cpf, email, telefone)
values ('c0000000-0000-0000-0000-00000000000a', 'Paciente Portal', '55500055500', 'paciente@teste.dev', '(46) 90000-0000');

insert into public.consulta (paciente_id, unidade_saude_id, data_hora, especialidade)
select p.id, u.id, v.data_hora, v.esp
from public.paciente p
cross join lateral (values
    (current_setting('t.ua')::bigint, '2031-06-10T09:00:00-03:00'::timestamptz, 'A-manha'),
    (current_setting('t.ua')::bigint, '2031-06-10T15:00:00-03:00'::timestamptz, 'A-tarde'),
    (current_setting('t.ub')::bigint, '2031-06-10T10:00:00-03:00'::timestamptz, 'B-manha')
) as v(unidade, data_hora, esp)
join public.unidade_saude u on u.id = v.unidade
where p.cpf = '55500055500';
select set_config('t.cons_a', (select id::text from public.consulta where especialidade = 'A-manha'), true);
select set_config('t.cons_b', (select id::text from public.consulta where especialidade = 'B-manha'), true);

-- ===========================================================================
-- Critério 1: servidor autenticado vê apenas dados da própria unidade.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select is((select unidade_nome from public.portal_meu_perfil()), 'Teste Unidade A',
    'atendente A: portal_meu_perfil mostra a unidade A');
select is((select array_agg(especialidade order by data_hora) from public.portal_agenda('2031-06-10')),
    array['A-manha', 'A-tarde'], 'atendente A: agenda do dia só tem consultas da unidade A');
select is((select paciente_cpf from public.portal_agenda('2031-06-10') limit 1), '***.000.555-**',
    'agenda mostra CPF mascarado');
select throws_ok(format($$select * from public.portal_atualizar_status(%s, 'cancelada')$$, current_setting('t.cons_b')),
    'P0002', null, 'atendente A não altera consulta da unidade B (tratada como inexistente)');
select lives_ok(format($$select * from public.portal_atualizar_status(%s, 'confirmada')$$, current_setting('t.cons_a')),
    'atendente A confirma consulta da unidade A');
select throws_ok(format($$select * from public.portal_atualizar_status(%s, 'agendada')$$, current_setting('t.cons_a')),
    '22023', null, 'status inválido é recusado');
select is((select count(*) from public.consulta), 0::bigint,
    'servidor não lê a tabela consulta direto');
select is((select count(*) from public.paciente), 0::bigint,
    'servidor não lê a tabela paciente direto');
select throws_ok($$select * from public.servidor$$, '42501', null,
    'servidor não lê a tabela servidor direto');
select throws_ok($$select * from public.exigir_servidor()$$, '42501', null,
    'função interna exigir_servidor() não é executável pelo app');

-- Perfis
select throws_ok($$select * from public.portal_equipe()$$, '42501', null,
    'perfil atendente não vê a equipe');
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select is((select array_agg(nome order by nome) from public.portal_equipe()),
    array['Atendente A', 'Gestor A', 'Inativo A'], 'perfil gestor vê a equipe só da unidade A');
select is((select count(*) from public.portal_agenda('2031-06-10')), 2::bigint,
    'gestor A também vê só a agenda da unidade A');

-- Servidor da unidade B enxerga só a B.
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select is((select array_agg(especialidade) from public.portal_agenda('2031-06-10')),
    array['B-manha'], 'atendente B: agenda só tem a consulta da unidade B');

reset role;
select is((select status from public.consulta where id = current_setting('t.cons_a')::bigint), 'confirmada',
    'a confirmação do atendente A foi gravada');
select is((select status from public.consulta where id = current_setting('t.cons_b')::bigint), 'agendada',
    'a consulta da unidade B continua intacta');

-- ===========================================================================
-- Critério 2: paciente autenticado não acessa o portal.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select throws_ok($$select * from public.portal_meu_perfil()$$, '42501', null, 'paciente: portal_meu_perfil negado');
select throws_ok($$select * from public.portal_agenda('2031-06-10')$$, '42501', null, 'paciente: portal_agenda negado');
select throws_ok(format($$select * from public.portal_atualizar_status(%s, 'cancelada')$$, current_setting('t.cons_a')),
    '42501', null, 'paciente: portal_atualizar_status negado');
select throws_ok($$select * from public.portal_equipe()$$, '42501', null, 'paciente: portal_equipe negado');

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$select * from public.portal_agenda('2031-06-10')$$, '42501', null, 'anônimo: portal negado');
reset role;

-- ===========================================================================
-- Critério 3: servidor sem vínculo ativo tem o login recusado.
-- ===========================================================================
select is(
    public.custom_access_token_hook('{"user_id": "a0000000-0000-0000-0000-00000000000c", "claims": {}}') -> 'error' ->> 'http_code',
    '403', 'hook recusa token para servidor inativo');
select ok(
    not public.custom_access_token_hook('{"user_id": "a0000000-0000-0000-0000-00000000000a", "claims": {}}') ? 'error',
    'hook emite token para servidor ativo');
select ok(
    not public.custom_access_token_hook('{"user_id": "c0000000-0000-0000-0000-00000000000a", "claims": {}}') ? 'error',
    'hook emite token para paciente');
select ok(
    has_function_privilege('supabase_auth_admin', 'public.custom_access_token_hook(jsonb)', 'execute')
    and not has_function_privilege('authenticated', 'public.custom_access_token_hook(jsonb)', 'execute'),
    'hook é executável só pelo Supabase Auth');

-- Desativado no meio da sessão: o token antigo ainda existe, mas o portal nega na hora.
update public.servidor set ativo = false where email = 'atendente.a@teste.dev';
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select throws_ok($$select * from public.portal_agenda('2031-06-10')$$, '42501', null,
    'servidor desativado com sessão aberta: portal negado imediatamente');
reset role;
select is(
    public.custom_access_token_hook('{"user_id": "a0000000-0000-0000-0000-00000000000a", "claims": {}}') -> 'error' ->> 'http_code',
    '403', 'servidor desativado: renovação do token também é recusada');

select * from finish();
rollback;
