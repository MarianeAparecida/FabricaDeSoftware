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

export async function atualizarStatus(consultaId: number, status: 'confirmada' | 'realizada' | 'faltou' | 'cancelada') {
    const { error } = await supabase.rpc('portal_atualizar_status', { p_consulta_id: consultaId, p_status: status });
    return { error };
}

export async function buscarEquipe() {
    const { data, error } = await supabase.rpc('portal_equipe');
    return { data: data as MembroEquipe[] | null, error: error ? { ...error, message: 'Não foi possível carregar a equipe.' } : null };
}
