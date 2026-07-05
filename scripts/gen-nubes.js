// Genera public/nubes.png: mar de nubes con ruido fractal (fBm), sin dependencias.
// Tileable horizontalmente (se repite con background-repeat: repeat-x) y SIN
// fade vertical horneado — el desvanecimiento hacia el cielo lo hace un
// mask-image en CSS (ver globals.css), así queda independiente del viewport.
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const W = 1600;
const H = 600;

// Celdas por octava a lo largo del eje X. Deben ser enteras para que el
// ruido haga wrap exacto (hash(xi mod celdas, ...)) y el tile empate borde a borde.
const CELDAS_X = [10, 22];

function hash(x, y, seed) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 144665)) | 0;
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 1274126177) | 0;
  return (((h ^ (h >>> 16)) >>> 0) / 4294967296);
}

const smooth = (t) => t * t * (3 - 2 * t);

// Ruido tileable en X: envuelve xi con módulo `celdasX` antes de hashear,
// así noise(0, y) === noise(celdasX, y) exactamente.
function noiseTileableX(x, y, seed, celdasX) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const xi0 = ((xi % celdasX) + celdasX) % celdasX;
  const xi1 = (xi0 + 1) % celdasX;
  const a = hash(xi0, yi, seed), b = hash(xi1, yi, seed);
  const c = hash(xi0, yi + 1, seed), d = hash(xi1, yi + 1, seed);
  const u = smooth(xf), v = smooth(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbmTileableX(x, y, seed) {
  let sum = 0, amp = 0.5;
  for (let o = 0; o < CELDAS_X.length; o++) {
    const celdas = CELDAS_X[o];
    sum += amp * noiseTileableX(x * celdas, y * celdas, seed + o * 101, celdas);
    amp *= 0.5;
  }
  return sum;
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;

const raw = Buffer.alloc(H * (1 + W * 4));
let p = 0;
for (let y = 0; y < H; y++) {
  raw[p++] = 0; // filtro PNG: none
  const fy = y / H;
  for (let x = 0; x < W; x++) {
    const fx = x / W;
    const v = fbmTileableX(fx, fy, 7);
    const v2 = fbmTileableX(fx * 2, fy * 2 + 3.7, 31); // detalle fino
    // más denso hacia abajo (sin llegar a un "aparecer" gradual: ya son nubes formadas)
    const densidad = lerp(0.06, 0.32, fy);
    const nube = clamp01((v - (0.5 - densidad)) * 2.6 + (v2 - 0.5) * 0.55);
    // sombras azuladas → cimas blancas
    const t = clamp01((v - 0.38) * 2.4);
    raw[p++] = Math.round(lerp(168, 255, t)); // R
    raw[p++] = Math.round(lerp(200, 253, t)); // G
    raw[p++] = Math.round(lerp(238, 255, t)); // B
    raw[p++] = Math.round(nube * 255);
  }
}

function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;  // bits
ihdr[9] = 6;  // RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const dest = path.join(__dirname, "..", "public", "nubes.png");
fs.writeFileSync(dest, png);
console.log("nubes.png generado:", png.length, "bytes");
