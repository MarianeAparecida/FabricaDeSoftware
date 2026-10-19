// Remove as consultas de teste da US-08 (roda no fim do fluxo, mesmo se o teste falhar)
const SUPABASE_URL = "https://szbcloiswybqiwyyejdj.supabase.co";
const SERVICE_KEY = SERVICE_ROLE_KEY; // vem do ambiente US01 do Maestro

const res = http.delete(
  SUPABASE_URL + "/rest/v1/consulta?especialidade=like." + encodeURIComponent("TESTE US08 AUTO") + "*",
  { headers: { apikey: SERVICE_KEY, Authorization: "Bearer " + SERVICE_KEY } }
);
console.log("Consultas de teste da US-08 removidas: " + res.status);