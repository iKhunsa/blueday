"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CRUCIGRAMA_ALLIE, type DireccionPalabra } from "@/lib/crucigrama-allie";

type Celda = {
  fila: number;
  columna: number;
  letra: string;
  numero?: number;
  indicesPalabras: number[];
};

const ALMACENAMIENTO_KEY = "crucigrama-allie";

function clave(fila: number, columna: number): string {
  return `${fila},${columna}`;
}

export default function Crucigrama() {
  const { filas, columnas, palabras } = CRUCIGRAMA_ALLIE;

  // Grilla derivada una sola vez de las colocaciones generadas.
  const grid = useMemo(() => {
    const g: (Celda | null)[][] = Array.from({ length: filas }, () =>
      Array.from({ length: columnas }, () => null)
    );
    palabras.forEach((p, idx) => {
      const dr = p.direccion === "down" ? 1 : 0;
      const dc = p.direccion === "across" ? 1 : 0;
      for (let i = 0; i < p.palabra.length; i++) {
        const fila = p.fila + i * dr;
        const columna = p.columna + i * dc;
        const existente = g[fila][columna];
        if (existente) {
          existente.indicesPalabras.push(idx);
        } else {
          g[fila][columna] = {
            fila,
            columna,
            letra: p.palabra[i],
            numero: i === 0 ? p.numero : undefined,
            indicesPalabras: [idx],
          };
        }
      }
    });
    return g;
  }, [filas, columnas, palabras]);

  const horizontales = useMemo(
    () =>
      palabras
        .map((p, idx) => ({ p, idx }))
        .filter((e) => e.p.direccion === "across")
        .sort((a, b) => a.p.numero - b.p.numero),
    [palabras]
  );
  const verticales = useMemo(
    () =>
      palabras
        .map((p, idx) => ({ p, idx }))
        .filter((e) => e.p.direccion === "down")
        .sort((a, b) => a.p.numero - b.p.numero),
    [palabras]
  );

  const [entradas, setEntradas] = useState<Record<string, string>>({});
  const [cargado, setCargado] = useState(false);
  const [seleccion, setSeleccion] = useState<{ fila: number; columna: number } | null>(null);
  const [direccion, setDireccion] = useState<DireccionPalabra>("across");
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [inmersivo, setInmersivo] = useState(false);
  const [celdaPx, setCeldaPx] = useState(32);

  const inputRefs = useRef(new Map<string, HTMLInputElement>());
  const botonAbrirRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const gridAreaRef = useRef<HTMLDivElement>(null);

  // Carga el progreso guardado (si existe) al montar.
  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(ALMACENAMIENTO_KEY);
      if (guardado) setEntradas(JSON.parse(guardado));
    } catch {
      // Safari privado u otro bloqueo: se juega igual, sin persistencia.
    }
    setCargado(true);
  }, []);

  // Guarda el progreso cada vez que cambia (una vez cargado, para no pisar
  // lo guardado con el estado inicial vacío del primer render).
  useEffect(() => {
    if (!cargado) return;
    try {
      window.localStorage.setItem(ALMACENAMIENTO_KEY, JSON.stringify(entradas));
    } catch {
      // ignorar
    }
  }, [entradas, cargado]);

  // Bloquea el scroll de fondo mientras el crucigrama está en pantalla completa.
  useEffect(() => {
    if (!pantallaCompleta) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, [pantallaCompleta]);

  // Foco: al abrir va a la celda seleccionada (o la primera palabra); al
  // cerrar vuelve al botón que abrió el crucigrama.
  useEffect(() => {
    if (pantallaCompleta) {
      const primera = palabras[0];
      const objetivo = seleccion ?? { fila: primera.fila, columna: primera.columna };
      const id = window.setTimeout(() => {
        inputRefs.current.get(clave(objetivo.fila, objetivo.columna))?.focus();
      }, 60);
      return () => window.clearTimeout(id);
    }
    botonAbrirRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pantallaCompleta]);

  // Escape: si está inmersivo sale de eso primero; si no, cierra el modal.
  useEffect(() => {
    if (!pantallaCompleta) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (inmersivo) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          setInmersivo(false);
        }
      } else {
        setPantallaCompleta(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pantallaCompleta, inmersivo]);

  // Mantiene `inmersivo` sincronizado si el navegador sale de pantalla
  // completa nativa por su cuenta (Escape del SO, F11, etc.).
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setInmersivo(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Recalcula el tamaño de celda para que la grilla completa quepa sin
  // scroll propio mientras está inmersivo (se ajusta al espacio real
  // disponible del contenedor, no a un tamaño fijo).
  useEffect(() => {
    if (!inmersivo) {
      setCeldaPx(32);
      return;
    }
    const el = gridAreaRef.current;
    if (!el) return;
    const GAP = 2;
    const PADDING = 16;
    function recalcular() {
      const rect = el!.getBoundingClientRect();
      const anchoDisponible = rect.width - GAP * (columnas - 1) - PADDING;
      const altoDisponible = rect.height - GAP * (filas - 1) - PADDING;
      const tam = Math.floor(Math.min(anchoDisponible / columnas, altoDisponible / filas));
      setCeldaPx(Math.max(14, Math.min(48, tam)));
    }
    recalcular();
    const ro = new ResizeObserver(recalcular);
    ro.observe(el);
    window.addEventListener("resize", recalcular);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recalcular);
    };
  }, [inmersivo, columnas, filas]);

  async function alternarInmersivo() {
    if (!inmersivo) {
      try {
        await dialogRef.current?.requestFullscreen?.();
      } catch {
        // el navegador bloqueó fullscreen nativo (ej. permisos); igual
        // mostramos el modo edge-to-edge por CSS como respaldo.
      }
      setInmersivo(true);
    } else {
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {
          // ignorar
        }
      }
      setInmersivo(false);
    }
  }

  function cerrarModal() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setInmersivo(false);
    setPantallaCompleta(false);
  }

  function estaCompleta(idx: number): boolean {
    const p = palabras[idx];
    const dr = p.direccion === "down" ? 1 : 0;
    const dc = p.direccion === "across" ? 1 : 0;
    for (let i = 0; i < p.palabra.length; i++) {
      if ((entradas[clave(p.fila + i * dr, p.columna + i * dc)] ?? "") !== p.palabra[i]) return false;
    }
    return true;
  }

  const celdasCorrectas = useMemo(() => {
    const set = new Set<string>();
    palabras.forEach((p, idx) => {
      if (!estaCompleta(idx)) return;
      const dr = p.direccion === "down" ? 1 : 0;
      const dc = p.direccion === "across" ? 1 : 0;
      for (let i = 0; i < p.palabra.length; i++) {
        set.add(clave(p.fila + i * dr, p.columna + i * dc));
      }
    });
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entradas, palabras]);

  const resueltas = palabras.filter((_, idx) => estaCompleta(idx)).length;
  const resuelto = resueltas === palabras.length;

  const celdaSeleccionada = seleccion ? grid[seleccion.fila]?.[seleccion.columna] ?? null : null;

  const indicePalabraActiva = useMemo(() => {
    if (!celdaSeleccionada) return undefined;
    const match = celdaSeleccionada.indicesPalabras.find((i) => palabras[i].direccion === direccion);
    return match !== undefined ? match : celdaSeleccionada.indicesPalabras[0];
  }, [celdaSeleccionada, direccion, palabras]);

  const palabraActiva = indicePalabraActiva !== undefined ? palabras[indicePalabraActiva] : undefined;

  const celdasActivas = useMemo(() => {
    const set = new Set<string>();
    if (!palabraActiva) return set;
    const dr = palabraActiva.direccion === "down" ? 1 : 0;
    const dc = palabraActiva.direccion === "across" ? 1 : 0;
    for (let i = 0; i < palabraActiva.palabra.length; i++) {
      set.add(clave(palabraActiva.fila + i * dr, palabraActiva.columna + i * dc));
    }
    return set;
  }, [palabraActiva]);

  function celdaExiste(fila: number, columna: number): boolean {
    return fila >= 0 && fila < filas && columna >= 0 && columna < columnas && !!grid[fila][columna];
  }

  function enfocar(fila: number, columna: number) {
    inputRefs.current.get(clave(fila, columna))?.focus();
  }

  function seleccionarCelda(fila: number, columna: number) {
    setSeleccion({ fila, columna });
    enfocar(fila, columna);
  }

  function seleccionarPalabra(idx: number) {
    const p = palabras[idx];
    setDireccion(p.direccion);
    seleccionarCelda(p.fila, p.columna);
  }

  function alClickCelda(fila: number, columna: number) {
    const c = grid[fila][columna];
    if (!c) return;
    const esMismaCelda = seleccion && seleccion.fila === fila && seleccion.columna === columna;
    const tieneAcross = c.indicesPalabras.some((i) => palabras[i].direccion === "across");
    const tieneDown = c.indicesPalabras.some((i) => palabras[i].direccion === "down");
    if (esMismaCelda && tieneAcross && tieneDown) {
      setDireccion((d) => (d === "across" ? "down" : "across"));
      return;
    }
    setSeleccion({ fila, columna });
    if (!c.indicesPalabras.some((i) => palabras[i].direccion === direccion)) {
      setDireccion(tieneAcross ? "across" : "down");
    }
  }

  function pasoSimple(fila: number, columna: number, dir: DireccionPalabra, delta: number) {
    const dr = dir === "down" ? delta : 0;
    const dc = dir === "across" ? delta : 0;
    const f = fila + dr;
    const c = columna + dc;
    return celdaExiste(f, c) ? { fila: f, columna: c } : null;
  }

  function pasoFlecha(fila: number, columna: number, eje: DireccionPalabra, delta: number) {
    const dr = eje === "down" ? delta : 0;
    const dc = eje === "across" ? delta : 0;
    let f = fila + dr;
    let c = columna + dc;
    while (f >= 0 && f < filas && c >= 0 && c < columnas) {
      if (grid[f][c]) return { fila: f, columna: c };
      f += dr;
      c += dc;
    }
    return null;
  }

  function alCambiarCelda(fila: number, columna: number, valorCrudo: string) {
    const letra = valorCrudo
      .toUpperCase()
      .replace(/[^A-ZÑ]/g, "")
      .slice(-1);
    setEntradas((prev) => ({ ...prev, [clave(fila, columna)]: letra }));
    if (letra) {
      const siguiente = pasoSimple(fila, columna, direccion, 1);
      if (siguiente) seleccionarCelda(siguiente.fila, siguiente.columna);
    }
  }

  function alKeyDown(e: React.KeyboardEvent<HTMLInputElement>, fila: number, columna: number) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const k = clave(fila, columna);
      if (entradas[k]) {
        setEntradas((prev) => ({ ...prev, [k]: "" }));
        return;
      }
      const destino = pasoSimple(fila, columna, direccion, -1);
      if (destino) {
        setEntradas((prev) => ({ ...prev, [clave(destino.fila, destino.columna)]: "" }));
        seleccionarCelda(destino.fila, destino.columna);
      }
      return;
    }

    let destino: { fila: number; columna: number } | null = null;
    let nuevaDireccion: DireccionPalabra | null = null;
    if (e.key === "ArrowLeft") {
      destino = pasoFlecha(fila, columna, "across", -1);
      nuevaDireccion = "across";
    } else if (e.key === "ArrowRight") {
      destino = pasoFlecha(fila, columna, "across", 1);
      nuevaDireccion = "across";
    } else if (e.key === "ArrowUp") {
      destino = pasoFlecha(fila, columna, "down", -1);
      nuevaDireccion = "down";
    } else if (e.key === "ArrowDown") {
      destino = pasoFlecha(fila, columna, "down", 1);
      nuevaDireccion = "down";
    }
    if (destino && nuevaDireccion) {
      e.preventDefault();
      const c = grid[destino.fila][destino.columna];
      if (c && c.indicesPalabras.some((i) => palabras[i].direccion === nuevaDireccion)) {
        setDireccion(nuevaDireccion);
      }
      seleccionarCelda(destino.fila, destino.columna);
    }
  }

  function claseCelda(fila: number, columna: number): string {
    const k = clave(fila, columna);
    const esSeleccionada = seleccion?.fila === fila && seleccion?.columna === columna;
    const esCorrecta = celdasCorrectas.has(k);
    const esActiva = celdasActivas.has(k);
    if (esCorrecta) {
      return "border-[rgba(89,214,138,0.55)] bg-[rgba(89,214,138,0.22)] text-[var(--correcto)]";
    }
    if (esSeleccionada) {
      return "border-2 border-[var(--acento)] bg-[rgba(138,184,255,0.35)] text-[var(--texto)] shadow-[0_0_12px_rgba(138,184,255,0.6)]";
    }
    if (esActiva) {
      return "border-[rgba(138,184,255,0.35)] bg-[rgba(138,184,255,0.18)] text-[var(--texto)]";
    }
    return "border-white/10 bg-white/[0.06] text-[var(--texto)]";
  }

  const clueActivaTexto = palabraActiva
    ? `${palabraActiva.numero} · ${palabraActiva.direccion === "across" ? "Horizontal" : "Vertical"} · ${palabraActiva.clave}`
    : "Toca una casilla para empezar";

  function renderGrid(celda: number, envolverConScroll: boolean) {
    const fuenteLetra = Math.max(9, Math.min(16, Math.round(celda * 0.42)));
    const fuenteNumero = Math.max(6, Math.min(8, Math.round(celda * 0.22)));
    const gridEl = (
      <div
        className="grid gap-[2px]"
        style={{
          gridTemplateColumns: `repeat(${columnas}, ${celda}px)`,
          gridTemplateRows: `repeat(${filas}, ${celda}px)`,
          width: columnas * (celda + 2),
        }}
      >
        {grid.map((fila, f) =>
          fila.map((c, col) => {
            if (!c) return <div key={clave(f, col)} aria-hidden="true" />;
            return (
              <div key={clave(f, col)} className={`relative rounded-[3px] border transition-colors ${claseCelda(f, col)}`}>
                {c.numero !== undefined && (
                  <span
                    className="pointer-events-none absolute left-[2px] top-0 leading-none text-[var(--texto-suave)]"
                    style={{ fontSize: fuenteNumero }}
                  >
                    {c.numero}
                  </span>
                )}
                <input
                  ref={(el) => {
                    if (el) inputRefs.current.set(clave(f, col), el);
                    else inputRefs.current.delete(clave(f, col));
                  }}
                  value={entradas[clave(f, col)] ?? ""}
                  maxLength={1}
                  inputMode="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  readOnly={celdasCorrectas.has(clave(f, col))}
                  onFocus={(e) => {
                    setSeleccion({ fila: f, columna: col });
                    e.currentTarget.select();
                  }}
                  onClick={() => alClickCelda(f, col)}
                  onChange={(e) => alCambiarCelda(f, col, e.target.value)}
                  onKeyDown={(e) => alKeyDown(e, f, col)}
                  style={{ fontSize: fuenteLetra }}
                  className="h-full w-full bg-transparent text-center font-semibold uppercase caret-transparent outline-none"
                />
              </div>
            );
          })
        )}
      </div>
    );
    if (!envolverConScroll) return gridEl;
    return (
      <div
        className="archivo-scroll overflow-auto rounded-xl border border-white/10 bg-black/20 p-2"
        style={{ maxHeight: pantallaCompleta ? "50vh" : "40vh" }}
      >
        {gridEl}
      </div>
    );
  }

  function renderListaPistas(
    titulo: string,
    lista: { p: (typeof palabras)[number]; idx: number }[],
    maxHeight: string
  ) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--texto-suave)]">{titulo}</p>
        <div className="archivo-scroll flex flex-col gap-1 overflow-y-auto pr-1" style={{ maxHeight }}>
          {lista.map(({ p, idx }) => {
            const activa = indicePalabraActiva === idx;
            const completa = estaCompleta(idx);
            return (
              <button
                key={`${p.direccion}-${p.numero}`}
                type="button"
                onClick={() => seleccionarPalabra(idx)}
                className={`rounded-lg px-2 py-1.5 text-left text-xs leading-snug transition ${
                  activa
                    ? "bg-[rgba(138,184,255,0.18)] text-[var(--texto)]"
                    : "text-[var(--texto-suave)] hover:bg-white/5 hover:text-[var(--texto)]"
                } ${completa ? "opacity-50 line-through" : ""}`}
              >
                <span className="font-semibold">{p.numero}.</span> {p.clave}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const contenidoJuego = (
    <div className={`flex w-full flex-col gap-3 ${inmersivo ? "h-full min-h-0" : ""}`}>
      <div className="flex shrink-0 items-center justify-between gap-3 rounded-xl border border-white/15 bg-[#04102a]/70 px-4 py-2 backdrop-blur">
        <p className="font-frase text-sm italic text-[var(--texto)] sm:text-base">{clueActivaTexto}</p>
        <p className="shrink-0 text-[10px] tracking-widest text-[var(--texto-suave)]">
          {resueltas}/{palabras.length}
        </p>
      </div>

      <div className={`flex min-h-0 flex-1 flex-col gap-4 ${inmersivo ? "md:flex-row" : ""}`}>
        <div
          ref={gridAreaRef}
          className={
            inmersivo
              ? "flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/20 p-2"
              : "shrink-0"
          }
        >
          {renderGrid(celdaPx, !inmersivo)}
        </div>

        <div
          className={`flex gap-4 ${
            inmersivo ? "shrink-0 flex-col overflow-y-auto sm:flex-row md:w-80 md:flex-col" : "flex-col sm:flex-row"
          }`}
        >
          {renderListaPistas("Horizontales", horizontales, inmersivo ? "30vh" : "22vh")}
          {renderListaPistas("Verticales", verticales, inmersivo ? "30vh" : "22vh")}
        </div>
      </div>

      <AnimatePresence>
        {resuelto && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="brillo-suave font-frase shrink-0 text-center text-base italic text-[var(--texto)]"
          >
            Lo lograste, mi gatita. Para siempre. ✨
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <>
      <button
        ref={botonAbrirRef}
        type="button"
        onClick={() => setPantallaCompleta(true)}
        className="group mt-2 flex w-full max-w-xs flex-col items-center gap-1.5 rounded-2xl border border-white/15 bg-[#04102a]/50 px-6 py-5 text-center shadow-lg backdrop-blur transition hover:border-white/35 hover:bg-[#04102a]/70"
      >
        <span className="text-2xl">🧩</span>
        <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--texto-suave)]">Crucigrama de hoy</span>
        <span className="font-frase text-sm italic text-[var(--texto)]">
          {resuelto ? "Completo. Para siempre." : `${resueltas} / ${palabras.length} resueltas — tocar para jugar`}
        </span>
      </button>

      {cargado &&
        createPortal(
          <AnimatePresence>
            {pantallaCompleta && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`fixed inset-0 z-[60] flex bg-black/85 backdrop-blur-md ${
                  inmersivo ? "p-0" : "items-center justify-center p-2 sm:p-6"
                }`}
                onClick={cerrarModal}
              >
                <motion.div
                  ref={dialogRef}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Crucigrama de hoy"
                  className={
                    inmersivo
                      ? "absolute inset-0 flex max-w-none flex-col overflow-hidden border-0 bg-[#040d24] p-3 sm:p-4"
                      : "relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-[#040d24]/95 p-4 shadow-2xl sm:p-6"
                  }
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={alternarInmersivo}
                    aria-label={inmersivo ? "Salir de pantalla completa" : "Ver en pantalla completa"}
                    title={inmersivo ? "Salir de pantalla completa" : "Ver en pantalla completa"}
                    className="absolute left-3 top-3 px-2 py-1 text-[var(--texto-suave)] transition hover:text-[var(--texto)]"
                  >
                    {inmersivo ? "⤡" : "⛶"}
                  </button>
                  <button
                    type="button"
                    onClick={cerrarModal}
                    aria-label="Cerrar crucigrama"
                    className="absolute right-3 top-3 px-2 py-1 text-[var(--texto-suave)] transition hover:text-[var(--texto)]"
                  >
                    ✕
                  </button>
                  <h2
                    className={`font-frase shrink-0 px-8 text-center text-lg italic text-[var(--texto)] sm:text-xl ${
                      inmersivo ? "mb-2" : "mb-4"
                    }`}
                  >
                    Crucigrama de hoy
                  </h2>
                  {contenidoJuego}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
