import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Recuperar_Styles } from "../../src/styles/recuperarStyles";
import { Top_Bar } from "../../src/components/topBar";
import { TextInput as PaperInput } from "react-native-paper";
import { useRouter } from "expo-router";
import BarraProgresso from "../../src/components/barra_progresso";
import { supabase } from "../../src/services/supabase";
import { alertar } from "../../src/utils/alerta";
import { useTheme } from "../../src/contexts/ThemeContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function Recuperar() {
  const { theme } = useTheme();
  const styles = Recuperar_Styles(theme);
  const [email, setEmail] = useState("");
  const [erroEmail, setErroEmail] = useState(false);
  const [mensagemErro, setMensagemErro] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function handleEnviarLink() {
    const emailLimpo = email.trim().toLowerCase();

    // 1. Validação de formato do e-mail
    if (!emailLimpo || !regexEmail.test(emailLimpo)) {
      setMensagemErro("Digite um e-mail válido. Exemplo: nome@email.com");
      setErroEmail(true);
      return;
    }

    setErroEmail(false);
    setMensagemErro("");
    setLoading(true);

    try {
      // 2. Validação no Banco de Dados: Verifica se o e-mail está cadastrado na tabela paciente
      const { data: paciente, error: erroConsulta } = await supabase
        .from("paciente")
        .select("id")
        .eq("email", emailLimpo)
        .maybeSingle();

      if (erroConsulta) {
        console.error("Erro ao verificar e-mail:", erroConsulta);
      }

      // Se não encontrar o e-mail no banco, aciona o estado de erro
      if (!paciente) {
        setMensagemErro("Este e-mail não está cadastrado na base de dados.");
        setErroEmail(true);
        setLoading(false);
        return;
      }

      // 3. Se o e-mail existe no banco, dispara o reset de senha pelo Supabase Auth
      const { error: erroReset } = await supabase.auth.resetPasswordForEmail(emailLimpo, {
        redirectTo: `${window.location.origin}/recuperarSenha/alterar`,
      });

      if (erroReset) {
        console.error("Erro ao enviar e-mail de recuperação:", erroReset);
        throw erroReset;
      }

      // Avança para a tela de confirmação repassando o e-mail
      router.push({
        pathname: "/recuperarSenha/validar",
        params: { email: emailLimpo },
      });
    } catch (err: any) {
      console.error("Erro inesperado:", err);
      alertar("Erro", err?.message || "Ocorreu um erro inesperado ao enviar o e-mail. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Top_Bar />
      <BarraProgresso etapaAtual={1} totalEtapas={3} />

      <View style={styles.box}>
        <View style={styles.conteudo}>
          <Text style={styles.titulo}>Recuperar senha</Text>
          <Text style={styles.subtitulo}>
            Digite o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.
          </Text>

          <Text style={[styles.label, erroEmail && { color: "#d32f2f" }]}>E-mail</Text>
          
          <PaperInput
            mode="outlined"
            label={<Text style={{ color: erroEmail ? "#d32f2f" : theme.placeholder }}>E-mail</Text>}
            value={email}
            onChangeText={(text) => {
              setEmail(text.replace(/\s/g, "").toLowerCase());
              if (erroEmail) {
                setErroEmail(false);
                setMensagemErro("");
              }
            }}
            placeholder="Ex.: nome@email.com"
            placeholderTextColor={theme.placeholder}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            activeOutlineColor={erroEmail ? "#d32f2f" : theme.primary}
            outlineColor={erroEmail ? "#d32f2f" : undefined}
            textColor={theme.text}
            style={styles.input}
            theme={{ roundness: 30 }}
            error={erroEmail}
            right={
              erroEmail ? (
                <PaperInput.Icon icon={() => <MaterialIcons name="error-outline" size={20} color="#d32f2f" />} />
              ) : undefined
            }
          />

          {erroEmail && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, marginBottom: 8 }}>
              <MaterialIcons name="error-outline" size={14} color="#d32f2f" />
              <Text style={{ color: "#d32f2f", fontSize: 12 }}>
                {mensagemErro}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.botao, { marginTop: erroEmail ? 10 : 20 }, loading && { opacity: 0.7 }]}
            onPress={handleEnviarLink}
            activeOpacity={0.7}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <Text style={styles.botao_text}>Enviar link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace("/auth/login")}
            activeOpacity={0.7}
            style={{ marginTop: 15, alignItems: "center" }}
          >
            <Text style={[styles.link, { color: theme.primary, fontWeight: "600" }]}>
              Voltar para o login
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}