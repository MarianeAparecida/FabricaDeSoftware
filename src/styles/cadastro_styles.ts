import React from "react";
import { StyleSheet } from "react-native";
import { COLORS } from "../theme/colors";


export const CadastroStyles = (theme: any) => StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: theme.background,
    },
    cadastro_box: {
        width: '90%',
        height: '65%',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        borderWidth: 1,
        borderColor: theme.placeholder,
        backgroundColor: theme.card,
        borderRadius: 10,
        alignSelf: 'center',
        marginTop: 'auto',
        marginBottom: 'auto', 
        transform: [{ translateY: -88 }], 
    },
    inputs: {
        width: '90%',
        backgroundColor: theme.card,
        borderRadius: 30,
    },
    criar: {
        width: '80%',
        height: 50,
        backgroundColor: theme.primary,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    criar_text: {
        color: COLORS.branco,
        fontSize: 18,
        fontWeight: 'bold',
    },
    gov_box_container: {
        width: '100%',
        position: 'absolute',
        bottom: 40,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
    },
    gov_box: {
        width: '90%',
        height: 50,
        borderWidth: 1,
        borderColor: theme.primary,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 30,
        alignSelf: 'center',

    },
    links: {
        color: theme.primary,
        fontSize: 12,
        fontWeight: 'bold',
    }
});