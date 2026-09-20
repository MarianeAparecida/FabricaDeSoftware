import { StyleSheet } from "react-native";

export const Validacao_Styles =(themes : any) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: themes.background,
  },
  box: {
    width: "90%",
    height: "50%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: themes.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themes.placeholder,
    marginTop: "auto",
    marginBottom: "auto",
    gap: 15,
    transform: [{ translateY: -70 }],
  },
  titulo: {
    color: themes.primary,
    fontSize: 20,
    fontWeight: "900",
  },
  subtitulo: {
    fontSize: 14,
    color: themes.placeholder,
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
    backgroundColor: themes.primary,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  botao_text: {
    color: themes.background,
    fontSize: 18,
    fontWeight: "bold",
  },
  voltar: {
    marginTop: 10,
  },
  voltar_text: {
    color: themes.primary,
    fontWeight: "bold",
  },
});
