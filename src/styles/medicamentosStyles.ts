import { StyleSheet } from 'react-native';

export const Medicamentos_Styles = (theme : any) =>StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: theme.text,
        textAlign: 'center',
        marginVertical: 5,
    },
    resultsContainer: {
        marginTop: 12,
        marginHorizontal: 10,
        paddingHorizontal: 6,
        flex: 1,
    },
    item: {
        padding: 10,
        borderRadius: 12,
        marginBottom: 10,
        borderColor: theme.placeholder,
        borderWidth: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.text,
    },
    itemInfo: {
        fontSize: 14,
        color: theme.placeholder,
        marginTop: 4,
    },

    unidadeName: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.text,
        maxWidth:'65%', //Ajuste da distância da unidade ao status
        paddingTop: 5
    },

    emptyText: {
        textAlign: 'center',
        color: theme.placeholder,
        marginTop: 20,
        fontStyle: 'italic',
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statusContainer: {
        flexDirection: 'row',
        position:'absolute',
        top:'45%',
        right: 0
    },

    statusText: {
        fontSize: 14,
        fontWeight: '600',
    },

});
