import Cielo from "@/components/Cielo";
import FraseDelDia from "@/components/FraseDelDia";
import { getFraseDeHoy } from "@/lib/frases";

// Revalida cada hora: la web siempre sabe qué día es sin redeploy.
export const revalidate = 3600;

export default function Home() {
  const { hoy, numeroDia, anteriores } = getFraseDeHoy();

  return (
    <>
      <Cielo />
      <FraseDelDia hoy={hoy} numeroDia={numeroDia} anteriores={anteriores} />
    </>
  );
}
