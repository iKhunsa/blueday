// Genera los íconos PNG de la app (favicon táctil de iOS + íconos PWA de Android)
// rasterizando app/icon.svg con sharp (ya viene como dependencia de Next, no
// hace falta instalar nada). Ejecutar con: node scripts/gen-iconos.js
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const svg = path.join(__dirname, "..", "app", "icon.svg");

// destino → tamaño en px (cuadrado)
const SALIDAS = [
  { dest: path.join(__dirname, "..", "app", "apple-icon.png"), tam: 180 },   // apple-touch-icon (iOS)
  { dest: path.join(__dirname, "..", "public", "icon-192.png"), tam: 192 },  // PWA Android
  { dest: path.join(__dirname, "..", "public", "icon-512.png"), tam: 512 },  // PWA Android / splash
];

async function main() {
  for (const { dest, tam } of SALIDAS) {
    // density alto para que el SVG se rasterice nítido antes del resize
    await sharp(svg, { density: 300 }).resize(tam, tam).png().toFile(dest);
    const bytes = fs.statSync(dest).size;
    console.log(`${path.relative(path.join(__dirname, ".."), dest)} generado: ${tam}x${tam}, ${bytes} bytes`);
  }
}

main().catch((err) => {
  console.error("Error generando íconos:", err);
  process.exit(1);
});
