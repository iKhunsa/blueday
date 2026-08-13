// Genera lib/crucigrama-allie.ts a partir de las 38 palabras+pistas del
// acróstico "TE AMO MI GATITA QUEDATE CONMIGO PARA SIEMPRE". Coloca las
// palabras en un grid entrelazándolas por letras compartidas (algoritmo
// greedy determinístico, sin backtracking). Ejecutar con:
//   node scripts/generar-crucigrama.js
const path = require("path");
const fs = require("fs");

// Orden original del acróstico — NO reordenar (el número de índice se usa
// como criterio de desempate en el ordenamiento por longitud).
const PALABRAS = [
  { word: "TRAVIESA", clue: "Me aceleras el corazón con 2 o 3 palabras y sabes que me matas con eso de ganas tú eres ?" },
  { word: "ESPOSOS", clue: "En Apex les hacíamos creer a los randoms que llevábamos 10 años de casados" },
  { word: "AMOR", clue: "El sentimiento que todos los días tú y yo nos entregamos" },
  { word: "MICHI", clue: "Vamos a tener 2 pero no más de 4 en casa para no ser una fundación de animales ahah" },
  { word: "OJITOS", clue: "Lo que más me encanta de verte" },
  { word: "MORRITOS", clue: "Eso que me apretabas de manera juguetona en la boquita cuando yo andaba celoso por un michi bb" },
  { word: "IGLESIA", clue: "Cada domingo te mando a confesar ahí todos los pecados hechos y por hacer" },
  { word: "GATITA", clue: "El apodo que usé por primera vez el día uno, cuando recién empezábamos a hablar" },
  { word: "ALLIE", clue: "Así te llamé la primera vez antes de usar nuestros apodos cariñosos" },
  { word: "TALLARINES", clue: "Lo que nos encanta comer y compartiremos este fin de semana" },
  { word: "INTENSIDAD", clue: "Solo los dos sabemos amar con mucha ....inserte palabra... porque no existe otra forma de hacerlo" },
  { word: "TERNURA", clue: "Lo que sientes cuando te doy mucho amor lindo" },
  { word: "APEX", clue: "El juego que nos unió para toda la vida" },
  { word: "QUERIDA", clue: 'El adjetivo cariñoso que la mayoría de veces apego a "esposa"' },
  { word: "UNICA", clue: "Como tú mi amor no hay dos eso te hace?" },
  { word: "ENERGIA", clue: "Lo que te preguntaba en % cada noche antes de conectarnos" },
  { word: "DESCANSO", clue: "Eso que te mandé tomar por 15 minutos cuando te vi agotada, para que te repongas" },
  { word: "ABRAZO", clue: "Uno de los grandes deseos que tengo todos los días que hablo y estoy contigo" },
  { word: "TAZITA", clue: "Las compré de a dos en Machala porque una sola iba a quedarse sola" },
  { word: "ESTUDIO", clue: "El rincón de la casa donde llevaba mi café cada mañana antes de ponerme a currar" },
  { word: "CARIÑO", clue: "Eso que juré ponerle a cada cosita que hiciera por ti, hasta la más simple" },
  { word: "ONEPIECE", clue: "La serie que te llevará mucho tiempo ver... la serie que te dije que si la veías te casarías conmigo" },
  { word: "NOCHE", clue: "Solo la luna y el cielo estrellado fueron testigos de todo lo que vivimos" },
  { word: "MATECITO", clue: "Lo primero que tomabas con tu mamá en casita antes de ponerte al día conmigo" },
  { word: "IMAN", clue: "Cuando estemos juntos sé que los dos seremos ..inserte palabra.. porque no nos despegaremos" },
  { word: "GOALS", clue: "Es una palabra en inglés que el trello tiene registrada con muchas task porque contigo quiero cumplirlo todo" },
  { word: "OBEDIENTE", clue: "Lo que eras cada vez que te portabas tan bien que ni falta hacía el castigo" },
  { word: "PRINCESA", clue: "Te trato como la realeza sin serlo porque mi amor por ti es de carácter feudal y real" },
  { word: "AMORE", clue: "El apodo cariñoso en italiano.. que te repetí en aquella noche donde nuestras almas se tocaron" },
  { word: "RECUERDO", clue: "Soy alguien muy olvidadizo pero con todo el amor del mundo sé que tú siempre me harás" },
  { word: "ANIMO", clue: "Como tú eres mi chispa y energía yo siempre te daré mucho ...inserte palabra.. cada que te falte para arrancar algo" },
  { word: "SIEMPRE", clue: "El tiempo de duración de nuestro amor que es para ..." },
  { word: "INCREIBLE", clue: "Lo primero que pensé cuando hablamos de manera deep y muy intelectual, esta mujer es .." },
  { word: "ESPECIAL", clue: "Cada noche contigo y cada día contigo es y serán" },
  { word: "MIMOS", clue: "Los piojitos que te hacía para que te durmieras calientita y bien consentida" },
  { word: "PASE", clue: "Esos niveles de Apex que te faltaban y subimos juntos antes de que se acabara el tiempo" },
  { word: "RUGIDO", clue: "En la reunión con el abogado tenía cara de póker... pero por dentro mi leoncito qué hacía?" },
  { word: "ESTRELLA", clue: "Le diste dirección y propósito a mi vida.. como lo hacen los astros como lo hace la polar porque tú eres mi ...insertar... personal" },
];

function claveCelda(fila, columna) {
  return `${fila},${columna}`;
}

function main() {
  if (PALABRAS.length !== 38) {
    throw new Error(`Se esperaban 38 palabras, hay ${PALABRAS.length}`);
  }

  // Orden de colocación: longitud descendente, empate = índice original (sort estable).
  const orden = PALABRAS.map((p, indiceOriginal) => ({ ...p, indiceOriginal })).sort(
    (a, b) => b.word.length - a.word.length
  );

  const grid = new Map(); // "fila,columna" -> letra
  const colocadas = []; // { word, clue, indiceOriginal, fila, columna, direccion }
  let minFila = 0, maxFila = 0, minColumna = 0, maxColumna = 0;
  let fallbacks = 0;

  function actualizarBoundingBox(fila, columna, largo, direccion) {
    const finFila = direccion === "down" ? fila + largo - 1 : fila;
    const finColumna = direccion === "across" ? columna + largo - 1 : columna;
    minFila = Math.min(minFila, fila);
    maxFila = Math.max(maxFila, finFila);
    minColumna = Math.min(minColumna, columna);
    maxColumna = Math.max(maxColumna, finColumna);
  }

  function crecimientoBoundingBox(fila, columna, largo, direccion) {
    const finFila = direccion === "down" ? fila + largo - 1 : fila;
    const finColumna = direccion === "across" ? columna + largo - 1 : columna;
    const nuevoMinFila = Math.min(minFila, fila);
    const nuevoMaxFila = Math.max(maxFila, finFila);
    const nuevoMinColumna = Math.min(minColumna, columna);
    const nuevoMaxColumna = Math.max(maxColumna, finColumna);
    const areaActual = (maxFila - minFila + 1) * (maxColumna - minColumna + 1);
    const areaNueva = (nuevoMaxFila - nuevoMinFila + 1) * (nuevoMaxColumna - nuevoMinColumna + 1);
    return areaNueva - areaActual;
  }

  // Valida una colocación candidata. `permitirSinCruce` es solo para el
  // fallback desconectado (que no busca intersección).
  function validar(word, fila, columna, direccion, permitirSinCruce) {
    const dr = direccion === "down" ? 1 : 0;
    const dc = direccion === "across" ? 1 : 0;

    // celda inmediatamente antes del inicio debe estar vacía
    if (grid.has(claveCelda(fila - dr, columna - dc))) return null;
    // celda inmediatamente después del final debe estar vacía
    const finFila = fila + word.length * dr;
    const finColumna = columna + word.length * dc;
    if (grid.has(claveCelda(finFila, finColumna))) return null;

    let cruces = 0;
    for (let i = 0; i < word.length; i++) {
      const r = fila + i * dr;
      const c = columna + i * dc;
      const existente = grid.get(claveCelda(r, c));
      if (existente !== undefined) {
        if (existente !== word[i]) return null; // conflicto de letra
        cruces++;
      } else {
        // celda vacía: no puede tener vecino perpendicular ocupado (evita
        // que la palabra roce otra sin cruzarla realmente)
        if (direccion === "across") {
          if (grid.has(claveCelda(r - 1, c)) || grid.has(claveCelda(r + 1, c))) return null;
        } else {
          if (grid.has(claveCelda(r, c - 1)) || grid.has(claveCelda(r, c + 1))) return null;
        }
      }
    }

    if (cruces === 0 && !permitirSinCruce) return null;
    return { cruces };
  }

  function colocar(entrada, fila, columna, direccion) {
    const dr = direccion === "down" ? 1 : 0;
    const dc = direccion === "across" ? 1 : 0;
    for (let i = 0; i < entrada.word.length; i++) {
      grid.set(claveCelda(fila + i * dr, columna + i * dc), entrada.word[i]);
    }
    actualizarBoundingBox(fila, columna, entrada.word.length, direccion);
    colocadas.push({
      word: entrada.word,
      clue: entrada.clue,
      indiceOriginal: entrada.indiceOriginal,
      fila,
      columna,
      direccion,
    });
  }

  // primera palabra (la más larga): ancla en (0,0) horizontal
  colocar(orden[0], 0, 0, "across");

  for (let idx = 1; idx < orden.length; idx++) {
    const entrada = orden[idx];
    const { word } = entrada;
    const candidatas = [];

    for (const colocada of colocadas) {
      const pdr = colocada.direccion === "down" ? 1 : 0;
      const pdc = colocada.direccion === "across" ? 1 : 0;
      for (let pi = 0; pi < colocada.word.length; pi++) {
        const pr = colocada.fila + pi * pdr;
        const pc = colocada.columna + pi * pdc;
        const pch = colocada.word[pi];

        for (let wi = 0; wi < word.length; wi++) {
          if (word[wi] !== pch) continue;
          // debe cruzar perpendicular a la palabra ya colocada
          const nuevaDireccion = colocada.direccion === "across" ? "down" : "across";
          const nuevaFila = nuevaDireccion === "down" ? pr - wi : pr;
          const nuevaColumna = nuevaDireccion === "across" ? pc - wi : pc;

          const resultado = validar(word, nuevaFila, nuevaColumna, nuevaDireccion, false);
          if (resultado) {
            candidatas.push({
              fila: nuevaFila,
              columna: nuevaColumna,
              direccion: nuevaDireccion,
              cruces: resultado.cruces,
              crecimiento: crecimientoBoundingBox(nuevaFila, nuevaColumna, word.length, nuevaDireccion),
            });
          }
        }
      }
    }

    if (candidatas.length === 0) {
      // fallback: sin cruce, dos filas debajo del bounding box actual
      fallbacks++;
      const filaFallback = maxFila + 2;
      const columnaFallback = minColumna;
      colocar(entrada, filaFallback, columnaFallback, "across");
      continue;
    }

    candidatas.sort((a, b) => {
      if (b.cruces !== a.cruces) return b.cruces - a.cruces;
      if (a.crecimiento !== b.crecimiento) return a.crecimiento - b.crecimiento;
      if (a.direccion !== b.direccion) return a.direccion === "across" ? -1 : 1;
      if (a.fila !== b.fila) return a.fila - b.fila;
      return a.columna - b.columna;
    });

    const mejor = candidatas[0];
    colocar(entrada, mejor.fila, mejor.columna, mejor.direccion);
  }

  if (colocadas.length !== 38) {
    throw new Error(`Se colocaron ${colocadas.length} palabras, se esperaban 38`);
  }

  // Normalizar a base 0
  const offsetFila = -minFila;
  const offsetColumna = -minColumna;
  for (const c of colocadas) {
    c.fila += offsetFila;
    c.columna += offsetColumna;
  }
  const filas = maxFila - minFila + 1;
  const columnas = maxColumna - minColumna + 1;

  // Numeración: escaneo row-major, una celda arranca número si empieza un
  // across y/o un down.
  const tieneLetra = new Set();
  for (const c of colocadas) {
    const dr = c.direccion === "down" ? 1 : 0;
    const dc = c.direccion === "across" ? 1 : 0;
    for (let i = 0; i < c.word.length; i++) {
      tieneLetra.add(claveCelda(c.fila + i * dr, c.columna + i * dc));
    }
  }

  const numeroPorCelda = new Map();
  let contador = 1;
  for (let fila = 0; fila < filas; fila++) {
    for (let columna = 0; columna < columnas; columna++) {
      if (!tieneLetra.has(claveCelda(fila, columna))) continue;
      const empiezaAcross =
        !tieneLetra.has(claveCelda(fila, columna - 1)) && tieneLetra.has(claveCelda(fila, columna + 1));
      const empiezaDown =
        !tieneLetra.has(claveCelda(fila - 1, columna)) && tieneLetra.has(claveCelda(fila + 1, columna));
      if (empiezaAcross || empiezaDown) {
        numeroPorCelda.set(claveCelda(fila, columna), contador);
        contador++;
      }
    }
  }

  // Asignar número a cada palabra colocada y devolver al orden original del acróstico
  const resultado = colocadas
    .map((c) => ({
      numero: numeroPorCelda.get(claveCelda(c.fila, c.columna)),
      palabra: c.word,
      clave: c.clue,
      fila: c.fila,
      columna: c.columna,
      direccion: c.direccion,
      indiceOriginal: c.indiceOriginal,
    }))
    .sort((a, b) => a.indiceOriginal - b.indiceOriginal);

  for (const r of resultado) {
    if (r.numero === undefined) {
      throw new Error(`Palabra sin número asignado: ${r.palabra}`);
    }
    delete r.indiceOriginal;
  }

  // Sanidad: sin dos palabras con mismo (fila, columna, direccion)
  const claves = new Set();
  for (const c of colocadas) {
    const k = `${c.fila},${c.columna},${c.direccion}`;
    if (claves.has(k)) throw new Error(`Colocación duplicada: ${k}`);
    claves.add(k);
  }

  const lineasPalabras = resultado
    .map(
      (r) =>
        `    { numero: ${r.numero}, palabra: ${JSON.stringify(r.palabra)}, clave: ${JSON.stringify(
          r.clave
        )}, fila: ${r.fila}, columna: ${r.columna}, direccion: ${JSON.stringify(r.direccion)} },`
    )
    .join("\n");

  const salida = `// GENERADO por scripts/generar-crucigrama.js — no editar a mano.
// Para regenerar: node scripts/generar-crucigrama.js

export type DireccionPalabra = "across" | "down";

export type PalabraCrucigrama = {
  numero: number;
  palabra: string;
  clave: string;
  fila: number;
  columna: number;
  direccion: DireccionPalabra;
};

export const CRUCIGRAMA_ALLIE: { filas: number; columnas: number; palabras: PalabraCrucigrama[] } = {
  filas: ${filas},
  columnas: ${columnas},
  palabras: [
${lineasPalabras}
  ],
};
`;

  const destino = path.join(__dirname, "..", "lib", "crucigrama-allie.ts");
  fs.writeFileSync(destino, salida, "utf-8");

  console.log(`lib/crucigrama-allie.ts generado: ${filas}x${columnas}, 38 palabras, ${fallbacks} por fallback desconectado.`);
}

main();
