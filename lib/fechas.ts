import { FECHA_INICIO } from "./config";

// Módulo puro (sin fs): usable tanto en servidor como en cliente.

/** Número de día desde FECHA_INICIO (el día de inicio cuenta como 1). */
export function getNumeroDia(iso: string): number {
  const aUTC = (fecha: string) => {
    const [y, m, d] = fecha.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  // Nunca menos de 1, aunque el reloj quede antes de FECHA_INICIO.
  return Math.max(1, Math.floor((aUTC(iso) - aUTC(FECHA_INICIO)) / 86_400_000) + 1);
}
