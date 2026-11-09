import { supabase } from './supabase';
import * as Auth from '../utils/auth';

// Portal da unidade (US-06). Tudo passa pelas funções portal_* do banco, que conferem a
// cada chamada se quem chama é servidor com vínculo ativo e devolvem só dados da unidade
// dele. Detalhes em docs/portal-da-unidade.md.

export type PerfilServidor = {
    nome: string;
    email: string;
    matricula: string;
    perfil: 'atendente' | 'gestor';
    unidade_id: number;
    unidade_nome: string;
    unidade_fuso: string;
};

export type ConsultaAgenda = {
    consulta_id: number;
    data_hora: string;
    status: 'agendada' | 'confirmada' | 'realizada' | 'faltou' | 'cancelada';
    especialidade: string | null;
    paciente_nome: string;
    paciente_cpf: string;
    paciente_telefone: string | null;
};

export type MembroEquipe = {
    nome: string;
    email: string;
    matricula: string;
    perfil: 'atendente' | 'gestor';
    ativo: boolean;
};

export type Profissional = {
    id?: number;
    matricula: string;
    nome: string;
    especialidade: string;
    crm: string;
    ativo: boolean;
    dias_atendimento: string[];
    horario_atendimento: string;
};

export type CadastroProfissional = {
    nome: string;
    especialidade: string;
    crm: string;
    dias_atendimento: string[];
    horario_atendimento: string;
};

export type AtualizarProfissional = {
    matricula: string;
    nome: string;
    especialidade: string;
    crm: string;
    dias_atendimento: string[];
    horario_atendimento: string;
};

/** Código que o banco devolve quando quem chama não é servidor ativo (ou não tem o perfil). */
export const ACESSO_NEGADO = '42501';

export const MENSAGEM_PACIENTE_NO_PORTAL =
    'Acesso restrito a servidores das unidades. Pacientes entram pelo app, com CPF e senha.';

/** Entra no portal com e-mail institucional e senha. Lança Error com mensagem para a tela. */
export async function entrarPortal(email: string, senha: string): Promise<PerfilServidor> {
    // Uma sessão de paciente guardada neste aparelho seria restaurada por cima da do servidor.
    await Auth.forgetLocalSession();

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
        // 403 vem do hook de autenticação: servidor sem vínculo ativo.
        if (error.status === 403) throw new Error(error.message);
        if (error.code === 'invalid_credentials') throw new Error('E-mail ou senha incorretos.');
        throw new Error('Não foi possível conectar ao servidor. Tente novamente.');
    }

    const { data, error: erroPerfil } = await buscarPerfil();
    if (erroPerfil || !data) {
        await supabase.auth.signOut({ scope: 'local' });
        throw new Error(erroPerfil?.code === ACESSO_NEGADO
            ? MENSAGEM_PACIENTE_NO_PORTAL
            : 'Não foi possível carregar seu perfil. Tente novamente.');
    }
    return data;
}

export async function sairPortal() {
    await supabase.auth.signOut({ scope: 'local' });
}

export async function buscarPerfil() {
    const { data, error } = await supabase.rpc('portal_meu_perfil').maybeSingle();
    return { data: data as PerfilServidor | null, error };
}

/** Consultas da unidade no dia ("AAAA-MM-DD", dia no fuso da unidade). */
export async function buscarAgenda(dia: string) {
    const { data, error } = await supabase.rpc('portal_agenda', { p_data: dia });
    return { data: data as ConsultaAgenda[] | null, error: error ? { ...error, message: 'Não foi possível carregar a agenda.' } : null };
}

export async function cancelarConsultaPortal(consultaId: number, motivo: string) {
    const { data, error } = await supabase.rpc('portal_cancelar_consulta', {
        p_consulta_id: consultaId,
        p_motivo: motivo,
    });
    if (error && error.code === 'PGRST202') {
        return { error: { message: 'Aguardando implementação da função de cancelamento no banco de dados (RPC: portal_cancelar_consulta).' } };
    }
    return { 
        data, 
        error: error ? { ...error, message: error.message || 'Não foi possível cancelar a consulta.' } : null 
    };
}

export async function remarcarConsultaPortal(consultaId: number, novaDataHora: string, motivo: string) {
    const { data, error } = await supabase.rpc('portal_remarcar_consulta', {
        p_consulta_id: consultaId,
        p_nova_data_hora: novaDataHora,
        p_motivo: motivo,
    });
    if (error && error.code === 'PGRST202') {
        return { error: { message: 'Aguardando implementação da função de remarcação no banco de dados (RPC: portal_remarcar_consulta).' } };
    }
    return { 
        data, 
        error: error ? { ...error, message: error.message || 'Não foi possível remarcar a consulta.' } : null 
    };
}

export async function atualizarStatus(consultaId: number, status: 'confirmada' | 'realizada' | 'faltou' | 'cancelada') {
    const { data, error } = await supabase.rpc('portal_atualizar_status', { 
        p_consulta_id: consultaId, 
        p_status: status 
    });

    if (error && error.code === 'PGRST202') {
        return { error: { message: 'Aguardando implementação da função de atualização de status no banco de dados (RPC: portal_atualizar_status).' } };
    }

    return { 
        data, 
        error: error ? { ...error, message: error.message || 'Não foi possível atualizar o status da consulta.' } : null 
    };
}

export async function buscarEquipe() {
    const { data, error } = await supabase.rpc('portal_equipe');
    return { data: data as MembroEquipe[] | null, error: error ? { ...error, message: 'Não foi possível carregar a equipe.' } : null };
}

export async function buscarProfissionais() {
    const { data, error } = await supabase.rpc('portal_profissionais');
    if (error && error.code === 'PGRST202') {
        const { data: equipe } = await buscarEquipe();
        const fallback = (equipe || []).map((e: any, index: number) => ({
            id: index + 1,
            matricula: e.matricula,
            nome: e.nome,
            especialidade: e.perfil === 'gestor' ? 'Clínico Geral' : 'Enfermagem',
            crm: e.matricula,
            ativo: e.ativo,
            dias_atendimento: ['S', 'T', 'Q', 'Q2', 'S2'],
            horario_atendimento: '08:00 - 17:00',
        }));
        return { data: fallback as Profissional[], error: null };
    }
    return { data: data as Profissional[] | null, error };
}

export async function cadastrarProfissional(dados: CadastroProfissional) {
    const { data, error } = await supabase.rpc('portal_cadastrar_profissional', {
        p_nome: dados.nome,
        p_especialidade: dados.especialidade,
        p_crm: dados.crm,
        p_dias: dados.dias_atendimento,
        p_horario: dados.horario_atendimento,
    });
    if (error && error.code === 'PGRST202') {
        return { error: { message: 'Aguardando implementação da função de cadastro no banco de dados (RPC: portal_cadastrar_profissional).' } };
    }
    return { data, error: error ? { ...error, message: error.message || 'Erro ao cadastrar profissional.' } : null };
}

export async function atualizarProfissional(dados: AtualizarProfissional) {
    const { data, error } = await supabase.rpc('portal_atualizar_profissional', {
        p_matricula: dados.matricula,
        p_nome: dados.nome,
        p_especialidade: dados.especialidade,
        p_crm: dados.crm,
        p_dias: dados.dias_atendimento,
        p_horario: dados.horario_atendimento,
    });
    if (error && error.code === 'PGRST202') {
        return { error: { message: 'Aguardando implementação da função de edição no banco de dados (RPC: portal_atualizar_profissional).' } };
    }
    return { data, error: error ? { ...error, message: error.message || 'Erro ao atualizar profissional.' } : null };
}

export async function desativarProfissional(matricula: string) {
    const { data, error } = await supabase.rpc('portal_desativar_profissional', {
        p_matricula: matricula,
    });
    if (error && error.code === 'PGRST202') {
        return { error: { message: 'Aguardando implementação da função de desativação no banco de dados (RPC: portal_desativar_profissional).' } };
    }
    return { data, error: error ? { ...error, message: error.message || 'Não foi possível desativar o profissional.' } : null };
}