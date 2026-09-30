-- US-20: revisão das políticas de acesso (RLS).
-- Documentação completa: docs/politicas-de-acesso.md
--
-- Brechas corrigidas nesta migration:
--   1. anon/authenticated tinham TODOS os privilégios em todas as tabelas (inclusive
--      TRUNCATE, que o RLS não filtra); só o RLS segurava o acesso.
--   2. Anônimo que lia paciente/consulta recebia lista vazia, não "acesso negado".
--   3. Paciente podia alterar o próprio CPF e e-mail (e com isso "ocupar" o CPF de outra
--      pessoa ou quebrar o próprio login).
--   4. Paciente podia marcar a própria consulta como realizada/confirmada, agendar já
--      confirmada e remarcar data/unidade direto na tabela.

-- ---------------------------------------------------------------------------
-- 1. Privilégios: começa do zero e concede só o necessário (defesa em profundidade:
--    mesmo que uma política seja removida por engano, o privilégio continua limitando).
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;

-- Tabelas criadas daqui em diante também nascem fechadas para anon/authenticated;
-- quem criar uma tabela nova precisa conceder os privilégios explicitamente.
alter default privileges for role postgres in schema public
    revoke all on tables from anon, authenticated;

-- Catálogos: leitura pública, sem escrita pelo app.
grant select on public.unidade_saude, public.profissional,
                public.medicamento, public.disponibilidade
    to anon, authenticated;

-- paciente: só autenticado. Pode editar apenas os dados cadastrais; cpf, email e
-- auth_user_id são a identidade do paciente e só mudam pelo servidor (service_role).
grant select on public.paciente to authenticated;
grant update (nome, nome_social, genero, telefone, endereco, cartao_sus, data_nascimento)
    on public.paciente to authenticated;

-- consulta: só autenticado. Pode agendar e, depois, apenas mudar o status (cancelar).
grant select on public.consulta to authenticated;
grant insert (paciente_id, profissional_id, unidade_saude_id, status, data_hora, especialidade)
    on public.consulta to authenticated;
grant update (status) on public.consulta to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Políticas de consulta: agendar só como "agendada"; alterar só para cancelar.
-- ---------------------------------------------------------------------------

drop policy "paciente agenda para si" on public.consulta;
create policy "paciente agenda para si" on public.consulta
    for insert to authenticated
    with check (paciente_id = public.meu_paciente_id() and status = 'agendada');

drop policy "paciente altera as proprias consultas" on public.consulta;
create policy "paciente cancela as proprias consultas" on public.consulta
    for update to authenticated
    using (paciente_id = public.meu_paciente_id() and status in ('agendada', 'confirmada'))
    with check (paciente_id = public.meu_paciente_id() and status = 'cancelada');

-- ---------------------------------------------------------------------------
-- 3. Documentação no próprio banco (os testes em supabase/tests exigem que toda
--    tabela e toda política tenham comentário).
-- ---------------------------------------------------------------------------

comment on table public.paciente is
    'Dados pessoais do paciente. RLS: autenticado lê e edita só o próprio registro '
    '(auth_user_id = auth.uid()); cpf/email/auth_user_id não são editáveis pelo app. '
    'Anônimo: sem acesso. Criação só pela Edge Function register-paciente.';
comment on table public.consulta is
    'Agendamentos. RLS: autenticado lê, agenda (status agendada) e cancela só as próprias '
    'consultas. Sem DELETE. Anônimo: sem acesso. Horários ocupados de terceiros só via '
    'função horarios_ocupados(), que não expõe o paciente.';
comment on table public.unidade_saude is
    'Catálogo público de unidades de saúde. RLS: leitura para anon e authenticated; '
    'escrita só pela service_role.';
comment on table public.profissional is
    'Catálogo público de profissionais. RLS: leitura para anon e authenticated; '
    'escrita só pela service_role.';
comment on table public.medicamento is
    'Catálogo público de medicamentos. RLS: leitura para anon e authenticated; '
    'escrita só pela service_role.';
comment on table public.disponibilidade is
    'Estoque público de medicamentos por unidade. RLS: leitura para anon e authenticated; '
    'escrita só pela service_role.';

comment on policy "paciente le o proprio registro" on public.paciente is
    'SELECT: apenas a linha cujo auth_user_id é o usuário logado.';
comment on policy "paciente atualiza o proprio registro" on public.paciente is
    'UPDATE: apenas a própria linha; as colunas editáveis são limitadas por GRANT.';
comment on policy "paciente le as proprias consultas" on public.consulta is
    'SELECT: apenas consultas do paciente logado (meu_paciente_id()).';
comment on policy "paciente agenda para si" on public.consulta is
    'INSERT: paciente_id precisa ser o do usuário logado e o status inicial é agendada.';
comment on policy "paciente cancela as proprias consultas" on public.consulta is
    'UPDATE: só consultas próprias ainda ativas (agendada/confirmada), e só para cancelada.';
comment on policy "leitura publica" on public.unidade_saude is 'SELECT liberado: catálogo público.';
comment on policy "leitura publica" on public.profissional is 'SELECT liberado: catálogo público.';
comment on policy "leitura publica" on public.medicamento is 'SELECT liberado: catálogo público.';
comment on policy "leitura publica" on public.disponibilidade is 'SELECT liberado: catálogo público.';

comment on function public.meu_paciente_id() is
    'id do paciente do usuário logado. SECURITY DEFINER para ser usada nas políticas de '
    'consulta sem depender do RLS de paciente. Só authenticated executa.';
comment on function public.horarios_ocupados(date, bigint) is
    'Horários já ocupados de uma unidade num dia, de qualquer paciente, devolvendo só o '
    'timestamp (sem paciente/especialidade). SECURITY DEFINER; só authenticated executa.';
