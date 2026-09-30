import { supabase } from './supabase';
import { FUSO_PADRAO, noFuso, paraIsoComFuso } from '../utils/fusoHorario';
//Timeout
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

// Executa qualquer query
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
        )as {data: T | null; error: any};

        if (response.error) {
            return { data: null, error: { message: mensagemErroPadrao, details: response.error } };
        }
        
        return { data: response.data as T, error: null };
    } catch (err: any) {
        return { data: null, error: { message: err.message || mensagemErroPadrao } };
    }
}

// Tipos
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
    /** Instante com fuso (timestamptz). Exibir com noFuso(data_hora, fusoDaConsulta(c)). */
    data_hora: string;
    especialidade?: string;
    unidade_saude?: string | { id: number; nome: string; endereco?: string; fuso_horario?: string };
};

export type UnidadeSaude = {
    id: number;
    nome: string;
    endereco?: string;
    telefone?: string;
    /** Fuso IANA da unidade, ex.: "America/Sao_Paulo". */
    fuso_horario?: string;
};

/** Fuso em que o horário de uma consulta deve ser exibido: o da unidade. */
export function fusoDaConsulta(consulta: Pick<Consulta, 'unidade_saude'>): string {
    const unidade = consulta.unidade_saude;
    return (typeof unidade === 'object' && unidade?.fuso_horario) || FUSO_PADRAO;
}

/**
 * Busca o paciente associado ao usuário autenticado
 */
export async function buscarPacientePorAuthId(authUserId: string) {
    const query = supabase
        .from('paciente')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

    const resultado = await executarQuery<Paciente>(query, 10000, 'Nenhum paciente vinculado a este usuário.');
    
    // Verificação extra para o maybeSingle (se data for null mas não houver erro de rede)
    if (!resultado.error && !resultado.data) {
        return { data: null, error: { message: 'Por favor, complete seu cadastro.', code: 'PACIENTE_NAO_ENCONTRADO' } };
    }
    
    return resultado;
}

/**
 * Busca todas as unidades de saúde cadastradas
 */
export async function buscarUnidadesSaude() {
    const query = supabase
        .from('unidade_saude')
        .select('*')
        .order('nome', { ascending: true });

    return executarQuery<UnidadeSaude[]>(query, 10000, 'Erro ao carregar a lista de unidades');
}

/**
 * Cria um novo agendamento de consulta no banco de dados
 */
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
/**
 * Busca todas as consultas de um paciente com dados da unidade de saúde
 */
export async function buscarConsultasPaciente(pacienteId: number) {
    const query = supabase
        .from('consulta')
        .select('*, unidade_saude:unidade_saude_id (id, nome, endereco, fuso_horario)')
        .eq('paciente_id', pacienteId)
        .order('data_hora', { ascending: true });

    return executarQuery<Consulta[]>(query, 15000, 'Não foi possível carregar seu histórico de consultas');
}

/**
 * Cancela uma consulta existente
 */
export async function cancelarConsulta(consultaId: number) {
    const query = supabase
        .from('consulta')
        .update({ status: 'cancelada' })
        .eq('id', consultaId)
        .select()
        .single();

    return executarQuery<Consulta>(query, 10000, 'Falha ao tentar cancelar a consulta');
}

/**
 * Busca horários ocupados para uma data e unidade específicas
 */
export async function buscarHorariosOcupados(data: string, unidadeId?: number, fuso: string = FUSO_PADRAO): Promise<string[]> {
    // RPC em vez de ler a tabela: o RLS só mostra as consultas do próprio paciente,
    // e aqui precisamos dos horários ocupados por qualquer paciente.
    const query = supabase.rpc('horarios_ocupados', {
        p_data: data,
        p_unidade_id: unidadeId || 0,
    });

    // Usamos a mestra para garantir o timeout de 10s
    const resultado = await executarQuery<string[]>(query, 10000, 'Erro ao buscar horários.');

    // Se der erro ou não vier nada, retorna lista vazia
    if (resultado.error || !resultado.data) {
        return [];
    }

    // Transforma o instante do banco no horário (HH:mm) da unidade, não do aparelho
    return resultado.data.map(dataHoraIso => noFuso(dataHoraIso, fuso).hora);
}

/**
 * Combina data e horário escolhidos (no fuso da unidade) em ISO com deslocamento
 * explícito. Ex.: ("2026-10-15", "14:00") → "2026-10-15T14:00:00-03:00"
 */
export function combinarDataHora(data: string, horario: string, fuso: string = FUSO_PADRAO): string {
    return paraIsoComFuso(data, horario, fuso);
}
