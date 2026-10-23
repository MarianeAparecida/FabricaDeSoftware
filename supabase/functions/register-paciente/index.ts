// Cadastro de paciente. Chamado por app/auth/cadastro.tsx com { nome, cpf, email, senha }.
import { admin, handle, json, limparCpf } from "../_shared/utils.ts";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SENHA_FORTE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

async function existe(coluna: "cpf" | "email", valor: string) {
  const { count, error } = await admin
    .from("paciente")
    .select("id", { count: "exact", head: true })
    .eq(coluna, valor);
  if (error) throw error;
  return (count ?? 0) > 0;
}

Deno.serve(handle(async (body) => {
  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  const cpf = limparCpf(body.cpf);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const senha = typeof body.senha === "string" ? body.senha : "";

  if (nome.length < 5) return json({ error: "O usuário deve ter no mínimo 5 caracteres." });
  if (cpf.length !== 11) return json({ error: "CPF inválido." });
  if (!EMAIL_REGEX.test(email)) return json({ error: "E-mail inválido." });
  if (!SENHA_FORTE.test(senha)) return json({ error: "A senha não atende aos requisitos mínimos." });

  if (await existe("cpf", cpf)) return json({ error: "Este CPF já está cadastrado." });
  if (await existe("email", email)) return json({ error: "Este e-mail já está cadastrado." });

  // 1. Cria a conta no Supabase Auth SEM confirmar o e-mail (email_confirm: false)
  // O próprio Supabase dispara automaticamente o e-mail de confirmação para o Mailpit!
  const { data: criado, error: erroAuth } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: false,
    user_metadata: { display_name: nome, cpf },
  });
  
  if (erroAuth || !criado.user) {
    if (erroAuth?.code === "email_exists") return json({ error: "Este e-mail já está cadastrado." });
    console.error(erroAuth);
    return json({ error: "Não foi possível criar a conta de autenticação." });
  }

  // 2. Insere os dados na tabela paciente no banco de dados vinculando ao auth_user_id
  const { error: erroPaciente } = await admin.from("paciente").insert({
    auth_user_id: criado.user.id,
    nome,
    cpf,
    email,
  });
  
  if (erroPaciente) {
    // Se falhar no banco, remove do auth para manter consistente
    await admin.auth.admin.deleteUser(criado.user.id);
    console.error(erroPaciente);
    return json({ error: "Não foi possível salvar os dados do paciente." });
  }

  return json({ ok: true });
}));