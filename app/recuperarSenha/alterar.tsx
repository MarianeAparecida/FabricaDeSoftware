import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as Linking from "expo-linking";
import { Alterar_Styles } from "../../src/styles/alterarStyles";
import { Top_Bar } from "../../src/components/topBar";
import { TextInput as PaperInput } from "react-native-paper";
import { useRouter } from "expo-router";
import BarraProgresso from "../../src/components/barra_progresso";
import { supabase } from "../../src/services/supabase";
import { AuthContext } from "../../src/contexts/AuthContext";
import { useTheme } from "../../src/contexts/ThemeContext";

export default function Alterar() {
  const { theme } = useTheme();
  const styles = Alterar_Styles(theme);
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initPasswordRecovery = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();

        if (!initialUrl) {
          Alert.alert("Erro", "Link de recuperação inválido ou expirado.");
          router.replace("/auth/login");
          return;
        }
        const url = initialUrl.includes("#") ? initialUrl.replace("#", "?") : initialUrl;
        const parsed = Linking.parse(url);

        const access_token = parsed.queryParams?.access_token as string;
        const refresh_token = parsed.queryParams?.refresh_token as string;

        if (!access_token || !refresh_token) {
          console.error("[ERROR] Tokens missing in link", parsed.queryParams);
          Alert.alert("Erro", "Link de recuperação inválido ou expirado.");
          router.replace("/auth/login");
          return;
        }

        const { error } = await supabase.auth.setSession({ access_token, refresh_token });

        if (error) {
          console.error("[ERROR] Failed to set session:", error);
          Alert.alert("Erro", "Não foi possível validar o link de recuperação.");
          router.replace("/auth/login");
          return;
        }

        setReady(true);
      } catch (err) {
        console.error("[ERROR] initPasswordRecovery failed:", err);
        Alert.alert("Erro", "Ocorreu um erro inesperado. Tente novamente.");
        router.replace("/auth/login");
      } finally {
        setLoading(false);
      }
    };

    void initPasswordRecovery();
  }, []);

  const validarCampos = async () => {
    const { logged } = useContext(AuthContext);
    const router = useRouter();
    if (!senha.trim() || !confirmar.trim()) {
      Alert.alert("Atenção", "Preencha todos os campos!");
      return;
    }

    if (senha !== confirmar) {
      Alert.alert("Atenção", "As senhas não são iguais!");
      setConfirmar("");
      return;
    }

    const senhaForte = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!senhaForte.test(senha)) {
      Alert.alert(
        "Atenção",
        "A senha deve ter no mínimo 8 caracteres e conter pelo menos:\n- Uma letra maiúscula\n- Uma letra minúscula\n- Um número\n- Um caractere especial"
      );
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.updateUser({ password: senha });

      if (error) {
        console.error("[ERROR] Failed to update password:", error);
        Alert.alert("Erro", "Não foi possível redefinir a senha. Tente novamente.");
        return;
      }

      Alert.alert("Sucesso", "Senha redefinida com sucesso!");

      useEffect(() => {//teste para redirecionar apos alterar a senha
        if (logged) {
          router.replace("/home/(perfil)");
        } else {
          router.replace("/auth/login");
        }
      }, [logged]);
      return null;

    } catch (err) {
      console.error("[ERROR] Unexpected error during password update:", err);
      Alert.alert("Erro", "Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  if (!ready)
    return (
      <View style={styles.container}>
        <Top_Bar />
        <Text style={styles.subtitulo}>Verificando link de recuperação de senha...</Text>
      </View>
    );



  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <View style={styles.container}>
        <Top_Bar />
        <BarraProgresso etapaAtual={3} totalEtapas={3} />

        <View style={styles.box}>
          <Text style={styles.titulo}>Nova Senha</Text>
          <Text style={styles.subtitulo}>Crie uma nova senha segura para sua conta</Text>

          <Text style={styles.label}>Senha</Text>
          <PaperInput
            mode="outlined"
            value={senha}
            onChangeText={setSenha}
            placeholder="Digite sua nova senha"
            secureTextEntry={!mostrarSenha}
            activeOutlineColor={theme.primary}
            style={styles.input}
            theme={{ roundness: 30 }}
            textColor={theme.text}
            right={
              <PaperInput.Icon
                icon={mostrarSenha ? "eye" : "eye-off"}
                onPress={() => setMostrarSenha(!mostrarSenha)}
              />
            }
          />

          <Text style={styles.label}>Confirmar senha</Text>
          <PaperInput
            mode="outlined"
            value={confirmar}
            onChangeText={setConfirmar}
            placeholder="Repita sua senha"
            secureTextEntry={!mostrarConfirmar}
            activeOutlineColor={theme.primary}
            style={styles.input}
            textColor={theme.text}
            theme={{ roundness: 30 }}
            right={
              <PaperInput.Icon
                icon={mostrarConfirmar ? "eye" : "eye-off"}
                onPress={() => setMostrarConfirmar(!mostrarConfirmar)}
              />
            }
          />

          <TouchableOpacity style={styles.botao} onPress={validarCampos}>
            <Text style={styles.botao_text}>Finalizar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.voltar} onPress={() => router.back()}>
            <Text style={styles.voltar_text}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}