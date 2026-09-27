import { deflateSync } from 'node:zlib';
import {
  POSTCARD_FONT_BASE_SIZE,
  POSTCARD_FONT_CELL_H,
  POSTCARD_FONT_CELL_W,
  POSTCARD_FONT_CHARS,
  POSTCARD_FONT_COLS,
  POSTCARD_FONT_REGULAR,
  POSTCARD_FONT_REGULAR_WIDTHS,
  POSTCARD_FONT_SEMIBOLD,
  POSTCARD_FONT_SEMIBOLD_WIDTHS,
} from './bbvaPostcardFont.js';

export interface PostcardRenderInput {
  eyebrow: string;
  title: string;
  message: string;
  fullName: string;
  certificationName: string;
  resultLabel: string;
  attemptLabel: string;
  dateLabel: string;
  accent?: string | null;
}

type RGB = [number, number, number];
type FontWeight = 'regular' | 'semibold';

const W = 1200;
const H = 675;
const FONT_INDEX = new Map([...POSTCARD_FONT_CHARS].map((char, index) => [char, index]));

function hexColor(value: string | null | undefined, fallback: RGB): RGB {
  const match = String(value ?? '').match(/^#([0-9a-f]{6})$/i);
  if (!match) return fallback;
  const number = Number.parseInt(match[1], 16);
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}
function mix(a: RGB, b: RGB, factor: number): RGB {
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * factor)) as RGB;
}
function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, 'ascii');
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  typeBuffer.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return output;
}
function encodePng(rgba: Buffer): Buffer {
  const row = W * 4;
  const raw = Buffer.alloc((row + 1) * H);
  for (let y = 0; y < H; y += 1) {
    const destination = y * (row + 1);
    raw[destination] = 0;
    rgba.copy(raw, destination + 1, y * row, (y + 1) * row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
function normalizeText(value: string): string {
  return String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function formatDate(value: string): string {
  const iso = String(value ?? '').slice(0, 10);
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value || '—';
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  return `${Number(match[3])} ${months[Number(match[2]) - 1]} ${match[1]}`;
}

class Canvas {
  readonly pixels = Buffer.alloc(W * H * 4);

  constructor(background: RGB = [255, 255, 255]) {
    this.rect(0, 0, W, H, background);
  }

  set(x: number, y: number, color: RGB, alpha = 255) {
    if (x < 0 || y < 0 || x >= W || y >= H || alpha <= 0) return;
    const index = (y * W + x) * 4;
    if (alpha >= 255) {
      this.pixels[index] = color[0];
      this.pixels[index + 1] = color[1];
      this.pixels[index + 2] = color[2];
      this.pixels[index + 3] = 255;
      return;
    }
    const factor = alpha / 255;
    this.pixels[index] = Math.round(color[0] * factor + this.pixels[index] * (1 - factor));
    this.pixels[index + 1] = Math.round(color[1] * factor + this.pixels[index + 1] * (1 - factor));
    this.pixels[index + 2] = Math.round(color[2] * factor + this.pixels[index + 2] * (1 - factor));
    this.pixels[index + 3] = 255;
  }

  rect(x: number, y: number, width: number, height: number, color: RGB) {
    for (let yy = Math.max(0, Math.floor(y)); yy < Math.min(H, Math.ceil(y + height)); yy += 1) {
      for (let xx = Math.max(0, Math.floor(x)); xx < Math.min(W, Math.ceil(x + width)); xx += 1) this.set(xx, yy, color);
    }
  }

  roundedRect(x: number, y: number, width: number, height: number, radius: number, color: RGB) {
    this.rect(x + radius, y, width - radius * 2, height, color);
    this.rect(x, y + radius, width, height - radius * 2, color);
    for (let yy = 0; yy < radius; yy += 1) {
      for (let xx = 0; xx < radius; xx += 1) {
        const dx = radius - xx;
        const dy = radius - yy;
        if (dx * dx + dy * dy <= radius * radius) {
          this.set(Math.floor(x + xx), Math.floor(y + yy), color);
          this.set(Math.floor(x + width - 1 - xx), Math.floor(y + yy), color);
          this.set(Math.floor(x + xx), Math.floor(y + height - 1 - yy), color);
          this.set(Math.floor(x + width - 1 - xx), Math.floor(y + height - 1 - yy), color);
        }
      }
    }
  }

  line(x: number, y: number, width: number, color: RGB) { this.rect(x, y, width, 1, color); }

  private glyphData(weight: FontWeight) {
    return weight === 'semibold'
      ? { atlas: POSTCARD_FONT_SEMIBOLD, widths: POSTCARD_FONT_SEMIBOLD_WIDTHS }
      : { atlas: POSTCARD_FONT_REGULAR, widths: POSTCARD_FONT_REGULAR_WIDTHS };
  }

  measure(value: string, size: number, weight: FontWeight = 'regular'): number {
    const { widths } = this.glyphData(weight);
    let width = 0;
    for (const char of value) {
      const index = FONT_INDEX.get(char) ?? FONT_INDEX.get('?')!;
      width += Number(widths[index] ?? POSTCARD_FONT_BASE_SIZE * 0.5) * size / POSTCARD_FONT_BASE_SIZE;
    }
    return width;
  }

  text(value: string, x: number, y: number, size: number, color: RGB, maxWidth = Number.POSITIVE_INFINITY, weight: FontWeight = 'regular') {
    const { atlas, widths } = this.glyphData(weight);
    const scale = size / POSTCARD_FONT_BASE_SIZE;
    let cursor = x;
    for (const originalChar of String(value ?? '')) {
      const char = FONT_INDEX.has(originalChar) ? originalChar : '?';
      const index = FONT_INDEX.get(char)!;
      const advance = Number(widths[index]) * scale;
      if (cursor + advance > x + maxWidth) break;
      if (char !== ' ') {
        const sourceX = (index % POSTCARD_FONT_COLS) * POSTCARD_FONT_CELL_W;
        const sourceY = Math.floor(index / POSTCARD_FONT_COLS) * POSTCARD_FONT_CELL_H;
        const destinationWidth = Math.max(1, Math.ceil(POSTCARD_FONT_CELL_W * scale));
        const destinationHeight = Math.max(1, Math.ceil(POSTCARD_FONT_CELL_H * scale));
        for (let dy = 0; dy < destinationHeight; dy += 1) {
          const sy = Math.min(POSTCARD_FONT_CELL_H - 1, Math.floor(dy / scale));
          for (let dx = 0; dx < destinationWidth; dx += 1) {
            const sx = Math.min(POSTCARD_FONT_CELL_W - 1, Math.floor(dx / scale));
            const alpha = atlas[(sourceY + sy) * (POSTCARD_FONT_COLS * POSTCARD_FONT_CELL_W) + sourceX + sx];
            if (alpha > 3) this.set(Math.round(cursor + dx), Math.round(y + dy), color, alpha);
          }
        }
      }
      cursor += advance;
    }
    return cursor;
  }

  wrapped(value: string, x: number, y: number, size: number, color: RGB, maxWidth: number, maxLines: number, lineHeight: number, weight: FontWeight = 'regular') {
    const words = normalizeText(value).split(' ').filter(Boolean);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (this.measure(candidate, size, weight) <= maxWidth) line = candidate;
      else {
        if (line) lines.push(line);
        line = word;
        if (lines.length >= maxLines) break;
      }
    }
    if (lines.length < maxLines && line) lines.push(line);
    if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) {
      let last = lines[maxLines - 1];
      while (last.length > 1 && this.measure(`${last}…`, size, weight) > maxWidth) last = last.slice(0, -1);
      lines[maxLines - 1] = `${last.trimEnd()}…`;
    }
    lines.forEach((text, index) => this.text(text, x, y + index * lineHeight, size, color, maxWidth, weight));
    return lines.length;
  }
}

export function renderCertificationPostcardPng(input: PostcardRenderInput): Buffer {
  const primary = hexColor(input.accent, [20, 100, 165]);
  const navy: RGB = [7, 33, 70];
  const blue: RGB = mix(primary, [20, 100, 165], 0.45);
  const sky: RGB = [229, 242, 252];
  const ink: RGB = [18, 41, 69];
  const muted: RGB = [83, 104, 128];
  const border: RGB = [214, 225, 235];
  const canvas = new Canvas([247, 249, 252]);

  // Header institucional limpio.
  canvas.rect(0, 0, W, 212, navy);
  canvas.rect(0, 0, 14, H, blue);
  canvas.rect(70, 58, 52, 5, [73, 171, 231]);
  canvas.text('BFS TALENT  |  CERTIFICACIONES', 70, 78, 21, [190, 220, 242], 620, 'semibold');
  canvas.wrapped(input.title, 70, 118, 46, [255, 255, 255], 760, 2, 54, 'semibold');

  // Mensaje principal.
  canvas.text(normalizeText(input.eyebrow), 70, 252, 19, blue, 700, 'semibold');
  canvas.wrapped(input.message, 70, 292, 25, ink, 720, 4, 35, 'regular');

  // Tarjeta de resultado.
  const cardX = 835; const cardY = 246; const cardW = 300; const cardH = 286;
  canvas.roundedRect(cardX, cardY, cardW, cardH, 18, [255, 255, 255]);
  canvas.rect(cardX, cardY, 7, cardH, blue);
  canvas.text('RESULTADO', cardX + 30, cardY + 27, 17, muted, 210, 'semibold');
  canvas.wrapped(input.resultLabel, cardX + 30, cardY + 61, 31, navy, 225, 2, 38, 'semibold');
  canvas.line(cardX + 30, cardY + 132, cardW - 58, border);
  canvas.text('INTENTO', cardX + 30, cardY + 156, 15, muted, 90, 'semibold');
  canvas.text(input.attemptLabel, cardX + 151, cardY + 151, 21, ink, 110, 'semibold');
  canvas.text('FECHA', cardX + 30, cardY + 200, 15, muted, 90, 'semibold');
  canvas.text(formatDate(input.dateLabel), cardX + 151, cardY + 195, 19, ink, 115, 'semibold');
  canvas.roundedRect(cardX + 30, cardY + 242, 118, 25, 12, sky);
  canvas.text('BFS TALENT', cardX + 46, cardY + 246, 14, blue, 94, 'semibold');

  // Pie con datos de la persona y certificación.
  canvas.line(70, 542, 1065, border);
  canvas.text('COLABORADOR', 70, 566, 15, muted, 180, 'semibold');
  canvas.wrapped(input.fullName, 70, 593, 23, ink, 475, 2, 29, 'semibold');
  canvas.text('CERTIFICACIÓN', 610, 566, 15, muted, 180, 'semibold');
  canvas.wrapped(input.certificationName, 610, 593, 23, ink, 525, 2, 29, 'semibold');

  return encodePng(canvas.pixels);
}
