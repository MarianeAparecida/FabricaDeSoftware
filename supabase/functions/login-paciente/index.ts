// Login por CPF + senha. Resposta esperada pelo app (src/contexts/AuthContext.tsx):
//   { session, user: { id, email, display_name, cpf } }  ou  { error }
import { emailPorCpf, handle, json, limparCpf, publicClient } from "../_shared/utils.ts";

const CREDENCIAIS_INVALIDAS = "CPF ou senha incorretos.";

Deno.serve(handle(async (body) => {
  const cpf = limparCpf(body.cpf);
  const password = typeof body.password === "string" ? body.password : "";

  if (cpf.length !== 11 || !password) return json({ error: "Informe CPF e senha." });

  const email = await emailPorCpf(cpf);
  if (!email) {
    console.log("[LOGIN ERROR] CPF não encontrado na tabela paciente:", cpf);
    return json({ error: "CPF não cadastrado na base de dados." });
  }

  const { data, error } = await publicClient().auth.signInWithPassword({ email, password });
  
  if (error || !data.session) {
    console.log("[LOGIN ERROR] Erro do Supabase Auth:", error?.message, error?.code);
    
    if (error?.code === "email_not_confirmed" || error?.message?.toLowerCase().includes("email not confirmed")) {
      return json({ error: "Sua conta ainda não foi confirmada. Verifique seu e-mail no Mailpit." });
    }
    
    return json({ error: `Erro na autenticação: ${error?.message || CREDENCIAIS_INVALIDAS}` });
  }

  const meta = data.user.user_metadata ?? {};
  return json({
    session: data.session,
    user: {
      id: data.user.id,
      email: data.user.email,
      display_name: meta.display_name ?? "",
      cpf: meta.cpf ?? cpf,
    },
  });
}));
