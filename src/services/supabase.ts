import { createClient } from "@supabase/supabase-js";

// Definidos em .env.local (veja .env.example). Rode `npx supabase status` para obter os valores locais.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.local");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  // O link de recuperação de senha é tratado manualmente em app/recuperarSenha/alterar.tsx.
  // Na web, a detecção automática consumiria e apagaria os tokens da URL antes da tela lê-los.
  auth: { detectSessionInUrl: false },
});
