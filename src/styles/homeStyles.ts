import { StyleSheet } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

export const Home_Styles = (theme: any) => StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.background,
        },

        header_box: {
            marginTop: 10,
        },

        titulo: {
            fontSize: 30,
            fontWeight: "bold",
            color: theme.text,
        },

        data: {
            fontSize: 14,
            marginTop: 2,
        },

        consulta_box: {
            backgroundColor: theme.card,
            borderRadius: 10,
            padding: 20,
            marginVertical: 10,
        },

        consulta_header: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 5,
        },

        consulta_titulo: {
            fontSize: 16,
            color: theme.text,
            fontWeight: "bold",
        },

        consulta_data: {
            color:  theme.placeholder,
            fontWeight: "bold",
        },

        consulta_info: {
            color: theme.text,
        },

        consulta_local: {
            color: theme.text,
            marginBottom: 8,
        },

        consulta_status: {
            backgroundColor: theme.verde,
            alignSelf: "flex-start",
            paddingHorizontal: 18,
            paddingVertical: 3,
            borderRadius: 6,
        },

        consulta_status_text: {
            color: theme.background,
            fontWeight: "bold",
            fontSize: 13,
        },

        servicos_titulo: {
            fontSize: 20,
            marginTop: 5,
            color: theme.text,
        },

        servicos_container: {
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-around",
            marginTop: 10,
            paddingBottom: 100,
        },

        servico_item: {
            width: "48%",
            backgroundColor: theme.card,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 20,
            marginVertical: 4,
        },

        servico_text: {
            color: theme.text,
            fontSize: 14,
            marginTop: 8,
            textAlign: "center",
        },
    });
