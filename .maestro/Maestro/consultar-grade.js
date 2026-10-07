const SUPABASE_URL = "https://szbcloiswybqiwyyejdj.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6YmNsb2lzd3licWl3eXllamRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDk0OTksImV4cCI6MjA3NDkyNTQ5OX0.DjCSY_BLtydN5Fv_ShOXtv1OApVYV69nHgc9UBwEBpA";

function sbGet(path) {
  const res = http.get(SUPABASE_URL + path, {
    headers: { apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY }
  });
  return json(res.body);
}

const nomeProf = encodeURIComponent("Murilo de Araújo");
const profResp = sbGet("/rest/v1/profissional?select=id,unidade_saude_id&nome=eq." + nomeProf);
const prof = profResp[0];

const grade = sbGet(
  "/rest/v1/grade_atendimento?select=dia_semana&profissional_id=eq." + prof.id + "&ativo=eq.true"
);
const diasAtivos = grade.map(function (g) { return g.dia_semana; });

let dataEscolhida = null;
let horarioEscolhido = null;
let mesesNavegados = 0;
const hoje = new Date();

for (let offsetMes = 0; offsetMes <= 3 && !dataEscolhida; offsetMes++) {
  const anoMes = new Date(hoje.getFullYear(), hoje.getMonth() + offsetMes, 1);
  const diaInicial = offsetMes === 0 ? hoje.getDate() + 1 : 1;
  const ultimoDiaDoMes = new Date(anoMes.getFullYear(), anoMes.getMonth() + 1, 0).getDate();

  for (let dia = diaInicial; dia <= ultimoDiaDoMes && !dataEscolhida; dia++) {
    const d = new Date(anoMes.getFullYear(), anoMes.getMonth(), dia);
    if (diasAtivos.indexOf(d.getDay()) === -1) continue;

    const dataStr = d.toISOString().split("T")[0];
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

    const horarios = json(rpcRes.body);
    if (horarios && horarios.length > 0) {
      dataEscolhida = d;
      horarioEscolhido = horarios[0].horario;
      mesesNavegados = offsetMes;
    }
  }
}

if (dataEscolhida) {
  output.diaDoMes = String(dataEscolhida.getDate());
  output.horario = horarioEscolhido;
  output.mesesNavegados = mesesNavegados;
  console.log(
    "Data: " + dataEscolhida.toDateString() +
    " | Horário: " + horarioEscolhido +
    " | Meses à frente: " + mesesNavegados
  );
} else {
  console.log("Nenhum horário disponível encontrado nos próximos 3 meses.");
}