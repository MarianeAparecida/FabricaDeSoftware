import React, { useEffect, useState, useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, TextInput, Modal } from "react-native";
import { useRouter } from "expo-router";
import { Top_Bar } from "../../src/components/topBar";
import { Portal_Styles } from "../../src/styles/portalStyles";
import { useTheme } from "../../src/contexts/ThemeContext";
import { usePortal } from "../../src/contexts/PortalContext";
import { useQuery } from "../../src/services/useQuery";
import { ConsultaAgenda, PerfilServidor, atualizarStatus, buscarAgenda, buscarEquipe } from "../../src/services/portal";
import { hojeNoFuso, noFuso, somarDias } from "../../src/utils/fusoHorario";
import { formatarData } from "../../src/utils/formatarData";
import CustomCalendar from "../../src/components/CustomCalendar";

type Status = ConsultaAgenda["status"];
type NovoStatus = Exclude<Status, "agendada">;

const ROTULO_STATUS: Record<Status, string> = {
  agendada: "Agendada",
  confirmada: "Confirmada",
  realizada: "Realizada",
  faltou: "Faltou",
  cancelada: "Cancelada",
};

const ACOES: Partial<Record<Status, { status: NovoStatus; rotulo: string }[]>> = {
  agendada: [
    { status: "confirmada", rotulo: "Confirmar" },
    { status: "cancelada", rotulo: "Cancelar" },
  ],
  confirmada: [
    { status: "realizada", rotulo: "Realizada" },
    { status: "faltou", rotulo: "Faltou" },
    { status: "cancelada", rotulo: "Cancelar" },
  ],
};

function confirmar(texto: string): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve((globalThis as any).confirm(texto));
  return new Promise((resolve) =>
    Alert.alert("Confirmar", texto, [
      { text: "Não", style: "cancel", onPress: () => resolve(false) },
      { text: "Sim", onPress: () => resolve(true) },
    ])
  );
}

function rotuloDia(dia: string) {
  const [ano, mes, d] = dia.split("-").map(Number);
  const semana = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(Date.UTC(ano, mes - 1, d));
  return `${semana.charAt(0).toUpperCase()}${semana.slice(1)}, ${formatarData(dia)}`;
}

export default function Portal() {
  const { theme } = useTheme();
  const styles = Portal_Styles(theme);
  const router = useRouter();
  const { status, perfil, mensagem, recarregar } = usePortal();

  useEffect(() => {
    if (status === "sem_sessao") router.replace("/portal/login");
  }, [status]);

  if (status === "ok" && perfil) return <Agenda perfil={perfil} />;

  return (
    <View style={styles.container}>
      <Top_Bar />
      <View style={styles.centro}>
        {status === "negado" || status === "erro" ? (
          <>
            <Text style={styles.titulo}>{status === "negado" ? "Acesso negado" : "Erro de conexão"}</Text>
            <Text style={[styles.subtitulo, { textAlign: "center" }]}>{mensagem}</Text>
            {status === "erro" ? (
              <TouchableOpacity style={[styles.botao, { paddingHorizontal: 30 }]} onPress={recarregar}>
                <Text style={styles.botao_texto}>Tentar novamente</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={[styles.botao, { paddingHorizontal: 30 }]} onPress={() => router.replace("/portal/login")}>
                  <Text style={styles.botao_texto}>Entrar como servidor</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.replace("/")}>
                  <Text style={styles.link}>Voltar ao app do paciente</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        ) : (
          <ActivityIndicator size="large" color={theme.primary} />
        )}
      </View>
    </View>
  );
}

function Agenda({ perfil }: { perfil: PerfilServidor }) {
  const { theme } = useTheme();
  const styles = Portal_Styles(theme);
  const router = useRouter();
  const { sair } = usePortal();
  const fuso = perfil.unidade_fuso;

  const [dia, setDia] = useState(() => hojeNoFuso(fuso));
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [alterando, setAlterando] = useState<number | null>(null);
  
  const [filtro, setFiltro] = useState("");
  const [mostrarCalendario, setMostrarCalendario] = useState(false);

  const { data: consultas, loading, error, refresh } = useQuery(() => buscarAgenda(dia), [dia]);

  const corStatus: Record<Status, string> = {
    agendada: theme.primary,
    confirmada: theme.success,
    realizada: theme.success,
    faltou: theme.warning,
    cancelada: theme.danger,
  };

  const consultasOrdenadas = useMemo(() => {
    if (!consultas) return [];
    return [...consultas].sort(
      (a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
    );
  }, [consultas]);

  const consultasFiltradas = useMemo(() => {
    if (!filtro.trim()) return consultasOrdenadas;
    const termo = filtro.toLowerCase().trim();
    return consultasOrdenadas.filter((c) => {
      const especialidade = (c.especialidade || "").toLowerCase();
      const profissional = ((c as any).profissional_nome || (c as any).profissional || "").toLowerCase();
      return especialidade.includes(termo) || profissional.includes(termo);
    });
  }, [consultasOrdenadas, filtro]);

  async function mudarStatus(c: ConsultaAgenda, novo: NovoStatus) {
    const hora = noFuso(c.data_hora, fuso).hora;
    if (novo === "cancelada" && !(await confirmar(`Cancelar a consulta de ${c.paciente_nome} às ${hora}?`))) return;

    setAlterando(c.consulta_id);
    const { error: erro } = await atualizarStatus(c.consulta_id, novo);
    setAviso(erro
      ? { tipo: "erro", texto: erro.message || "Não foi possível alterar a consulta." }
      : { tipo: "ok", texto: `${c.paciente_nome} às ${hora}: ${ROTULO_STATUS[novo].toLowerCase()}.` });
    setAlterando(null);
    refresh();
  }

  async function handleSair() {
    await sair();
    router.replace("/portal/login");
  }

  return (
    <View style={styles.container}>
      <Top_Bar />
      <ScrollView>
        <View style={styles.content}>
          <View style={styles.cabecalho}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cabecalho_unidade}>{perfil.unidade_nome}</Text>
              <Text style={styles.cabecalho_servidor}>
                {perfil.nome} · {perfil.perfil === "gestor" ? "Gestor" : "Atendente"} · Matrícula {perfil.matricula}
              </Text>
            </View>
            <TouchableOpacity style={styles.botao_sair} onPress={handleSair}>
              <Text style={styles.botao_sair_texto}>Sair</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.secao_titulo}>Agenda da unidade</Text>

          {/* Controle de navegação de data */}
          <View style={styles.navegacao_dia}>
            <TouchableOpacity style={styles.navegacao_botao} onPress={() => { setDia(somarDias(dia, -1)); setAviso(null); }}>
              <Text style={styles.navegacao_texto}>{"< Anterior"}</Text>
            </TouchableOpacity>
            
            <View style={{ alignItems: "center" }}>
              <Text style={styles.dia_rotulo}>{rotuloDia(dia)}</Text>
              
              <TouchableOpacity onPress={() => setMostrarCalendario(true)}>
                <Text style={styles.link}>Abrir calendário</Text>
              </TouchableOpacity>

              {dia !== hojeNoFuso(fuso) && (
                <TouchableOpacity onPress={() => { 
                  setDia(hojeNoFuso(fuso)); 
                  setAviso(null); 
                  setMostrarCalendario(false); 
                }}>
                  <Text style={[styles.link, { marginTop: 4 }]}>Ir para hoje</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.navegacao_botao} onPress={() => { setDia(somarDias(dia, 1)); setAviso(null); }}>
              <Text style={styles.navegacao_texto}>{"Próximo >"}</Text>
            </TouchableOpacity>
          </View>

          <Modal
            visible={mostrarCalendario}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setMostrarCalendario(false)}
          >
            <View style={{
              flex: 1,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              justifyContent: "center",
              alignItems: "center",
              padding: 8
            }}>
              <View style={{
                backgroundColor: theme.background,
                borderRadius: 12,
                padding: 16,
                width: "100%",
                maxWidth: 400,
                elevation: 5,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
              }}>
                <Text style={[styles.secao_titulo, { marginBottom: 12, textAlign: "center" }]}>
                  Selecione uma data
                </Text>
                
                <CustomCalendar
                  selectedDate={dia}
                  onSelectDate={(novaData) => {
                    setDia(novaData);
                    setAviso(null);
                    setMostrarCalendario(false);
                  }}
                  minDate="2020-01-01"
                  theme={theme}
                />

                <TouchableOpacity
                  style={[styles.botao, { marginTop: 16, backgroundColor: theme.placeholder }]}
                  onPress={() => setMostrarCalendario(false)}
                >
                  <Text style={styles.botao_texto}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <View style={{ marginBottom: 15 }}>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: theme.placeholder,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                color: theme.text,
                backgroundColor: theme.background,
              }}
              placeholder="Buscar por profissional ou especialidade..."
              placeholderTextColor={theme.placeholder}
              value={filtro}
              onChangeText={setFiltro}
            />
          </View>

          {aviso && (
            <Text style={[styles.item_texto, { color: aviso.tipo === "ok" ? theme.success : theme.danger, marginBottom: 8 }]}>
              {aviso.texto}
            </Text>
          )}

          {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color={theme.primary} />
          ) : error ? (
            <Text style={styles.erro}>{error}</Text>
          ) : !consultasFiltradas.length ? (
            <Text style={styles.vazio}>
              {filtro ? "Nenhuma consulta encontrada para esta busca." : "Nenhuma consulta neste dia."}
            </Text>
          ) : (
            consultasFiltradas.map((c) => (
              <View key={c.consulta_id} style={styles.item}>
                <View style={styles.item_linha}>
                  <Text style={styles.item_hora}>{noFuso(c.data_hora, fuso).hora}</Text>
                  <Text style={[styles.status, { color: corStatus[c.status] }]}>{ROTULO_STATUS[c.status]}</Text>
                </View>
                <Text style={styles.item_texto}>
                  {c.paciente_nome} · {c.especialidade || "Consulta"}
                </Text>
                {(c as any).profissional_nome && (
                  <Text style={styles.item_detalhe}>
                    Profissional: {(c as any).profissional_nome}
                  </Text>
                )}
                <Text style={styles.item_detalhe}>
                  CPF {c.paciente_cpf}{c.paciente_telefone ? ` · ${c.paciente_telefone}` : ""}
                </Text>
                {ACOES[c.status] && (
                  <View style={styles.acoes}>
                    {alterando === c.consulta_id ? (
                      <ActivityIndicator color={theme.primary} />
                    ) : (
                      ACOES[c.status]!.map((a) => (
                        <TouchableOpacity
                          key={a.status}
                          style={[styles.acao, { borderColor: corStatus[a.status] }]}
                          onPress={() => mudarStatus(c, a.status)}
                        >
                          <Text style={[styles.acao_texto, { color: corStatus[a.status] }]}>{a.rotulo}</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </View>
            ))
          )}

          {perfil.perfil === "gestor" && <Equipe />}
        </View>
      </ScrollView>
    </View>
  );
}

function Equipe() {
  const { theme } = useTheme();
  const styles = Portal_Styles(theme);
  const { data: equipe, loading, error } = useQuery(buscarEquipe, []);

  return (
    <>
      <Text style={styles.secao_titulo}>Equipe da unidade</Text>
      {loading ? (
        <ActivityIndicator color={theme.primary} />
      ) : error ? (
        <Text style={styles.erro}>{error}</Text>
      ) : (
        equipe?.map((s) => (
          <View key={s.matricula} style={styles.item}>
            <View style={styles.item_linha}>
              <Text style={styles.item_texto}>{s.nome}</Text>
              <Text style={[styles.status, { color: s.ativo ? theme.success : theme.danger }]}>
                {s.ativo ? "Ativo" : "Sem vínculo ativo"}
              </Text>
            </View>
            <Text style={styles.item_detalhe}>
              {s.perfil === "gestor" ? "Gestor" : "Atendente"} · Matrícula {s.matricula} · {s.email}
            </Text>
          </View>
        ))
      )}
    </>
  );
}