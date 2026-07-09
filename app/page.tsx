import Cielo from "@/components/Cielo";
import FraseDelDia from "@/components/FraseDelDia";
import { getFraseDeHoy } from "@/lib/frases";

// Render en cada request: la fecha se evalúa siempre al momento, sin caché.
// (Con ISR/revalidate, Vercel servía una copia vieja al primer visitante del día.)
export const dynamic = "force-dynamic";

export default function Home() {
  const { hoy, numeroDia, anteriores } = getFraseDeHoy();

  return (
    <>
      <Cielo />
      <FraseDelDia hoy={hoy} numeroDia={numeroDia} anteriores={anteriores} />
    </>
  );
}
