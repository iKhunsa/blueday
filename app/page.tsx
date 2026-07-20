import Cielo from "@/components/Cielo";
import FraseDelDia from "@/components/FraseDelDia";
import { getFraseDeHoy } from "@/lib/frases";

// Página estática (CDN, cero función serverless por visita): así no se expone el
// throttle de funciones del plan. La frase del día se hornea en build y se
// revalida a diario vía /api/revalidate, disparado por Vercel Cron a las 00:00
// de Ecuador (ver vercel.json). Pestañas abiertas al cruzar medianoche además
// se refrescan solas desde FraseDelDia (router.refresh en comprobarDia).
export const dynamic = "force-static";

export default function Home() {
  const { hoy, numeroDia, anteriores } = getFraseDeHoy();

  return (
    <>
      <Cielo />
      <FraseDelDia hoy={hoy} numeroDia={numeroDia} anteriores={anteriores} />
    </>
  );
}
