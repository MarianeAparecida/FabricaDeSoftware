import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// O app trata qualquer status diferente de 2xx como "erro de conexão". Por isso,
// erros de negócio voltam com 200 e { error: "mensagem" }, que o app exibe ao usuário.
export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function handle(fn: (body: Record<string, unknown>) => Promise<Response>) {
  return async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Corpo da requisição inválido." }, 400);
    }

    try {
      return await fn(body);
    } catch (err) {
      console.error(err);
      return json({ error: "Erro interno do servidor." }, 500);
    }
  };
}

const url = Deno.env.get("SUPABASE_URL")!;
const options = { auth: { persistSession: false, autoRefreshToken: false } };

// Ignora RLS: usado só no servidor para buscar e-mail por CPF e criar contas.
export const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, options);

// Cliente público, para operações feitas "como o usuário" (login, reset de senha).
export function publicClient() {
  return createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, options);
}

export function limparCpf(cpf: unknown) {
  return typeof cpf === "string" ? cpf.replace(/\D/g, "") : "";
}

export async function emailPorCpf(cpf: string): Promise<string | null> {
  const { data, error } = await admin
    .from("paciente")
    .select("email")
    .eq("cpf", cpf)
    .maybeSingle();
  if (error) throw error;
  return data?.email ?? null;
}
