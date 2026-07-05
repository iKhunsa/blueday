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

// Mar de nubes: PNG pregenerado con ruido fractal, tileable en X (se repite
// en vez de estirarse — nunca se pixela sin importar el ancho de pantalla).
// El fade hacia el cielo es un mask-image en CSS (ver .nubes en globals.css),
// así queda igual de suave en cualquier tamaño de viewport.
function Nubes() {
  return (
    <div className="nubes pointer-events-none absolute inset-x-0 bottom-0 h-[38vh]">
      {/* línea de luz donde el cielo toca las nubes */}
      <div className="horizonte absolute inset-x-0 top-[18%] h-16" />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/nubes.png)",
          backgroundRepeat: "repeat-x",
          backgroundSize: "auto 100%",
          backgroundPosition: "center bottom",
        }}
      />
    </div>
  );
}

export default function Cielo() {
  const estrellas = useMemo(() => {
    const rand = mulberry32(20260704);
    return Array.from({ length: 150 }, () => ({
      left: rand() * 100,
      top: rand() * 62, // solo en la zona oscura del cielo, no sobre las nubes
      size: rand() * 1.8 + 0.6,
      delay: rand() * 6,
      duration: rand() * 4 + 3,
    }));
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
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

      {/* mar de nubes */}
      <Nubes />
    </div>
  );
}
