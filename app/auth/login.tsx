import React, { useState, useContext } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Login_Styles } from "../../src/styles/loginStyles";
import Fontisto from "@expo/vector-icons/Fontisto";
import { Top_Bar } from "../../src/components/topBar";
import { AuthContext } from "../../src/contexts/AuthContext";
import { TextInput as PaperInput } from "react-native-paper";
import { formatCPF } from "../../src/utils/formatarCpf";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useRouter } from "expo-router";

export default function Login() {
  const { theme } = useTheme();
  const styles = Login_Styles(theme);
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);

  const { signIn } = useContext(AuthContext);
  const router = useRouter();

  async function handleLogin() {
    if (!cpf || !password) {
      Alert.alert("Atenção", "Preencha CPF e senha!");
      return;
    }

    const cleanCpf = cpf.replace(/\D/g, "");
    if (cleanCpf.length !== 11) {
      Alert.alert("Atenção", "CPF inválido! Deve conter 11 dígitos.");
      return;
    }

    try {
      await signIn(cleanCpf, password);
      router.replace("/home");
    } catch (error: any) {
      Alert.alert("Erro ao entrar", error.message || "CPF ou senha incorretos.");
    }
  }
  async function testeUser() {
    setCpf("12345678900");
    setPassword("ABC123!@#ab");
  }
  return (
    <View style={{ flex: 1 }}>

      <Top_Bar />
      <SafeAreaView style={styles.container}>

        <View style={styles.login_box}>
          <View style={styles.input_box}>
            <Text style={[, styles.textos, { marginTop: 'auto' }]}>CPF</Text>
            <PaperInput
              mode="outlined"
              label={<Text style={{ color: theme.placeholder }}>CPF</Text>}
              value={formatCPF(cpf)}
              onChangeText={(text) => setCpf(text.replace(/\D/g, "").slice(0, 11))}
              placeholder="Digite seu CPF"
              keyboardType="numeric"
              textColor={theme.text}
              activeOutlineColor={theme.primary}
              style={styles.inputs}
              theme={{ roundness: 30 }}
            />
          </View>
          <View style={styles.input_box}>
            <Text style={styles.textos}>Senha</Text>
            <PaperInput
              mode="outlined"
              label={<Text style={{ color: theme.placeholder }}>Senha</Text>}
              value={password}
              onChangeText={(text) => setPassword(text.replace(/\s/g, ""))}
              placeholder="Digite sua senha"
              activeOutlineColor={theme.primary}
              style={styles.inputs}
              textColor={theme.text}
              theme={{ roundness: 30 }}
              secureTextEntry={!passwordVisible}
              right={
                <PaperInput.Icon
                  icon={passwordVisible ? "eye" : "eye-off"}
                  onPress={() => setPasswordVisible(!passwordVisible)}
                />
              }
            />
          </View>
          <View style={styles.input_box}>
            <TouchableOpacity
              style={styles.acessar}
              onPress={handleLogin}
              activeOpacity={0.7}
            >
              <Text style={styles.acessar_text}>Acessar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/recuperarSenha/recuperar")}
            >
              <Text style={styles.links}>Esqueci minha senha</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.gov_box_container}>
          <TouchableOpacity
            style={styles.gov_box}
            activeOpacity={0.7}
            onPress={testeUser}
          >
            <Text style={{ color: theme.primary }}>
              <Fontisto
                name="world"
                size={18}
                color={theme.primary}
              /> Entrar com o gov.br
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/auth/cadastro")}
            style={{ paddingHorizontal: 50 }}
          >
            <Text style={styles.links}>
              Primeiro acesso? Cadastre-se aqui
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView >
    </View>
  );
}