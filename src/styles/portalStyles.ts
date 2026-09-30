import { StyleSheet } from 'react-native';
import { COLORS } from '../theme/colors';

export const Portal_Styles = (theme: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    content: {
        width: '100%',
        maxWidth: 720,
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    centro: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 14,
    },

    // Login
    login_box: {
        width: '90%',
        maxWidth: 420,
        alignSelf: 'center',
        marginTop: 40,
        padding: 20,
        gap: 14,
        borderWidth: 1,
        borderColor: theme.placeholder,
        backgroundColor: theme.card,
        borderRadius: 10,
    },
    titulo: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.text,
    },
    subtitulo: {
        fontSize: 14,
        color: theme.placeholder,
    },
    input: {
        backgroundColor: theme.background,
    },
    botao: {
        backgroundColor: theme.primary,
        height: 48,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    botao_desabilitado: {
        backgroundColor: theme.placeholder,
    },
    botao_texto: {
        color: COLORS.branco,
        fontSize: 16,
        fontWeight: 'bold',
    },
    link: {
        color: theme.primary,
        textAlign: 'center',
        fontSize: 14,
    },
    erro: {
        color: theme.danger,
        fontSize: 14,
        textAlign: 'center',
    },

    // Cabeçalho do servidor
    cabecalho: {
        marginTop: 16,
        padding: 14,
        borderRadius: 10,
        backgroundColor: theme.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    cabecalho_unidade: {
        color: COLORS.branco,
        fontSize: 17,
        fontWeight: 'bold',
    },
    cabecalho_servidor: {
        color: COLORS.branco,
        fontSize: 13,
        marginTop: 3,
    },
    botao_sair: {
        backgroundColor: theme.background,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 6,
    },
    botao_sair_texto: {
        color: theme.primary,
        fontWeight: 'bold',
    },

    // Agenda
    secao_titulo: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.primary,
        marginTop: 20,
        marginBottom: 8,
    },
    navegacao_dia: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    navegacao_botao: {
        padding: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: theme.placeholder,
    },
    navegacao_texto: {
        color: theme.text,
        fontWeight: 'bold',
    },
    dia_rotulo: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.text,
        textAlign: 'center',
    },
    item: {
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.placeholder,
        marginBottom: 10,
        gap: 4,
    },
    item_linha: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    item_hora: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.text,
    },
    item_texto: {
        fontSize: 14,
        color: theme.text,
    },
    item_detalhe: {
        fontSize: 13,
        color: theme.placeholder,
    },
    status: {
        fontSize: 13,
        fontWeight: 'bold',
    },
    acoes: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    acao: {
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 6,
        borderWidth: 1,
    },
    acao_texto: {
        fontSize: 13,
        fontWeight: 'bold',
    },
    vazio: {
        textAlign: 'center',
        color: theme.placeholder,
        fontStyle: 'italic',
        marginVertical: 16,
    },
});
