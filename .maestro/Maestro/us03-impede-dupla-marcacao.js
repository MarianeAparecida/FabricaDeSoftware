/*
 * US03 - Impedir dupla marcação de consulta
 *
 * Objetivo: provar que o banco não permite duas consultas ativas
 * (agendada/confirmada) para o mesmo profissional no mesmo horário.
 * Regra aplicada pelo índice único parcial consulta_profissional_horario_unico_idx.
 *
 * Fluxo:
 * 1) Login do paciente de teste e captura do token.
 * 2) Busca profissional, paciente e um horário de amanhã (fuso -03:00).
 * 3) Limpeza prévia: cancela sobras de execuções anteriores nesse horário.
 * 4) Insere a mesma consulta duas vezes seguidas.
 * 5) Guarda em output:
 *      primeiraInsercaoOk       -> 201 (criada)
 *      segundaInsercaoBloqueada -> 409 (recusada pelo índice único)
 * 6) Limpeza final: cancela a consulta criada, liberando o horário.
 *
 * Observações:
 * - O Maestro não tem http.patch; usa-se http.request com method "PATCH".
 * - Não imprimir token/corpo do login no console.
 */

const SUPABASE_URL = "https://szbcloiswybqiwyyejdj.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6YmNsb2lzd3licWl3eXllamRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDk0OTksImV4cCI6MjA3NDkyNTQ5OX0.DjCSY_BLtydN5Fv_ShOXtv1OApVYV69nHgc9UBwEBpA";

function headersAnon() {
  return { apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY, "Content-Type": "application/json" };
}

// 1) Login do paciente de teste via Edge Function (mesmo fluxo que o app usa)
const loginRes = http.post(SUPABASE_URL + "/functions/v1/login-paciente", {
  headers: headersAnon(),
    body: JSON.stringify({ cpf: String(PACIENTE_CPF).replace(/\D/g, ""), password: PACIENTE_SENHA })
});
console.log("Status login: " + loginRes.status);

const sessao = json(loginRes.body);
const accessToken = sessao.access_token || (sessao.session && sessao.session.access_token);

function headersAuth() {
  return { apikey: ANON_KEY, Authorization: "Bearer " + accessToken, "Content-Type": "application/json" };
}

// 2) Pega o id do paciente logado (a RPC devolve o valor direto)
const pacienteId = json(
  http.post(SUPABASE_URL + "/rest/v1/rpc/meu_paciente_id", {
    headers: headersAuth(),
    body: JSON.stringify({})
  }).body
);

// 3) Acha o profissional e um horário livre
const nomeProf = encodeURIComponent("Murilo de Araújo");
const prof = json(
  http.get(SUPABASE_URL + "/rest/v1/profissional?select=id,unidade_saude_id&nome=eq." + nomeProf, {
    headers: { apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY }
  }).body
)[0];

// Data de amanhã (calculada localmente, sem passar por UTC)
function dois(n) { return n < 10 ? "0" + n : "" + n; }
const hoje = new Date();
const amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
const dataStr = amanha.getFullYear() + "-" + dois(amanha.getMonth() + 1) + "-" + dois(amanha.getDate());

const rpcRes = http.post(SUPABASE_URL + "/rest/v1/rpc/buscar_disponibilidade_agenda", {
  headers: headersAnon(),
  body: JSON.stringify({ p_unidade_id: prof.unidade_saude_id, p_profissional_id: prof.id, p_data: dataStr })
});
const horarios = json(rpcRes.body);
const horario = (horarios && horarios[0] && horarios[0].horario ? horarios[0].horario : "22:30").substring(0, 5);
const dataHoraISO = dataStr + "T" + horario + ":00-03:00"; // fuso explícito

// 3.1) Limpeza prévia: libera o horário caso tenha sobrado consulta de execução anterior
http.request(
  SUPABASE_URL + "/rest/v1/consulta?profissional_id=eq." + prof.id +
    "&data_hora=eq." + encodeURIComponent(dataHoraISO) +
    "&status=in.(agendada,confirmada)",
  {
    method: "PATCH",
    headers: headersAuth(),
    body: JSON.stringify({ status: "cancelada" })
  }
);

const corpoConsulta = {
  paciente_id: pacienteId,
  profissional_id: prof.id,
  unidade_saude_id: prof.unidade_saude_id,
  status: "agendada",
  data_hora: dataHoraISO,
  especialidade: "Dentista"
};

function inserirConsulta() {
  const headers = headersAuth();
  headers["Prefer"] = "return=representation";
  const res = http.post(SUPABASE_URL + "/rest/v1/consulta", {
    headers: headers,
    body: JSON.stringify(corpoConsulta)
  });
  return { status: res.status, body: res.body };
}

// 4) Insere duas vezes seguidas, no mesmo horário
const primeira = inserirConsulta();
const segunda = inserirConsulta();

output.primeiraInsercaoOk = primeira.status === 201;
output.segundaInsercaoBloqueada = segunda.status === 409;

console.log("1ª inserção: " + primeira.status + " | " + primeira.body);
console.log("2ª inserção: " + segunda.status + " | " + segunda.body);

// 5) Limpeza: cancela a consulta criada (libera o horário no índice parcial)
if (output.primeiraInsercaoOk) {
  const criada = json(primeira.body)[0];
  http.request(SUPABASE_URL + "/rest/v1/consulta?id=eq." + criada.id, {
    method: "PATCH",
    headers: headersAuth(),
    body: JSON.stringify({ status: "cancelada" })
  });
  console.log("Consulta de teste cancelada (id " + criada.id + ")");
}