import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// Revalida la home una vez al día para hornear la frase del nuevo día.
// Lo dispara Vercel Cron (ver vercel.json) a las 00:00 de Ecuador; cuando la env
// CRON_SECRET está definida, Vercel añade "Authorization: Bearer <CRON_SECRET>".
// También se puede forzar a mano con ese mismo header.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  // Falla cerrado: sin secreto configurado, nadie puede revalidar.
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  revalidatePath("/");
  return NextResponse.json({ revalidated: true, now: Date.now() });
}
