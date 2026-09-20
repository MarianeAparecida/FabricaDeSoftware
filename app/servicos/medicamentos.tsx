import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Top_Bar } from '../../src/components/topBar';
import { Medicamentos_Styles} from '../../src/styles/medicamentosStyles';
import { CampoPesquisa } from '../../src/components/campo_pesquisa';
import { supabase } from '../../src/services/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { FontAwesome5 } from "@expo/vector-icons";

type Medicamento = {
  id: string;
  name: string;
  dose_mg: string;
  quantidade?: number;
  hospital?: string;
};

export default function Medicamentos() {
  const { theme } = useTheme();
  const styles = Medicamentos_Styles(theme);
  const router = useRouter();
  const [data, setData] = useState<Medicamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Medicamento[]>([]);

  useEffect(() => {
    const fetchDisponibilidade = async () => {
      setLoading(true);

      const { data: fetchedData, error } = await supabase
        .from('disponibilidade')
        .select(`
            id_medicamento,
            unidades_disponiveis,
            medicamento (
            id,
            nome,
            dose_mg
            ),
            unidade_saude (
            id,
            nome
            )
        `)
        .order('id_medicamento');

      if (error) {
        console.error('Supabase error:', error);
        setData([]);
      } else if (fetchedData) {
        const mappedData: Medicamento[] = fetchedData.map((item: any, index: number) => ({
          id: `${item.id_medicamento}-${index}`,
          name: item.medicamento.nome,
          dose_mg: `${item.medicamento.dose_mg}mg`,
          quantidade: item.unidades_disponiveis,
          hospital: item.unidade_saude?.nome || 'Desconhecido',
        }));

        setData(mappedData);
      }

      setLoading(false);
    };

    fetchDisponibilidade();
  }, []);

  // Filter results based on search query
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase();
    setResults(data.filter(d => d.name.toLowerCase().startsWith(q)));
  }, [query, data]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Top_Bar />
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, marginTop: 10 }}>
        <TouchableOpacity
          onPress={() => router.push('/home')}
          style={{
            marginRight: 10,
            padding: 5
          }}
        >
          <FontAwesome5 name="arrow-left" size={20} color={theme.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Medicamentos</Text>
      </View>

      <CampoPesquisa
        label="Buscar Medicamento"
        query={query}
        setQuery={setQuery}
        placeholder="Digite o nome do medicamento"
      />

      <FlatList
        data={results.length > 0 ? results : data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const disponivel = item.quantidade && item.quantidade > 0;

          return (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Medicamento ${item.name}`}
              style={styles.item}
              activeOpacity={0.8}
            >
              <View style={{ paddingVertical: 6, }}>
                <Text style={styles.itemName}>{item.name} - {item.dose_mg}</Text>
                <View style={styles.statusContainer}>
                  <Text style={[styles.statusText, { color: disponivel ? theme.success : theme.warning }]}>
                    {disponivel ? "Disponível" : "Indisponível"}
                  </Text>
                  <MaterialCommunityIcons
                    name={disponivel ? "check-circle" : "close-circle"}
                    size={20}
                    color={disponivel ? theme.success : theme.warning}
                    style={{ marginLeft: 4 }}
                  />
                </View>
                <Text style={styles.unidadeName}>Unidade: {item.hospital}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhum medicamento encontrad o</Text>
        }
        style={styles.resultsContainer}
      />
    </SafeAreaView>
  );
}
