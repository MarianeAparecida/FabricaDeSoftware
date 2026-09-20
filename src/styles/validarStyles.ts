import { StyleSheet } from "react-native";

export const Validar_Styles = (theme : any) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: theme.background,
  },
  box: {
    width: "90%",
    height: "50%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.placeholder,
    marginTop: "auto",
    marginBottom: "auto",
    gap: 15,
    transform: [{ translateY: -70 }],
  },
  titulo: {
    color: theme.primary,
    fontSize: 20,
    fontWeight: "900",
  },
  subtitulo: {
    fontSize: 14,
    color: theme.placeholder,
    textAlign: "center",
    marginHorizontal: 20,
  },
  label: {
    alignSelf: "flex-start",
    marginLeft: "5%",
    fontSize: 16,
  },
  input: {
    width: "90%",
    height: 50,
    backgroundColor: "#ebeaea",
    borderRadius: 30,
    paddingLeft: 20,
  },
  botao: {
    width: "90%",
    height: 50,
    backgroundColor: theme.primary,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  botao_text: {
    color: theme.background,
    fontSize: 18,
    fontWeight: "bold",
  },
  voltar: {
    marginTop: 10,
  },
  voltar_text: {
    color: theme.primary,
    fontWeight: "bold",
  },
});
