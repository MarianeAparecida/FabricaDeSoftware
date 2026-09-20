import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { Top_Bar } from "../../../src/components/topBar";
import { useTheme } from "../../../src/contexts/ThemeContext";

export default function SobreApp() {
    const { theme } = useTheme();
    const router = useRouter();

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            <Top_Bar />
            <ScrollView style={{ flex: 1, padding: 16 }}>
                {/* Header com botão voltar */}
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
                    <TouchableOpacity onPress={() => router.push('/home/(perfil)')} style={{ padding: 8 }}>
                        <FontAwesome5 name="arrow-left" size={20} color={theme.primary} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 24, fontWeight: "700", color: theme.text, marginLeft: 12 }}>
                        Sobre o Aplicativo
                    </Text>
                </View>

                {/* Logo/Ícone do App */}
                <View style={{ alignItems: "center", marginBottom: 30 }}>
                    <View style={{ 
                        backgroundColor: theme.primary + '20', 
                        borderRadius: 80, 
                        width: 120, 
                        height: 120, 
                        justifyContent: "center", 
                        alignItems: "center",
                        marginBottom: 16
                    }}>
                        <MaterialCommunityIcons name="hospital-building" size={60} color={theme.primary} />
                    </View>
                    <Text style={{ fontSize: 26, fontWeight: "700", color: theme.primary, marginBottom: 4 }}>
                        AgendaSUS
                    </Text>
                    <Text style={{ fontSize: 14, color: theme.placeholder }}>
                        Versão 1.0.0
                    </Text>
                </View>

                {/* Card com descrição */}
                <View style={{ backgroundColor: theme.background, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: theme.placeholder, marginBottom: 20 }}>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: theme.text, marginBottom: 12 }}>
                        O que é o AgendaSUS?
                    </Text>
                    <Text style={{ fontSize: 15, color: theme.text, lineHeight: 24, textAlign: "justify" }}>
                        O <Text style={{ fontWeight: "600" }}>AgendaSUS</Text> é um aplicativo desenvolvido para facilitar o acesso dos cidadãos aos serviços de saúde pública. 
                        Através dele, você pode agendar consultas, visualizar seu histórico médico, acessar informações sobre medicamentos e muito mais.
                    </Text>
                </View>

                {/* Objetivo */}
                <View style={{ backgroundColor: theme.primary + '10', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                        <FontAwesome5 name="bullseye" size={20} color={theme.primary} style={{ marginRight: 10 }} />
                        <Text style={{ fontSize: 18, fontWeight: "700", color: theme.primary }}>
                            Nosso Objetivo
                        </Text>
                    </View>
                    <Text style={{ fontSize: 15, color: theme.text, lineHeight: 24, textAlign: "justify" }}>
                        Tornar o acesso à saúde pública mais simples e eficiente, digitalizando processos e colocando o paciente no centro do cuidado. 
                        Acreditamos que a tecnologia pode transformar a experiência dos usuários do SUS.
                    </Text>
                </View>

                {/* Informações técnicas */}
                <View style={{ backgroundColor: theme.background, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: theme.placeholder, marginBottom: 30 }}>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: theme.text, marginBottom: 16 }}>
                        Informações Técnicas
                    </Text>
                    
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.success }}>
                        <Text style={{ fontSize: 14, color: theme.placeholder }}>Versão</Text>
                        <Text style={{ fontSize: 14, color: theme.text, fontWeight: "600" }}>1.0.0</Text>
                    </View>

                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.success }}>
                        <Text style={{ fontSize: 14, color: theme.placeholder }}>Desenvolvido por</Text>
                        <Text style={{ fontSize: 14, color: theme.text, fontWeight: "600" }}>Equipe 06</Text>
                    </View>

                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.success }}>
                        <Text style={{ fontSize: 14, color: theme.placeholder }}>Plataforma</Text>
                        <Text style={{ fontSize: 14, color: theme.text, fontWeight: "600" }}>React Native</Text>
                    </View>

                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 14, color: theme.placeholder }}>Última atualização</Text>
                        <Text style={{ fontSize: 14, color: theme.text, fontWeight: "600" }}>Dezembro 2025</Text>
                    </View>
                </View>

                {/* Rodapé */}
                <View style={{ alignItems: "center", marginBottom: 30 }}>
                    <Text style={{ fontSize: 12, color: theme.placeholder, textAlign: "center" }}>
                        © 2025 AgendaSUS. Todos os direitos reservados.
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.placeholder, textAlign: "center", marginTop: 8 }}>
                        Sistema desenvolvido para facilitar o acesso à saúde pública
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}
