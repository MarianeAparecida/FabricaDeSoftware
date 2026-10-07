const SUPABASE_URL = "https://szbcloiswybqiwyyejdj.supabase.co";
const SERVICE_KEY = SERVICE_ROLE_KEY; // vem do Env do Maestro Studio

function sbGet(path, key) {
  const res = http.get(SUPABASE_URL + path, {
    headers: { apikey: key, Authorization: "Bearer " + key }
  });
  console.log("Status: " + res.status + " | Corpo: " + res.body);
  return json(res.body);
}

const nomeProf = encodeURIComponent("Murilo de Araújo");
const profResp = sbGet("/rest/v1/profissional?select=id,unidade_saude_id&nome=eq." + nomeProf, SERVICE_KEY);
console.log("Resposta profissional: " + JSON.stringify(profResp));
const prof = profResp[0];

const hoje = new Date();
const amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
const mesesNavegados = amanha.getMonth() !== hoje.getMonth() ? 1 : 0;

const novoHorario = "22:00";

const insertRes = http.post(SUPABASE_URL + "/rest/v1/grade_atendimento", {
  headers: {
    apikey: SERVICE_KEY,
    Authorization: "Bearer " + SERVICE_KEY,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  },
  body: JSON.stringify({
    unidade_saude_id: prof.unidade_saude_id,
    profissional_id: prof.id,
    dia_semana: amanha.getDay(),
    hora_inicio: novoHorario + ":00",
    hora_fim: "22:15:00",
    intervalo_minutos: 15,
    ativo: true
  })
});

const inserted = json(insertRes.body)[0];

output.diaDoMes = String(amanha.getDate());
output.mesesNavegados = mesesNavegados;
output.horarioEsperado = novoHorario;
output.insertedId = inserted.id;

console.log("Grade temporária criada: id " + inserted.id + " | dia " + amanha.toDateString() + " | horário " + novoHorario);