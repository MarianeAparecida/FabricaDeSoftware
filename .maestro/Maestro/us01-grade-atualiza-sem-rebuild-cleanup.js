// Remove o horário temporário criado pelo setup, deixando o banco limpo após o teste.
const SUPABASE_URL = "https://szbcloiswybqiwyyejdj.supabase.co";
const SERVICE_KEY = SERVICE_ROLE_KEY;

http.delete(SUPABASE_URL + "/rest/v1/grade_atendimento?id=eq." + output.insertedId, {
  headers: {
    apikey: SERVICE_KEY,
    Authorization: "Bearer " + SERVICE_KEY
  }
});

console.log("Grade temporária removida (id " + output.insertedId + ")");