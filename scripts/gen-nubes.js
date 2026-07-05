// Genera public/nubes.png: mar de nubes con ruido fractal (fBm), sin dependencias.
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const W = 1600;
const H = 600;

function hash(x, y, seed) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 144665)) | 0;
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 1274126177) | 0;
  return (((h ^ (h >>> 16)) >>> 0) / 4294967296);
}

const smooth = (t) => t * t * (3 - 2 * t);

function noise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  const u = smooth(xf), v = smooth(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x, y, seed) {
  let sum = 0, amp = 0.5, freq = 1;
  for (let o = 0; o < 5; o++) {
    sum += amp * noise(x * freq, y * freq, seed + o * 101);
    amp *= 0.5;
    freq *= 2;
  }
  return sum;
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smoothstep = (a, b, t) => smooth(clamp01((t - a) / (b - a)));
const lerp = (a, b, t) => a + (b - a) * t;

const raw = Buffer.alloc(H * (1 + W * 4));
let p = 0;
for (let y = 0; y < H; y++) {
  raw[p++] = 0; // filtro PNG: none
  const fy = y / H;
  // aparece gradualmente desde arriba, denso abajo
  const ramp = smoothstep(0.08, 0.55, fy);
  const relleno = smoothstep(0.5, 1.0, fy) * 0.65;
  for (let x = 0; x < W; x++) {
    const fx = x / W;
    // nubes estiradas horizontalmente (10 celdas x 4 celdas)
    const v = fbm(fx * 10, fy * 4 + 20, 7);
    const v2 = fbm(fx * 22, fy * 9 + 5, 31); // detalle fino
    const nube = clamp01((v - 0.47) * 2.6 + (v2 - 0.5) * 0.55);
    const a = clamp01(nube * ramp + relleno * ramp);
    // sombras azuladas → cimas blancas
    const t = clamp01((v - 0.38) * 2.4);
    raw[p++] = Math.round(lerp(168, 255, t)); // R
    raw[p++] = Math.round(lerp(200, 253, t)); // G
    raw[p++] = Math.round(lerp(238, 255, t)); // B
    raw[p++] = Math.round(a * 255);
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

const dest = path.join("C:\\Users\\liber\\OneDrive\\Documentos\\Blue day", "public", "nubes.png");
fs.writeFileSync(dest, png);
console.log("nubes.png generado:", png.length, "bytes");
