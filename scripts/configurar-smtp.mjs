// Liga o SMTP externo no Supabase Auth do projeto na nuvem (US: [BE] envio de e-mails via SMTP).
//
// O Supabase Auth é quem envia os e-mails do banco (hoje: recuperação de senha, disparada pela
// Edge Function send-email). Sem SMTP próprio ele usa o servidor de testes do Supabase, que só
// entrega para membros da organização e tem limite de poucas mensagens por hora.
//
// Uso:
//   npm run smtp:configurar            aplica a configuração
//   npm run smtp:configurar -- --dry-run   mostra o que seria enviado (senha mascarada)
//   npm run smtp:configurar -- --status    mostra a configuração atual do projeto
//   npm run smtp:configurar -- --so-template   envia só assunto/template, sem mexer no SMTP
//
// Lê as variáveis de `.env.smtp` (veja `.env.smtp.example`); variáveis já definidas no
// ambiente têm prioridade. Detalhes em docs/envio-de-email.md.
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.supabase.com/v1";
const PROJETO_PADRAO = "szbcloiswybqiwyyejdj";

export function lerEnvArquivo(texto) {
  const vars = {};
  for (const bruta of texto.split(/\r?\n/)) {
    const linha = bruta.trim();
    if (!linha || linha.startsWith("#")) continue;
    const i = linha.indexOf("=");
    if (i < 1) continue;
    const chave = linha.slice(0, i).trim();
    let valor = linha.slice(i + 1).trim();
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
      valor = valor.slice(1, -1);
    }
    vars[chave] = valor;
  }
  return vars;
}

// Assunto do template de recuperação declarado em supabase/config.toml, para a nuvem e o
// ambiente local usarem exatamente o mesmo texto.
export function assuntoRecuperacao(configToml) {
  const bloco = configToml.split(/^\[auth\.email\.template\.recovery\]\s*$/m)[1];
  const assunto = bloco?.split(/^\[/m)[0].match(/^subject\s*=\s*"([^"]*)"/m)?.[1];
  if (!assunto) throw new Error("Assunto de [auth.email.template.recovery] não encontrado em supabase/config.toml.");
  return assunto;
}

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export function payloadTemplate({ assunto, template }) {
  return { mailer_subjects_recovery: assunto, mailer_templates_recovery_content: template };
}

export function montarPayload(env, conteudo) {
  const faltando = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"].filter((k) => !env[k]);
  if (faltando.length) throw new Error(`Variáveis obrigatórias ausentes: ${faltando.join(", ")}.`);

  const porta = Number(env.SMTP_PORT);
  if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
    throw new Error(`SMTP_PORT inválida: "${env.SMTP_PORT}".`);
  }

  const remetente = env.SMTP_ADMIN_EMAIL || env.SMTP_USER;
  if (!EMAIL.test(remetente)) throw new Error(`E-mail do remetente inválido: "${remetente}".`);

  const limite = Number(env.SMTP_LIMITE_POR_HORA || 30);
  if (!Number.isInteger(limite) || limite < 1) {
    throw new Error(`SMTP_LIMITE_POR_HORA inválido: "${env.SMTP_LIMITE_POR_HORA}".`);
  }

  return {
    external_email_enabled: true,
    smtp_host: env.SMTP_HOST,
    smtp_port: String(porta),
    smtp_user: env.SMTP_USER,
    smtp_pass: env.SMTP_PASS,
    smtp_admin_email: remetente,
    smtp_sender_name: env.SMTP_SENDER_NAME || "AgendaSUS",
    rate_limit_email_sent: limite,
    ...payloadTemplate(conteudo),
  };
}

export function mascarar(payload) {
  const copia = { ...payload };
  if (copia.smtp_pass) copia.smtp_pass = "********";
  if (copia.mailer_templates_recovery_content) {
    copia.mailer_templates_recovery_content = `(${copia.mailer_templates_recovery_content.length} caracteres)`;
  }
  return copia;
}

const CAMPOS_STATUS = [
  "external_email_enabled", "smtp_host", "smtp_port", "smtp_user", "smtp_admin_email",
  "smtp_sender_name", "rate_limit_email_sent", "mailer_subjects_recovery", "site_url", "uri_allow_list",
];

async function api(metodo, caminho, token, corpo) {
  const resp = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await resp.text();
  if (!resp.ok) {
    const dica = resp.status === 401
      ? " Use um Personal Access Token (sbp_...): as chaves anon/service_role/sb_secret não acessam a Management API."
      : "";
    throw new Error(`Management API respondeu ${resp.status}: ${texto.slice(0, 300)}${dica}`);
  }
  return texto ? JSON.parse(texto) : null;
}

function resumo(config) {
  return Object.fromEntries(CAMPOS_STATUS.map((k) => [k, config?.[k] ?? null]));
}

async function main(args) {
  const arquivo = join(RAIZ, ".env.smtp");
  const env = { ...(existsSync(arquivo) ? lerEnvArquivo(readFileSync(arquivo, "utf8")) : {}), ...process.env };
  const projeto = env.SUPABASE_PROJECT_REF || PROJETO_PADRAO;
  const token = env.SUPABASE_ACCESS_TOKEN;

  if (args.includes("--status")) {
    if (!token) throw new Error("Defina SUPABASE_ACCESS_TOKEN (Personal Access Token, sbp_...).");
    console.log(JSON.stringify(resumo(await api("GET", `/projects/${projeto}/config/auth`, token)), null, 2));
    return;
  }

  const conteudo = {
    assunto: assuntoRecuperacao(readFileSync(join(RAIZ, "supabase", "config.toml"), "utf8")),
    template: readFileSync(join(RAIZ, "supabase", "templates", "recuperacao.html"), "utf8"),
  };
  const soTemplate = args.includes("--so-template");
  const payload = soTemplate ? payloadTemplate(conteudo) : montarPayload(env, conteudo);

  if (args.includes("--dry-run")) {
    console.log(`Projeto: ${projeto}`);
    console.log(JSON.stringify(mascarar(payload), null, 2));
    return;
  }

  if (!token) throw new Error("Defina SUPABASE_ACCESS_TOKEN (Personal Access Token, sbp_...).");
  await api("PATCH", `/projects/${projeto}/config/auth`, token, payload);
  const atual = await api("GET", `/projects/${projeto}/config/auth`, token);
  const conferir = soTemplate ? ["mailer_subjects_recovery"] : ["smtp_host", "smtp_user", "mailer_subjects_recovery"];
  if (conferir.some((k) => atual[k] !== payload[k])) {
    throw new Error("A configuração foi enviada, mas o projeto não a refletiu. Confira no painel do Supabase.");
  }
  console.log(soTemplate ? `Template de recuperação atualizado no projeto ${projeto}:` : `SMTP externo configurado no projeto ${projeto}:`);
  console.log(JSON.stringify(resumo(atual), null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(`Erro: ${err.message}`);
    process.exit(1);
  });
}
