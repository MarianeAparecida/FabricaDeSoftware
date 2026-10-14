import { Platform } from "react-native";
import { supabase } from "./supabase";

// No app, a Edge Function send-email usa o deep link agendasus://recuperarSenha/alterar (padrão).
// Na web, pedimos que o link do e-mail volte para esta mesma origem; a função só aceita
// destinos da lista permitida e, fora dela, mantém o deep link.
function destinoDoLink(): string | undefined {
  if (Platform.OS !== "web") return undefined;
  const origem = (globalThis as any).location?.origin;
  return origem ? `${origem}/recuperarSenha/alterar` : undefined;
}

export function solicitarRecuperacaoSenha(cpf: string) {
  const redirectTo = destinoDoLink();
  return supabase.functions.invoke("send-email", {
    body: { cpf, action: "reset", ...(redirectTo ? { redirectTo } : {}) },
  });
}
