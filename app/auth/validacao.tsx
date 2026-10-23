import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../src/services/supabase";
import { useTheme } from "../../src/contexts/ThemeContext";
import { alertar } from "../../src/utils/alerta";
import { Top_Bar } from "../../src/components/topBar";
import { Validacao_Styles } from "../../src/styles/validacaoStyles";

export default function Validacao() {
  const { theme } = useTheme();
  const styles = Validacao_Styles(theme);
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  
  const email = params.email || "";
  const [enviando, setEnviando] = useState(false);

  // Função para enviar/reenviar o e-mail de confirmação usando o método nativo do Supabase
  async function handleReenviar() {
    if (!email) {
      return alertar("Erro", "E-mail não encontrado. Refaça o cadastro.");
    }

    try {
      setEnviando(true);

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        throw error;
      }

      alertar("Sucesso", "E-mail de confirmação enviado! Verifique sua caixa de entrada ou o Mailpit.");
    } catch (err: any) {
      console.error("[Validacao] Erro ao enviar:", err);
      alertar("Erro", err?.message || "Não foi possível enviar o e-mail.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Top_Bar />
      <View style={styles.container}>
        <View style={styles.box}>
          <Text style={styles.titulo}>Confirme seu e-mail</Text>
          
          <Text style={styles.subtitulo}>
            Sua conta foi cadastrada com sucesso! Para começar, clique no botão abaixo para disparar o link de ativação para o endereço:{"\n"}
            <Text style={{ fontWeight: "bold", color: theme.text }}>{email || "seu endereço cadastrado"}</Text>
          </Text>

          <Text style={[styles.subtitulo, { marginTop: 8, marginBottom: 20 }]}>
            Caso o e-mail não chegue na sua caixa de entrada ou no Mailpit local, basta clicar no botão novamente para reenviá-lo. Após receber, abra a mensagem e clique no link para ativar a sua conta.
          </Text>

          {/* Botão de Enviar / Reenviar E-mail */}
          <TouchableOpacity
            style={[styles.botao, enviando && { opacity: 0.7 }]}
            onPress={handleReenviar}
            disabled={enviando}
            activeOpacity={0.7}
          >
            {enviando ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <Text style={styles.botao_text}>Enviar / Reenviar e-mail de confirmação</Text>
            )}
          </TouchableOpacity>

          {/* Botão para ir direto ao login */}
          <TouchableOpacity
            style={styles.voltar}
            onPress={() => router.replace("/auth/login")}
            activeOpacity={0.7}
          >
            <Text style={styles.voltar_text}>Já confirmou? Ir para o Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}