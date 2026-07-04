import fs from "fs";
import path from "path";
import { TIMEZONE, FECHA_INICIO, FRASE_FALLBACK } from "./config";

export type Frase = {
  fecha: string; // YYYY-MM-DD
  fechaLarga: string; // "viernes, 4 de julio de 2026"
  texto: string;
};

const FRASES_PATH = path.join(process.cwd(), "content", "frases.md");

/** Parsea content/frases.md: bloques `## YYYY-MM-DD` seguidos del texto. */
export function getFrases(): Map<string, Frase> {
  const raw = fs.readFileSync(FRASES_PATH, "utf-8");
  const frases = new Map<string, Frase>();

  for (const bloque of raw.split(/^##\s+/m)) {
    const lineas = bloque.trim().split("\n");
    const fecha = lineas[0]?.trim();
    const texto = lineas.slice(1).join("\n").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha) && texto) {
      frases.set(fecha, { fecha, fechaLarga: formatearFecha(fecha), texto });
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

/** Número de día desde FECHA_INICIO (el día de inicio cuenta como 1). */
export function getNumeroDia(hoy: string): number {
  const aUTC = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.floor((aUTC(hoy) - aUTC(FECHA_INICIO)) / 86_400_000) + 1;
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
