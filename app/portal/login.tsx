import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { TextInput as PaperInput } from "react-native-paper";
import { useRouter } from "expo-router";
import { Top_Bar } from "../../src/components/topBar";
import { Portal_Styles } from "../../src/styles/portalStyles";
import { useTheme } from "../../src/contexts/ThemeContext";
import { usePortal } from "../../src/contexts/PortalContext";
import { entrarPortal } from "../../src/services/portal";

export default function PortalLogin() {
  const { theme } = useTheme();
  const styles = Portal_Styles(theme);
  const router = useRouter();
  const { recarregar } = usePortal();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [entrando, setEntrando] = useState(false);
  // Mensagem na própria tela: Alert.alert não aparece na versão web.
  const [erro, setErro] = useState<string | null>(null);

  async function handleEntrar() {
    if (!email.trim() || !senha) {
      setErro("Informe e-mail e senha.");
      return;
    }
    setErro(null);
    setEntrando(true);
    try {
      await entrarPortal(email.trim().toLowerCase(), senha);
      await recarregar();
      router.replace("/portal");
    } catch (err: any) {
      setErro(err?.message || "Não foi possível entrar.");
    } finally {
      setEntrando(false);
    }
  }

  return (
    <View style={styles.container}>
      <Top_Bar />
      <View style={styles.login_box}>
        <View>
          <Text style={styles.titulo}>Portal da unidade</Text>
          <Text style={styles.subtitulo}>Acesso para servidores das UBS</Text>
        </View>

        <PaperInput
          mode="outlined"
          label={<Text style={{ color: theme.placeholder }}>E-mail institucional</Text>}
          value={email}
          onChangeText={(t) => setEmail(t.replace(/\s/g, ""))}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textColor={theme.text}
          activeOutlineColor={theme.primary}
          style={styles.input}
          theme={{ roundness: 30 }}
        />
        <PaperInput
          mode="outlined"
          label={<Text style={{ color: theme.placeholder }}>Senha</Text>}
          value={senha}
          onChangeText={setSenha}
          secureTextEntry={!senhaVisivel}
          autoCapitalize="none"
          textColor={theme.text}
          activeOutlineColor={theme.primary}
          style={styles.input}
          theme={{ roundness: 30 }}
          onSubmitEditing={handleEntrar}
          right={<PaperInput.Icon icon={senhaVisivel ? "eye" : "eye-off"} onPress={() => setSenhaVisivel(!senhaVisivel)} />}
        />

        {erro && <Text style={styles.erro}>{erro}</Text>}

        <TouchableOpacity
          style={[styles.botao, entrando && styles.botao_desabilitado]}
          onPress={handleEntrar}
          disabled={entrando}
          activeOpacity={0.7}
        >
          {entrando ? <ActivityIndicator color={theme.background} /> : <Text style={styles.botao_texto}>Entrar</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/auth/login")} activeOpacity={0.7}>
          <Text style={styles.link}>Sou paciente</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
