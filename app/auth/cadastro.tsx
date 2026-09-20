import React, { useState, useContext } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { CadastroStyles } from "../../src/styles/cadastroStyles";
import Fontisto from "@expo/vector-icons/Fontisto";
import { Top_Bar } from "../../src/components/topBar";
import { TextInput as PaperInput } from "react-native-paper";
import { formatCPF } from "../../src/utils/formatarCpf";
import { CadastroContext } from "../../src/contexts/CadastroContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/contexts/ThemeContext";

export default function Cadastro() {
    const { theme } = useTheme();
    const styles = CadastroStyles(theme);
    const [username, setUsername] = useState("");
    const [cpf, setCpf] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

    const { setCadastro } = useContext(CadastroContext);
    const router = useRouter();

    const validarCampos = async () => {
        try {
            if (!username.trim() || !cpf.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
                return Alert.alert("Atenção", "Todos os campos devem ser preenchidos!");
            }

            if (username.trim().length < 5) {
                return Alert.alert("Atenção", "O usuário deve ter no mínimo 5 caracteres!");
            }

            const regexCPF = /^\d{11}$/;
            if (!regexCPF.test(cpf)) {
                return Alert.alert("Atenção", "O CPF deve conter exatamente 11 dígitos numéricos!");
            }

            const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!regexEmail.test(email)) {
                return Alert.alert("Atenção", "Digite um e-mail válido!");
            }

            if (password !== confirmPassword) {
                setPassword("");
                setConfirmPassword("");
                return Alert.alert("Atenção", "As senhas não são iguais!");
            }

            const senhaForte = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
            if (!senhaForte.test(password)) {
                setPassword("");
                setConfirmPassword("");
                return Alert.alert(
                    "Atenção",
                    "A senha deve ter no mínimo 8 caracteres e conter pelo menos:\n- Uma letra maiúscula\n- Uma letra minúscula\n- Um número\n- Um caractere especial"
                );
            }

            setCadastro({ username, cpf, email, password });

            router.push("/auth/validacao");
        } catch (err) {
            console.error("Erro inesperado no cadastro:", err);
            Alert.alert("Erro", "Ocorreu um erro inesperado. Tente novamente.");
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <Top_Bar />
            <SafeAreaView style={styles.container}>
                <View style={styles.cadastro_box}>

                    {/* Usuário */}
                    <PaperInput
                        mode="outlined"
                        label={<Text style={{ color: theme.placeholder }}>Usuário</Text>}
                        value={username}
                        onChangeText={(text) => setUsername(text.replace(/\s/g, ""))}
                        placeholder="Digite seu usuário"
                        placeholderTextColor={theme.placeholder}
                        activeOutlineColor={theme.primary}
                        style={styles.inputs}
                        textColor={theme.text}
                        theme={{ roundness: 30 }}
                    />

                    {/* CPF */}
                    <PaperInput
                        mode="outlined"
                        label={<Text style={{ color: theme.placeholder }}>CPF</Text>}
                        value={formatCPF(cpf)}
                        onChangeText={(text) => setCpf(text.replace(/\D/g, "").slice(0, 11))}
                        placeholder="Digite seu CPF"
                        placeholderTextColor={theme.placeholder}
                        activeOutlineColor={theme.primary}
                        style={styles.inputs}
                        theme={{ roundness: 30 }}
                        textColor={theme.text}
                        keyboardType="numeric"
                    />

                    {/* Email */}
                    <PaperInput
                        mode="outlined"
                        label={<Text style={{ color: theme.placeholder }}>E-mail</Text>}
                        value={email}
                        onChangeText={(text) => setEmail(text.replace(/\s/g, "").toLowerCase())}
                        placeholder="Digite seu e-mail"
                        placeholderTextColor={theme.placeholder}
                        activeOutlineColor={theme.primary}
                        style={styles.inputs}
                        theme={{ roundness: 30 }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        textColor={theme.text}
                    />

                    {/* Senha */}
                    <PaperInput
                        mode="outlined"
                        label={<Text style={{ color: theme.placeholder }}>Senha</Text>}
                        value={password}
                        onChangeText={(text) => setPassword(text.replace(/\s/g, ""))}
                        placeholder="Digite sua senha"
                        placeholderTextColor={theme.placeholder}
                        activeOutlineColor={theme.primary}
                        style={styles.inputs}
                        theme={{ roundness: 30 }}
                        secureTextEntry={!passwordVisible}
                        autoCapitalize="none"
                        autoCorrect={false}
                        right={<PaperInput.Icon icon={passwordVisible ? "eye" : "eye-off"} onPress={() => setPasswordVisible(!passwordVisible)} />}
                        textColor={theme.text}
                    />

                    {/* Confirmar senha */}
                    <PaperInput
                        mode="outlined"
                        label={<Text style={{ color: theme.placeholder }}>Confirmação da senha</Text>}
                        value={confirmPassword}
                        onChangeText={(text) => setConfirmPassword(text.replace(/\s/g, ""))}
                        placeholder="Digite confirme sua senha"
                        placeholderTextColor={theme.placeholder}
                        activeOutlineColor={theme.primary}
                        style={styles.inputs}
                        theme={{ roundness: 30 }}
                        secureTextEntry={!confirmPasswordVisible}
                        autoCapitalize="none"
                        autoCorrect={false}
                        right={<PaperInput.Icon icon={confirmPasswordVisible ? "eye" : "eye-off"} onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)} />}
                        textColor={theme.text}
                    />

                    <TouchableOpacity style={styles.criar} activeOpacity={0.7} onPress={validarCampos}>
                        <Text style={styles.criar_text}>Criar conta</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.gov_box_container}>
                    <View style={styles.gov_box}>
                        <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 10 }} activeOpacity={0.7} onPress={() => Alert.alert("Work in progress!")}>
                            <Fontisto name="world" size={18} color={theme.primary} />
                            <Text style={{ color: theme.primary }}>Entrar com o gov.br</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()}>
                        <Text style={styles.links}>Já tem uma conta? Acesse aqui!</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}