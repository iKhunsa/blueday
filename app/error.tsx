"use client";

// Pantalla de error suave: mantiene el cielo y ofrece reintentar,
// en vez de la pantalla técnica por defecto de Next.
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-frase text-2xl font-light text-[var(--texto)] md:text-3xl">
        El cielo se nubló un momento.
      </p>
      <button
        onClick={reset}
        className="rounded-full border border-white/20 bg-[#04102a]/50 px-5 py-2 text-xs tracking-widest text-white/80 shadow-lg backdrop-blur transition hover:border-white/40 hover:text-white"
      >
        volver a mirar
      </button>
    </main>
  );
}
