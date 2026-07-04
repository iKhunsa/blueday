"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type FrasePlana = { fecha: string; fechaLarga: string; texto: string };

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

function Destello({ className }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <path
        d="M12 2 C13 8 16 11 22 12 C16 13 13 16 12 22 C11 16 8 13 2 12 C8 11 11 8 12 2 Z"
        fill="#e9eef8"
        opacity="0.9"
      />
    </motion.svg>
  );
}

const entrada = {
  hidden: { opacity: 0, y: 18, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

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

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial="hidden"
        animate="visible"
        transition={{ staggerChildren: 0.35, delayChildren: 0.4 }}
        className="flex max-w-3xl flex-col items-center"
      >
        {/* encabezado */}
        <motion.p
          variants={entrada}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className="mb-8 text-[11px] uppercase tracking-[0.45em] text-[var(--texto-suave)]"
        >
          Día <span className="brillo-acento">{numeroDia}</span> bajo el mismo
          cielo
        </motion.p>

        {/* frase */}
        <motion.div
          variants={entrada}
          transition={{ duration: 1.4, ease: "easeOut" }}
          className="relative"
        >
          <Destello className="absolute -right-8 -top-8 h-7 w-7 md:-right-12 md:-top-10 md:h-9 md:w-9" />
          <blockquote
            className="font-frase brillo-suave text-3xl font-light leading-snug text-[var(--texto)] md:text-5xl md:leading-snug"
            dangerouslySetInnerHTML={{ __html: renderTexto(hoy.texto) }}
          />
        </motion.div>

        {/* fecha */}
        <motion.p
          variants={entrada}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className="mt-10 text-sm text-[var(--texto-suave)]"
        >
          {hoy.fechaLarga}
        </motion.p>
      </motion.div>

      {/* pie */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 1.5 }}
        className="absolute bottom-8 flex flex-col items-center gap-2"
      >
        {anteriores.length > 0 && (
          <button
            onClick={() => setArchivoAbierto(true)}
            className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs tracking-widest text-[var(--texto-suave)] backdrop-blur transition hover:border-white/25 hover:text-[var(--texto)]"
          >
            ✧ noches anteriores
          </button>
        )}
        <p className="text-[10px] tracking-[0.3em] text-[var(--texto-suave)] opacity-50">
          HECHO PARA TI
        </p>
      </motion.footer>

      {/* archivo de noches anteriores */}
      <AnimatePresence>
        {archivoAbierto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-md"
            onClick={() => setArchivoAbierto(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.97 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative max-h-[75vh] w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#040d24]/90 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <h2 className="font-frase text-xl italic text-[var(--texto)]">
                  Noches anteriores
                </h2>
                <button
                  onClick={() => setArchivoAbierto(false)}
                  aria-label="Cerrar"
                  className="text-[var(--texto-suave)] transition hover:text-[var(--texto)]"
                >
                  ✕
                </button>
              </div>
              <ul className="archivo-scroll max-h-[60vh] space-y-6 overflow-y-auto px-6 py-6">
                {anteriores.map((f) => (
                  <li key={f.fecha}>
                    <p className="mb-1 text-[10px] uppercase tracking-[0.3em] text-[var(--acento)] opacity-80">
                      {f.fechaLarga}
                    </p>
                    <p
                      className="font-frase text-lg leading-relaxed text-[var(--texto)]"
                      dangerouslySetInnerHTML={{ __html: renderTexto(f.texto) }}
                    />
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
