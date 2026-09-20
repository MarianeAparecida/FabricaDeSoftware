import { View, Text, TouchableOpacity, ActivityIndicator, FlatList } from "react-native";
import React, { useEffect, useState } from "react";
import { buscarUnidadesSaude, UnidadeSaude } from "../../../src/services/consultas";
import { useTheme } from "../../../src/contexts/ThemeContext";
import { router } from "expo-router";
import { Top_Bar } from "../../../src/components/topBar";
import { useQuery } from "@/src/services/useQuery";
import BarraProgresso from "../../../src/components/barra_progresso";

export default function SelecionarUnidade() {
    const { theme } = useTheme();

    const { data: unidades, loading, error, refresh } = useQuery(buscarUnidadesSaude);

    const handleSelecionar = (unidade: UnidadeSaude) => {
        router.push({
            pathname: "/home/(agendar)/proficional",
            params: {
                unidadeSelecionada: JSON.stringify(unidade)
            }
        });
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            <Top_Bar />
            <View style={{ flex: 1, padding: 20 }}>
                <BarraProgresso etapaAtual={1} totalEtapas={3} />

                <Text
                    style={{
                        fontSize: 22,
                        fontWeight: "bold",
                        color: theme.primary,
                        marginBottom: 20,
                        marginTop: 10
                    }}
                >
                    Selecione a Unidade de Saúde
                </Text>

                {loading ? (
                    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text style={{ color: theme.text, marginTop: 10 }}>Carregando unidades...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={unidades}
                        keyExtractor={item => item.id.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={{
                                    padding: 15,
                                    borderBottomWidth: 1,
                                    borderBottomColor: theme.placeholder
                                }}
                                onPress={() => handleSelecionar(item)}
                            >
                                <Text style={{ fontSize: 16, color: theme.text, fontWeight: "600" }}>
                                    {item.nome}
                                </Text>

                                {item.endereco && (
                                    <Text
                                        style={{
                                            fontSize: 13,
                                            color: theme.placeholder,
                                            marginTop: 3
                                        }}
                                    >
                                        {item.endereco}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        )}
                    />
                )}

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
