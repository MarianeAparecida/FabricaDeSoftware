// Envio de e-mail por CPF. Hoje o app usa só { cpf, action: "reset" } (recuperação de senha).
// Sempre responde sucesso para não revelar quais CPFs estão cadastrados.
// Em ambiente local, os e-mails chegam no Mailpit: http://127.0.0.1:54324
import { emailPorCpf, handle, json, limparCpf, publicClient } from "../_shared/utils.ts";

const REDIRECT_RESET = Deno.env.get("RESET_REDIRECT_URL") ?? "http://localhost:8081/recuperarSenha/alterar";

Deno.serve(handle(async (body) => {
  const cpf = limparCpf(body.cpf);
  if (body.action !== "reset") return json({ error: "Ação não suportada." }, 400);
  if (cpf.length !== 11) return json({ error: "CPF inválido." }, 400);

  const email = await emailPorCpf(cpf);
  if (email) {
    const { error } = await publicClient().auth.resetPasswordForEmail(email, { redirectTo: REDIRECT_RESET });
    if (error) console.error("[send-email] reset falhou:", error.message);
  }

  return json({ ok: true });
}));
