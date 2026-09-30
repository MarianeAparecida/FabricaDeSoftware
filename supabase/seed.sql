-- Dados de exemplo do AgendaSUS. Roda automaticamente em `supabase start` (primeira vez)
-- e em `supabase db reset`.

-- ---------------------------------------------------------------------------
-- Unidades de saúde
-- ---------------------------------------------------------------------------
insert into public.unidade_saude (id, nome, endereco, telefone) values
    (1, 'UBS Central',          'Rua XV de Novembro, 1200 - Centro',        '(41) 3333-1000'),
    (2, 'UBS Vila Nova',        'Av. das Araucárias, 455 - Vila Nova',      '(41) 3333-2000'),
    (3, 'UBS Jardim das Flores','Rua das Hortênsias, 78 - Jardim das Flores','(41) 3333-3000'),
    (4, 'Policlínica Municipal','Av. Brasil, 3100 - Boa Vista',             '(41) 3333-4000');

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

insert into public.disponibilidade (id_medicamento, id_unidade_saude, unidades_disponiveis) values
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
-- Usuário de teste (e-mail já confirmado)
--   CPF:   123.456.789-00
--   Senha: ABC123!@#ab
-- ---------------------------------------------------------------------------
do $$
declare
    v_user_id uuid := '11111111-1111-1111-1111-111111111111';
    v_email   text := 'teste@agendasus.dev';
begin
    insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change,
        email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
        '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
        v_email, extensions.crypt('ABC123!@#ab', extensions.gen_salt('bf')),
        now(),
        '{"provider": "email", "providers": ["email"]}',
        jsonb_build_object('display_name', 'Maria Teste', 'cpf', '12345678900', 'email_verified', true),
        now(), now(),
        '', '', '', '',
        '', '', '', ''
    );

    insert into auth.identities (
        id, user_id, provider_id, provider, identity_data,
        last_sign_in_at, created_at, updated_at
    ) values (
        gen_random_uuid(), v_user_id, v_user_id::text, 'email',
        jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
        now(), now(), now()
    );

    insert into public.paciente (
        auth_user_id, nome, cpf, email, genero, telefone, endereco, cartao_sus, data_nascimento
    ) values (
        v_user_id, 'Maria Teste', '12345678900', v_email, 'Feminino', '(41) 99999-0000',
        'Rua das Palmeiras, Número 150, Bairro Centro, Curitiba - PR, CEP 80000-000',
        '898 0012 3456 7890', '1990-05-15'
    );
end $$;

-- Consultas do usuário de teste: próximas (tela inicial / Minhas consultas) e passadas (Histórico).
insert into public.consulta (paciente_id, unidade_saude_id, status, data_hora, especialidade)
select p.id, c.unidade, c.status, c.data_hora, c.especialidade
from public.paciente p
cross join (values
    (1, 'agendada',  (current_date + 3)  + time '09:00', 'Clínico Geral'),
    (2, 'agendada',  (current_date + 10) + time '14:30', 'Psicólogo'),
    (1, 'realizada', (current_date - 20) + time '10:00', 'Dentista'),
    (4, 'faltou',    (current_date - 45) + time '08:30', 'Ortopedista'),
    (3, 'cancelada', (current_date - 7)  + time '15:00', 'Nutricionista')
) as c(unidade, status, data_hora, especialidade)
where p.cpf = '12345678900';
