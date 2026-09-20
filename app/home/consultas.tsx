import React, { useState, useContext } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Top_Bar } from '../../src/components/topBar';
import { Consultas_Styles, Consultas_Styles as styles } from '../../src/styles/consultasStyles';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Modal from "react-native-modal";
import { AuthContext } from '../../src/contexts/AuthContext';
import { buscarPacientePorAuthId, buscarConsultasPaciente, cancelarConsulta } from '../../src/services/consultas';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useQuery } from '@/src/services/useQuery';

type Consulta = {
    id: number;
    unidade: string;
    especialista: string;
    date: string;
    hora: string;
};

const formatarData = (dateString: string) => {
    const [ano, mes, dia] = dateString.split('-');
    return `${dia}/${mes}/${ano}`;
};

export default function Consultas() {
    const { theme } = useTheme();
    const styles = Consultas_Styles(theme);
    const [isVisible, setIsVisible] = useState(false);
    const [consultaSelecionada, setConsultaSelecionada] = useState<Consulta | null>(null);
    const [cancelando, setCancelando] = useState(false);

    const { user } = useContext(AuthContext);

    const { data, loading, error, refresh } = useQuery<Consulta[]>(async () => {
        if (!user) return { data: [], error: 'Usuário não autenticado' };

        try {
            const { data: paciente } = await buscarPacientePorAuthId(user.id);
            if (!paciente) return { data: [], error: 'Dados de paciente não encontrados' };

            const { data: consultas } = await buscarConsultasPaciente(paciente.id);
            if (!consultas) return { data: [], error: null };

            const agora = new Date();
            const filtradas = consultas
                .filter(c => {
                    const dataConsulta = new Date(c.data_hora);
                    return dataConsulta >= agora && c.status !== 'cancelada';
                })
                .map(c => {
                    const [dataParte] = c.data_hora.split('T');
                    const dataHora = new Date(c.data_hora);
                    const hora = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                    let nomeUnidade = 'UBS';
                    if (c.unidade_saude && typeof c.unidade_saude === 'object') {
                        nomeUnidade = (c.unidade_saude as any).nome;
                    }

                    return {
                        id: c.id!,
                        unidade: nomeUnidade,
                        especialista: c.especialidade || 'Consulta Médica',
                        date: dataParte,
                        hora: hora,
                    };
                })
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            return { data: filtradas, error: null };
        } catch (err: any) {
            return { data: [], error: 'Erro ao carregar consultas' };
        }
    }, [user]);

     useFocusEffect(
        React.useCallback(() => {
            refresh(); // Atualiza a lista sempre que o usuário abrir a tela
        }, [refresh])
    );

    const abrirModalCancelar = (consulta: Consulta) => {
        setConsultaSelecionada(consulta);
        setIsVisible(true);
    };

    const confirmarCancelamento = async () => {
        if (!consultaSelecionada) return;

        setCancelando(true);

        try {
            const { error } = await cancelarConsulta(consultaSelecionada.id);

            if (error) {
                Alert.alert('Erro', `Não foi possível cancelar a consulta. ${error.message || 'Tente novamente.'}`);
            } else {
                Alert.alert('Sucesso', 'Consulta cancelada com sucesso!');
                setIsVisible(false);
                refresh();
            }
        } catch (err) {
            Alert.alert('Erro', 'Ocorreu um erro ao cancelar a consulta.');
        } finally {
            setCancelando(false);
        }
    };

    return (
        <View style={styles.container}>
            <Top_Bar />
            <View style={styles.content}>
                <Text style={styles.header}>Consultas — Dois Vizinhos</Text>

                {loading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text style={{ marginTop: 10, color: theme.text, opacity: 0.6 }}>
                            Carregando consultas...
                        </Text>
                    </View>
                ) : error ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={styles.error}>{error}</Text>
                    </View>
                ) : (
                    <FlatList
                        data={data || []}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <View style={styles.item}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.itemMeta}>Unidade: {item.unidade}</Text>
                                    <Text style={styles.itemMeta}>Especialista: {item.especialista}</Text>
                                    <Text style={styles.itemMeta}>Data: {formatarData(item.date)}</Text>
                                    <Text style={styles.itemMeta}>Hora: {item.hora}</Text>
                                </View>

                                <View style={styles.statusContainer}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <MaterialCommunityIcons
                                            name="check-circle"
                                            size={20}
                                            color={theme.success}
                                            style={{ marginRight: 4 }}
                                        />
                                        <Text style={[styles.statusText, { color: theme.success }]}>
                                            Confirmada
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.cancelarButton}
                                        onPress={() => abrirModalCancelar(item)}
                                    >
                                        <Text style={{ color: theme.background, fontWeight: '600' }}>Cancelar</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>Nenhuma consulta agendada</Text>
                        }
                        style={styles.listContainer}
                    />
                )}

                <Modal isVisible={isVisible} onBackdropPress={() => setIsVisible(false)}>
                    <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
                            Tem certeza que deseja cancelar a consulta com {consultaSelecionada?.especialista} em {consultaSelecionada ? formatarData(consultaSelecionada.date) : ''}?
                        </Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 15 }}>
                            <TouchableOpacity
                                style={{ backgroundColor: theme.danger, padding: 10, borderRadius: 5, minWidth: 80, alignItems: 'center' }}
                                onPress={() => setIsVisible(false)}
                                disabled={cancelando}
                            >
                                <Text style={{ color: theme.background, fontWeight: 'bold' }}>Não</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ backgroundColor: theme.success, padding: 10, borderRadius: 5, minWidth: 80, alignItems: 'center' }}
                                onPress={confirmarCancelamento}
                                disabled={cancelando}
                            >
                                {cancelando ? (
                                    <ActivityIndicator size="small" color={theme.background} />
                                ) : (
                                    <Text style={{ color: theme.background, fontWeight: 'bold' }}>Sim</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
        </View>
    );
}
