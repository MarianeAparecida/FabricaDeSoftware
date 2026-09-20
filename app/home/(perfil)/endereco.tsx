import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { FontAwesome5 } from "@expo/vector-icons";
import { supabase } from "../../../src/services/supabase";
import { Top_Bar } from "../../../src/components/top_bar";
import { useTheme } from "../../../src/contexts/ThemeContext";
import { COLORS } from "@/src/theme/colors";
import { KeyboardAvoidingView } from "react-native";

export default function Endereco() {
    const { theme } = useTheme();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    const [enderecoCompleto, setEnderecoCompleto] = useState("");

    const [editData, setEditData] = useState({
        rua: "",
        numero: "",
        bairro: "",
        cidade: "",
        uf: "",
        cep: ""
    });

    useEffect(() => {
        fetchEndereco();
    }, []);

    // Função para separar endereço em partes
    function parseEndereco(endereco: string) {
        if (!endereco) return;

        // Formato esperado: "Rua XXX, Número YYY, Bairro ZZZ, Cidade - UF, CEP"
        // Você pode ajustar o parsing conforme o formato do seu banco
        const parts = endereco.split(',').map(p => p.trim());

        setEditData({
            rua: parts[0]?.replace(/^Rua\s*/i, '') || "",
            numero: parts[1]?.replace(/^Número\s*/i, '') || "",
            bairro: parts[2]?.replace(/^Bairro\s*/i, '') || "",
            cidade: parts[3]?.split('-')[0]?.trim() || "",
            uf: parts[3]?.split('-')[1]?.trim() || "",
            cep: parts[4]?.replace(/^CEP\s*/i, '') || ""
        });
    }

    // Função para concatenar endereço
    function buildEndereco(data: typeof editData) {
        const parts = [];
        if (data.rua) parts.push(`${data.rua}`);
        if (data.numero) parts.push(`Número ${data.numero}`);
        if (data.bairro) parts.push(`Bairro ${data.bairro}`);
        if (data.cidade && data.uf) parts.push(`${data.cidade} - ${data.uf}`);
        if (data.cep) parts.push(`CEP ${data.cep}`);
        return parts.join(', ');
    }

    async function fetchEndereco() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const { data, error } = await supabase
                .from('paciente')
                .select('endereco')
                .eq('email', user.email)
                .single();

            if (error) throw error;

            setEnderecoCompleto(data.endereco || "");
            parseEndereco(data.endereco);
        } catch (error: any) {
            Alert.alert("Erro", error.message || "Não foi possível carregar os dados");
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const enderecoAtualizado = buildEndereco(editData);

            const { error } = await supabase
                .from('paciente')
                .update({ endereco: enderecoAtualizado })
                .eq('email', user.email);

            if (error) throw error;

            setEnderecoCompleto(enderecoAtualizado);
            setIsEditing(false);
            Alert.alert("Sucesso", "Endereço atualizado com sucesso!");
        } catch (error: any) {
            Alert.alert("Erro", error.message || "Não foi possível atualizar o endereço");
        } finally {
            setSaving(false);
        }
    }

    function handleCancel() {
        parseEndereco(enderecoCompleto);
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
                            Endereço
                        </Text>
                    </View>

                    {/* Card de Endereço */}
                    <View style={{ backgroundColor: theme.background, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.placeholder }}>

                        {/* Ícone de localização grande */}
                        <View style={{ alignItems: "center", marginBottom: 20 }}>
                            <View style={{
                                backgroundColor: theme.primary + '20',
                                borderRadius: 50,
                                width: 80,
                                height: 80,
                                justifyContent: "center",
                                alignItems: "center"
                            }}>
                                <FontAwesome5 name="map-marked-alt" size={40} color={theme.primary} />
                            </View>
                        </View>

                        {/* CEP */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, fontWeight: "600", color: theme.primary, marginBottom: 6 }}>CEP</Text>
                            {isEditing ? (
                                <TextInput
                                    value={editData.cep}
                                    onChangeText={(text) => {
                                        // Máscara XXXXX-XXX
                                        let cleaned = text.replace(/\D/g, '');
                                        if (cleaned.length > 5) {
                                            cleaned = cleaned.slice(0, 5) + '-' + cleaned.slice(5, 8);
                                        }
                                        setEditData({ ...editData, cep: cleaned });
                                    }}
                                    style={{ borderWidth: 1, borderColor: theme.success, padding: 12, borderRadius: 8, fontSize: 16, color: theme.text }}
                                    placeholder="00000-000"
                                    keyboardType="numeric"
                                    maxLength={9}
                                />
                            ) : (
                                <View style={{ backgroundColor: theme.card, padding: 12, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 16, color: theme.text }}>{editData.cep || "Não informado"}</Text>
                                </View>
                            )}
                        </View>

                        {/* Rua */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, fontWeight: "600", color: theme.primary, marginBottom: 6 }}>RUA/AVENIDA</Text>
                            {isEditing ? (
                                <TextInput
                                    value={editData.rua}
                                    onChangeText={(text) => setEditData({ ...editData, rua: text })}
                                    style={{ borderWidth: 1, borderColor: theme.success, padding: 12, borderRadius: 8, fontSize: 16, color: theme.text }}
                                    placeholder="Digite o nome da rua"
                                />
                            ) : (
                                <View style={{ backgroundColor: theme.card, padding: 12, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 16, color: theme.text }}>{editData.rua || "Não informado"}</Text>
                                </View>
                            )}
                        </View>

                        {/* Número */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, fontWeight: "600", color: theme.primary, marginBottom: 6 }}>NÚMERO</Text>
                            {isEditing ? (
                                <TextInput
                                    value={editData.numero}
                                    onChangeText={(text) => setEditData({ ...editData, numero: text })}
                                    style={{ borderWidth: 1, borderColor: theme.success, padding: 12, borderRadius: 8, fontSize: 16, color: theme.text }}
                                    placeholder="Digite o número"
                                    keyboardType="numeric"
                                />
                            ) : (
                                <View style={{ backgroundColor: theme.card, padding: 12, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 16, color: theme.text }}>{editData.numero || "Não informado"}</Text>
                                </View>
                            )}
                        </View>

                        {/* Bairro */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, fontWeight: "600", color: theme.primary, marginBottom: 6 }}>BAIRRO</Text>
                            {isEditing ? (
                                <TextInput
                                    value={editData.bairro}
                                    onChangeText={(text) => setEditData({ ...editData, bairro: text })}
                                    style={{ borderWidth: 1, borderColor: theme.success, padding: 12, borderRadius: 8, fontSize: 16, color: theme.text }}
                                    placeholder="Digite o bairro"
                                />
                            ) : (
                                <View style={{ backgroundColor: theme.card, padding: 12, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 16, color: theme.text }}>{editData.bairro || "Não informado"}</Text>
                                </View>
                            )}
                        </View>

                        {/* Cidade e UF */}
                        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                            <View style={{ flex: 2 }}>
                                <Text style={{ fontSize: 12, fontWeight: "600", color: theme.primary, marginBottom: 6 }}>CIDADE</Text>
                                {isEditing ? (
                                    <TextInput
                                        value={editData.cidade}
                                        onChangeText={(text) => setEditData({ ...editData, cidade: text })}
                                        style={{ borderWidth: 1, borderColor: theme.success, padding: 12, borderRadius: 8, fontSize: 16, color: theme.text }}
                                        placeholder="Digite a cidade"
                                    />
                                ) : (
                                    <View style={{ backgroundColor: theme.card, padding: 12, borderRadius: 8 }}>
                                        <Text style={{ fontSize: 16, color: theme.text }}>{editData.cidade || "Não informado"}</Text>
                                    </View>
                                )}
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 12, fontWeight: "600", color: theme.primary, marginBottom: 6 }}>UF</Text>
                                {isEditing ? (
                                    <TextInput
                                        value={editData.uf}
                                        onChangeText={(text) => setEditData({ ...editData, uf: text.toUpperCase() })}
                                        style={{ borderWidth: 1, borderColor: theme.success, padding: 12, borderRadius: 8, fontSize: 16, color: theme.text }}
                                        placeholder="UF"
                                        maxLength={2}
                                        autoCapitalize="characters"
                                    />
                                ) : (
                                    <View style={{ backgroundColor: theme.card, padding: 12, borderRadius: 8 }}>
                                        <Text style={{ fontSize: 16, color: theme.text }}>{editData.uf || "N/A"}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Botões */}
                    {!isEditing ? (
                        <TouchableOpacity
                            onPress={() => setIsEditing(true)}
                            style={{ backgroundColor: theme.primary, padding: 16, borderRadius: 10, marginTop: 20, marginBottom: 30, flexDirection: "row", justifyContent: "center", alignItems: "center" }}
                        >
                            <FontAwesome5 name="edit" size={18} color={COLORS.branco} style={{ marginRight: 8 }} />
                            <Text style={{ color: COLORS.branco, fontSize: 16, fontWeight: "600" }}>Editar Endereço</Text>
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
                                <FontAwesome5 name="check" size={18} color={COLORS.branco} style={{ marginRight: 8 }} />
                                <Text style={{ color: COLORS.branco, fontSize: 16, fontWeight: "600" }}>{saving ? "Salvando..." : "Salvar"}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
