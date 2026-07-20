import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// Revalida la home una vez al día (Vercel Cron, ver vercel.json) para hornear
// la frase del nuevo día.
//
// Vercel solo inyecta el header "Authorization: Bearer <secret>" automático
// cuando la variable se llama CRON_SECRET (nombre reservado). Aquí la variable
// del proyecto es "cronometro", así que:
//   - el cron se autentica por su user-agent (vercel-cron), y
//   - el Bearer con "cronometro" queda para disparos manuales.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.cronometro;
  const auth = request.headers.get("authorization");
  const userAgent = request.headers.get("user-agent") ?? "";

  const esCron = userAgent.includes("vercel-cron");
  const esManual = !!secret && auth === `Bearer ${secret}`;

  // Falla cerrado: solo el cron de Vercel o un Bearer válido pueden revalidar.
  if (!esCron && !esManual) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  revalidatePath("/");
  return NextResponse.json({ revalidated: true, now: Date.now() });
}
