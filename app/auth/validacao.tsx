import React, { useState, useContext, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Validacao_Styles } from "../../src/styles/validacaoStyles";
import { Top_Bar } from "../../src/components/topBar";
import { TextInput as PaperInput } from "react-native-paper";
import { CadastroContext } from "../../src/contexts/CadastroContext";
import { supabase } from "../../src/services/supabase";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/contexts/ThemeContext";

export default function Validacao() {
  const { theme } = useTheme();
  const styles = Validacao_Styles(theme);
  const [codigo, setCodigo] = useState("");
  const { cadastro, clearCadastro } = useContext(CadastroContext);
  const router = useRouter();

  if (!cadastro) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Carregando...</Text>
      </View>
    );
  }

  const { username, cpf, email, password } = cadastro;

  function showError(message: string) {
    console.error("[Validacao] showError:", message);
    Alert.alert("Erro", message);
  }

  async function handleProximo() {

    if (codigo.length !== 6) return showError("O código deve ter 6 dígitos.");
    if (codigo !== "123456") return showError("O código informado está incorreto. Use 123456 para teste.");

    try {
      const { data, error } = await supabase.functions.invoke("register-paciente", {
        body: { nome: username, cpf, email, senha: password },
      });

      if (error || data?.error) return showError(error?.message || data?.error || "Falha ao registrar usuário.");

      Alert.alert("Sucesso", "Conta criada com sucesso!", [
        {
          text: "OK",
          onPress: () => {
            router.replace("/auth/login");
            clearCadastro();
          },
        },
      ]);
    } catch (err: any) {
      console.error("[Validacao] handleProximo catch error:", err);
      if (err?.message?.includes("fetch")) return showError("Falha de conexão. Verifique sua internet e tente novamente.");
      return showError("Ocorreu um erro inesperado. Tente novamente.");
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.container}>
        <Top_Bar />
        <View style={styles.box}>
          <Text style={styles.titulo}>Verificação</Text>
          <Text style={styles.subtitulo}>
            Insira o código de 6 dígitos enviado ao e-mail {email}
          </Text>

          <Text style={styles.label}>Código</Text>
          <PaperInput
            mode="outlined"
            value={codigo}
            onChangeText={(text) => {
              setCodigo(text.replace(/\D/g, "").slice(0, 6));
            }}
            placeholder="Digite o código"
            keyboardType="numeric"
            activeOutlineColor={theme.primary}
            style={styles.input}
            theme={{ roundness: 30 }}
          />

          <TouchableOpacity
            style={styles.botao}
            onPress={handleProximo}
            activeOpacity={0.7}
          >
            <Text style={styles.botao_text}>Concluir</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.voltar} activeOpacity={0.7}>
            <Text style={styles.voltar_text}>Reenviar o e-mail</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.voltar}
            onPress={() => {
              router.back();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.voltar_text}>Alterar e-mail</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}