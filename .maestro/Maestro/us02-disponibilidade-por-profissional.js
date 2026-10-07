/*
 * US02 - Calcular disponibilidade por profissional
 *
 * Objetivo: provar que a disponibilidade considera apenas as consultas do
 * profissional escolhido e que a busca exige a unidade.
 *
 * Fluxo:
 * 1) Login do paciente de teste e captura do token.
 * 2) Cria um profissional temporário na mesma unidade do profissional A,
 *    copiando a grade dele (usa SERVICE_ROLE_KEY do ambiente do Maestro).
 * 3) Procura, nos próximos 14 dias, a primeira data com horário livre em
 *    comum para os dois (RPC buscar_disponibilidade_agenda).
 * 4) Cria uma consulta para o profissional A nesse horário.
 * 5) Verifica em output:
 *      horarioSumiuParaProfissionalA   -> o horário não aparece mais para A
 *      horarioContinuaLivreParaB       -> o horário continua disponível para B
 *      semUnidadeRetornaErro           -> busca sem unidade retorna erro, não lista vazia
 * 6) Limpeza (sempre, mesmo se der erro): cancela a consulta criada e apaga
 *    o profissional temporário e a grade dele.
 *
 * Observações:
 * - O Maestro não tem http.patch; usa-se http.request com method "PATCH".
 * - Não imprimir tokens nem a SERVICE_ROLE_KEY no console.
 */

const SUPABASE_URL = "https://szbcloiswybqiwyyejdj.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6YmNsb2lzd3licWl3eXllamRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDk0OTksImV4cCI6MjA3NDkyNTQ5OX0.DjCSY_BLtydN5Fv_ShOXtv1OApVYV69nHgc9UBwEBpA";
const SERVICE_KEY = SERVICE_ROLE_KEY; // vem do ambiente US01 do Maestro
const NOME_PROF_TESTE = "Profissional Teste US02";

function headersAnon() {
  return { apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY, "Content-Type": "application/json" };
}

function headersService() {
  return { apikey: SERVICE_KEY, Authorization: "Bearer " + SERVICE_KEY, "Content-Type": "application/json" };
}

function dois(n) { return n < 10 ? "0" + n : "" + n; }

// Chama a RPC de disponibilidade e devolve { status, horarios: ["HH:MM", ...] }
function disponibilidade(unidadeId, profissionalId, data) {
  const res = http.post(SUPABASE_URL + "/rest/v1/rpc/buscar_disponibilidade_agenda", {
    headers: headersAnon(),
    body: JSON.stringify({ p_unidade_id: unidadeId, p_profissional_id: profissionalId, p_data: data })
  });
  const horarios = [];
  if (res.status === 200) {
    const lista = json(res.body);
    for (let i = 0; lista && i < lista.length; i++) {
      horarios.push(String(lista[i].horario).substring(0, 5));
    }
  }
  return { status: res.status, horarios: horarios };
}

// Apaga um profissional de teste e a grade dele
function apagarProfissional(id) {
  http.delete(SUPABASE_URL + "/rest/v1/grade_atendimento?profissional_id=eq." + id, { headers: headersService() });
  const res = http.delete(SUPABASE_URL + "/rest/v1/profissional?id=eq." + id, { headers: headersService() });
  return res.status;
}

output.horarioSumiuParaProfissionalA = false;
output.horarioContinuaLivreParaB = false;
output.semUnidadeRetornaErro = false;

let accessToken = null;
let profBId = null;
let criada = null;

try {
  // 1) Login do paciente de teste
  const loginRes = http.post(SUPABASE_URL + "/functions/v1/login-paciente", {
    headers: headersAnon(),
    body: JSON.stringify({ cpf: "12345678900", password: "ABC123!@#ab" })
  });
  console.log("Status login: " + loginRes.status);
  const sessao = json(loginRes.body);
  accessToken = sessao.access_token || (sessao.session && sessao.session.access_token);

  const headersAuth = { apikey: ANON_KEY, Authorization: "Bearer " + accessToken, "Content-Type": "application/json" };

  const pacienteId = json(
    http.post(SUPABASE_URL + "/rest/v1/rpc/meu_paciente_id", {
      headers: headersAuth,
      body: JSON.stringify({})
    }).body
  );

  const profA = json(
    http.get(SUPABASE_URL + "/rest/v1/profissional?select=id,unidade_saude_id&nome=eq." + encodeURIComponent("Murilo de Araújo"), {
      headers: headersAnon()
    }).body
  )[0];

  // 2) Cria o profissional temporário (B) na mesma unidade do A
  // 2.1) Remove sobras de execuções anteriores que tenham falhado no meio
  const sobras = json(
    http.get(SUPABASE_URL + "/rest/v1/profissional?select=id&nome=eq." + encodeURIComponent(NOME_PROF_TESTE), {
      headers: headersService()
    }).body
  );
  for (let i = 0; sobras && i < sobras.length; i++) {
    apagarProfissional(sobras[i].id);
  }

  // 2.2) A coluna id não tem valor padrão: usa o maior id + 1
  const ultimo = json(
    http.get(SUPABASE_URL + "/rest/v1/profissional?select=id&order=id.desc&limit=1", {
      headers: headersService()
    }).body
  );
  profBId = (ultimo && ultimo[0] ? Number(ultimo[0].id) : 0) + 1;

  const criaProf = http.post(SUPABASE_URL + "/rest/v1/profissional", {
    headers: headersService(),
    body: JSON.stringify({
      id: profBId,
      nome: NOME_PROF_TESTE,
      cpf: "000.000.000-02",
      registro_conselho: "TESTE-US02",
      especialidade: "Dentista",
      unidade_saude_id: profA.unidade_saude_id
    })
  });
  console.log("Criação do profissional temporário: " + criaProf.status);
  if (criaProf.status !== 201) {
    console.log("Corpo: " + criaProf.body);
    profBId = null; // nada foi criado, não há o que apagar
    throw new Error("Não foi possível criar o profissional temporário");
  }

  // 2.3) Copia a grade ativa do profissional A para o B
  const gradeA = json(
    http.get(
      SUPABASE_URL + "/rest/v1/grade_atendimento?select=dia_semana,hora_inicio,hora_fim,intervalo_minutos,ativo,unidade_saude_id" +
        "&profissional_id=eq." + profA.id + "&ativo=eq.true",
      { headers: headersService() }
    ).body
  );
  const gradeB = [];
  for (let i = 0; gradeA && i < gradeA.length; i++) {
    gradeB.push({
      profissional_id: profBId,
      unidade_saude_id: gradeA[i].unidade_saude_id,
      dia_semana: gradeA[i].dia_semana,
      hora_inicio: gradeA[i].hora_inicio,
      hora_fim: gradeA[i].hora_fim,
      intervalo_minutos: gradeA[i].intervalo_minutos,
      ativo: gradeA[i].ativo
    });
  }
  const criaGrade = http.post(SUPABASE_URL + "/rest/v1/grade_atendimento", {
    headers: headersService(),
    body: JSON.stringify(gradeB)
  });
  console.log("Cópia da grade (" + gradeB.length + " faixa(s)): " + criaGrade.status);
  if (criaGrade.status !== 201) {
    console.log("Corpo: " + criaGrade.body);
    throw new Error("Não foi possível copiar a grade para o profissional temporário");
  }

  // 3) Procura nos próximos 14 dias a primeira data com horário livre em comum
  let dataStr = null;
  let horarioEscolhido = null;
  const hoje = new Date();
  for (let d = 1; d <= 14 && !horarioEscolhido; d++) {
    const dia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + d);
    const candidata = dia.getFullYear() + "-" + dois(dia.getMonth() + 1) + "-" + dois(dia.getDate());
    const dispA = disponibilidade(profA.unidade_saude_id, profA.id, candidata);
    if (dispA.horarios.length === 0) continue;
    const dispB = disponibilidade(profA.unidade_saude_id, profBId, candidata);
    for (let i = 0; i < dispA.horarios.length; i++) {
      if (dispB.horarios.indexOf(dispA.horarios[i]) >= 0) {
        dataStr = candidata;
        horarioEscolhido = dispA.horarios[i];
        break;
      }
    }
  }

  if (horarioEscolhido) {
    console.log("Horário escolhido: " + dataStr + " " + horarioEscolhido);

    // 4) Cria consulta para o profissional A nesse horário
    const headersInsert = { apikey: ANON_KEY, Authorization: "Bearer " + accessToken, "Content-Type": "application/json", "Prefer": "return=representation" };
    const insertRes = http.post(SUPABASE_URL + "/rest/v1/consulta", {
      headers: headersInsert,
      body: JSON.stringify({
        paciente_id: pacienteId,
        profissional_id: profA.id,
        unidade_saude_id: profA.unidade_saude_id,
        status: "agendada",
        data_hora: dataStr + "T" + horarioEscolhido + ":00-03:00",
        especialidade: "Dentista"
      })
    });
    console.log("Inserção para o profissional A: " + insertRes.status);

    if (insertRes.status === 201) {
      criada = json(insertRes.body)[0];

      // 5) Reconsulta a disponibilidade dos dois
      const dispA2 = disponibilidade(profA.unidade_saude_id, profA.id, dataStr);
      const dispB2 = disponibilidade(profA.unidade_saude_id, profBId, dataStr);
      output.horarioSumiuParaProfissionalA = dispA2.status === 200 && dispA2.horarios.indexOf(horarioEscolhido) < 0;
      output.horarioContinuaLivreParaB = dispB2.status === 200 && dispB2.horarios.indexOf(horarioEscolhido) >= 0;
    } else {
      console.log("Corpo da inserção: " + insertRes.body);
    }
  } else {
    console.log("Não há horário livre em comum para os dois profissionais nos próximos 14 dias.");
  }

  // 5.1) Busca sem unidade deve retornar erro de parâmetro obrigatório, não lista vazia
  const dataBusca = dataStr || "2026-10-12";
  const semUnidadeOmitida = http.post(SUPABASE_URL + "/rest/v1/rpc/buscar_disponibilidade_agenda", {
    headers: headersAnon(),
    body: JSON.stringify({ p_profissional_id: profA.id, p_data: dataBusca })
  });
  const semUnidadeNula = http.post(SUPABASE_URL + "/rest/v1/rpc/buscar_disponibilidade_agenda", {
    headers: headersAnon(),
    body: JSON.stringify({ p_unidade_id: null, p_profissional_id: profA.id, p_data: dataBusca })
  });
  console.log("Sem unidade (omitida): " + semUnidadeOmitida.status);
  console.log("Sem unidade (null): " + semUnidadeNula.status + " | " + semUnidadeNula.body);
  output.semUnidadeRetornaErro =
    semUnidadeOmitida.status >= 400 &&
    semUnidadeNula.status === 400 &&
    String(semUnidadeNula.body).indexOf("obrigatorio") >= 0;
} finally {
  // 6) Limpeza: roda sempre, mesmo se algo acima falhar
  if (criada) {
    http.request(SUPABASE_URL + "/rest/v1/consulta?id=eq." + criada.id, {
      method: "PATCH",
      headers: { apikey: ANON_KEY, Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelada" })
    });
    console.log("Consulta de teste cancelada (id " + criada.id + ")");
  }
  if (profBId !== null) {
    const st = apagarProfissional(profBId);
    console.log("Profissional temporário apagado (id " + profBId + "): " + st);
  }
}