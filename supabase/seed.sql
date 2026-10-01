-- Dados de exemplo do AgendaSUS. Roda automaticamente em `supabase start` (primeira vez)
-- e em `supabase db reset`.

-- ---------------------------------------------------------------------------
-- Unidades de saúde
-- ---------------------------------------------------------------------------
insert into public.unidade_saude (id, nome, endereco, telefone) values
    (1, 'UBS Central',          'Rua XV de Novembro, 1200 - Centro',        '(41) 3333-1000'),
    (2, 'UBS Vila Nova',        'Av. das Araucárias, 455 - Vila Nova',      '(41) 3333-2000'),
    (3, 'UBS Jardim das Flores','Rua das Hortênsias, 78 - Jardim das Flores','(41) 3333-3000'),
    (4, 'Policlínica Municipal','Av. Brasil, 3100 - Boa Vista',             '(41) 3333-4000'),
    (5, 'UBS Centro - Dois Vizinhos', 'Rua Principal, 100 - Centro, Dois Vizinhos - PR', '(46) 3536-1000');
-- fuso_horario de todas: America/Sao_Paulo (padrão da coluna).

-- ---------------------------------------------------------------------------
-- Profissionais (mesmas especialidades da tela de seleção do app)
-- ---------------------------------------------------------------------------
insert into public.profissional (nome, especialidade, unidade_saude_id) values
    ('Dra. Ana Souza',      'Clínico Geral',  1),
    ('Dr. Bruno Lima',      'Dentista',       1),
    ('Dra. Carla Mendes',   'Psicólogo',      2),
    ('Dr. Diego Rocha',     'Pediatra',       2),
    ('Dr. Eduardo Alves',   'Ortopedista',    4),
    ('Dra. Fernanda Costa', 'Ginecologista',  3),
    ('Dr. Gustavo Pereira', 'Cardiologista',  4),
    ('Dra. Helena Martins', 'Nutricionista',  3);

-- ---------------------------------------------------------------------------
-- Medicamentos e estoque por unidade
-- ---------------------------------------------------------------------------
insert into public.medicamento (id, nome, dose_mg) values
    (1, 'Paracetamol',    500),
    (2, 'Dipirona',       500),
    (3, 'Ibuprofeno',     400),
    (4, 'Amoxicilina',    500),
    (5, 'Losartana',       50),
    (6, 'Metformina',     850),
    (7, 'Omeprazol',       20),
    (8, 'Sinvastatina',    20);

insert into public.disponibilidade (id_medicamento, id_unidade, unidades_disponiveis) values
    (1, 1, 120), (1, 2, 40),
    (2, 1, 0),   (2, 3, 75),
    (3, 2, 30),
    (4, 1, 15),  (4, 4, 0),
    (5, 3, 60),  (5, 4, 200),
    (6, 2, 90),
    (7, 1, 50),  (7, 3, 0),
    (8, 4, 35);

-- Ajusta as sequences depois dos ids explícitos.
select setval(pg_get_serial_sequence('public.unidade_saude', 'id'), (select max(id) from public.unidade_saude));
select setval(pg_get_serial_sequence('public.medicamento',   'id'), (select max(id) from public.medicamento));

-- ---------------------------------------------------------------------------
-- Contas de login (e-mail já confirmado). Função temporária, some ao fim do seed.
-- ---------------------------------------------------------------------------
create function pg_temp.criar_usuario(p_id uuid, p_email text, p_senha text, p_meta jsonb)
returns uuid
language plpgsql
as $$
begin
    insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change,
        email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
        '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated',
        p_email, extensions.crypt(p_senha, extensions.gen_salt('bf')),
        now(),
        '{"provider": "email", "providers": ["email"]}',
        p_meta || jsonb_build_object('email_verified', true),
        now(), now(),
        '', '', '', '',
        '', '', '', ''
    );

    insert into auth.identities (
        id, user_id, provider_id, provider, identity_data,
        last_sign_in_at, created_at, updated_at
    ) values (
        gen_random_uuid(), p_id, p_id::text, 'email',
        jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
        now(), now(), now()
    );
    return p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Paciente de teste
--   CPF:   123.456.789-00
--   Senha: ABC123!@#ab
-- ---------------------------------------------------------------------------
insert into public.paciente (
    auth_user_id, nome, cpf, email, genero, telefone, endereco, cartao_sus, data_nascimento
) values (
    pg_temp.criar_usuario('11111111-1111-1111-1111-111111111111', 'teste@agendasus.dev', 'ABC123!@#ab',
                          '{"display_name": "Maria Teste", "cpf": "12345678900"}'),
    'Maria Teste', '12345678900', 'teste@agendasus.dev', 'Feminino', '(41) 99999-0000',
    'Rua das Palmeiras, Número 150, Bairro Centro, Curitiba - PR, CEP 80000-000',
    '898 0012 3456 7890', '1990-05-15'
);

-- Paciente sem conta no app (cadastrado pela unidade), para a agenda do portal ter volume.
insert into public.paciente (nome, cpf, email, telefone)
values ('José Pereira', '98765432100', 'jose.pereira@exemplo.dev', '(46) 98888-1234');

-- ---------------------------------------------------------------------------
-- Servidores das unidades (portal: http://localhost:8081/portal)
--   Senha de todos: Servidor@123
-- ---------------------------------------------------------------------------
insert into public.servidor (auth_user_id, unidade_saude_id, nome, email, matricula, perfil, ativo) values
    (pg_temp.criar_usuario('22222222-0000-0000-0000-000000000001', 'recepcao.dv@agendasus.dev', 'Servidor@123',
                           '{"display_name": "Ana Recepção"}'),
     5, 'Ana Recepção', 'recepcao.dv@agendasus.dev', 'DV-001', 'atendente', true),
    (pg_temp.criar_usuario('22222222-0000-0000-0000-000000000002', 'gestor.central@agendasus.dev', 'Servidor@123',
                           '{"display_name": "Carlos Gestor"}'),
     1, 'Carlos Gestor', 'gestor.central@agendasus.dev', 'CT-001', 'gestor', true),
    (pg_temp.criar_usuario('22222222-0000-0000-0000-000000000003', 'inativo.central@agendasus.dev', 'Servidor@123',
                           '{"display_name": "Bruno Desligado"}'),
     1, 'Bruno Desligado', 'inativo.central@agendasus.dev', 'CT-002', 'atendente', false);

-- Consultas do usuário de teste: próximas (tela inicial / Minhas consultas) e passadas (Histórico).
-- Os horários são de parede na unidade e viram instante com o fuso dela ("at time zone").
insert into public.consulta (paciente_id, unidade_saude_id, status, data_hora, especialidade)
select p.id, c.unidade, c.status, c.hora_local at time zone u.fuso_horario, c.especialidade
from public.paciente p
cross join (
    select (now() at time zone 'America/Sao_Paulo')::date as hoje
) d
cross join lateral (values
    (1, 'agendada',  (d.hoje + 3)  + time '09:00', 'Clínico Geral'),
    (2, 'agendada',  (d.hoje + 10) + time '14:30', 'Psicólogo'),
    (1, 'realizada', (d.hoje - 20) + time '10:00', 'Dentista'),
    (4, 'faltou',    (d.hoje - 45) + time '08:30', 'Ortopedista'),
    (3, 'cancelada', (d.hoje - 7)  + time '15:00', 'Nutricionista')
) as c(unidade, status, hora_local, especialidade)
join public.unidade_saude u on u.id = c.unidade
where p.cpf = '12345678900';

-- Consultas do José: hoje e amanhã em Dois Vizinhos, hoje na UBS Central.
insert into public.consulta (paciente_id, unidade_saude_id, status, data_hora, especialidade)
select p.id, c.unidade, 'agendada', c.hora_local at time zone u.fuso_horario, c.especialidade
from public.paciente p
cross join (select (now() at time zone 'America/Sao_Paulo')::date as hoje) d
cross join lateral (values
    (5, d.hoje       + time '10:00', 'Clínico Geral'),
    (5, d.hoje       + time '15:30', 'Dentista'),
    (5, (d.hoje + 1) + time '09:00', 'Pediatra'),
    (1, d.hoje       + time '11:00', 'Cardiologista')
) as c(unidade, hora_local, especialidade)
join public.unidade_saude u on u.id = c.unidade
where p.cpf = '98765432100';
