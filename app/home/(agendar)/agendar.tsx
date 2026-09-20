import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import React, { useState, useContext, useEffect } from "react";
import { Agendamento_Styles } from "../../../src/styles/agendamentoStyles"
import { Top_Bar } from "../../../src/components/topBar";
import { AuthContext } from "../../../src/contexts/AuthContext";
import { criarConsulta, buscarPacientePorAuthId, combinarDataHora, buscarHorariosOcupados, UnidadeSaude } from "../../../src/services/consultas";
import { useQuery } from "@/src/services/useQuery";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "../../../src/contexts/ThemeContext";
import CustomCalendar from "../../../src/components/CustomCalendar";
import BarraProgresso from "../../../src/components/barra_progresso";

export default function Agendamento() {
    const { theme } = useTheme();
    const styles = Agendamento_Styles(theme);
    const params = useLocalSearchParams();

    const [day, setDay] = useState('');
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [unidadeSelecionada, setUnidadeSelecionada] = useState<UnidadeSaude | null>(null);
    const [tipoProfissional, setTipoProfissional] = useState<string | null>(null);

    const { user } = useContext(AuthContext);

    const todosHorarios = [
        '08:00', '08:30', '09:00', '09:30',
        '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30',
        '14:00', '14:30', '15:00', '15:30',
        '16:00', '16:30', '17:00', '17:30'
    ];

    useEffect(() => {
        if (typeof params.unidadeSelecionada === 'string') {
            try {
                setUnidadeSelecionada(JSON.parse(params.unidadeSelecionada));
            } catch (e) { router.back(); }
        }
        if (typeof params.tipo === 'string') {
            setTipoProfissional(params.tipo);
        }
    }, [params.unidadeSelecionada, params.tipo]);


    const { data: horariosDisponiveis, loading: loadingHorarios } = useQuery(async () => {
        if (!day || !unidadeSelecionada) return { data: [], error: null };

        const ocupados = await buscarHorariosOcupados(day, unidadeSelecionada.id);
        let disponiveis = todosHorarios.filter(h => !ocupados.includes(h));

        // Filtro de horário retroativo (se for hoje)
        const now = new Date();
        if (day === now.toISOString().split('T')[0]) {
            const currentMin = now.getHours() * 60 + now.getMinutes();
            disponiveis = disponiveis.filter(h => {
                const [hr, min] = h.split(":").map(Number);
                return (hr * 60 + min) > currentMin;
            });
        }

        return { data: disponiveis, error: null };
    }, [day, unidadeSelecionada?.id]);

    const handleAgendarConsulta = async () => {
        if (!user) return Alert.alert("Erro", "Faça login para continuar.");
        if (!tipoProfissional) return Alert.alert("Erro", "Profissional não selecionado")
        if (!unidadeSelecionada) return Alert.alert("Erro", "Unidade não carregada.");
        if (!day) return Alert.alert("Atenção", "Selecione uma data.");
        if (!selectedTime) return Alert.alert("Atenção", "Selecione um horário.");

        setLoading(true);

        try {
            const { data: paciente } = await buscarPacientePorAuthId(user.id);
            if (!paciente) {
                Alert.alert("Erro", "Complete seu cadastro de paciente.");
                setLoading(false); // Importante resetar loading
                return;
            }

            const dataHora = combinarDataHora(day, selectedTime);

            const { error } = await criarConsulta({
                paciente_id: paciente.id,
                unidade_saude_id: unidadeSelecionada.id,
                data_hora: dataHora,
                status: "agendada",
                especialidade: tipoProfissional
            });

            if (error) throw new Error("Falha na criação");

            Alert.alert(
                "Sucesso",
                `Consulta com ${tipoProfissional} marcada na ${unidadeSelecionada.nome} em ${formatarData(day)} às ${selectedTime}`,
                [{
                    text: "OK",
                    onPress: () => {
                        if (router.canDismiss()) {
                            router.dismissAll();
                        }

                        router.replace('/home');
                    }
                }]
            );
        } catch (err) {
            Alert.alert("Erro", "Não foi possível realizar o agendamento.");
        } finally {
            setLoading(false);
        }
    };

    const today = new Date().toISOString().split('T')[0];
    const formatarData = (dateString: string) => {
        if (!dateString || !dateString.includes('-')) return "-";
        const [y, m, d] = dateString.split("-");
        return `${d}/${m}/${y}`;
    };

    return (
        <View style={styles.container}>
            <Top_Bar />
            <ScrollView
                style={{ flex: 1, width: '100%', paddingHorizontal: 15 }}
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                <BarraProgresso etapaAtual={3} totalEtapas={3} />

                {/* Renderização condicional da unidade */}
                {unidadeSelecionada ? (
                    <View style={{
                        backgroundColor: theme.primary,
                        padding: 10, marginHorizontal: 10, marginBottom: 8,
                        borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: theme.background, fontSize: 12 }}>Dados selecionados:</Text>
                            <Text style={{ color: theme.background, fontSize: 14, fontWeight: "bold", marginTop: 3 }}>
                                {tipoProfissional}
                            </Text>
                            <Text style={{ color: theme.background, fontSize: 11, marginTop: 2 }}>
                                {unidadeSelecionada.nome} / {unidadeSelecionada.endereco}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{ backgroundColor: theme.background, padding: 8, borderRadius: 5 }}
                        >
                            <Text style={{ color: theme.primary, fontSize: 12, fontWeight: "bold" }}>Alterar</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <ActivityIndicator style={{ marginTop: 20 }} color={theme.primary} />
                )}

                <Text style={{ color: theme.primary, fontSize: 18, fontWeight: "600", marginTop: 15, paddingLeft: 10 }}>
                    Selecione a data
                </Text>

                <CustomCalendar
                    selectedDate={day}
                    minDate={today}
                    onSelectDate={(d) => { setDay(d); setSelectedTime(null); }}
                    theme={theme}
                />

                <View style={{ marginTop: 15, paddingHorizontal: 10 }}>
                    <Text style={{ fontSize: 18, color: theme.primary, fontWeight: "600", marginBottom: 10 }}>
                        Horários disponíveis {day && `(${horariosDisponiveis?.length})`}
                    </Text>

                    {loadingHorarios ? (
                        <ActivityIndicator size="large" color={theme.primary} />
                    ) : (
                        <View style={styles.horarios_box}>
                            {!loadingHorarios && day && (!horariosDisponiveis || horariosDisponiveis.length === 0) ? (
                                <Text style={{ color: theme.text, fontStyle: 'italic', padding: 10 }}>
                                    Nenhum horário disponível para essa data.
                                </Text>
                            ) : (
                                horariosDisponiveis?.map(hora => (
                                    <TouchableOpacity
                                        key={hora}
                                        style={[
                                            styles.horarios,
                                            { backgroundColor: selectedTime === hora ? theme.primary : "transparent" }
                                        ]}
                                        onPress={() => setSelectedTime(hora)}
                                    >
                                        <Text style={[
                                            styles.horarios_texto,
                                            { color: selectedTime === hora ? theme.background : theme.text }
                                        ]}>
                                            {hora}
                                        </Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>

            <View style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                backgroundColor: theme.background, padding: 15, borderTopWidth: 1, borderColor: '#eee'
            }}>
                <TouchableOpacity
                    onPress={handleAgendarConsulta}
                    disabled={!selectedTime || !day || loading || !unidadeSelecionada}
                    style={{
                        backgroundColor: (!selectedTime || !day || loading || !unidadeSelecionada) ? theme.placeholder : theme.primary,
                        height: 50, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 10
                    }}
                >
                    {loading ? (
                        <ActivityIndicator color={theme.background} />
                    ) : (
                        <Text style={{ color: theme.background, fontWeight: "bold", fontSize: 16 }}>
                            Confirmar Agendamento
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => {
                        if (router.canDismiss()) router.dismissAll();
                        router.replace('/home');
                    }}
                    disabled={loading}
                    style={{
                        borderWidth: 1, borderColor: theme.placeholder,
                        height: 50, borderRadius: 8, alignItems: "center", justifyContent: "center"
                    }}
                >
                    <Text style={{ color: theme.text, fontWeight: "bold" }}>Cancelar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}