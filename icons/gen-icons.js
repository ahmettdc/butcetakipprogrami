/* Bağımlılıksız PNG ikon üretici (Node stdlib zlib kullanır).
   Teal yuvarlak kare zemin üzerine beyaz donut + pasta dilimi çizer. */
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function lerp(a, b, t) { return a + (b - a) * t; }
function hex(r, g, b) { return [r, g, b]; }

function draw(size) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2;
  const R = size * 0.30;      // dış yarıçap
  const Rin = size * 0.175;   // iç boşluk (donut)
  const ringLo = size * 0.30;
  // gradient renkler
  const top = hex(0x2d, 0xd4, 0xbf);    // #2dd4bf
  const bot = hex(0x0f, 0x76, 0x6e);    // #0f766e
  const wedgeCol = hex(0xfd, 0xe0, 0x47); // sarı dilim #fde047
  const white = hex(0xff, 0xff, 0xff);
  const radius = size * 0.22; // yuvarlak köşe

  function inRoundedRect(x, y) {
    const rx = Math.min(x, size - x);
    const ry = Math.min(y, size - y);
    if (rx >= radius || ry >= radius) return true;
    const dx = radius - rx, dy = radius - ry;
    return dx * dx + dy * dy <= radius * radius;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (!inRoundedRect(x + 0.5, y + 0.5)) { buf[i + 3] = 0; continue; }
      // zemin gradient
      const t = y / size;
      let r = lerp(top[0], bot[0], t) | 0;
      let g = lerp(top[1], bot[1], t) | 0;
      let b = lerp(top[2], bot[2], t) | 0;

      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= R && dist >= Rin) {
        // açı: üstten saat yönü
        let ang = Math.atan2(dy, dx) + Math.PI / 2;
        if (ang < 0) ang += Math.PI * 2;
        // %30'luk dilim sarı, gerisi beyaz
        const col = ang < Math.PI * 2 * 0.30 ? wedgeCol : white;
        r = col[0]; g = col[1]; b = col[2];
      }
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
    }
  }
  return buf;
}

[192, 512].forEach(function (size) {
  const buf = draw(size);
  const png = encodePNG(size, size, buf);
  const out = path.join(__dirname, "icon-" + size + ".png");
  fs.writeFileSync(out, png);
  console.log("yazildi:", out, png.length, "bayt");
});
