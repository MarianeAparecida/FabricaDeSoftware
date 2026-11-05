-- A política de leitura da grade de atendimento (criada em 20260930190000_us01_grade_atendimento_rpc.sql)
-- ficou sem COMMENT ON POLICY. Toda política do schema public precisa ser documentada
-- (docs/politicas-de-acesso.md), e o teste "toda política do schema public tem comentário"
-- de supabase/tests/database/rls.test.sql falhava por isso.
comment on policy grade_atendimento_select on public.grade_atendimento is
    'SELECT liberado: catálogo público com a grade de horários dos profissionais em cada unidade.';
