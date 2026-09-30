// Datas e horas de consulta sempre no fuso da unidade de saúde, nunca no do aparelho.
// Convenção completa em docs/data-e-hora.md.

/** Fuso usado quando a unidade não informa o seu (mesmo padrão do banco). */
export const FUSO_PADRAO = "America/Sao_Paulo";

type Partes = { ano: number; mes: number; dia: number; hora: number; minuto: number };

const formatadores = new Map<string, Intl.DateTimeFormat>();

function formatador(fuso: string) {
  let f = formatadores.get(fuso);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: fuso,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    formatadores.set(fuso, f);
  }
  return f;
}

function partes(instante: Date, fuso: string): Partes {
  const p: Record<string, string> = {};
  for (const { type, value } of formatador(fuso).formatToParts(instante)) p[type] = value;
  return {
    ano: Number(p.year),
    mes: Number(p.month),
    dia: Number(p.day),
    hora: Number(p.hour) % 24, // alguns motores devolvem "24" para meia-noite
    minuto: Number(p.minute),
  };
}

const doisDigitos = (n: number) => String(n).padStart(2, "0");

/** Diferença, em minutos, entre o horário do fuso e o UTC naquele instante (ex.: -180). */
function deslocamentoMinutos(instanteMs: number, fuso: string) {
  const p = partes(new Date(instanteMs), fuso);
  const comoUtc = Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto);
  return Math.round((comoUtc - Math.floor(instanteMs / 60000) * 60000) / 60000);
}

/**
 * Data ("AAAA-MM-DD") + hora ("HH:mm") de parede no fuso informado → ISO com deslocamento
 * explícito, pronto para gravar. Ex.: ("2026-10-15", "14:00") → "2026-10-15T14:00:00-03:00".
 */
export function paraIsoComFuso(data: string, hora: string, fuso: string = FUSO_PADRAO): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  const [h, m] = hora.split(":").map(Number);
  const paredeComoUtc = Date.UTC(ano, mes - 1, dia, h, m);

  // Segunda passada acerta o deslocamento em datas de mudança de horário de verão.
  let desloc = deslocamentoMinutos(paredeComoUtc, fuso);
  desloc = deslocamentoMinutos(paredeComoUtc - desloc * 60000, fuso);

  const sinal = desloc < 0 ? "-" : "+";
  const abs = Math.abs(desloc);
  return `${data}T${hora}:00${sinal}${doisDigitos(Math.floor(abs / 60))}:${doisDigitos(abs % 60)}`;
}

/** Instante (ISO vindo do banco, ou Date) → data "AAAA-MM-DD" e hora "HH:mm" no fuso informado. */
export function noFuso(instante: string | Date, fuso: string = FUSO_PADRAO) {
  const p = partes(typeof instante === "string" ? new Date(instante) : instante, fuso);
  return {
    data: `${p.ano}-${doisDigitos(p.mes)}-${doisDigitos(p.dia)}`,
    hora: `${doisDigitos(p.hora)}:${doisDigitos(p.minuto)}`,
  };
}

/** Data de hoje ("AAAA-MM-DD") no fuso informado. */
export function hojeNoFuso(fuso: string = FUSO_PADRAO) {
  return noFuso(new Date(), fuso).data;
}
