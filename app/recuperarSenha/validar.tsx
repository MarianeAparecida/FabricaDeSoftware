import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Validar_Styles } from "../../src/styles/validarStyles";
import { Top_Bar } from "../../src/components/topBar";
import { useRouter, useLocalSearchParams } from "expo-router";
import BarraProgresso from "../../src/components/barra_progresso";
import { supabase } from "../../src/services/supabase";
import { alertar } from "../../src/utils/alerta";
import { useTheme } from "../../src/contexts/ThemeContext";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

export default function Validar() {
  const { theme } = useTheme();
  const styles = Validar_Styles(theme);
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email || "";

  const [loading, setLoading] = useState(false);
  const [contador, setContador] = useState(60);
  const [podeReenviar, setPodeReenviar] = useState(false);

  // Efeito para o temporizador de reenvio (60 segundos)
  useEffect(() => {
    if (contador > 0) {
      const timer = setTimeout(() => setContador(contador - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setPodeReenviar(true);
    }
  }, [contador]);

  async function handleResend() {
    if (!email) {
      alertar("Erro", "E-mail não disponível para reenviar.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/recuperarSenha/alterar`,
      });

      if (error) throw error;

      alertar("Sucesso", "E-mail de recuperação reenviado com sucesso.");
      // Reinicia o contador após o reenvio bem-sucedido
      setContador(60);
      setPodeReenviar(false);
    } catch (err) {
      console.error(err);
      alertar("Erro", "Não foi possível reenviar o e-mail. Tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Top_Bar />
      <BarraProgresso etapaAtual={2} totalEtapas={3} />

      <View style={styles.box}>
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          {/* Caixa com o ícone de e-mail alinhada ao protótipo */}
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: theme.primary + "15",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <MaterialCommunityIcons name="email-outline" size={28} color={theme.primary} />
          </View>

          <Text style={styles.titulo}>Confira seu e-mail</Text>
          <Text style={[styles.subtitulo, { textAlign: "center", marginTop: 8 }]}>
            Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha. Verifique também a caixa de spam.
          </Text>
        </View>

        {/* Botão de Reenviar E-mail */}
        <TouchableOpacity
          style={[styles.botao, (!podeReenviar || loading) && { opacity: 0.7 }]}
          onPress={handleResend}
          activeOpacity={0.7}
          disabled={!podeReenviar || loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.background} />
          ) : (
            <Text style={styles.botao_text}>Reenviar e-mail</Text>
          )}
        </TouchableOpacity>

        {/* Texto do temporizador regressivo */}
        {!podeReenviar ? (
          <Text style={{ textAlign: "center", marginTop: 12, color: theme.placeholder, fontSize: 13 }}>
            Reenviar em {contador} segundos
          </Text>
        ) : null}

        {/* Voltar para o login */}
        <TouchableOpacity
          style={{ marginTop: 20, alignItems: "center" }}
          onPress={() => router.replace("/auth/login")}
          activeOpacity={0.7}
        >
          <Text style={{ color: theme.primary, fontWeight: "600", fontSize: 14 }}>
            Voltar para o login
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}