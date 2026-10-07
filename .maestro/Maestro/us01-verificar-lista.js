// Reaproveita a mesma lógica: busca a disponibilidade real do dia escolhido
const SUPABASE_URL = "https://szbcloiswybqiwyyejdj.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6YmNsb2lzd3licWl3eXllamRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDk0OTksImV4cCI6MjA3NDkyNTQ5OX0.DjCSY_BLtydN5Fv_ShOXtv1OApVYV69nHgc9UBwEBpA";

function sbGet(path) {
  const res = http.get(SUPABASE_URL + path, {
    headers: { apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY }
  });
  return json(res.body);
}

const nomeProf = encodeURIComponent("Murilo de Araújo");
const prof = sbGet("/rest/v1/profissional?select=id,unidade_saude_id&nome=eq." + nomeProf)[0];

// Usa a mesma data já escolhida pelo output anterior
function dois(n) { return n < 10 ? "0" + n : "" + n; }
const hoje = new Date();
const d = new Date(hoje.getFullYear(), hoje.getMonth() + Number(output.mesesNavegados), Number(output.diaDoMes));
const dataStr = d.getFullYear() + "-" + dois(d.getMonth() + 1) + "-" + dois(d.getDate());

const rpcRes = http.post(SUPABASE_URL + "/rest/v1/rpc/buscar_disponibilidade_agenda", {
  headers: {
    apikey: ANON_KEY,
    Authorization: "Bearer " + ANON_KEY,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    p_unidade_id: prof.unidade_saude_id,
    p_profissional_id: prof.id,
    p_data: dataStr
  })
});

const horarios = json(rpcRes.body).map(function (h) { return h.horario; });
output.horariosEsperados = horarios;
console.log("Horários esperados vindos do banco: " + JSON.stringify(horarios));