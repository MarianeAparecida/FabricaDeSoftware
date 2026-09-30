import { supabase } from './supabase';

const timeout = async <T>(promise: PromiseLike<T>, controller: AbortController, ms: number = 30000): Promise<T> => {
    const timeoutId = setTimeout(() => controller.abort(), ms);

    try {
        const result = await promise;
        return result;
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error('Tempo limite de conexão excedido. Verifique sua internet');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

async function executarQuery<T>(
    query: any,
    ms: number = 15000,
    mensagemErroPadrao: string = 'Erro ao processar requisição'
): Promise<{ data: T | null; error: any }> {
    const controller = new AbortController();

    try {
        const response = await timeout(
            query.abortSignal(controller.signal),
            controller,
            ms
        ) as { data: T | null; error: any };

        if (response.error) {
            return { data: null, error: { message: mensagemErroPadrao, details: response.error } };
        }

        return { data: response.data as T, error: null };
    } catch (err: any) {
        return { data: null, error: { message: err.message || mensagemErroPadrao } };
    }
}

export type Paciente = {
    id: number;
    nome: string;
    nome_social?: string;
    cpf?: string;
    genero?: string;
    telefone?: string;
    endereco?: string;
    cartao_sus?: string;
    data_nascimento?: string;
    email?: string;
    auth_user_id?: string;
};

export type Consulta = {
    id?: number;
    paciente_id: number;
    profissional_id?: number;
    unidade_saude_id?: number;
    status?: string;
    data_hora: string;
    especialidade?: string;
    unidade_saude?: string | { id: number; nome: string; endereco?: string };
};

export type UnidadeSaude = {
    id: number;
    nome: string;
    endereco?: string;
    telefone?: string;
};

export type Profissional = {
    id: number;
    nome: string;
    cpf?: string;
    registro_conselho?: string;
    especialidade?: string;
    unidade_id: number;
};

export async function buscarPacientePorAuthId(authUserId: string) {
    const query = supabase
        .from('paciente')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

    const resultado = await executarQuery<Paciente>(query, 10000, 'Nenhum paciente vinculado a este usuário.');

    if (!resultado.error && !resultado.data) {
        return { data: null, error: { message: 'Por favor, complete seu cadastro.', code: 'PACIENTE_NAO_ENCONTRADO' } };
    }

    return resultado;
}

export async function buscarUnidadesSaude() {
    const query = supabase
        .from('unidade_saude')
        .select('*')
        .order('nome', { ascending: true });

    return executarQuery<UnidadeSaude[]>(query, 10000, 'Erro ao carregar a lista de unidades');
}

export async function buscarProfissionaisPorUnidade(unidadeId: number) {
    const query = supabase
        .from('profissional')
        .select('*')
        .eq('unidade_id', unidadeId)
        .order('nome', { ascending: true });

    return executarQuery<Profissional[]>(query, 10000, 'Erro ao carregar a lista de profissionais');
}

export async function criarConsulta(consulta: Omit<Consulta, 'id'>) {
    const query = supabase
        .from('consulta')
        .insert({
            paciente_id: consulta.paciente_id,
            profissional_id: consulta.profissional_id || null,
            unidade_saude_id: consulta.unidade_saude_id || null,
            status: consulta.status || 'agendada',
            data_hora: consulta.data_hora,
            especialidade: consulta.especialidade,
        })
        .select()
        .single();

    return executarQuery<Consulta>(query, 15000, 'Não foi possível salvar seu agendamento. Verifique sua conexão.');
}

export async function buscarConsultasPaciente(pacienteId: number) {
    const query = supabase
        .from('consulta')
        .select('*, unidade_saude:unidade_saude_id (id, nome, endereco)')
        .eq('paciente_id', pacienteId)
        .order('data_hora', { ascending: true });

    return executarQuery<Consulta[]>(query, 15000, 'Não foi possível carregar seu histórico de consultas');
}

export async function cancelarConsulta(consultaId: number) {
    const query = supabase
        .from('consulta')
        .update({ status: 'cancelada' })
        .eq('id', consultaId)
        .select()
        .single();

    return executarQuery<Consulta>(query, 10000, 'Falha ao tentar cancelar a consulta');
}

export async function buscarHorariosDisponiveis(data: string, unidadeId: number, profissionalId: number) {
    const query = supabase.rpc('buscar_disponibilidade_agenda', {
        p_unidade_id: unidadeId,
        p_profissional_id: profissionalId,
        p_data: data,
    });

    const resultado = await executarQuery<Array<string | { horario: string }>>(
        query,
        10000,
        'Erro ao carregar horários disponíveis'
    );

    if (resultado.error) {
        return { data: null, error: resultado.error };
    }

    const horarios = (resultado.data || [])
        .map((item) => typeof item === 'string' ? item : item.horario)
        .filter((horario): horario is string => Boolean(horario));

    return { data: horarios, error: null };
}

export function combinarDataHora(data: string, horario: string): string {
    return `${data}T${horario}:00`;
}
