import React, { useState, useContext } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { CadastroStyles } from "../../src/styles/cadastroStyles";
import Fontisto from "@expo/vector-icons/Fontisto";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Top_Bar } from "../../src/components/topBar";
import { TextInput as PaperInput } from "react-native-paper";
import { formatCPF } from "../../src/utils/formatarCpf";
import { validarCPF } from "../../src/utils/validarCpf";
import { CadastroContext } from "../../src/contexts/CadastroContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/contexts/ThemeContext";
import { alertar } from "../../src/utils/alerta";
import { supabase } from "../../src/services/supabase";

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
    const [carregando, setCarregando] = useState(false);

    // Estados para o erro inline do CPF
    const [erroCpf, setErroCpf] = useState(false);
    const [mensagemErroCpf, setMensagemErroCpf] = useState("");

    const { setCadastro } = useContext(CadastroContext);
    const router = useRouter();

    const validarCampos = async () => {
        try {
            if (!username.trim() || !cpf.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
                return alertar("Atenção", "Todos os campos devem ser preenchidos!");
            }

            if (username.trim().length < 5) {
                return alertar("Atenção", "O usuário deve ter no mínimo 5 caracteres!");
            }

            const cleanCpf = cpf.replace(/\D/g, "");
            
            // Validação de preenchimento de 11 dígitos
            if (cleanCpf.length !== 11) {
                setErroCpf(true);
                setMensagemErroCpf("O CPF deve conter exatamente 11 dígitos numéricos.");
                return;
            }

            // Validação oficial dos dígitos verificadores (US-12)
            if (!validarCPF(cleanCpf)) {
                setErroCpf(true);
                setMensagemErroCpf("CPF inválido. Verifique os dígitos informados.");
                return;
            }

            // Se passou, limpa o estado de erro do CPF
            setErroCpf(false);
            setMensagemErroCpf("");

            const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const emailLimpo = email.trim().toLowerCase();
            if (!regexEmail.test(emailLimpo)) {
                return alertar("Atenção", "Digite um e-mail válido!");
            }

            if (password !== confirmPassword) {
                setPassword("");
                setConfirmPassword("");
                return alertar("Atenção", "As senhas não são iguais!");
            }

            const senhaForte = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
            if (!senhaForte.test(password)) {
                setPassword("");
                setConfirmPassword("");
                return alertar(
                    "Atenção",
                    "A senha deve ter no mínimo 8 caracteres e conter pelo menos:\n- Uma letra maiúscula\n- Uma letra minúscula\n- Um número\n- Um caractere especial"
                );
            }

            setCarregando(true);

            // Chama a Edge Function register-paciente para criar no Auth e inserir na tabela paciente
            const { data, error } = await supabase.functions.invoke("register-paciente", {
                body: {
                    nome: username.trim(),
                    cpf: cleanCpf,
                    email: emailLimpo,
                    senha: password,
                },
            });

            if (error) {
                throw error;
            }

            if (data?.error) {
                throw new Error(data.error);
            }

            // Guarda também no contexto caso a tela de validação precise de consultar
            setCadastro({ username, cpf: cleanCpf, email: emailLimpo, password });

            alertar("Sucesso", "Cadastro realizado!", () => {
                router.push({
                    pathname: "/auth/validacao",
                    params: { email: emailLimpo },
                });
            });
        } catch (err: any) {
            console.error("Erro inesperado no cadastro:", err);
            alertar("Erro", err?.message || "Ocorreu um erro inesperado ao registar. Tente novamente.");
        } finally {
            setCarregando(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
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

                    {/* CPF com validação inline de dígito verificador */}
                    <View style={{ width: "100%", alignItems: "center" }}>
                        <PaperInput
                            mode="outlined"
                            label={<Text style={{ color: erroCpf ? "#d32f2f" : theme.placeholder }}>CPF</Text>}
                            value={formatCPF(cpf)}
                            onChangeText={(text) => {
                                setCpf(text.replace(/\D/g, "").slice(0, 11));
                                if (erroCpf) {
                                    setErroCpf(false);
                                    setMensagemErroCpf("");
                                }
                            }}
                            placeholder="Digite seu CPF"
                            placeholderTextColor={theme.placeholder}
                            activeOutlineColor={erroCpf ? "#d32f2f" : theme.primary}
                            outlineColor={erroCpf ? "#d32f2f" : undefined}
                            style={styles.inputs}
                            theme={{ roundness: 30 }}
                            textColor={theme.text}
                            keyboardType="numeric"
                            error={erroCpf}
                            right={
                                erroCpf ? (
                                    <PaperInput.Icon icon={() => <MaterialIcons name="error-outline" size={20} color="#d32f2f" />} />
                                ) : undefined
                            }
                        />

                        {erroCpf && (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, width: "90%" }}>
                                <MaterialIcons name="error-outline" size={14} color="#d32f2f" />
                                <Text style={{ color: "#d32f2f", fontSize: 12 }}>
                                    {mensagemErroCpf}
                                </Text>
                            </View>
                        )}
                    </View>

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

                    <TouchableOpacity 
                        style={[styles.criar, carregando && { opacity: 0.7 }]} 
                        activeOpacity={0.7} 
                        onPress={validarCampos}
                        disabled={carregando}
                    >
                        {carregando ? (
                            <ActivityIndicator color={theme.background} />
                        ) : (
                            <Text style={styles.criar_text}>Criar conta</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.gov_box_container}>
                    <View style={styles.gov_box}>
                        <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 10 }} activeOpacity={0.7} onPress={() => alertar("Work in progress!")}>
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