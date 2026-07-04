"use client";

import { useMemo } from "react";

// PRNG con semilla fija: mismas estrellas en servidor y cliente (sin errores de hidratación).
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type PuntoMichi = { x: number; y: number; brillante?: boolean };

// Carita de michi dibujada como constelación (orejas, contorno y ojos).
const CONTORNO_MICHI: PuntoMichi[] = [
  { x: 14, y: 48 },
  { x: 20, y: 30 },
  { x: 28, y: 10 },
  { x: 36, y: 26 },
  { x: 56, y: 26 },
  { x: 64, y: 10 },
  { x: 72, y: 30 },
  { x: 78, y: 48 },
  { x: 46, y: 64 },
];

const CARA_MICHI: PuntoMichi[] = [
  { x: 34, y: 42, brillante: true }, // ojo izquierdo
  { x: 58, y: 42, brillante: true }, // ojo derecho
  { x: 46, y: 50 }, // nariz
];

function ConstelacionMichi({
  nombre,
  className,
}: {
  nombre: string;
  className: string;
}) {
  const puntos = [...CONTORNO_MICHI, CONTORNO_MICHI[0]];
  const trazo = puntos.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className={`pointer-events-none absolute flotar ${className}`}>
      <svg viewBox="0 0 92 74" fill="none" className="w-full">
        <polyline
          points={trazo}
          stroke="rgba(138,184,255,0.22)"
          strokeWidth="0.5"
        />
        {CONTORNO_MICHI.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="1.1"
            fill="#cfe1ff"
            className="estrella"
            style={{ animationDelay: `${i * 0.55}s`, position: "static" }}
          />
        ))}
        {CARA_MICHI.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={p.brillante ? 1.5 : 0.9}
            fill={p.brillante ? "#ffffff" : "#8ab8ff"}
            className="estrella"
            style={{ animationDelay: `${i * 0.8 + 0.3}s`, position: "static" }}
          />
        ))}
      </svg>
      <p className="font-frase mt-1 text-center text-xs italic tracking-widest text-[var(--texto-suave)] opacity-60">
        {nombre}
      </p>
    </div>
  );
}

export default function Cielo() {
  const estrellas = useMemo(() => {
    const rand = mulberry32(20260704);
    return Array.from({ length: 150 }, () => ({
      left: rand() * 100,
      top: rand() * 100,
      size: rand() * 1.8 + 0.6,
      delay: rand() * 6,
      duration: rand() * 4 + 3,
    }));
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* nebulosas azules */}
      <div
        className="nebulosa left-[-10%] top-[55%] h-[50vh] w-[60vw]"
        style={{
          background:
            "radial-gradient(circle, rgba(30,80,190,0.35), transparent 70%)",
        }}
      />
      <div
        className="nebulosa right-[-15%] top-[30%] h-[45vh] w-[50vw]"
        style={{
          background:
            "radial-gradient(circle, rgba(90,60,200,0.18), transparent 70%)",
          animationDelay: "5s",
        }}
      />

      {/* estrellas */}
      {estrellas.map((e, i) => (
        <div
          key={i}
          className="estrella"
          style={{
            left: `${e.left}%`,
            top: `${e.top}%`,
            width: `${e.size}px`,
            height: `${e.size}px`,
            animationDelay: `${e.delay}s`,
            animationDuration: `${e.duration}s`,
          }}
        />
      ))}

      {/* estrellas fugaces */}
      <div className="fugaz right-[5%] top-[12%]" />
      <div
        className="fugaz right-[35%] top-[4%]"
        style={{ animationDelay: "6.5s", animationDuration: "15s" }}
      />

      {/* michis estelares */}
      <ConstelacionMichi
        nombre="Michi Mayor"
        className="right-[6%] top-[10%] w-36 opacity-90 md:right-[10%] md:top-[14%] md:w-48"
      />
      <ConstelacionMichi
        nombre="Michi Menor"
        className="bottom-[14%] left-[5%] w-20 opacity-60 md:left-[9%] md:w-28"
      />
    </div>
  );
}
