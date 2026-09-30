// Cadastro de paciente. Chamado por app/auth/validacao.tsx com { nome, cpf, email, senha }.
// O app já faz a etapa de "código de verificação" na própria tela, então a conta
// nasce com o e-mail confirmado.
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

  // Duas buscas com .eq() em vez de .or(`...${email}`): o e-mail vem do usuário, e
  // interpolado no filtro permitiria injetar condições (ex.: "x@y.z,cpf.like.1*")
  // e descobrir CPFs de outros pacientes, já que esta função ignora o RLS.
  if (await existe("cpf", cpf)) return json({ error: "Este CPF já está cadastrado." });
  if (await existe("email", email)) return json({ error: "Este e-mail já está cadastrado." });

  const { data: criado, error: erroAuth } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { display_name: nome, cpf },
  });
  if (erroAuth || !criado.user) {
    if (erroAuth?.code === "email_exists") return json({ error: "Este e-mail já está cadastrado." });
    console.error(erroAuth);
    return json({ error: "Não foi possível criar a conta." });
  }

  const { error: erroPaciente } = await admin.from("paciente").insert({
    auth_user_id: criado.user.id,
    nome,
    cpf,
    email,
  });
  if (erroPaciente) {
    // Desfaz a conta de autenticação para não deixar usuário sem paciente.
    await admin.auth.admin.deleteUser(criado.user.id);
    console.error(erroPaciente);
    return json({ error: "Não foi possível criar a conta." });
  }

  return json({ ok: true });
}));
