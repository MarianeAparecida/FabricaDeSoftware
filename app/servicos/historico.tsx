import React, { useState, useContext } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Top_Bar } from '../../src/components/topBar';
import { Historico_Styles} from '../../src/styles/historicoStyles';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../../src/contexts/AuthContext';
import { buscarPacientePorAuthId, buscarConsultasPaciente } from '../../src/services/consultas';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { FontAwesome5 } from "@expo/vector-icons";
import { useQuery } from '@/src/services/useQuery';

type Consulta = {
    id: number;
    unidade: string;
    especialista: string;
    date: string;
    hora: string;
    status: 'Realizada' | 'Faltou' | 'Cancelada';
};

const formatarData = (dateString: string) => {
    const [ano, mes, dia] = dateString.split('-');
    return `${dia}/${mes}/${ano}`;
};

export default function Historico() {
    const { theme } = useTheme();
    const styles = Historico_Styles(theme);
    const router = useRouter();

    const { user } = useContext(AuthContext);

   const { data, loading, error, refresh } = useQuery<Consulta[]>(async () => {
        if (!user) return { data: [], error: { message: 'Usuário não autenticado' } };

        const { data: paciente } = await buscarPacientePorAuthId(user.id);
        if (!paciente) return { data: [], error: { message: 'Paciente não encontrado' } };

        const { data: consultas } = await buscarConsultasPaciente(paciente.id);
        if (!consultas) return { data: [], error: null };

        const agora = new Date();
        const formatadas = consultas
            .filter(c => new Date(c.data_hora) < agora || c.status === 'cancelada' || c.status === 'faltou')
            .map(c => {
                const [dataParte] = c.data_hora.split('T');
                const hora = new Date(c.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                return {
                    id: c.id!,
                    unidade: typeof c.unidade_saude === 'object' ? c.unidade_saude.nome : 'UBS',
                    especialista: c.especialidade || 'Consulta Médica',
                    date: dataParte,
                    hora: hora,
                    status: c.status === 'cancelada' ? 'Cancelada' : (c.status === 'faltou' ? 'Faltou' : 'Realizada') as any,
                };
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { data: formatadas, error: null };
    }, [user?.id]);

    // NOVO: FocusEffect usando o refresh
    useFocusEffect(
        React.useCallback(() => {
            refresh();
        }, [refresh])
    );

    const getStatusProps = (status: Consulta['status']) => {
        switch (status) {
            case 'Realizada': return { icon: 'check-circle', color: theme.success };
            case 'Faltou': return { icon: 'close-circle', color: theme.warning };
            case 'Cancelada': return { icon: 'cancel', color: theme.danger };
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <Top_Bar />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={{ marginTop: 10, color: theme.text, opacity: 0.6 }}>
                        Carregando histórico...
                    </Text>
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <Top_Bar />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: theme.danger, fontSize: 16 }}>{error}</Text>
                </View>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <Top_Bar />
            <View style={styles.content}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                    <TouchableOpacity
                        onPress={() => router.push('/home')}
                        style={{
                            marginRight: 10,
                            padding: 5,
                            marginTop: 16,
                        }}
                    >
                        <FontAwesome5 name="arrow-left" size={20} color={theme.primary} />
                    </TouchableOpacity>
                    <Text style={styles.header}>Histórico</Text>
                </View>

                <FlatList
                    data={data || []}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => {
                        const statusProps = getStatusProps(item.status);
                        return (
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
                                            name={statusProps.icon as any}
                                            size={20}
                                            color={statusProps.color}
                                            style={{ marginRight: 4 }}
                                        />
                                        <Text style={[styles.statusText, { color: statusProps.color }]}>
                                            {item.status}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>Nenhuma consulta no histórico</Text>
                    }
                    style={styles.listContainer}
                />
            </View>
        </SafeAreaView>
    );
}
