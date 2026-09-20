import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView } from "react-native";
import { useRouter } from "expo-router";
import { FontAwesome5 } from "@expo/vector-icons";
import { supabase } from "../../../src/services/supabase";
import { COLORS } from "../../../src/theme/colors";
import { Top_Bar } from "../../../src/components/top_bar";
import { formatCPF } from "../../../src/components/format_cpf";
import { useTheme } from "../../../src/contexts/ThemeContext";

export default function DadosPessoais() {
    const { theme } = useTheme();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Converter de YYYY-MM-DD para DD/MM/YYYY
    const formatDateToBR = (date: string) => {
        if (!date) return "";
        // Remove a parte de hora se existir e pega apenas a data
        const dateOnly = date.split('T')[0];
        const [year, month, day] = dateOnly.split('-');
        return `${day}/${month}/${year}`;
    };

    // Converter de DD/MM/YYYY para YYYY-MM-DD
    const formatDateToISO = (date: string) => {
        if (!date) return "";
        const [day, month, year] = date.split('/');
        return `${year}-${month}-${day}`;
    };

    const [userData, setUserData] = useState({
        nome: "",
        nome_social: "",
        data_nascimento: "",
        cpf: "",
        genero: "",
        telefone: "",
        cartao_sus: "",
        email: ""
    });

    const [editData, setEditData] = useState({
        nome: "",
        nome_social: "",
        data_nascimento: "",
        genero: "",
        telefone: "",
        cartao_sus: ""
    });

    useEffect(() => {
        fetchUserData();
    }, []);

    async function fetchUserData() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const { data, error } = await supabase
                .from('paciente')
                .select('*')
                .eq('email', user.email)
                .single();

            if (error) throw error;

            setUserData(data);
            setEditData({
                nome: data.nome || "",
                nome_social: data.nome_social || "",
                data_nascimento: formatDateToBR(data.data_nascimento) || "",
                genero: data.genero || "",
                telefone: data.telefone || "",
                cartao_sus: data.cartao_sus || ""
            });
        } catch (error: any) {
            Alert.alert("Erro", error.message || "Não foi possível carregar os dados");
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!editData.nome.trim()) {
            Alert.alert("Erro", "O nome não pode estar vazio");
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('paciente')
                .update({
                    nome: editData.nome.trim(),
                    nome_social: editData.nome_social.trim(),
                    data_nascimento: formatDateToISO(editData.data_nascimento.trim()),
                    genero: editData.genero.trim(),
                    telefone: editData.telefone.trim(),
                    cartao_sus: editData.cartao_sus.trim()
                })
                .eq('email', userData.email);

            if (error) throw error;

            // Atualizar userData com a data no formato ISO do banco
            setUserData({
                ...userData,
                nome: editData.nome,
                nome_social: editData.nome_social,
                data_nascimento: formatDateToISO(editData.data_nascimento.trim()),
                genero: editData.genero,
                telefone: editData.telefone,
                cartao_sus: editData.cartao_sus
            });
            setIsEditing(false);
            Alert.alert("Sucesso", "Dados atualizados com sucesso!");
        } catch (error: any) {
            Alert.alert("Erro", error.message || "Não foi possível atualizar os dados");
        } finally {
            setSaving(false);
        }
    }

    function handleCancel() {
        setEditData({
            nome: userData.nome || "",
            nome_social: userData.nome_social || "",
            data_nascimento: formatDateToBR(userData.data_nascimento) || "",
            genero: userData.genero || "",
            telefone: userData.telefone || "",
            cartao_sus: userData.cartao_sus || ""
        });
        setIsEditing(false);
    }

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.background }}>
                <Top_Bar />
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            <Top_Bar />
            <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
                <ScrollView style={{ flex: 1, padding: 16 }}>
                    {/* Header com botão voltar */}
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
                        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
                            <FontAwesome5 name="arrow-left" size={20} color={theme.primary} />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 24, fontWeight: "700", color: theme.text, marginLeft: 12 }}>
                            Dados Pessoais
                        </Text>
                    </View>

                    {/* Card com os dados */}
                    <View style={{ backgroundColor: theme.background, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.placeholder }}>

                        {/* CPF - Não editável */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, fontWeight: "600", color: theme.primary, marginBottom: 6 }}>CPF</Text>
                            <View style={{ backgroundColor: theme.card, padding: 12, borderRadius: 8 }}>
                                <Text style={{ fontSize: 16, color: theme.placeholder }}>{formatCPF(userData.cpf) || "Não informado"}</Text>
                            </View>
                        </View>

                        {/* Nome - Não editável */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, fontWeight: "600", color: theme.primary, marginBottom: 6 }}>NOME COMPLETO</Text>
                            <View style={{ backgroundColor: theme.card, padding: 12, borderRadius: 8 }}>
                                <Text style={{ fontSize: 16, color: theme.placeholder }}>{userData.nome || "Não informado"}</Text>
                            </View>
                        </View>

                        {/* Nome Social */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, fontWeight: "600", color: theme.primary, marginBottom: 6 }}>NOME SOCIAL</Text>
                            {isEditing ? (
                                <TextInput
                                    value={editData.nome_social}
                                    onChangeText={(text) => setEditData({ ...editData, nome_social: text })}
                                    style={{ borderWidth: 1, borderColor: theme.success, padding: 12, borderRadius: 8, fontSize: 16, color: theme.text }}
                                    placeholder="Digite seu nome social (opcional)"
                                />
                            ) : (
                                <View style={{ backgroundColor: theme.card, padding: 12, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 16, color: theme.text }}>{userData.nome_social || "Não informado"}</Text>
                                </View>
                            )}
                        </View>

                        {/* Data de Nascimento */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, fontWeight: "600", color: theme.primary, marginBottom: 6 }}>DATA DE NASCIMENTO</Text>
                            {isEditing ? (
                                <TextInput
                                    value={editData.data_nascimento}
                                    onChangeText={(text) => {
                                        // Máscara DD/MM/YYYY
                                        let cleaned = text.replace(/\D/g, '');
                                        if (cleaned.length >= 2) {
                                            cleaned = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
                                        }
                                        if (cleaned.length >= 5) {
                                            cleaned = cleaned.slice(0, 5) + '/' + cleaned.slice(5, 9);
                                        }
                                        setEditData({ ...editData, data_nascimento: cleaned });
                                    }}
                                    style={{ borderWidth: 1, borderColor: theme.success, padding: 12, borderRadius: 8, fontSize: 16, color: theme.text }}
                                    placeholder="DD/MM/AAAA"
                                    keyboardType="numeric"
                                    maxLength={10}
                                />
                            ) : (
                                <View style={{ backgroundColor: theme.card, padding: 12, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 16, color: theme.text }}>
                                        {userData.data_nascimento ? new Date(userData.data_nascimento).toLocaleDateString('pt-BR') : "Não informado"}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Gênero */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, fontWeight: "600", color: theme.primary, marginBottom: 6 }}>GÊNERO</Text>
                            {isEditing ? (
                                <TextInput
                                    value={editData.genero}
                                    onChangeText={(text) => setEditData({ ...editData, genero: text })}
                                    style={{ borderWidth: 1, borderColor: theme.success, padding: 12, borderRadius: 8, fontSize: 16, color: theme.text }}
                                    placeholder="Digite seu gênero"
                                />
                            ) : (
                                <View style={{ backgroundColor: theme.card, padding: 12, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 16, color: theme.text }}>{userData.genero || "Não informado"}</Text>
                                </View>
                            )}
                        </View>

                        {/* Email - Não editável */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, fontWeight: "600", color: theme.primary, marginBottom: 6 }}>E-MAIL</Text>
                            <View style={{ backgroundColor: theme.card, padding: 12, borderRadius: 8 }}>
                                <Text style={{ fontSize: 16, color: theme.placeholder }}>{userData.email || "Não informado"}</Text>
                            </View>
                        </View>

                        {/* Telefone */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, fontWeight: "600", color: theme.primary, marginBottom: 6 }}>TELEFONE</Text>
                            {isEditing ? (
                                <TextInput
                                    value={editData.telefone}
                                    onChangeText={(text) => {
                                        // Máscara (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
                                        let cleaned = text.replace(/\D/g, '');
                                        let formatted = '';
                                        if (cleaned.length > 0) {
                                            formatted = '(' + cleaned.substring(0, 2);
                                            if (cleaned.length >= 2) {
                                                formatted += ') ';
                                            }
                                            if (cleaned.length > 2) {
                                                if (cleaned.length <= 10) {
                                                    formatted += cleaned.substring(2, 6);
                                                    if (cleaned.length > 6) {
                                                        formatted += '-' + cleaned.substring(6, 10);
                                                    }
                                                } else {
                                                    formatted += cleaned.substring(2, 7);
                                                    if (cleaned.length > 7) {
                                                        formatted += '-' + cleaned.substring(7, 11);
                                                    }
                                                }
                                            }
                                        }
                                        setEditData({ ...editData, telefone: formatted });
                                    }}
                                    style={{ borderWidth: 1, borderColor: theme.success, padding: 12, borderRadius: 8, fontSize: 16, color: theme.text }}
                                    placeholder="(XX) XXXXX-XXXX"
                                    keyboardType="phone-pad"
                                    maxLength={15}
                                />
                            ) : (
                                <View style={{ backgroundColor: theme.card, padding: 12, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 16, color: theme.text }}>{userData.telefone || "Não informado"}</Text>
                                </View>
                            )}
                        </View>

                        {/* Cartão SUS */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, fontWeight: "600", color: theme.primary, marginBottom: 6 }}>CARTÃO SUS</Text>
                            {isEditing ? (
                                <TextInput
                                    value={editData.cartao_sus}
                                    onChangeText={(text) => setEditData({ ...editData, cartao_sus: text })}
                                    style={{ borderWidth: 1, borderColor: theme.success, padding: 12, borderRadius: 8, fontSize: 16, color: theme.text }}
                                    placeholder="Digite o número do cartão SUS"
                                    keyboardType="numeric"
                                />
                            ) : (
                                <View style={{ backgroundColor: theme.card, padding: 12, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 16, color: theme.text }}>{userData.cartao_sus || "Não informado"}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Botões */}
                    {!isEditing ? (
                        <TouchableOpacity
                            onPress={() => setIsEditing(true)}
                            style={{ backgroundColor: theme.primary, padding: 16, borderRadius: 10, marginTop: 20, marginBottom: 30, flexDirection: "row", justifyContent: "center", alignItems: "center" }}
                        >
                            <FontAwesome5 name="edit" size={18} color={theme.background} style={{ marginRight: 8 }} />
                            <Text style={{ color: theme.background, fontSize: 16, fontWeight: "600" }}>Editar Dados</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={{ flexDirection: "row", gap: 12, marginTop: 20, marginBottom: 30 }}>
                            <TouchableOpacity
                                onPress={handleCancel}
                                disabled={saving}
                                style={{ flex: 1, borderWidth: 2, borderColor: theme.danger, padding: 16, borderRadius: 10, alignItems: "center" }}
                            >
                                <Text style={{ color: theme.danger, fontSize: 16, fontWeight: "600" }}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={saving}
                                style={{ flex: 1, backgroundColor: theme.success, padding: 16, borderRadius: 10, flexDirection: "row", justifyContent: "center", alignItems: "center", opacity: saving ? 0.6 : 1 }}
                            >
                                <FontAwesome5 name="check" size={18} color={theme.background} style={{ marginRight: 8 }} />
                                <Text style={{ color: theme.background, fontSize: 16, fontWeight: "600" }}>{saving ? "Salvando..." : "Salvar"}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
