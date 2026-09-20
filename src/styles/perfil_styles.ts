import { StyleSheet } from "react-native";
import { COLORS } from "../theme/colors";

export const Perfil_Styles = (theme: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    content: {
        paddingHorizontal: 10,
    },
    header: {
        marginBottom: 24
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        color: theme.text,
        marginTop: 10,
        marginBottom: 5,
    },
    subText: {
        fontSize: 16,
        color: theme.placeholder,
        marginTop: 2
    },
    card: {
        backgroundColor: theme.background,
        borderRadius: 15,
        padding: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: theme.placeholder,
    },
    cardTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10, color: theme.text },
    menuItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderColor: theme.success,
    },
    menuLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12
    },
    menuText: {
        fontSize: 17,
        color: theme.text
    },
    sair: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.danger,
        padding: 11,
        borderRadius: 14,
        marginTop: 10,
        marginBottom: 20
    },
    sairText: {
        color: COLORS.branco,
        fontWeight: "600",
        fontSize: 17
    },
});
