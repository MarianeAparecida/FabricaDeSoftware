import React, { useContext } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Home_Styles } from "../../src/styles/homeStyles";
import { Top_Bar } from "../../src/components/topBar";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import AntDesign from "@expo/vector-icons/AntDesign";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useRouter, useFocusEffect } from "expo-router";
import { AuthContext } from "../../src/contexts/AuthContext";
import { buscarPacientePorAuthId, buscarConsultasPaciente } from "../../src/services/consultas";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useQuery } from "../../src/services/useQuery"; // Certifique-se de que o caminho está correto

interface Consulta {
    data: string;
    hora: string;
    especialidade?: string;
    local?: string;
    status: string;
}

export default function Home() {
    const { theme } = useTheme();
    const styles = Home_Styles(theme);

    const router = useRouter();
    const { user } = useContext(AuthContext);

    const dataAtual = (() => {
        const hoje = new Date();
        const dataFormatada = hoje.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
        });
        return dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
    })();

    // Substituindo useState e carregarProximaConsulta pelo useQuery
    const { data: consulta, loading, refresh } = useQuery<Consulta | null>(async () => {
        if (!user) {
            return { data: null, error: null };
        }

        try {
            const { data: paciente } = await buscarPacientePorAuthId(user.id);

            if (!paciente) {
                return { data: null, error: null };
            }

            const { data: consultas } = await buscarConsultasPaciente(paciente.id);

            if (consultas && consultas.length > 0) {
                const agora = new Date();

                const proximaConsulta = consultas
                    .filter((c) => {
                        const dataConsulta = new Date(c.data_hora);
                        return dataConsulta >= agora && c.status === "agendada";
                    })
                    .sort(
                        (a, b) =>
                            new Date(a.data_hora).getTime() -
                            new Date(b.data_hora).getTime()
                    )[0];

                if (proximaConsulta) {
                    const [dataParte] = proximaConsulta.data_hora.split("T");
                    const [ano, mes, dia] = dataParte.split("-");
                    const dataFormatada = `${dia}/${mes}/${ano}`;

                    const dataHora = new Date(proximaConsulta.data_hora);
                    const hora = dataHora.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                    });

                    let nomeUnidade = "UBS";
                    if (proximaConsulta.unidade_saude && typeof proximaConsulta.unidade_saude === "object") {
                        nomeUnidade = proximaConsulta.unidade_saude.nome;
                    } else if (typeof proximaConsulta.unidade_saude === "string") {
                        nomeUnidade = proximaConsulta.unidade_saude;
                    }

                    return {
                        data: {
                            data: dataFormatada,
                            hora: hora + "H",
                            especialidade: proximaConsulta.especialidade || "Consulta Médica",
                            local: nomeUnidade,
                            status:
                                proximaConsulta.status === "agendada"
                                    ? "Confirmada"
                                    : proximaConsulta.status || "Agendada",
                        },
                        error: null,
                    };
                }
            }
            return { data: null, error: null };
        } catch (error: any) {
            return { data: null, error };
        }
    }, [user]);

    // Mantendo o useFocusEffect original para recarregar ao voltar para a tela
    useFocusEffect(
        React.useCallback(() => {
            refresh();
        }, [refresh])
    );

    return (
        <View style={styles.container}>
            <Top_Bar />
            <View style={{ flex: 1, paddingHorizontal: 15 }}>
                {/* Saudação */}
                <View style={styles.header_box}>
                    <Text style={styles.titulo}>Olá, {user?.nome || "Usuário"}!</Text>
                    <Text style={styles.data}>{dataAtual}</Text>
                </View>

                {/* Próxima consulta */}
                {loading ? (
                    <View style={styles.consulta_box}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text style={{ textAlign: "center", marginTop: 10, color: theme.text }}>
                            Carregando consultas...
                        </Text>
                    </View>
                ) : consulta ? (
                    <View style={styles.consulta_box}>
                        <View style={styles.consulta_header}>
                            <Text style={styles.consulta_titulo}>Sua próxima consulta</Text>
                            <Ionicons name="notifications-outline" size={18} color={theme.text} />
                        </View>

                        <Text style={styles.consulta_data}>
                            {consulta.data} ÀS {consulta.hora}
                        </Text>
                        <Text style={styles.consulta_info}>{consulta.especialidade}</Text>
                        <Text style={styles.consulta_local}>{consulta.local}</Text>

                        <View
                            style={[
                                styles.consulta_status,
                                {
                                    backgroundColor:
                                        consulta.status === "Confirmada"
                                            ? theme.success
                                            : theme.placeholder,
                                },
                            ]}
                        >
                            <Text style={styles.consulta_status_text}>{consulta.status}</Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.consulta_box}>
                        <Text style={styles.consulta_titulo}>Nenhuma consulta agendada</Text>
                        <Text style={{ textAlign: "center", marginTop: 10, color: theme.placeholder }}>
                            Você não tem consultas futuras. Agende uma nova consulta!
                        </Text>
                    </View>
                )}

                {/* Serviços */}
                <Text style={styles.servicos_titulo}>Serviços</Text>
                <View style={styles.servicos_container}>
                    <TouchableOpacity
                        style={styles.servico_item}
                        activeOpacity={0.7}
                        onPress={() => router.push("/home/agendar")}
                    >
                        <FontAwesome6 name="calendar-plus" size={30} color={theme.primary} />
                        <Text style={styles.servico_text}>Agendar consulta</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.servico_item}
                        activeOpacity={0.7}
                        onPress={() => router.push("/home/consultas")}
                    >
                        <AntDesign name="bars" size={30} color={theme.primary} />
                        <Text style={styles.servico_text}>Minhas consultas</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.servico_item}
                        activeOpacity={0.7}
                        onPress={() => router.push("/servicos/medicamentos")}
                    >
                        <FontAwesome5 name="pills" size={30} color={theme.primary} />
                        <Text style={styles.servico_text}>Medicamentos</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.servico_item}
                        activeOpacity={0.7}
                        onPress={() => router.push("/servicos/historico")}
                    >
                        <FontAwesome5 name="file-medical" size={30} color={theme.primary} />
                        <Text style={styles.servico_text}>Meu histórico</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}