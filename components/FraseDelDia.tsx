"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FECHA_INICIO, TIMEZONE } from "@/lib/config";

type FrasePlana = { fecha: string; fechaLarga: string; texto: string };

const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function partesIso(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month: month - 1, day };
}

function diasEnMes(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

// Lunes = 0 ... Domingo = 6
function offsetPrimerDia(year: number, month: number): number {
  const dia = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return (dia + 6) % 7;
}

function aIso(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

// Mini-markdown: escapa HTML y luego aplica **negrita**, *cursiva* y saltos de línea.
function renderTexto(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br />");
}

// Hoy (YYYY-MM-DD) calculado en el navegador, misma zona horaria que el servidor.
function fechaHoyCliente(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Meta del contador del pie: 2027-06-13 a las 00:00 en America/Guayaquil (UTC-5, sin horario de verano).
const META_CONTADOR = Date.UTC(2027, 5, 13, 5, 0, 0);

// El servidor no puede saber la hora del cliente, así que el contador solo se
// calcula tras montar; antes se reserva el espacio para no mover el pie.
function ContadorRegresivo() {
  const [restante, setRestante] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRestante(Math.max(0, META_CONTADOR - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (restante === null) return <span aria-hidden="true">&nbsp;</span>;
  if (restante === 0) return <>HECHO PARA TI</>;

  const total = Math.floor(restante / 1000);
  const dias = Math.floor(total / 86400);
  const horas = Math.floor((total % 86400) / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;
  const dd = (n: number) => String(n).padStart(2, "0");
  return (
    <>
      FALTAN {dias} {dias === 1 ? "DÍA" : "DÍAS"} {dd(horas)}:{dd(minutos)}:{dd(segundos)}
    </>
  );
}

function Destello({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`destello ${className ?? ""}`}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 2 C13 8 16 11 22 12 C16 13 13 16 12 22 C11 16 8 13 2 12 C8 11 11 8 12 2 Z"
        fill="#e9eef8"
        opacity="0.9"
      />
    </svg>
  );
}

// Las animaciones de entrada son CSS puro (.aparecer en globals.css):
// el texto se ve siempre, incluso si el JS no llega a ejecutarse.
// framer-motion queda solo para el modal, que sí necesita interacción.
export default function FraseDelDia({
  hoy,
  numeroDia,
  anteriores,
}: {
  hoy: FrasePlana;
  numeroDia: number;
  anteriores: FrasePlana[];
}) {
  const [archivoAbierto, setArchivoAbierto] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null);
  const router = useRouter();

  // Si el día cambia con la app abierta (medianoche, pestaña/PWA que se reabre),
  // se re-pide la frase al servidor sin recargar la página entera.
  useEffect(() => {
    const comprobarDia = () => {
      if (fechaHoyCliente() !== hoy.fecha) router.refresh();
    };
    comprobarDia();
    const id = window.setInterval(comprobarDia, 60_000);
    window.addEventListener("focus", comprobarDia);
    document.addEventListener("visibilitychange", comprobarDia);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", comprobarDia);
      document.removeEventListener("visibilitychange", comprobarDia);
    };
  }, [hoy.fecha, router]);
  // Dirección del último cambio de mes (para animar el slide hacia el lado correcto).
  const [direccionMes, setDireccionMes] = useState(1);

  const botonArchivoRef = useRef<HTMLButtonElement>(null);
  const botonCerrarRef = useRef<HTMLButtonElement>(null);
  const estabaAbierto = useRef(false);

  const inicio = useMemo(() => partesIso(FECHA_INICIO), []);
  const hoyPartes = useMemo(() => partesIso(hoy.fecha), [hoy.fecha]);
  const [mesVisto, setMesVisto] = useState(() => ({
    year: hoyPartes.year,
    month: hoyPartes.month,
  }));

  const mapaAnteriores = useMemo(() => {
    const m = new Map<string, FrasePlana>();
    for (const f of anteriores) m.set(f.fecha, f);
    return m;
  }, [anteriores]);

  // Noches en orden cronológico (anteriores viene descendente) + hoy al final,
  // para navegar con ← → dentro del detalle.
  const nochesNavegables = useMemo(
    () => [...anteriores].reverse().concat(hoy),
    [anteriores, hoy]
  );
  const indiceSeleccionado = fechaSeleccionada
    ? nochesNavegables.findIndex((f) => f.fecha === fechaSeleccionada)
    : -1;
  const fraseSeleccionada =
    indiceSeleccionado >= 0 ? nochesNavegables[indiceSeleccionado] : undefined;

  const irNoche = (delta: number) => {
    if (indiceSeleccionado < 0) return;
    const destino = nochesNavegables[indiceSeleccionado + delta];
    if (destino) setFechaSeleccionada(destino.fecha);
  };

  const enPrimerMes =
    mesVisto.year === inicio.year && mesVisto.month === inicio.month;
  const enUltimoMes =
    mesVisto.year === hoyPartes.year && mesVisto.month === hoyPartes.month;

  const irMesAnterior = () => {
    if (enPrimerMes) return;
    setDireccionMes(-1);
    setMesVisto(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    );
  };
  const irMesSiguiente = () => {
    if (enUltimoMes) return;
    setDireccionMes(1);
    setMesVisto(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    );
  };

  const cerrarArchivo = () => {
    setArchivoAbierto(false);
    setFechaSeleccionada(null);
  };

  // Teclado: Escape cierra por pasos; ← → navegan noches dentro del detalle.
  useEffect(() => {
    if (!archivoAbierto) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (fechaSeleccionada) setFechaSeleccionada(null);
        else cerrarArchivo();
      } else if (fechaSeleccionada && e.key === "ArrowLeft") {
        irNoche(-1);
      } else if (fechaSeleccionada && e.key === "ArrowRight") {
        irNoche(1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // Foco: al abrir va al botón de cerrar; al cerrar vuelve al botón del pie.
  useEffect(() => {
    if (archivoAbierto) {
      estabaAbierto.current = true;
      const id = window.setTimeout(() => botonCerrarRef.current?.focus(), 60);
      return () => window.clearTimeout(id);
    }
    if (estabaAbierto.current) {
      estabaAbierto.current = false;
      botonArchivoRef.current?.focus();
    }
  }, [archivoAbierto]);

  const celdas = useMemo(() => {
    const total = diasEnMes(mesVisto.year, mesVisto.month);
    const offset = offsetPrimerDia(mesVisto.year, mesVisto.month);
    const lista: ({ iso: string; dia: number; estado: "futuro" | "vacio" | "hoy" | "disponible" } | null)[] =
      Array.from({ length: offset }, () => null);
    for (let dia = 1; dia <= total; dia++) {
      const iso = aIso(mesVisto.year, mesVisto.month, dia);
      let estado: "futuro" | "vacio" | "hoy" | "disponible";
      if (iso > hoy.fecha) estado = "futuro";
      else if (iso === hoy.fecha) estado = "hoy";
      else if (mapaAnteriores.has(iso)) estado = "disponible";
      else estado = "vacio";
      lista.push({ iso, dia, estado });
    }
    while (lista.length % 7 !== 0) lista.push(null);
    return lista;
  }, [mesVisto, hoy.fecha, mapaAnteriores]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="flex max-w-3xl flex-col items-center">
        {/* encabezado */}
        <p
          className="aparecer mb-8 text-[11px] uppercase tracking-[0.45em] text-[var(--texto-suave)]"
          style={{ animationDelay: "0.4s", animationDuration: "1.1s" }}
        >
          Día <span className="brillo-acento">{numeroDia}</span> bajo el mismo
          cielo
        </p>

        {/* frase */}
        <div
          className="aparecer relative"
          style={{ animationDelay: "0.75s", animationDuration: "1.4s" }}
        >
          <Destello className="absolute -right-8 -top-8 h-7 w-7 md:-right-12 md:-top-10 md:h-9 md:w-9" />
          <blockquote
            className="font-frase brillo-suave text-3xl font-light leading-snug text-[var(--texto)] md:text-5xl md:leading-snug"
            dangerouslySetInnerHTML={{ __html: renderTexto(hoy.texto) }}
          />
        </div>

        {/* fecha */}
        <p
          className="aparecer mt-10 text-sm text-[var(--texto-suave)]"
          style={{ animationDelay: "1.1s", animationDuration: "1.1s" }}
        >
          {hoy.fechaLarga}
        </p>
      </div>

      {/* pie */}
      <footer
        className="aparecer-suave absolute bottom-8 flex flex-col items-center gap-2"
        style={{ animationDelay: "2.2s" }}
      >
        {anteriores.length > 0 && (
          <button
            ref={botonArchivoRef}
            onClick={() => setArchivoAbierto(true)}
            className="rounded-full border border-white/20 bg-[#04102a]/50 px-5 py-2 text-xs tracking-widest text-white/80 shadow-lg backdrop-blur transition hover:border-white/40 hover:text-white"
          >
            ✧ noches anteriores
          </button>
        )}
        <p
          className="text-[10px] tracking-[0.3em] tabular-nums text-[#0a2a5c]/70"
          style={{ textShadow: "0 1px 6px rgba(255,255,255,0.5)" }}
        >
          <ContadorRegresivo />
        </p>
      </footer>

      {/* archivo de noches anteriores */}
      <AnimatePresence>
        {archivoAbierto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md sm:items-center sm:p-6"
            onClick={cerrarArchivo}
          >
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.99 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              role="dialog"
              aria-modal="true"
              aria-label="Noches anteriores"
              className="relative max-h-[85vh] w-full overflow-hidden rounded-t-3xl border border-white/10 bg-[#040d24]/90 pb-[env(safe-area-inset-bottom)] shadow-2xl sm:max-h-[75vh] sm:max-w-lg sm:rounded-2xl sm:pb-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <h2 className="font-frase text-lg italic text-[var(--texto)] sm:text-xl">
                  {fraseSeleccionada ? fraseSeleccionada.fechaLarga : "Noches anteriores"}
                </h2>
                <button
                  ref={botonCerrarRef}
                  onClick={fechaSeleccionada ? () => setFechaSeleccionada(null) : cerrarArchivo}
                  aria-label={fechaSeleccionada ? "Volver al calendario" : "Cerrar"}
                  className="px-2 py-1 text-[var(--texto-suave)] transition hover:text-[var(--texto)]"
                >
                  {fechaSeleccionada ? "←" : "✕"}
                </button>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {fraseSeleccionada ? (
                  <motion.div
                    key={fraseSeleccionada.fecha}
                    initial={{ opacity: 0, x: 28 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -28 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                  >
                    <div className="archivo-scroll max-h-[55vh] overflow-y-auto px-6 py-6">
                      <p
                        className="font-frase text-lg leading-relaxed text-[var(--texto)]"
                        dangerouslySetInnerHTML={{ __html: renderTexto(fraseSeleccionada.texto) }}
                      />
                    </div>
                    <div className="flex items-center justify-between border-t border-white/10 px-6 py-3">
                      <button
                        onClick={() => irNoche(-1)}
                        disabled={indiceSeleccionado <= 0}
                        aria-label="Noche anterior"
                        className="px-2 py-1 text-xs tracking-widest text-[var(--texto-suave)] transition hover:text-[var(--texto)] disabled:opacity-20 disabled:hover:text-[var(--texto-suave)]"
                      >
                        ← anterior
                      </button>
                      <button
                        onClick={() => irNoche(1)}
                        disabled={indiceSeleccionado >= nochesNavegables.length - 1}
                        aria-label="Noche siguiente"
                        className="px-2 py-1 text-xs tracking-widest text-[var(--texto-suave)] transition hover:text-[var(--texto)] disabled:opacity-20 disabled:hover:text-[var(--texto-suave)]"
                      >
                        siguiente →
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="calendario"
                    initial={{ opacity: 0, x: -28 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 28 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="px-4 py-5 sm:px-6 sm:py-6"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <button
                        onClick={irMesAnterior}
                        disabled={enPrimerMes}
                        aria-label="Mes anterior"
                        className="px-3 py-1 text-lg text-[var(--texto-suave)] transition hover:text-[var(--texto)] disabled:opacity-20 disabled:hover:text-[var(--texto-suave)]"
                      >
                        ‹
                      </button>
                      <p className="text-xs uppercase tracking-[0.3em] text-[var(--texto)]">
                        {MESES[mesVisto.month]} {mesVisto.year}
                      </p>
                      <button
                        onClick={irMesSiguiente}
                        disabled={enUltimoMes}
                        aria-label="Mes siguiente"
                        className="px-3 py-1 text-lg text-[var(--texto-suave)] transition hover:text-[var(--texto)] disabled:opacity-20 disabled:hover:text-[var(--texto-suave)]"
                      >
                        ›
                      </button>
                    </div>
                    <motion.div
                      key={`${mesVisto.year}-${mesVisto.month}`}
                      initial={{ opacity: 0, x: direccionMes * 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="grid grid-cols-7 gap-1.5 text-center"
                    >
                      {DIAS_SEMANA.map((d, i) => (
                        <span
                          key={`dia-${i}`}
                          className="pb-2 text-[10px] uppercase tracking-widest text-[var(--texto-suave)] opacity-60"
                        >
                          {d}
                        </span>
                      ))}
                      {celdas.map((c, i) => {
                        if (!c) return <span key={i} />;
                        if (c.estado === "disponible") {
                          return (
                            <button
                              key={i}
                              onClick={() => setFechaSeleccionada(c.iso)}
                              aria-label={`Ver frase del ${c.dia} de ${MESES[mesVisto.month]}`}
                              className="aspect-square rounded-full text-sm text-[var(--texto)] shadow-inner transition hover:bg-white/25 hover:shadow-[0_0_14px_rgba(233,238,248,0.35)]"
                              style={{ background: "rgba(255,255,255,0.12)" }}
                            >
                              {c.dia}
                            </button>
                          );
                        }
                        if (c.estado === "hoy") {
                          return (
                            <button
                              key={i}
                              onClick={() => setFechaSeleccionada(c.iso)}
                              aria-label={`Ver frase de hoy, ${c.dia} de ${MESES[mesVisto.month]}`}
                              className="relative aspect-square rounded-full border border-[var(--acento)] text-sm text-[var(--texto)] transition hover:bg-white/10"
                            >
                              {c.dia}
                              <span
                                aria-hidden="true"
                                className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--acento)]"
                              />
                            </button>
                          );
                        }
                        return (
                          <span
                            key={i}
                            aria-hidden="true"
                            className={`flex aspect-square items-center justify-center text-sm text-[var(--texto-suave)] ${
                              c.estado === "futuro" ? "opacity-15" : "opacity-30"
                            }`}
                          >
                            {c.dia}
                          </span>
                        );
                      })}
                    </motion.div>
                    <div className="mt-5 flex items-center justify-center gap-5 text-[10px] tracking-widest text-[var(--texto-suave)] opacity-70">
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-white/25" />
                        con frase
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2.5 w-2.5 rounded-full border border-[var(--acento)]" />
                        hoy
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
