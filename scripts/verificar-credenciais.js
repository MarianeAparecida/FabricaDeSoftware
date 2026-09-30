// US-21: nenhuma URL ou chave de serviço escrita no código versionado.
//   npm run check:credenciais
// Roda também no início de toda build do EAS (script "eas-build-pre-install" do package.json);
// lá, confere ainda se as variáveis obrigatórias vieram do ambiente do EAS.
// Detalhes em docs/variaveis-de-ambiente.md.
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");

// Em qualquer arquivo versionado.
const CHAVES = [
  { nome: "token JWT (chave anon/service_role do Supabase)", regex: /eyJ[\w-]{10,}\.eyJ[\w-]{10,}\.[\w-]{10,}/ },
  { nome: "chave do Supabase", regex: /sb_(publishable|secret)_[\w-]{10,}/ },
  { nome: "URL de projeto Supabase", regex: /[a-z0-9]{20}\.supabase\.(co|in)\b/ },
  { nome: "chave privada", regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

// Em código (.js/.ts...), nenhuma URL: nem padrão, nem de exemplo, nem em comentário.
const CODIGO = /\.(c|m)?(j|t)sx?$/;
const URL_NO_CODIGO = { nome: "URL escrita no código", regex: /https?:\/\/[^\s"'`)]+/ };

// Variáveis que a build do EAS precisa receber do ambiente (eas env:set).
const OBRIGATORIAS_NO_EAS = ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY"];

function arquivosVersionados() {
  try {
    // Versionados + novos ainda não commitados, respeitando o .gitignore.
    const saida = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
      cwd: RAIZ,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return saida.split("\0").filter(Boolean);
  } catch {
    return percorrer(""); // Sem git (ex.: servidor de build): percorre a pasta.
  }
}

function percorrer(pasta) {
  const ignorar = new Set(["node_modules", ".git", ".expo", "android", "ios", "dist", "web-build"]);
  return fs.readdirSync(path.join(RAIZ, pasta), { withFileTypes: true }).flatMap((item) => {
    const relativo = path.posix.join(pasta, item.name);
    if (item.isDirectory()) return ignorar.has(item.name) ? [] : percorrer(relativo);
    return /^\.env(\..+)?$/.test(item.name) && item.name !== ".env.example" ? [] : [relativo];
  });
}

function procurarCredenciais() {
  const achados = [];
  for (const arquivo of arquivosVersionados()) {
    const caminho = path.join(RAIZ, arquivo);
    if (!fs.existsSync(caminho) || !fs.statSync(caminho).isFile()) continue;
    const conteudo = fs.readFileSync(caminho);
    if (conteudo.includes(0)) continue; // binário (imagens, fontes)

    const regras = CODIGO.test(arquivo) ? [...CHAVES, URL_NO_CODIGO] : CHAVES;
    conteudo.toString("utf8").split("\n").forEach((linha, i) => {
      for (const { nome, regex } of regras) {
        const achado = linha.match(regex);
        if (achado) achados.push(`${arquivo}:${i + 1}  ${nome}: ${achado[0].slice(0, 30)}…`);
      }
    });
  }
  return achados;
}

function variaveisFaltandoNoEas() {
  if (process.env.EAS_BUILD !== "true") return [];
  return OBRIGATORIAS_NO_EAS.filter((nome) => !process.env[nome]);
}

const achados = procurarCredenciais();
if (achados.length) {
  console.error("Credenciais escritas no código. Mova para variáveis de ambiente (veja .env.example):\n");
  console.error(achados.map((a) => `  ${a}`).join("\n"));
}

const faltando = variaveisFaltandoNoEas();
if (faltando.length) {
  const perfil = process.env.EAS_BUILD_PROFILE;
  const eas = JSON.parse(fs.readFileSync(path.join(RAIZ, "eas.json"), "utf8"));
  const ambiente = eas.build?.[perfil]?.environment ?? "<ambiente>";
  console.error(`\nA build do EAS (perfil "${perfil}", ambiente "${ambiente}") não recebeu: ${faltando.join(", ")}.`);
  console.error(`Cadastre com: eas env:set --environment ${ambiente} --name <NOME> --value <valor> --visibility <plaintext|sensitive>`);
}

if (achados.length || faltando.length) process.exit(1);
console.log("Nenhuma credencial escrita no código.");
