-- US-02: disponibilidade deve considerar o profissional escolhido.
--
-- A unidade continua obrigatoria, mas um horario ocupado por um profissional
-- nao bloqueia o mesmo horario para outro profissional da mesma unidade.

drop index if exists public.consulta_horario_unico_idx;

create unique index if not exists consulta_profissional_horario_unico_idx
    on public.consulta (unidade_saude_id, profissional_id, data_hora)
    where status in ('agendada', 'confirmada')
      and unidade_saude_id is not null
      and profissional_id is not null
      and data_hora is not null;

comment on index public.consulta_profissional_horario_unico_idx is
    'Impede dois agendamentos que ocupam agenda no mesmo horario para o mesmo profissional e unidade.';

create unique index if not exists consulta_sem_profissional_horario_unico_idx
    on public.consulta (unidade_saude_id, data_hora)
    where status in ('agendada', 'confirmada')
      and unidade_saude_id is not null
      and profissional_id is null
      and data_hora is not null;

comment on index public.consulta_sem_profissional_horario_unico_idx is
    'Preserva a protecao de duplicidade para consultas legadas sem profissional definido.';

create or replace function public.buscar_disponibilidade_agenda(
    p_unidade_id bigint,
    p_profissional_id bigint,
    p_data date
)
returns table(horario text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
    if p_unidade_id is null then
        raise exception 'Parametro obrigatorio: unidade.' using errcode = '22023';
    end if;

    if p_profissional_id is null then
        raise exception 'Parametro obrigatorio: profissional.' using errcode = '22023';
    end if;

    if p_data is null then
        raise exception 'Parametro obrigatorio: data.' using errcode = '22023';
    end if;

    return query
    with profissional_valido as (
        select p.id
        from public.profissional p
        where p.id = p_profissional_id
          and p.unidade_saude_id = p_unidade_id
    ),
    slots as (
        select
            slot.data_hora as data_hora_local,
            slot.data_hora at time zone u.fuso_horario as data_hora
        from public.grade_atendimento g
        join profissional_valido pv on pv.id = g.profissional_id
        join public.unidade_saude u on u.id = g.unidade_saude_id
        cross join lateral generate_series(
            p_data + g.hora_inicio,
            (p_data + g.hora_fim) - make_interval(mins => g.intervalo_minutos),
            make_interval(mins => g.intervalo_minutos)
        ) as slot(data_hora)
        where g.unidade_saude_id = p_unidade_id
          and g.profissional_id = p_profissional_id
          and g.dia_semana = extract(dow from p_data)::smallint
          and g.ativo = true
    ),
    ocupados as (
        select c.data_hora
        from public.consulta c
        join public.unidade_saude u on u.id = c.unidade_saude_id
        where c.unidade_saude_id = p_unidade_id
          and c.profissional_id = p_profissional_id
          and c.data_hora >= (p_data::timestamp at time zone u.fuso_horario)
          and c.data_hora < ((p_data + 1)::timestamp at time zone u.fuso_horario)
          and c.status in ('agendada', 'confirmada')
    )
    select distinct to_char(s.data_hora_local, 'HH24:MI') as horario
    from slots s
    where s.data_hora > now()
      and not exists (
          select 1
          from ocupados o
          where o.data_hora = s.data_hora
      )
    order by 1;
end;
$$;

grant execute on function public.buscar_disponibilidade_agenda(bigint, bigint, date)
    to anon, authenticated;

comment on function public.buscar_disponibilidade_agenda(bigint, bigint, date) is
    'Lista horarios disponiveis da grade do profissional na unidade/data. Unidade, profissional '
    'e data sao obrigatorios; horarios ocupados filtram apenas consultas agendadas/confirmadas '
    'do profissional escolhido.';
