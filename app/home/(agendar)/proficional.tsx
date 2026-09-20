import { View, Text, TouchableOpacity, FlatList } from "react-native";
import React, { useState } from "react";
import { useTheme } from "../../../src/contexts/ThemeContext";
import { router, useLocalSearchParams } from "expo-router";
import { Top_Bar } from "../../../src/components/topBar";
import BarraProgresso from "../../../src/components/barra_progresso";

const tiposProfissionais = [
    { id: 1, nome: "Clínico Geral" },
    { id: 2, nome: "Dentista" },
    { id: 3, nome: "Psicólogo" },
    { id: 4, nome: "Pediatra" },
    { id: 5, nome: "Ortopedista" },
    { id: 6, nome: "Ginecologista" },
    { id: 7, nome: "Cardiologista" },
    { id: 8, nome: "Nutricionista" },
];

export default function SelecionarTipo() {
    const { theme } = useTheme();
    const params = useLocalSearchParams();

    // O valor recebido é a STRING JSON da unidade
    const unidadeSelecionada = params.unidadeSelecionada; 

    // O estado armazena o nome do profissional selecionado (string)
    const [selecionado, setSelecionado] = useState<string | null>(null);

    const handleNext = () => {
        // Validação: precisa ter um profissional e a unidade (que é a string JSON)
        if (!selecionado) {
            alert("Por favor, selecione um tipo de profissional.");
            return;
        }
        // Se a unidadeSelecionada não for uma string (ou for null/undefined), algo deu errado na tela anterior
        if (typeof unidadeSelecionada !== 'string') {
            alert("Erro: Dados da unidade de saúde não encontrados.");
            router.back(); // Volta para a tela anterior
            return;
        }
        router.push({
            pathname: "/home/agendar",
            params: {
                tipo: selecionado,
                // Repassando a STRING JSON da unidade para a próxima tela
                unidadeSelecionada: unidadeSelecionada 
            }
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
                    Selecione o Tipo de Profissional
                </Text>

                <FlatList
                    data={tiposProfissionais}
                    keyExtractor={item => item.id.toString()}
                    renderItem={({ item }) => {
                        const ativo = selecionado === item.nome;

                        return (
                            <TouchableOpacity
                                onPress={() => setSelecionado(item.nome)}
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
                            </TouchableOpacity>
                        );
                    }}
                />

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