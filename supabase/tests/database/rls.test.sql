-- US-20: testes das políticas de acesso (RLS). Rode com `npm run db:test`.
-- Tudo acontece numa transação desfeita no final: não altera os dados do banco.
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

-- ---------------------------------------------------------------------------
-- Preparação: dois pacientes (A e B), cada um com uma consulta.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@teste.dev'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@teste.dev');

insert into public.paciente (auth_user_id, nome, cpf, email, telefone) values
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Paciente A', '11100011100', 'a@teste.dev', 'tel-a'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Paciente B', '22200022200', 'b@teste.dev', 'tel-b');

insert into public.consulta (paciente_id, unidade_saude_id, status, data_hora, especialidade)
select id, 1, 'agendada', '2031-01-10 10:00'::timestamp, 'Dentista' from public.paciente where cpf = '11100011100'
union all
select id, 1, 'agendada', '2031-01-10 11:00'::timestamp, 'Pediatra' from public.paciente where cpf = '22200022200';

select set_config('teste.pac_a', (select id::text from public.paciente where cpf = '11100011100'), true);
select set_config('teste.pac_b', (select id::text from public.paciente where cpf = '22200022200'), true);
select set_config('teste.cons_b', (select id::text from public.consulta where data_hora = '2031-01-10 11:00'), true);

-- ===========================================================================
-- Critério 1: paciente autenticado só acessa os próprios registros.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';

-- Leitura
select is((select count(*) from public.consulta), 1::bigint,
    'A enxerga exatamente 1 consulta (a própria)');
select is((select count(*) from public.consulta where paciente_id <> current_setting('teste.pac_a')::bigint), 0::bigint,
    'A não enxerga consultas de outros pacientes');
select is((select count(*) from public.consulta where id = current_setting('teste.cons_b')::bigint), 0::bigint,
    'A não enxerga a consulta de B nem buscando pelo id');
select is((select count(*) from public.paciente), 1::bigint,
    'A enxerga exatamente 1 paciente');
select is((select cpf from public.paciente), '11100011100',
    'o paciente visível para A é o próprio A');

-- Agendamento
select throws_ok(
    format($$insert into public.consulta (paciente_id, unidade_saude_id, data_hora) values (%s, 2, '2031-02-01 08:00')$$,
           current_setting('teste.pac_b')),
    '42501', null, 'A não agenda consulta em nome de B');
select throws_ok(
    format($$insert into public.consulta (paciente_id, unidade_saude_id, status, data_hora) values (%s, 2, 'confirmada', '2031-02-01 08:00')$$,
           current_setting('teste.pac_a')),
    '42501', null, 'A não agenda consulta já confirmada');
select lives_ok(
    format($$insert into public.consulta (paciente_id, unidade_saude_id, status, data_hora, especialidade) values (%s, 2, 'agendada', '2031-02-01 08:00', 'Dentista')$$,
           current_setting('teste.pac_a')),
    'A agenda consulta para si com status agendada');

-- Alteração de consultas
select throws_ok($$update public.consulta set status = 'realizada'$$,
    '42501', null, 'A não marca a própria consulta como realizada');
select throws_ok($$update public.consulta set data_hora = '2031-03-01 09:00'$$,
    '42501', null, 'A não remarca data/hora direto na tabela');
select throws_ok($$update public.consulta set paciente_id = 1$$,
    '42501', null, 'A não transfere a consulta para outro paciente');
select throws_ok($$delete from public.consulta$$,
    '42501', null, 'A não apaga consultas');
update public.consulta set status = 'cancelada' where id = current_setting('teste.cons_b')::bigint;
select lives_ok($$update public.consulta set status = 'cancelada' where data_hora = '2031-01-10 10:00'$$,
    'A cancela a própria consulta');
select is((select status from public.consulta where data_hora = '2031-01-10 10:00'), 'cancelada',
    'o cancelamento de A foi gravado');
-- Consulta cancelada não é alvo da política de UPDATE: o comando não afeta nenhuma linha.
update public.consulta set status = 'agendada' where data_hora = '2031-01-10 10:00';
select is((select status from public.consulta where data_hora = '2031-01-10 10:00'), 'cancelada',
    'A não reativa consulta cancelada');

-- Alteração de pacientes
update public.paciente set telefone = 'invadido' where id = current_setting('teste.pac_b')::bigint;
select lives_ok($$update public.paciente set telefone = 'novo-tel-a'$$,
    'A edita os próprios dados cadastrais');
select throws_ok($$update public.paciente set cpf = '99999999999'$$,
    '42501', null, 'A não altera o próprio CPF');
select throws_ok($$update public.paciente set email = 'outro@teste.dev'$$,
    '42501', null, 'A não altera o próprio e-mail');
select throws_ok($$update public.paciente set auth_user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$,
    '42501', null, 'A não troca o vínculo com o usuário de autenticação');
select throws_ok($$insert into public.paciente (nome, cpf, email) values ('Falso', '33300033300', 'f@teste.dev')$$,
    '42501', null, 'A não cria pacientes');

-- Função de horários: mostra que o horário de B está ocupado, sem expor B.
select is((select count(*) from public.horarios_ocupados('2031-01-10', 1) h where h = '2031-01-10 11:00'), 1::bigint,
    'horarios_ocupados() mostra o horário de B como ocupado');

-- Catálogos: leitura sim, escrita não.
select throws_ok($$insert into public.unidade_saude (nome) values ('UBS Falsa')$$,
    '42501', null, 'autenticado não altera catálogos');

-- Conferência como administrador: as tentativas de A contra B não tiveram efeito.
reset role;
select is((select status from public.consulta where id = current_setting('teste.cons_b')::bigint), 'agendada',
    'a consulta de B continua agendada após a tentativa de A');
select is((select telefone from public.paciente where id = current_setting('teste.pac_b')::bigint), 'tel-b',
    'o telefone de B continua intacto após a tentativa de A');

-- ===========================================================================
-- Critério 2: usuário não autenticado não lê dados de pacientes.
-- ===========================================================================
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok($$select * from public.paciente$$,
    '42501', null, 'anônimo: acesso negado a paciente');
select throws_ok($$select * from public.consulta$$,
    '42501', null, 'anônimo: acesso negado a consulta');
select throws_ok($$select * from public.horarios_ocupados('2031-01-10', 1)$$,
    '42501', null, 'anônimo: acesso negado a horarios_ocupados()');
select throws_ok($$select public.meu_paciente_id()$$,
    '42501', null, 'anônimo: acesso negado a meu_paciente_id()');
select lives_ok($$select * from public.unidade_saude$$,
    'anônimo lê o catálogo de unidades (público)');

-- ===========================================================================
-- Critério 3: toda tabela tem RLS ativo e política documentada.
-- ===========================================================================
reset role;

select is_empty($$
    select relname from pg_class
    where relnamespace = 'public'::regnamespace and relkind in ('r', 'p') and not relrowsecurity
$$, 'toda tabela do schema public tem RLS ativo');

select is_empty($$
    select relname from pg_class
    where relnamespace = 'public'::regnamespace and relkind in ('r', 'p')
      and obj_description(oid, 'pg_class') is null
$$, 'toda tabela do schema public tem a política documentada (COMMENT ON TABLE)');

select is_empty($$
    select c.relname || '.' || p.polname from pg_policy p
    join pg_class c on c.oid = p.polrelid
    where c.relnamespace = 'public'::regnamespace
      and obj_description(p.oid, 'pg_policy') is null
$$, 'toda política do schema public tem comentário');

select * from finish();
rollback;
