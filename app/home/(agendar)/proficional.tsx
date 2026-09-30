import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert } from "react-native";
import React, { useState } from "react";
import { useTheme } from "../../../src/contexts/ThemeContext";
import { router, useLocalSearchParams } from "expo-router";
import { Top_Bar } from "../../../src/components/topBar";
import BarraProgresso from "../../../src/components/barra_progresso";
import { useQuery } from "@/src/services/useQuery";
import {
    buscarProfissionaisPorUnidade,
    Profissional,
    UnidadeSaude,
} from "../../../src/services/consultas";

function parseUnidade(value: string | null): UnidadeSaude | null {
    if (!value) return null;

    try {
        return JSON.parse(value) as UnidadeSaude;
    } catch {
        return null;
    }
}

export default function SelecionarProfissional() {
    const { theme } = useTheme();
    const params = useLocalSearchParams();
    const unidadeParam = typeof params.unidadeSelecionada === "string" ? params.unidadeSelecionada : null;
    const unidadeSelecionada = parseUnidade(unidadeParam);

    const [selecionado, setSelecionado] = useState<Profissional | null>(null);

    const { data: profissionais, loading, error } = useQuery<Profissional[]>(async () => {
        if (!unidadeSelecionada) {
            return { data: [], error: null };
        }

        return buscarProfissionaisPorUnidade(unidadeSelecionada.id);
    }, [unidadeSelecionada?.id]);

    const handleNext = () => {
        if (!unidadeParam || !unidadeSelecionada) {
            Alert.alert("Erro", "Dados da unidade de saúde não encontrados.");
            router.back();
            return;
        }

        if (!selecionado) {
            Alert.alert("Atenção", "Selecione um profissional.");
            return;
        }

        router.push({
            pathname: "/home/agendar",
            params: {
                unidadeSelecionada: unidadeParam,
                profissionalSelecionado: JSON.stringify(selecionado),
            },
        });
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            <Top_Bar />
            <View style={{ flex: 1, padding: 20 }}>
                <BarraProgresso etapaAtual={2} totalEtapas={3} />

                <Text
                    style={{
                        fontSize: 22,
                        fontWeight: "bold",
                        color: theme.primary,
                        marginBottom: 20,
                        marginTop: 10
                    }}
                >
                    Selecione o Profissional
                </Text>

                {loading ? (
                    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text style={{ color: theme.text, marginTop: 10 }}>Carregando profissionais...</Text>
                    </View>
                ) : error ? (
                    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                        <Text style={{ color: theme.danger, textAlign: "center" }}>{error}</Text>
                    </View>
                ) : (
                    <FlatList
                        data={profissionais || []}
                        keyExtractor={item => item.id.toString()}
                        ListEmptyComponent={
                            <Text style={{ color: theme.text, textAlign: "center", marginTop: 20 }}>
                                Nenhum profissional cadastrado para esta unidade.
                            </Text>
                        }
                        renderItem={({ item }) => {
                            const ativo = selecionado?.id === item.id;

                            return (
                                <TouchableOpacity
                                    onPress={() => setSelecionado(item)}
                                    style={{
                                        padding: 15,
                                        borderRadius: 8,
                                        marginBottom: 10,
                                        borderWidth: ativo ? 2 : 1,
                                        borderColor: ativo ? theme.primary : theme.placeholder,
                                        backgroundColor: ativo ? theme.primary + "20" : theme.card
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 16,
                                            fontWeight: "600",
                                            color: theme.text
                                        }}
                                    >
                                        {item.nome}
                                    </Text>

                                    {item.especialidade && (
                                        <Text style={{ fontSize: 13, color: theme.placeholder, marginTop: 4 }}>
                                            {item.especialidade}
                                        </Text>
                                    )}

                                    {item.registro_conselho && (
                                        <Text style={{ fontSize: 12, color: theme.placeholder, marginTop: 2 }}>
                                            Registro: {item.registro_conselho}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                    />
                )}

                <TouchableOpacity
                    onPress={handleNext}
                    disabled={!selecionado}
                    style={{
                        backgroundColor: selecionado ? theme.primary : theme.placeholder,
                        padding: 14,
                        borderRadius: 8,
                        alignItems: "center",
                        marginTop: 15
                    }}
                >
                    <Text
                        style={{
                            color: theme.background,
                            fontSize: 16,
                            fontWeight: "bold"
                        }}
                    >
                        Próximo
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{
                        backgroundColor: theme.danger,
                        padding: 12,
                        borderRadius: 6,
                        marginTop: 20,
                        alignItems: "center"
                    }}
                >
                    <Text style={{ color: theme.background, fontWeight: "bold", fontSize: 16 }}>
                        Voltar
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
