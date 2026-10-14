import { Alert, Platform } from "react-native";

// Alert.alert não faz nada no react-native-web; na web usamos o alert do navegador.
// `aoFechar` roda quando o usuário dispensa o aviso, nas duas plataformas.
export function alertar(titulo: string, mensagem: string, aoFechar?: () => void) {
  if (Platform.OS === "web") {
    (globalThis as any).alert(`${titulo}\n\n${mensagem}`);
    aoFechar?.();
    return;
  }
  Alert.alert(titulo, mensagem, [{ text: "OK", onPress: aoFechar }]);
}
