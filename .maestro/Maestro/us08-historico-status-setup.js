/*
 * US08 - Registrar realização, falta e confirmação da consulta (histórico)
 *
 * Objetivo: provar que o histórico do paciente mostra o status gravado:
 *   realizada -> "Realizada"   | faltou -> "Faltou"
 *   passada sem registro (agendada) -> "Sem registro", e não "Realizada"
 *   consulta futura -> não aparece no histórico
 *
 * Este script prepara os dados (usa SERVICE_ROLE_KEY do ambiente do Maestro).
 * Todas as consultas de teste têm a especialidade começando com
 * "TESTE US08 AUTO", para serem identificadas na tela e apagadas depois.
 * Não imprimir tokens nem a SERVICE_ROLE_KEY no console.
 */

const SUPABASE_URL = "https://szbcloiswybqiwyyejdj.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6YmNsb2lzd3licWl3eXllamRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDk0OTksImV4cCI6MjA3NDkyNTQ5OX0.DjCSY_BLtydN5Fv_ShOXtv1OApVYV69nHgc9UBwEBpA";
const SERVICE_KEY = SERVICE_ROLE_KEY; // vem do ambiente US01 do Maestro
const PREFIXO = "TESTE US08 AUTO";

function headersAnon() {
  return { apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY, "Content-Type": "application/json" };
}
function headersService() {
  return { apikey: SERVICE_KEY, Authorization: "Bearer " + SERVICE_KEY, "Content-Type": "application/json" };
}
function dois(n) { return n < 10 ? "0" + n : "" + n; }

// Data/hora relativa a hoje, com fuso explícito (-03:00)
function dataHora(diasAFrente, hhmm) {
  const h = new Date();
  const d = new Date(h.getFullYear(), h.getMonth(), h.getDate() + diasAFrente);
  return d.getFullYear() + "-" + dois(d.getMonth() + 1) + "-" + dois(d.getDate()) + "T" + hhmm + ":00-03:00";
}

// 1) Limpeza prévia: remove sobras de execuções anteriores
http.delete(
  SUPABASE_URL + "/rest/v1/consulta?especialidade=like." + encodeURIComponent(PREFIXO) + "*",
  { headers: headersService() }
);

// 2) Descobre o paciente de teste e a unidade
const loginRes = http.post(SUPABASE_URL + "/functions/v1/login-paciente", {
  headers: headersAnon(),
  body: JSON.stringify({ cpf: "12345678900", password: "ABC123!@#ab" })
});
console.log("Status login: " + loginRes.status);
const sessao = json(loginRes.body);
const token = sessao.access_token || (sessao.session && sessao.session.access_token);

const pacienteId = json(
  http.post(SUPABASE_URL + "/rest/v1/rpc/meu_paciente_id", {
    headers: { apikey: ANON_KEY, Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({})
  }).body
);

const prof = json(
  http.get(SUPABASE_URL + "/rest/v1/profissional?select=unidade_saude_id&nome=eq." + encodeURIComponent("Murilo de Araújo"), {
    headers: headersAnon()
  }).body
)[0];

// 3) Cria as consultas de teste (sem profissional, para não ocupar a agenda)
const linhas = [
  { status: "realizada", data_hora: dataHora(0, "23:30"),  especialidade: PREFIXO + " realizada" },
  { status: "faltou",    data_hora: dataHora(-1, "09:00"), especialidade: PREFIXO + " faltou" },
  { status: "agendada",  data_hora: dataHora(-2, "10:00"), especialidade: PREFIXO + " semregistro" },
  { status: "agendada",  data_hora: dataHora(2, "15:00"),  especialidade: PREFIXO + " futura" }
];
for (let i = 0; i < linhas.length; i++) {
  linhas[i].paciente_id = pacienteId;
  linhas[i].unidade_saude_id = prof.unidade_saude_id;
}

const insertRes = http.post(SUPABASE_URL + "/rest/v1/consulta", {
  headers: headersService(),
  body: JSON.stringify(linhas)
});
console.log("Criação das consultas de teste: " + insertRes.status);
if (insertRes.status !== 201) {
  console.log("Corpo: " + insertRes.body);
  throw new Error("Não foi possível criar as consultas de teste da US-08");
}