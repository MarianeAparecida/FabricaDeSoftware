import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  TouchableOpacity,
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
import { useTheme } from "../../src/contexts/ThemeContext";
import { alertar } from "../../src/utils/alerta";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

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
  const [linkInvalido, setLinkInvalido] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erroConfirmar, setErroConfirmar] = useState(false);

  // Validações em tempo real para o checklist
  const temOitoCaracteres = senha.length >= 8;
  const temMaiuscula = /[A-Z]/.test(senha);
  const temNumero = /\d/.test(senha);
  const temEspecial = /[\W_]/.test(senha);

  useEffect(() => {
    const initPasswordRecovery = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();

        if (!initialUrl) {
          setLinkInvalido(true);
          return;
        }

        const url = initialUrl.includes("#") ? initialUrl.replace("#", "?") : initialUrl;
        const parsed = Linking.parse(url);

        const codigoErro = (parsed.queryParams?.error_code || parsed.queryParams?.error) as string | undefined;
        if (codigoErro) {
          setLinkInvalido(true);
          return;
        }

        const access_token = parsed.queryParams?.access_token as string;
        const refresh_token = parsed.queryParams?.refresh_token as string;

        if (!access_token || !refresh_token) {
          setLinkInvalido(true);
          return;
        }

        const { error } = await supabase.auth.setSession({ access_token, refresh_token });

        if (error) {
          setLinkInvalido(true);
          return;
        }

        setReady(true);
      } catch (err) {
        console.error("[ERROR] initPasswordRecovery failed:", err);
        setLinkInvalido(true);
      } finally {
        setLoading(false);
      }
    };

    void initPasswordRecovery();
  }, []);

  const validarESalvar = async () => {
    if (!senha.trim() || !confirmar.trim()) {
      alertar("Atenção", "Preencha todos os campos!");
      return;
    }

    if (senha !== confirmar) {
      setErroConfirmar(true);
      return;
    }

    setErroConfirmar(false);

    const senhaForte = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!senhaForte.test(senha)) {
      alertar(
        "Atenção",
        "A senha deve ter no mínimo 8 caracteres e conter pelo menos:\n- Uma letra maiúscula\n- Uma letra minúscula\n- Um número\n- Um caractere especial"
      );
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password: senha });

      if (error) {
        throw error;
      }

      // Ativa a tela de sucesso personalizada do protótipo
      setSucesso(true);
    } catch (err: any) {
      console.error("[ERROR] Failed to update password:", err);
      alertar("Erro", err?.message || "Não foi possível redefinir a senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // 1. Estado Visual: Link Expirado ou Inválido (Figma)
  if (linkInvalido) {
    return (
      <View style={styles.container}>
        <Top_Bar />
        <View style={styles.box}>
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: "#fee2e2",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <MaterialIcons name="link-off" size={28} color="#dc2626" />
            </View>
            <Text style={styles.titulo}>Link expirado ou inválido</Text>
            <Text style={[styles.subtitulo, { textAlign: "center", marginTop: 8 }]}>
              Não foi possível usar este link. Ele pode ter vencido ou já ter sido usado.{"\n\n"}
              Peça um novo link para criar sua senha com segurança.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.botao}
            onPress={() => router.replace("/recuperarSenha/recuperar")}
            activeOpacity={0.7}
          >
            <Text style={styles.botao_text}>Pedir novo link</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginTop: 20, alignItems: "center" }}
            onPress={() => router.replace("/auth/login")}
            activeOpacity={0.7}
          >
            <Text style={{ color: theme.primary, fontWeight: "600" }}>Voltar para o login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 2. Estado Visual: Senha Alterada com Sucesso (Figma)
  if (sucesso) {
    return (
      <View style={styles.container}>
        <Top_Bar />
        <View style={styles.box}>
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: "#d1fae5",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <MaterialCommunityIcons name="check" size={32} color="#059669" />
            </View>
            <Text style={styles.titulo}>Senha alterada com sucesso!</Text>
            <Text style={[styles.subtitulo, { textAlign: "center", marginTop: 8 }]}>
              Tudo pronto. Entre na sua conta com a nova senha para acessar seus agendamentos.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.botao}
            onPress={() => router.replace("/auth/login")}
            activeOpacity={0.7}
          >
            <Text style={styles.botao_text}>Ir para o login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 3. Tela Principal: Criar Nova Senha com Checklist e Regras
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
          <Text style={styles.titulo}>Criar nova senha</Text>
          <Text style={styles.subtitulo}>Escolha uma senha e digite a mesma senha nos dois campos.</Text>

          <Text style={styles.label}>Nova senha</Text>
          <PaperInput
            mode="outlined"
            value={senha}
            onChangeText={(text) => {
              setSenha(text.replace(/\s/g, ""));
            }}
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

          {/* Caixa de checklist de regras idêntica ao Figma */}
          <View
            style={{
              backgroundColor: "#f0fdf4",
              borderRadius: 12,
              padding: 12,
              marginVertical: 10,
              borderWidth: 1,
              borderColor: "#dcfce7",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#166534", marginBottom: 6 }}>
              Sua senha atende às regras:
            </Text>
            <View style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <MaterialIcons
                  name={temOitoCaracteres ? "check-circle" : "radio-button-unchecked"}
                  size={16}
                  color={temOitoCaracteres ? "#16a34a" : "#9ca3af"}
                />
                <Text style={{ fontSize: 12, color: temOitoCaracteres ? "#166534" : "#4b5563" }}>
                  Mínimo de 8 caracteres
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <MaterialIcons
                  name={temMaiuscula ? "check-circle" : "radio-button-unchecked"}
                  size={16}
                  color={temMaiuscula ? "#16a34a" : "#9ca3af"}
                />
                <Text style={{ fontSize: 12, color: temMaiuscula ? "#166534" : "#4b5563" }}>
                  Uma letra maiúscula
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <MaterialIcons
                  name={temNumero ? "check-circle" : "radio-button-unchecked"}
                  size={16}
                  color={temNumero ? "#16a34a" : "#9ca3af"}
                />
                <Text style={{ fontSize: 12, color: temNumero ? "#166534" : "#4b5563" }}>
                  Um número
                </Text>
              </View>
            </View>
          </View>

          <Text style={[styles.label, erroConfirmar && { color: "#dc2626" }]}>Confirmar nova senha</Text>
          <PaperInput
            mode="outlined"
            value={confirmar}
            onChangeText={(text) => {
              setConfirmar(text.replace(/\s/g, ""));
              if (erroConfirmar) setErroConfirmar(false);
            }}
            placeholder="Repita sua senha"
            secureTextEntry={!mostrarConfirmar}
            activeOutlineColor={erroConfirmar ? "#dc2626" : theme.primary}
            outlineColor={erroConfirmar ? "#dc2626" : undefined}
            style={styles.input}
            textColor={theme.text}
            theme={{ roundness: 30 }}
            error={erroConfirmar}
            right={
              <PaperInput.Icon
                icon={mostrarConfirmar ? "eye" : "eye-off"}
                onPress={() => setMostrarConfirmar(!mostrarConfirmar)}
              />
            }
          />

          {erroConfirmar && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, marginBottom: 8 }}>
              <MaterialIcons name="error-outline" size={14} color="#dc2626" />
              <Text style={{ color: "#dc2626", fontSize: 12 }}>
                As senhas não coincidem. Digite a mesma senha nos dois campos.
              </Text>
            </View>
          )}

          <TouchableOpacity style={[styles.botao, { marginTop: 10 }]} onPress={validarESalvar}>
            <Text style={styles.botao_text}>Salvar nova senha</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginTop: 15, alignItems: "center" }}
            onPress={() => router.replace("/auth/login")}
            activeOpacity={0.7}
          >
            <Text style={{ color: theme.primary, fontWeight: "600" }}>Voltar para o login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}