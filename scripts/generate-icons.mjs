import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

const sizes = [16, 32, 48, 128];
const outputDir = join(process.cwd(), "extension", "icons");

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i += 1) {
  let c = i;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[i] = c >>> 0;
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function writePixel(pixels, size, x, y, color) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const offset = (y * size + x) * 4;
  pixels[offset] = color[0];
  pixels[offset + 1] = color[1];
  pixels[offset + 2] = color[2];
  pixels[offset + 3] = color[3];
}

function rect(pixels, size, x, y, w, h, color) {
  const left = Math.max(0, Math.round(x));
  const top = Math.max(0, Math.round(y));
  const right = Math.min(size, Math.round(x + w));
  const bottom = Math.min(size, Math.round(y + h));
  for (let py = top; py < bottom; py += 1) {
    for (let px = left; px < right; px += 1) writePixel(pixels, size, px, py, color);
  }
}

function roundedRect(pixels, size, x, y, w, h, radius, color) {
  const left = Math.round(x);
  const top = Math.round(y);
  const right = Math.round(x + w);
  const bottom = Math.round(y + h);
  const r = Math.max(0, radius);

  for (let py = top; py < bottom; py += 1) {
    for (let px = left; px < right; px += 1) {
      const dx = px < x + r ? x + r - px : px >= x + w - r ? px - (x + w - r - 1) : 0;
      const dy = py < y + r ? y + r - py : py >= y + h - r ? py - (y + h - r - 1) : 0;
      if (dx * dx + dy * dy <= r * r || dx === 0 || dy === 0) {
        writePixel(pixels, size, px, py, color);
      }
    }
  }
}

function makePng(size) {
  const pixels = Buffer.alloc(size * size * 4, 0);
  const s = size / 128;

  roundedRect(pixels, size, 4 * s, 4 * s, 120 * s, 120 * s, 24 * s, [17, 24, 39, 255]);
  roundedRect(pixels, size, 22 * s, 26 * s, 84 * s, 62 * s, 10 * s, [14, 165, 233, 52]);

  const stroke = Math.max(1, Math.round(7 * s));
  rect(pixels, size, 22 * s, 26 * s, 84 * s, stroke, [56, 189, 248, 255]);
  rect(pixels, size, 22 * s, 81 * s, 84 * s, stroke, [56, 189, 248, 255]);
  rect(pixels, size, 22 * s, 26 * s, stroke, 62 * s, [56, 189, 248, 255]);
  rect(pixels, size, 99 * s, 26 * s, stroke, 62 * s, [56, 189, 248, 255]);

  const cStroke = Math.max(2, Math.round(14 * s));
  rect(pixels, size, 42 * s, 42 * s, 48 * s, cStroke, [255, 255, 255, 255]);
  rect(pixels, size, 42 * s, 42 * s, cStroke, 46 * s, [255, 255, 255, 255]);
  rect(pixels, size, 42 * s, 74 * s, 48 * s, cStroke, [255, 255, 255, 255]);

  const rawRows = [];
  for (let y = 0; y < size; y += 1) {
    rawRows.push(Buffer.from([0]));
    rawRows.push(pixels.subarray(y * size * 4, (y + 1) * size * 4));
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(rawRows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

await mkdir(outputDir, { recursive: true });
for (const size of sizes) {
  await writeFile(join(outputDir, `icon${size}.png`), makePng(size));
}

console.log(`Generated ${sizes.length} icon files in ${outputDir}`);
