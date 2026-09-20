import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, } from "react-native";
import { Recuperar_Styles } from "../../src/styles/recuperarStyles";
import { Top_Bar } from "../../src/components/topBar";
import { TextInput as PaperInput } from "react-native-paper";
import { useNavigation, useRouter } from "expo-router";
import BarraProgresso from "../../src/components/barra_progresso";
import { formatCPF } from "../../src/utils/formatarCpf";
import { supabase } from "../../src/services/supabase";
import { useTheme } from "../../src/contexts/ThemeContext";

export default function Recuperar() {
  const { theme } = useTheme();
  const styles = Recuperar_Styles(theme);
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleProximo() {
    const cleanCpf = cpf.replace(/\D/g, "");
    if (!cpf || cleanCpf.length !== 11) {
      Alert.alert("Atenção", "Digite um CPF válido com 11 dígitos.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("send-email", {
        body: { cpf: cleanCpf, action: "reset" },
      });

      if (error) {
        console.error("Erro ao chamar função:", error);
        Alert.alert("Erro", "Não foi possível enviar o e-mail. Tente novamente mais tarde.");
      } else {
        Alert.alert(
          "Sucesso",
          "Um e-mail de recuperação foi enviado para o usuário com esse CPF, se existir.",
          [
            {
              text: "OK",
              onPress: () =>
                router.push({
                  pathname: "/recuperarSenha/validar",
                  params: { cpf: cleanCpf },
                }),
            },
          ]
        );
      }
    } catch (err) {
      console.error("Erro inesperado:", err);
      Alert.alert("Erro", "Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Top_Bar />
      <BarraProgresso etapaAtual={1} totalEtapas={3}/>

      <View style={styles.box}>
        <View style={styles.conteudo}>
          <Text style={styles.titulo}>Recuperação de Senha</Text>
          <Text style={styles.subtitulo}>
            Digite seu CPF para receber um código de verificação
          </Text>

          <Text style={styles.label}>CPF</Text>
          <PaperInput
            mode="outlined"
            label={<Text style={{ color: theme.placeholder }}>CPF</Text>}
            value={formatCPF(cpf)}
            onChangeText={(text) => setCpf(text.replace(/\D/g, '').slice(0, 11))}
            placeholder="Digite seu CPF"
            keyboardType="numeric"
            activeOutlineColor={theme.primary}
            textColor={theme.text}
            style={styles.input}
            theme={{ roundness: 30 }}
          />

          <TouchableOpacity
            style={styles.botao}
            onPress={handleProximo}
            activeOpacity={0.7}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <Text style={styles.botao_text}>Próximo</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.link}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}