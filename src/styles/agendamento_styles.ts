import { StyleSheet } from "react-native";
import { COLORS } from "../theme/colors";
import { Dimensions } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

const SCREEN_WIDTH = Dimensions.get('window').width;

export const Agendamento_Styles = (theme: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
        alignItems: 'center',
    },
    calendario: {
        width: SCREEN_WIDTH * 0.95,
        marginTop: 10,
        marginBottom: 20,
        backgroundColor: 'transparent',
        alignSelf: 'center',
    },
    horarios_box: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 2,
    },
    horarios: {
        backgroundColor: theme.primary,
        width: '30%',
        flexGrow: 1,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        margin: 2,
        borderColor: theme.placeholder,
        borderWidth: 0.2,
    },
    horarios_texto: {
        color: theme.text,
        fontWeight: 'bold',
    },
});