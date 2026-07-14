import fs from "fs";
import path from "path";
import { TIMEZONE, FRASE_FALLBACK } from "./config";
import { getNumeroDia } from "./fechas";

export { getNumeroDia };

export type Frase = {
  fecha: string; // YYYY-MM-DD
  fechaLarga: string; // "viernes, 4 de julio de 2026"
  texto: string;
  videoId?: string; // ID de video de YouTube, si el día es un video en vez de (o además de) texto
};

const FRASES_PATH = path.join(process.cwd(), "content", "frases.md");

// Marcador `[youtube: <url-o-id>]` como primera línea del bloque.
const MARCADOR_YOUTUBE = /^\[youtube:\s*(.+?)\]\s*$/i;

/** Extrae el ID de 11 caracteres de una URL de YouTube (o lo devuelve tal cual si ya es un ID). */
function extraerIdYoutube(entrada: string): string | null {
  const valor = entrada.trim();
  if (/^[\w-]{11}$/.test(valor)) return valor;
  try {
    const url = new URL(/^https?:\/\//i.test(valor) ? valor : `https://${valor}`);
    const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (host === "youtube.com") {
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v");
        return id && /^[\w-]{11}$/.test(id) ? id : null;
      }
      const m = url.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})/);
      if (m) return m[1];
    }
  } catch {
    return null;
  }
  return null;
}

/** Parsea content/frases.md: bloques `## YYYY-MM-DD` seguidos del texto (o un marcador de video). */
export function getFrases(): Map<string, Frase> {
  const frases = new Map<string, Frase>();

  let raw: string;
  try {
    raw = fs.readFileSync(FRASES_PATH, "utf-8");
  } catch (error) {
    // Sin archivo no hay 500: la página cae a FRASE_FALLBACK.
    console.error(`No se pudo leer ${FRASES_PATH}:`, error);
    return frases;
  }

  for (const bloque of raw.split(/^##\s+/m)) {
    const lineas = bloque.trim().split("\n");
    const fecha = lineas[0]?.trim();
    let texto = lineas.slice(1).join("\n").trim();

    let videoId: string | undefined;
    const primeraLinea = texto.split("\n")[0] ?? "";
    const marcador = primeraLinea.match(MARCADOR_YOUTUBE);
    if (marcador) {
      const id = extraerIdYoutube(marcador[1]);
      if (id) {
        videoId = id;
        texto = texto.slice(primeraLinea.length).trim();
      }
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha) && (texto || videoId)) {
      frases.set(fecha, { fecha, fechaLarga: formatearFecha(fecha), texto, videoId });
    }
  }
  return frases;
}

/** Fecha de hoy (YYYY-MM-DD) en la zona horaria configurada. */
export function getFechaHoy(): string {
  // en-CA formatea como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formatearFecha(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  // Mediodía UTC evita corrimientos de día al formatear.
  const fecha = new Date(Date.UTC(y, m - 1, d, 12));
  const larga = new Intl.DateTimeFormat("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(fecha);
  return larga.charAt(0).toUpperCase() + larga.slice(1);
}

export function getFraseDeHoy(): {
  hoy: Frase;
  numeroDia: number;
  anteriores: Frase[];
} {
  const frases = getFrases();
  const fechaHoy = getFechaHoy();

  const hoy: Frase = frases.get(fechaHoy) ?? {
    fecha: fechaHoy,
    fechaLarga: formatearFecha(fechaHoy),
    texto: FRASE_FALLBACK,
  };

  const anteriores = [...frases.values()]
    .filter((f) => f.fecha < fechaHoy)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return { hoy, numeroDia: getNumeroDia(fechaHoy), anteriores };
}
