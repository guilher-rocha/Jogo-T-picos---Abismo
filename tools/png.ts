// PNG mínimo (RGBA 8 bits) usando o zlib do Node. Só para ferramentas de desenvolvimento.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import type { Pixmap } from '../src/gfx/pixmap';
import { Pixmap as PM } from '../src/gfx/pixmap';

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), Buffer.from(data)]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

export function encodePng(p: Pixmap): Buffer {
  const raw = Buffer.alloc((p.w * 4 + 1) * p.h);
  for (let y = 0; y < p.h; y++) {
    raw[y * (p.w * 4 + 1)] = 0;
    Buffer.from(p.data.buffer, p.data.byteOffset + y * p.w * 4, p.w * 4).copy(raw, y * (p.w * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(p.w, 0);
  ihdr.writeUInt32BE(p.h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

export function writePng(path: string, p: Pixmap): void {
  writeFileSync(path, encodePng(p));
}

// ── mini fonte 3x5 para legendas ──────────────────────────────────────────
const FONT: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101111011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010', '8': '111101111101111',
  '9': '111101111001110', _: '000000000000111', '-': '000000111000000', ':': '000010000010000', '.': '000000000000010',
  ' ': '000000000000000',
};

export function drawLabel(dst: Pixmap, text: string, x: number, y: number, color: [number, number, number, number] = [220, 220, 230, 255]): void {
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const g = FONT[ch] ?? FONT[' '];
    for (let i = 0; i < 15; i++) if (g[i] === '1') dst.set(cx + (i % 3), y + Math.floor(i / 3), color);
    cx += 4;
  }
}

/** Monta uma folha de sprites com legendas. */
export function sheet(items: { name: string; img: Pixmap }[], opts: { cols?: number; scale?: number; bg?: [number, number, number, number]; cell?: number } = {}): Pixmap {
  const cols = opts.cols ?? 8;
  const scale = opts.scale ?? 4;
  const cell = opts.cell ?? Math.max(...items.map((i) => Math.max(i.img.w, i.img.h)));
  const cw = cell * scale + 8;
  const labelH = 8;
  const ch = cell * scale + labelH + 8;
  const rows = Math.ceil(items.length / cols);
  const out = new PM(cols * cw, rows * ch);
  out.fillRect(0, 0, out.w, out.h, opts.bg ?? [58, 62, 84, 255]);
  items.forEach((it, i) => {
    const cx = (i % cols) * cw;
    const cy = Math.floor(i / cols) * ch;
    const s = it.img.scaled(scale);
    out.blit(s, cx + 4 + Math.floor((cell * scale - s.w) / 2), cy + 4 + (cell * scale - s.h));
    drawLabel(out, it.name.slice(0, Math.floor(cw / 4)), cx + 2, cy + cell * scale + 6);
  });
  return out;
}
