# Bajo el mismo cielo 🌌

Calendario de frases diarias. Cada día, al abrir el link, ella ve la frase que escribiste para esa fecha.

## Cómo agregar frases

Edita [`content/frases.md`](content/frases.md). Cada bloque es:

```markdown
## 2026-07-15
Tu frase para ese día. Admite **negrita**, *cursiva* y
saltos de línea.
```

- Puedes pegar 30 fechas de golpe o editar un día puntual — solo importa la fecha del encabezado.
- Si un día no tiene entrada, se muestra la frase de respaldo (configurable en `lib/config.ts`).
- Guarda, haz `git push`, y Vercel despliega solo.

## Configuración

En [`lib/config.ts`](lib/config.ts):

- `FECHA_INICIO` — fecha del "día 1" para el contador.
- `TIMEZONE` — zona horaria que decide qué día es hoy (por defecto `America/Guayaquil`).
- `FRASE_FALLBACK` — texto cuando un día no tiene frase.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

## Deploy en Vercel

1. Sube este repo a GitHub.
2. En [vercel.com](https://vercel.com) → **Add New Project** → importa el repo.
3. Deploy con la configuración por defecto (detecta Next.js solo).
4. Cada `git push` a `main` redespliega automáticamente.

La página se revalida cada hora, así que la frase cambia de día sin necesidad de redeploy.
