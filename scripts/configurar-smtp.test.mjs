import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assuntoRecuperacao, lerEnvArquivo, mascarar, montarPayload, payloadTemplate } from "./configurar-smtp.mjs";

const base = {
  SMTP_HOST: "smtp.exemplo.com",
  SMTP_PORT: "465",
  SMTP_USER: "envio@exemplo.com",
  SMTP_PASS: "s3nh@=com#simbolos",
};
const conteudo = { assunto: "Assunto", template: "<p>{{ .ConfirmationURL }}</p>" };

test("lê .env com aspas, comentários e '=' no valor", () => {
  const vars = lerEnvArquivo('# comentário\nSMTP_PASS="a=b#c"\nSMTP_SENDER_NAME=\'Agenda SUS\'\n\nVAZIA=\n');
  assert.equal(vars.SMTP_PASS, "a=b#c");
  assert.equal(vars.SMTP_SENDER_NAME, "Agenda SUS");
  assert.equal(vars.VAZIA, "");
});

test("monta o payload da Management API com padrões", () => {
  const p = montarPayload(base, conteudo);
  assert.equal(p.external_email_enabled, true);
  assert.equal(p.smtp_port, "465");
  assert.equal(p.smtp_admin_email, "envio@exemplo.com");
  assert.equal(p.smtp_sender_name, "AgendaSUS");
  assert.equal(p.rate_limit_email_sent, 30);
  assert.equal(p.smtp_pass, base.SMTP_PASS);
  assert.equal(p.mailer_templates_recovery_content, conteudo.template);
});

test("respeita remetente, nome e limite informados", () => {
  const p = montarPayload(
    { ...base, SMTP_ADMIN_EMAIL: "nao-responda@exemplo.com", SMTP_SENDER_NAME: "UBS", SMTP_LIMITE_POR_HORA: "100" },
    conteudo,
  );
  assert.equal(p.smtp_admin_email, "nao-responda@exemplo.com");
  assert.equal(p.smtp_sender_name, "UBS");
  assert.equal(p.rate_limit_email_sent, 100);
});

test("recusa configuração incompleta ou inválida", () => {
  assert.throws(() => montarPayload({ ...base, SMTP_PASS: "" }, conteudo), /SMTP_PASS/);
  assert.throws(() => montarPayload({ ...base, SMTP_PORT: "abc" }, conteudo), /SMTP_PORT/);
  assert.throws(() => montarPayload({ ...base, SMTP_PORT: "70000" }, conteudo), /SMTP_PORT/);
  assert.throws(() => montarPayload({ ...base, SMTP_ADMIN_EMAIL: "sem-arroba" }, conteudo), /remetente/);
  assert.throws(() => montarPayload({ ...base, SMTP_LIMITE_POR_HORA: "0" }, conteudo), /LIMITE/);
});

test("nunca exibe a senha no dry-run", () => {
  const m = mascarar(montarPayload(base, conteudo));
  assert.equal(m.smtp_pass, "********");
  assert.ok(!JSON.stringify(m).includes(base.SMTP_PASS));
});

test("usa o assunto e o template declarados no config.toml", () => {
  const toml = readFileSync(new URL("../supabase/config.toml", import.meta.url), "utf8");
  assert.equal(assuntoRecuperacao(toml), "AgendaSUS - Redefinição de senha");
  const caminho = toml.match(/\[auth\.email\.template\.recovery\][^[]*content_path\s*=\s*"\.\/supabase\/([^"]+)"/)[1];
  const html = readFileSync(new URL(`../supabase/${caminho}`, import.meta.url), "utf8");
  assert.match(html, /\{\{ \.ConfirmationURL \}\}/);
});

test("falha se o bloco do template sumir do config.toml", () => {
  assert.throws(() => assuntoRecuperacao("[auth.email]\nenable_signup = true\n"), /não encontrado/);
});

test("--so-template não envia nenhum campo de SMTP", () => {
  const p = payloadTemplate(conteudo);
  assert.deepEqual(Object.keys(p).sort(), ["mailer_subjects_recovery", "mailer_templates_recovery_content"]);
  assert.ok(!Object.keys(p).some((k) => k.startsWith("smtp_") || k === "external_email_enabled"));
});
