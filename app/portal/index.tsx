import React, { useEffect, useState, useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, TextInput, Modal } from "react-native";
import { useRouter } from "expo-router";
import { Top_Bar } from "../../src/components/topBar";
import { Portal_Styles } from "../../src/styles/portalStyles";
import { useTheme } from "../../src/contexts/ThemeContext";
import { usePortal } from "../../src/contexts/PortalContext";
import { useQuery } from "../../src/services/useQuery";
import { ConsultaAgenda, PerfilServidor, atualizarStatus, cancelarConsultaPortal, remarcarConsultaPortal, buscarAgenda, buscarProfissionais, cadastrarProfissional,  atualizarProfissional, desativarProfissional } from "../../src/services/portal";
import { hojeNoFuso, noFuso, somarDias } from "../../src/utils/fusoHorario";
import { formatarData } from "../../src/utils/formatarData";
import CustomCalendar from "../../src/components/CustomCalendar";
import moment from "moment";

import { buscarHorariosDisponiveis, combinarDataHora } from '../../src/services/consultas';

type Status = ConsultaAgenda["status"];
type NovoStatus = Exclude<Status, "agendada">;

const ROTULO_STATUS: Record<Status, string> = {
  agendada: "Agendada",
  confirmada: "Confirmada",
  realizada: "Realizada",
  faltou: "Faltou",
  cancelada: "Cancelada",
};

const ACOES: Partial<Record<Status, { status: string; rotulo: string }[]>> = {
  agendada: [
    { status: "confirmada", rotulo: "Confirmar" },
    { status: "remarcar", rotulo: "Remarcar" },
    { status: "cancelada", rotulo: "Cancelar" },
  ],
  confirmada: [
    { status: "realizada", rotulo: "Realizada" },
    { status: "faltou", rotulo: "Faltou" },
    { status: "remarcar", rotulo: "Remarcar" },
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

function aplicarMascaraHora(texto: string) {
  const limpo = texto.replace(/\D/g, "").slice(0, 4);
  if (limpo.length >= 3) {
    return `${limpo.slice(0, 2)}:${limpo.slice(2)}`;
  }
  return limpo;
}

function converterHoraParaMinutos(horaStr: string): number {
  const [h, m] = horaStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function validarHorarioLogico(inicio: string, fim: string): { valido: boolean; mensagem?: string } {
  const regex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
  if (!regex.test(inicio) || !regex.test(fim)) {
    return { valido: false, mensagem: "Informe horários válidos no formato HH:MM (ex: 08:00)." };
  }
  
  const minInicio = converterHoraParaMinutos(inicio);
  const minFim = converterHoraParaMinutos(fim);

  if (minInicio >= minFim) {
    return { valido: false, mensagem: "O horário de início deve ser anterior ao término." };
  }

  return { valido: true };
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

  const [modalCancelarVisible, setModalCancelarVisible] = useState(false);
  const [consultaSelecionada, setConsultaSelecionada] = useState<ConsultaAgenda | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [outroMotivoCancelamento, setOutroMotivoCancelamento] = useState('');

  const [modalRemarcarVisible, setModalRemarcarVisible] = useState(false);
  const [consultaRemarcar, setConsultaRemarcar] = useState<ConsultaAgenda | null>(null);
  const [dataRemarcacao, setDataRemarcacao] = useState(moment().format('YYYY-MM-DD'));
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [horarioEscolhido, setHorarioEscolhido] = useState<string | null>(null);
  const [motivoRemarcacao, setMotivoRemarcacao] = useState('');
  const [outroMotivoRemarcacao, setOutroMotivoRemarcacao] = useState('');
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [carregando, setCarregando] = useState(false);

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

  const MOTIVOS_PADRAO = [
    "Não poderei comparecer",
    "Não preciso mais da consulta",
    "Tenho outro compromisso no horário",
    "Vou ser atendido em outro local",
    "Outro motivo"
  ];

  async function executarCancelamento() {
    if (!consultaSelecionada) return;
    const motivoFinal = motivoCancelamento === "Outro motivo" ? outroMotivoCancelamento.trim() : motivoCancelamento;
    
    if (!motivoFinal) {
      Alert.alert("Atenção", "Selecione ou informe o motivo do cancelamento.");
      return;
    }

    setCarregando(true);
    const { error } = await cancelarConsultaPortal(consultaSelecionada.consulta_id, motivoFinal);
    setCarregando(false);

    if (error) {
      setAviso({ tipo: "erro", texto: error.message });
    } else {
      setAviso({ tipo: "ok", texto: "Consulta cancelada com sucesso. O horário foi liberado." });
      setModalCancelarVisible(false);
      setConsultaSelecionada(null);
      setMotivoCancelamento('');
      setOutroMotivoCancelamento('');
      refresh();
    }
  }

  async function carregarHorariosRemarcacao(data: string) {
    if (!data) return;
    setCarregandoHorarios(true);
    const perfilUnidadeId = perfil?.unidade_id;
    const profId = (consultaRemarcar as any)?.profissional_id;
    const resultado = await buscarHorariosDisponiveis(data, perfilUnidadeId, profId);
    setCarregandoHorarios(false);
    if (resultado.data) {
      setHorariosDisponiveis(resultado.data);
    } else {
      setHorariosDisponiveis([]);
    }
  }

  async function executarRemarcacao() {
    if (!consultaRemarcar || !horarioEscolhido) {
      Alert.alert("Atenção", "Selecione a nova data e o horário disponível.");
      return;
    }
    const motivoFinal = motivoRemarcacao === "Outro motivo" ? outroMotivoRemarcacao.trim() : motivoRemarcacao;
    if (!motivoFinal) {
      Alert.alert("Atenção", "Selecione ou informe o motivo da remarcação.");
      return;
    }

    // Combina data e horário no formato ISO aceito pelo backend
    const novaDataHoraIso = combinarDataHora(dataRemarcacao, horarioEscolhido, perfil?.unidade_fuso);

    setCarregando(true);
    const { error } = await remarcarConsultaPortal(consultaRemarcar.consulta_id, novaDataHoraIso, motivoFinal);
    setCarregando(false);

    if (error) {
      setAviso({ tipo: "erro", texto: error.message });
    } else {
      setAviso({ tipo: "ok", texto: "Consulta remarcada com sucesso!" });
      setModalRemarcarVisible(false);
      setConsultaRemarcar(null);
      setHorarioEscolhido(null);
      setMotivoRemarcacao('');
      setOutroMotivoRemarcacao('');
      refresh();
    }
  }

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
              padding: 16
            }}>
              <View style={{
                backgroundColor: theme.background,
                borderRadius: 12,
                padding: 24,
                width: "100%",
                maxWidth: 420,
                height: 480, // Altura ideal aumentada para acomodar o CustomCalendar sem apertar
                elevation: 5,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                justifyContent: "space-between"
              }}>
                <Text style={[styles.secao_titulo, { textAlign: "center", fontSize: 18, marginBottom: 8 }]}>
                  Selecione uma data
                </Text>
                
                <View style={{ flex: 1, justifyContent: "center", marginVertical: 4 }}>
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
                </View>

                <TouchableOpacity
                  style={[styles.botao, { backgroundColor: theme.placeholder, height: 44, alignItems: "center", justifyContent: "center", marginTop: 8 }]}
                  onPress={() => setMostrarCalendario(false)}
                >
                  <Text style={styles.botao_texto}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal
            visible={modalCancelarVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setModalCancelarVisible(false)}
          >
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 16 }}>
              <View style={{ backgroundColor: theme.background, borderRadius: 12, padding: 20, width: "100%", maxWidth: 400, maxHeight: "90%" }}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={[styles.secao_titulo, { fontSize: 18, marginBottom: 12, textAlign: "center" }]}>Cancelar consulta</Text>
                  
                  {consultaSelecionada && (
                    <View style={{ backgroundColor: theme.placeholder + "22", padding: 10, borderRadius: 8, marginBottom: 16 }}>
                      <Text style={{ color: theme.text, fontWeight: "bold" }}>{consultaSelecionada.especialidade || "Consulta"}</Text>
                      <Text style={{ color: theme.text, fontSize: 13 }}>Paciente: {consultaSelecionada.paciente_nome}</Text>
                      <Text style={{ color: theme.text, fontSize: 13 }}>Data: {moment(consultaSelecionada.data_hora).format("DD/MM/YYYY [às] HH:mm")}</Text>
                    </View>
                  )}

                  <Text style={[styles.item_texto, { fontWeight: "600", marginBottom: 8 }]}>Motivo do cancelamento *</Text>
                  {MOTIVOS_PADRAO.map((motivo) => (
                    <TouchableOpacity
                      key={motivo}
                      style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 }}
                      onPress={() => setMotivoCancelamento(motivo)}
                    >
                      <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: theme.primary, alignItems: "center", justifyContent: "center" }}>
                        {motivoCancelamento === motivo && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary }} />}
                      </View>
                      <Text style={{ color: theme.text, fontSize: 14 }}>{motivo}</Text>
                    </TouchableOpacity>
                  ))}

                  {motivoCancelamento === "Outro motivo" && (
                    <TextInput
                      style={{ borderWidth: 1, borderColor: theme.placeholder, borderRadius: 8, padding: 10, color: theme.text, backgroundColor: theme.background, marginTop: 4, marginBottom: 16 }}
                      placeholder="Especifique o motivo..."
                      placeholderTextColor={theme.placeholder}
                      value={outroMotivoCancelamento}
                      onChangeText={setOutroMotivoCancelamento}
                    />
                  )}

                  <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                    <TouchableOpacity
                      style={[styles.botao, { flex: 1, backgroundColor: theme.placeholder, height: 44, alignItems: "center", justifyContent: "center" }]}
                      onPress={() => setModalCancelarVisible(false)}
                    >
                      <Text style={styles.botao_texto}>Voltar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.botao, { flex: 1, backgroundColor: theme.danger || "#d9534f", height: 44, alignItems: "center", justifyContent: "center", opacity: carregando ? 0.7 : 1 }]}
                      onPress={executarCancelamento}
                      disabled={carregando}
                    >
                      {carregando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.botao_texto}>Confirmar</Text>}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>

          <Modal
            visible={modalRemarcarVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setModalRemarcarVisible(false)}
          >
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 16 }}>
              <View style={{ backgroundColor: theme.background, borderRadius: 12, padding: 20, width: "100%", maxWidth: 425, maxHeight: "90%" }}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={[styles.secao_titulo, { fontSize: 18, marginBottom: 12, textAlign: "center" }]}>Remarcar consulta</Text>

                  {consultaRemarcar && (
                    <View style={{ backgroundColor: theme.placeholder + "22", padding: 10, borderRadius: 8, marginBottom: 12 }}>
                      <Text style={{ color: theme.text, fontWeight: "bold" }}>Consulta Atual:</Text>
                      <Text style={{ color: theme.text, fontSize: 13 }}>{consultaRemarcar.especialidade} - {consultaRemarcar.paciente_nome}</Text>
                      <Text style={{ color: theme.text, fontSize: 13 }}>Atual: {moment(consultaRemarcar.data_hora).format("DD/MM/YYYY [às] HH:mm")}</Text>
                    </View>
                  )}

                  <Text style={[styles.item_texto, { fontWeight: "600", marginBottom: 6 }]}>Selecione a nova data:</Text>
                  <View style={{ alignItems: "center", marginBottom: 12 }}>
                    <CustomCalendar
                      selectedDate={dataRemarcacao}
                      onSelectDate={(novaData) => {
                        setDataRemarcacao(novaData);
                        carregarHorariosRemarcacao(novaData);
                      }}
                      minDate={moment().format("YYYY-MM-DD")}
                      theme={theme}
                    />
                  </View>

                  <Text style={[styles.item_texto, { fontWeight: "600", marginBottom: 6 }]}>Horários disponíveis:</Text>
                  {carregandoHorarios ? (
                    <ActivityIndicator color={theme.primary} style={{ marginVertical: 10 }} />
                  ) : horariosDisponiveis.length === 0 ? (
                    <Text style={{ color: theme.placeholder, fontSize: 13, marginBottom: 12 }}>Nenhum horário disponível nesta data.</Text>
                  ) : (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                      {horariosDisponiveis.map((h) => (
                        <TouchableOpacity
                          key={h}
                          style={{
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: horarioEscolhido === h ? theme.primary : theme.placeholder,
                            backgroundColor: horarioEscolhido === h ? theme.primary : "transparent"
                          }}
                          onPress={() => setHorarioEscolhido(h)}
                        >
                          <Text style={{ color: horarioEscolhido === h ? theme.background : theme.text, fontWeight: "600" }}>{h}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <Text style={[styles.item_texto, { fontWeight: "600", marginBottom: 8 }]}>Motivo da remarcação *</Text>
                  {MOTIVOS_PADRAO.map((motivo) => (
                    <TouchableOpacity
                      key={motivo}
                      style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 10 }}
                      onPress={() => setMotivoRemarcacao(motivo)}
                    >
                      <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: theme.primary, alignItems: "center", justifyContent: "center" }}>
                        {motivoRemarcacao === motivo && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary }} />}
                      </View>
                      <Text style={{ color: theme.text, fontSize: 14 }}>{motivo}</Text>
                    </TouchableOpacity>
                  ))}

                  {motivoRemarcacao === "Outro motivo" && (
                    <TextInput
                      style={{ borderWidth: 1, borderColor: theme.placeholder, borderRadius: 8, padding: 10, color: theme.text, backgroundColor: theme.background, marginTop: 4, marginBottom: 16 }}
                      placeholder="Especifique o motivo..."
                      placeholderTextColor={theme.placeholder}
                      value={outroMotivoRemarcacao}
                      onChangeText={setOutroMotivoRemarcacao}
                    />
                  )}

                  <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                    <TouchableOpacity
                      style={[styles.botao, { flex: 1, backgroundColor: theme.placeholder, height: 44, alignItems: "center", justifyContent: "center" }]}
                      onPress={() => setModalRemarcarVisible(false)}
                    >
                      <Text style={styles.botao_texto}>Voltar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.botao, { flex: 1, height: 44, alignItems: "center", justifyContent: "center", opacity: carregando ? 0.7 : 1 }]}
                      onPress={executarRemarcacao}
                      disabled={carregando}
                    >
                      {carregando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.botao_texto}>Confirmar</Text>}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
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
                {ACOES[c.status as Status] && (
                  <View style={styles.acoes}>
                    {alterando === c.consulta_id ? (
                      <ActivityIndicator color={theme.primary} />
                    ) : (
                      ACOES[c.status as Status]!.map((a) => (
                        <TouchableOpacity
                          key={a.status}
                          style={[styles.acao, { borderColor: corStatus[a.status as Status] || theme.primary }]}
                          onPress={() => {
                            if (a.status === "cancelada") {
                              setConsultaSelecionada(c);
                              setModalCancelarVisible(true);
                            } else if (a.status === "remarcar") {
                              setConsultaRemarcar(c);
                              setDataRemarcacao(moment().format('YYYY-MM-DD'));
                              carregarHorariosRemarcacao(moment().format('YYYY-MM-DD'));
                              setModalRemarcarVisible(true);
                            } else {
                              mudarStatus(c, a.status as NovoStatus);
                            }
                          }}
                        >
                          <Text style={[styles.acao_texto, { color: corStatus[a.status as Status] || theme.primary }]}>
                            {a.rotulo}
                          </Text>
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
  const { data: equipe, loading, error, refresh } = useQuery(buscarProfissionais, []);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativos" | "inativos">("todos");

  const [modalCadastroVisivel, setModalCadastroVisivel] = useState(false);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<any | null>(null);

  const equipeFiltrada = useMemo(() => {
    if (!equipe) return [];

    return equipe.filter((s) => {
      const termo = busca.toLowerCase().trim();
      const matchTexto =
        !termo ||
        s.nome.toLowerCase().includes(termo) ||
        (s.especialidade && s.especialidade.toLowerCase().includes(termo)) ||
        (s.crm && s.crm.toLowerCase().includes(termo)) ||
        s.matricula.toLowerCase().includes(termo);

      const matchStatus =
        filtroStatus === "todos" ||
        (filtroStatus === "ativos" && s.ativo) ||
        (filtroStatus === "inativos" && !s.ativo);

      return matchTexto && matchStatus;
    });
  }, [equipe, busca, filtroStatus]);

  return (
    <View style={{ marginTop: 24 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Text style={styles.secao_titulo}>Profissionais</Text>
        
        <TouchableOpacity
          style={[styles.botao, { height: 40, paddingHorizontal: 16 }]}
          onPress={() => setModalCadastroVisivel(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.botao_texto, { fontSize: 14 }]}>+ Cadastrar profissional</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginBottom: 12 }}>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: theme.placeholder,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: theme.text,
            backgroundColor: theme.background,
          }}
          placeholder="Pesquise por nome ou registro..."
          placeholderTextColor={theme.placeholder}
          value={busca}
          onChangeText={setBusca}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        {(["todos", "ativos", "inativos"] as const).map((tipo) => {
          const selecionado = filtroStatus === tipo;
          const rotulo = tipo === "todos" ? "Todos" : tipo === "ativos" ? "Ativos" : "Inativos";
          return (
            <TouchableOpacity
              key={tipo}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 14,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: selecionado ? theme.primary : theme.placeholder,
                backgroundColor: selecionado ? theme.primary : "transparent",
              }}
              onPress={() => setFiltroStatus(tipo)}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: selecionado ? "#FFFFFF" : theme.text,
                }}
              >
                {rotulo}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginVertical: 20 }} />
      ) : error ? (
        <Text style={styles.erro}>{error}</Text>
      ) : !equipe || equipe.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: 30, gap: 10 }}>
          <Text style={styles.vazio}>Nenhum profissional cadastrado.</Text>
          <Text style={[styles.item_detalhe, { textAlign: "center" }]}>
            Cadastre os profissionais da unidade para abrir a agenda de atendimentos.
          </Text>
        </View>
      ) : equipeFiltrada.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: 30, gap: 10 }}>
          <Text style={styles.vazio}>Nenhum resultado encontrado para "{busca}".</Text>
          <TouchableOpacity
            style={[styles.acao, { borderColor: theme.primary, paddingHorizontal: 16, paddingVertical: 8 }]}
            onPress={() => {
              setBusca("");
              setFiltroStatus("todos");
            }}
          >
            <Text style={[styles.acao_texto, { color: theme.primary }]}>Limpar busca</Text>
          </TouchableOpacity>
        </View>
      ) : (
        equipeFiltrada.map((s) => (
          <TouchableOpacity
            key={s.matricula}
            style={styles.item}
            activeOpacity={0.7}
            onPress={() => setProfissionalSelecionado(s)}
          >
            <View style={styles.item_linha}>
              <Text style={styles.item_texto}>{s.nome}</Text>
              <Text style={[styles.status, { color: s.ativo ? theme.success : theme.danger }]}>
                {s.ativo ? "Ativo" : "Inativo"}
              </Text>
            </View>
            <Text style={styles.item_detalhe}>
              {s.especialidade || "Sem especialidade"} · CRM/Registro {s.crm || s.matricula}
            </Text>
            {s.horario_atendimento && (
              <Text style={[styles.item_detalhe, { marginTop: 2 }]}>
                Horário: {s.horario_atendimento}
              </Text>
            )}
          </TouchableOpacity>
        ))
      )}

      <ModalCadastrarProfissional
        visible={modalCadastroVisivel}
        onClose={() => setModalCadastroVisivel(false)}
        onSucesso={refresh}
        theme={theme}
      />

      <ModalEditarProfissional
        profissional={profissionalSelecionado}
        visible={!!profissionalSelecionado}
        onClose={() => setProfissionalSelecionado(null)}
        onSucesso={refresh}
        theme={theme}
      />
    </View>
  );
}

function ModalCadastrarProfissional({
  visible,
  onClose,
  onSucesso,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  onSucesso: () => void;
  theme: any;
}) {
  const styles = Portal_Styles(theme);

  const [nome, setNome] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [crm, setCrm] = useState("");
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFim, setHoraFim] = useState("17:00");
  const [diasSelecionados, setDiasSelecionados] = useState<string[]>([]);
  
  const [erros, setErros] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(false);

  const diasSemana = [
    { chave: "D", rotulo: "Domingo" },
    { chave: "S", rotulo: "Segunda" },
    { chave: "T", rotulo: "Terça" },
    { chave: "Q", rotulo: "Quarta" },
    { chave: "Q2", rotulo: "Quinta" },
    { chave: "S2", rotulo: "Sexta" },
    { chave: "S3", rotulo: "Sábado" },
  ];

  function toggleDia(chave: string) {
    if (diasSelecionados.includes(chave)) {
      setDiasSelecionados(diasSelecionados.filter((d) => d !== chave));
    } else {
      setDiasSelecionados([...diasSelecionados, chave]);
    }
  }

  async function handleSalvar() {
    const novosErros: Record<string, string> = {};
    if (!nome.trim()) novosErros.nome = "Nome completo é obrigatório.";
    if (!especialidade.trim()) novosErros.especialidade = "Especialidade é obrigatória.";
    if (!crm.trim()) novosErros.crm = "CRM / registro profissional é obrigatório.";
    if (diasSelecionados.length === 0) novosErros.dias = "Selecione ao menos um dia de atendimento.";
    
    const validacaoHorario = validarHorarioLogico(horaInicio, horaFim);
    if (!validacaoHorario.valido) {
      novosErros.horario = validacaoHorario.mensagem || "Horário inválido.";
    }

    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros);
      return;
    }

    setErros({});
    setCarregando(true);

    const horarioFormatado = `${horaInicio} - ${horaFim}`;

    try {
      const { error } = await cadastrarProfissional({
        nome: nome.trim(),
        especialidade: especialidade.trim(),
        crm: crm.trim(),
        dias_atendimento: diasSelecionados,
        horario_atendimento: horarioFormatado,
      });

      if (error) throw new Error(error.message);

      Alert.alert("Sucesso", "Profissional cadastrado com sucesso!");
      setNome("");
      setEspecialidade("");
      setCrm("");
      setDiasSelecionados([]);
      setHoraInicio("08:00");
      setHoraFim("17:00");
      onSucesso();
      onClose();
    } catch (err: any) {
      Alert.alert("Aviso do Servidor", err?.message || "Não foi possível realizar o cadastro.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 16 }}>
        <View style={{ backgroundColor: theme.background, borderRadius: 12, padding: 20, width: "100%", maxWidth: 500, maxHeight: "90%" }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.titulo, { fontSize: 20, marginBottom: 16 }]}>Novo profissional</Text>

            <Text style={[styles.item_texto, { fontWeight: "600", marginBottom: 4 }]}>Nome completo</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: erros.nome ? theme.danger : theme.placeholder, borderRadius: 8, padding: 10, color: theme.text, marginBottom: erros.nome ? 2 : 12, backgroundColor: theme.background }}
              placeholder="Ex: Ana Souza"
              placeholderTextColor={theme.placeholder}
              value={nome}
              onChangeText={setNome}
            />
            {erros.nome && <Text style={{ color: theme.danger, fontSize: 12, marginBottom: 10 }}>{erros.nome}</Text>}

            <Text style={[styles.item_texto, { fontWeight: "600", marginBottom: 4 }]}>Especialidade</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: erros.especialidade ? theme.danger : theme.placeholder, borderRadius: 8, padding: 10, color: theme.text, marginBottom: erros.especialidade ? 2 : 12, backgroundColor: theme.background }}
              placeholder="Ex: Clínico Geral"
              placeholderTextColor={theme.placeholder}
              value={especialidade}
              onChangeText={setEspecialidade}
            />
            {erros.especialidade && <Text style={{ color: theme.danger, fontSize: 12, marginBottom: 10 }}>{erros.especialidade}</Text>}

            <Text style={[styles.item_texto, { fontWeight: "600", marginBottom: 4 }]}>CRM / registro profissional</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: erros.crm ? theme.danger : theme.placeholder, borderRadius: 8, padding: 10, color: theme.text, marginBottom: erros.crm ? 2 : 12, backgroundColor: theme.background }}
              placeholder="Ex: CRM-SP 123456"
              placeholderTextColor={theme.placeholder}
              value={crm}
              onChangeText={setCrm}
            />
            {erros.crm && <Text style={{ color: theme.danger, fontSize: 12, marginBottom: 10 }}>{erros.crm}</Text>}

            <Text style={[styles.item_texto, { fontWeight: "600", marginBottom: 6 }]}>Dias de atendimento</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
              {diasSemana.map((d, index) => {
                const selecionado = diasSelecionados.includes(d.chave);
                return (
                  <TouchableOpacity
                    key={index}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: selecionado ? theme.primary : theme.placeholder,
                      backgroundColor: selecionado ? theme.primary : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onPress={() => toggleDia(d.chave)}
                  >
                    <Text style={{ color: selecionado ? "#FFF" : theme.text, fontWeight: "bold", fontSize: 12 }}>
                      {d.chave.replace("2", "").replace("3", "")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {erros.dias && <Text style={{ color: theme.danger, fontSize: 12, marginBottom: 10 }}>{erros.dias}</Text>}

            <Text style={[styles.item_texto, { fontWeight: "600", marginBottom: 4 }]}>Horário de atendimento</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: erros.horario ? 2 : 20 }}>
              <TextInput
                style={{ flex: 1, borderWidth: 1, borderColor: erros.horario ? theme.danger : theme.placeholder, borderRadius: 8, padding: 10, color: theme.text, backgroundColor: theme.background, textAlign: "center" }}
                placeholder="08:00"
                maxLength={5}
                keyboardType="numeric"
                placeholderTextColor={theme.placeholder}
                value={horaInicio}
                onChangeText={(t) => setHoraInicio(aplicarMascaraHora(t))}
              />
              <Text style={{ color: theme.text, fontWeight: "bold" }}>às</Text>
              <TextInput
                style={{ flex: 1, borderWidth: 1, borderColor: erros.horario ? theme.danger : theme.placeholder, borderRadius: 8, padding: 10, color: theme.text, backgroundColor: theme.background, textAlign: "center" }}
                placeholder="17:00"
                maxLength={5}
                keyboardType="numeric"
                placeholderTextColor={theme.placeholder}
                value={horaFim}
                onChangeText={(t) => setHoraFim(aplicarMascaraHora(t))}
              />
            </View>
            {erros.horario && <Text style={{ color: theme.danger, fontSize: 12, marginBottom: 16 }}>{erros.horario}</Text>}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.botao, { flex: 1, backgroundColor: theme.placeholder, height: 44 }]}
                onPress={onClose}
              >
                <Text style={styles.botao_texto}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.botao, { flex: 1, height: 44, opacity: carregando ? 0.7 : 1 }]}
                onPress={handleSalvar}
                disabled={carregando}
              >
                {carregando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.botao_texto}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ModalEditarProfissional({
  profissional,
  visible,
  onClose,
  onSucesso,
  theme,
}: {
  profissional: any | null;
  visible: boolean;
  onClose: () => void;
  onSucesso: () => void;
  theme: any;
}) {
  const styles = Portal_Styles(theme);

  const [erroHorario, setErroHorario] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [especialidade, setEspec] = useState("");
  const [crm, setCrm] = useState("");
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFim, setHoraFim] = useState("17:00");
  const [diasSelecionados, setDias] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (profissional) {
      setNome(profissional.nome || "");
      setEspec(profissional.especialidade || "");
      setCrm(profissional.crm || profissional.matricula || "");
      
      const horarioStr = profissional.horario_atendimento || "08:00 - 17:00";
      const partes = horarioStr.split("-");
      if (partes.length === 2) {
        setHoraInicio(partes[0].trim());
        setHoraFim(partes[1].trim());
      } else {
        setHoraInicio("08:00");
        setHoraFim("17:00");
      }

      setDias(profissional.dias_atendimento || ["S", "T", "Q", "Q2", "S2"]);
    }
  }, [profissional]);

  const diasSemana = [
    { chave: "D", rotulo: "Domingo" },
    { chave: "S", rotulo: "Segunda" },
    { chave: "T", rotulo: "Terça" },
    { chave: "Q", rotulo: "Quarta" },
    { chave: "Q2", rotulo: "Quinta" },
    { chave: "S2", rotulo: "Sexta" },
    { chave: "S3", rotulo: "Sábado" },
  ];

  function toggleDia(chave: string) {
    if (diasSelecionados.includes(chave)) {
      setDias(diasSelecionados.filter((d) => d !== chave));
    } else {
      setDias([...diasSelecionados, chave]);
    }
  }

  async function handleSalvar() {
    if (!nome.trim() || !especialidade.trim() || !crm.trim()) {
      Alert.alert("Atenção", "Preencha todos os campos obrigatórios.");
      return;
    }

    const validacaoHorario = validarHorarioLogico(horaInicio, horaFim);
    if (!validacaoHorario.valido) {
      setErroHorario(validacaoHorario.mensagem || "Horário inválido.");
      return;
    }
    setErroHorario(null);

    setCarregando(true);
    const horarioFormatado = `${horaInicio} - ${horaFim}`;

    try {
      const { error } = await atualizarProfissional({
        matricula: profissional.matricula || profissional.crm,
        nome: nome.trim(),
        especialidade: especialidade.trim(),
        crm: crm.trim(),
        dias_atendimento: diasSelecionados,
        horario_atendimento: horarioFormatado,
      });

      if (error) throw new Error(error.message);

      Alert.alert("Sucesso", "Dados do profissional atualizados com sucesso!");
      onSucesso();
      onClose();
    } catch (err: any) {
      Alert.alert("Aviso do Servidor", err?.message || "Não foi possível atualizar.");
    } finally {
      setCarregando(false);
    }
  }

  async function handleDesativar() {
    Alert.alert(
      "Desativar profissional",
      `Deseja desativar ${profissional.nome}? O profissional deixará de aparecer na agenda.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desativar",
          style: "destructive",
          onPress: async () => {
            setCarregando(true);
            try {
              const { error } = await desativarProfissional(profissional.matricula || profissional.crm);
              if (error) throw new Error(error.message);

              Alert.alert("Sucesso", "Profissional desativado com sucesso.");
              onSucesso();
              onClose();
            } catch (err: any) {
              Alert.alert("Aviso do Servidor", err?.message || "Não foi possível desativar.");
            } finally {
              setCarregando(false);
            }
          },
        },
      ]
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 16 }}>
        <View style={{ backgroundColor: theme.background, borderRadius: 12, padding: 20, width: "100%", maxWidth: 500, maxHeight: "90%" }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.titulo, { fontSize: 20, marginBottom: 16 }]}>Editar profissional</Text>

            <Text style={[styles.item_texto, { fontWeight: "600", marginBottom: 4 }]}>Nome completo</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: theme.placeholder, borderRadius: 8, padding: 10, color: theme.text, marginBottom: 12, backgroundColor: theme.background }}
              value={nome}
              onChangeText={setNome}
            />

            <Text style={[styles.item_texto, { fontWeight: "600", marginBottom: 4 }]}>Especialidade</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: theme.placeholder, borderRadius: 8, padding: 10, color: theme.text, marginBottom: 12, backgroundColor: theme.background }}
              value={especialidade}
              onChangeText={setEspec}
            />

            <Text style={[styles.item_texto, { fontWeight: "600", marginBottom: 4 }]}>CRM / registro profissional</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: theme.placeholder, borderRadius: 8, padding: 10, color: theme.text, marginBottom: 12, backgroundColor: theme.background }}
              value={crm}
              onChangeText={setCrm}
            />

            <Text style={[styles.item_texto, { fontWeight: "600", marginBottom: 6 }]}>Dias de atendimento</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
              {diasSemana.map((d, index) => {
                const selecionado = diasSelecionados.includes(d.chave);
                return (
                  <TouchableOpacity
                    key={index}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: selecionado ? theme.primary : theme.placeholder,
                      backgroundColor: selecionado ? theme.primary : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onPress={() => toggleDia(d.chave)}
                  >
                    <Text style={{ color: selecionado ? "#FFF" : theme.text, fontWeight: "bold", fontSize: 12 }}>
                      {d.chave.replace("2", "").replace("3", "")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.item_texto, { fontWeight: "600", marginBottom: 4 }]}>Horário de atendimento</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: erroHorario ? 2 : 20 }}>
              <TextInput
                style={{ flex: 1, borderWidth: 1, borderColor: erroHorario ? theme.danger : theme.placeholder, borderRadius: 8, padding: 10, color: theme.text, backgroundColor: theme.background, textAlign: "center" }}
                value={horaInicio}
                maxLength={5}
                keyboardType="numeric"
                onChangeText={(t) => { setHoraInicio(aplicarMascaraHora(t)); setErroHorario(null); }}
              />
              <Text style={{ color: theme.text, fontWeight: "bold" }}>às</Text>
              <TextInput
                style={{ flex: 1, borderWidth: 1, borderColor: erroHorario ? theme.danger : theme.placeholder, borderRadius: 8, padding: 10, color: theme.text, backgroundColor: theme.background, textAlign: "center" }}
                value={horaFim}
                maxLength={5}
                keyboardType="numeric"
                onChangeText={(t) => { setHoraFim(aplicarMascaraHora(t)); setErroHorario(null); }}
              />
            </View>
            {erroHorario && <Text style={{ color: theme.danger, fontSize: 12, marginBottom: 16 }}>{erroHorario}</Text>}

            <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
              <TouchableOpacity
                style={[styles.botao, { flex: 1, backgroundColor: theme.placeholder, height: 44, alignItems: "center", justifyContent: "center" }]}
                onPress={onClose}
              >
                <Text style={styles.botao_texto}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.botao, { flex: 1, height: 44, opacity: carregando ? 0.7 : 1, alignItems: "center", justifyContent: "center" }]}
                onPress={handleSalvar}
                disabled={carregando}
              >
                {carregando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.botao_texto}>Salvar</Text>}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{
                borderWidth: 1,
                borderColor: theme.danger,
                borderRadius: 8,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "transparent"
              }}
              onPress={handleDesativar}
            >
              <Text style={{ color: theme.danger, fontWeight: "bold", fontSize: 14 }}>Desativar profissional</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}