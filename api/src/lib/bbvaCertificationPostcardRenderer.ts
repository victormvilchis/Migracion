import { deflateSync } from 'node:zlib';

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

const W = 1200;
const H = 675;
const FONT: Record<string, string[]> = {
  A:['01110','10001','10001','11111','10001','10001','10001'], B:['11110','10001','10001','11110','10001','10001','11110'],
  C:['01111','10000','10000','10000','10000','10000','01111'], D:['11110','10001','10001','10001','10001','10001','11110'],
  E:['11111','10000','10000','11110','10000','10000','11111'], F:['11111','10000','10000','11110','10000','10000','10000'],
  G:['01111','10000','10000','10111','10001','10001','01111'], H:['10001','10001','10001','11111','10001','10001','10001'],
  I:['11111','00100','00100','00100','00100','00100','11111'], J:['00111','00010','00010','00010','10010','10010','01100'],
  K:['10001','10010','10100','11000','10100','10010','10001'], L:['10000','10000','10000','10000','10000','10000','11111'],
  M:['10001','11011','10101','10101','10001','10001','10001'], N:['10001','11001','10101','10011','10001','10001','10001'],
  O:['01110','10001','10001','10001','10001','10001','01110'], P:['11110','10001','10001','11110','10000','10000','10000'],
  Q:['01110','10001','10001','10001','10101','10010','01101'], R:['11110','10001','10001','11110','10100','10010','10001'],
  S:['01111','10000','10000','01110','00001','00001','11110'], T:['11111','00100','00100','00100','00100','00100','00100'],
  U:['10001','10001','10001','10001','10001','10001','01110'], V:['10001','10001','10001','10001','10001','01010','00100'],
  W:['10001','10001','10001','10101','10101','10101','01010'], X:['10001','10001','01010','00100','01010','10001','10001'],
  Y:['10001','10001','01010','00100','00100','00100','00100'], Z:['11111','00001','00010','00100','01000','10000','11111'],
  '0':['01110','10001','10011','10101','11001','10001','01110'], '1':['00100','01100','00100','00100','00100','00100','01110'],
  '2':['01110','10001','00001','00010','00100','01000','11111'], '3':['11110','00001','00001','01110','00001','00001','11110'],
  '4':['00010','00110','01010','10010','11111','00010','00010'], '5':['11111','10000','10000','11110','00001','00001','11110'],
  '6':['01110','10000','10000','11110','10001','10001','01110'], '7':['11111','00001','00010','00100','01000','01000','01000'],
  '8':['01110','10001','10001','01110','10001','10001','01110'], '9':['01110','10001','10001','01111','00001','00001','01110'],
  ' ':['00000','00000','00000','00000','00000','00000','00000'], '.':['00000','00000','00000','00000','00000','00110','00110'],
  ',':['00000','00000','00000','00000','00110','00110','00100'], ':':['00000','00110','00110','00000','00110','00110','00000'],
  '-':['00000','00000','00000','11111','00000','00000','00000'], '/':['00001','00010','00100','01000','10000','00000','00000'],
  '!':['00100','00100','00100','00100','00100','00000','00100'], '?':['01110','10001','00001','00010','00100','00000','00100'],
  '+':['00000','00100','00100','11111','00100','00100','00000'], '%':['11001','11010','00100','01000','10110','00110','00000'],
  '(':['00010','00100','01000','01000','01000','00100','00010'], ')':['01000','00100','00010','00010','00010','00100','01000'],
};

function ascii(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '').toUpperCase();
}
function hexColor(value: string | null | undefined, fallback: [number, number, number]): [number, number, number] {
  const m = String(value ?? '').match(/^#([0-9a-f]{6})$/i);
  if (!m) return fallback;
  const n = Number.parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: [number,number,number], b: [number,number,number], t: number): [number,number,number] {
  return [0,1,2].map((i) => Math.round(a[i] + (b[i]-a[i])*t)) as [number,number,number];
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) {
    c ^= byte;
    for (let k=0;k<8;k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const t = Buffer.from(type, 'ascii');
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0); t.copy(out, 4); data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([t,data])), 8 + data.length);
  return out;
}
function encodePng(rgba: Buffer): Buffer {
  const row = W * 4;
  const raw = Buffer.alloc((row + 1) * H);
  for (let y=0;y<H;y++) {
    const dest = y * (row + 1); raw[dest] = 0;
    rgba.copy(raw, dest + 1, y * row, (y + 1) * row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W,0); ihdr.writeUInt32BE(H,4); ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR',ihdr), chunk('IDAT',deflateSync(raw,{level:9})), chunk('IEND',Buffer.alloc(0))]);
}

class Canvas {
  readonly pixels = Buffer.alloc(W*H*4);
  set(x:number,y:number,c:[number,number,number],a=255) {
    if (x<0||y<0||x>=W||y>=H) return;
    const i=(y*W+x)*4; this.pixels[i]=c[0]; this.pixels[i+1]=c[1]; this.pixels[i+2]=c[2]; this.pixels[i+3]=a;
  }
  rect(x:number,y:number,w:number,h:number,c:[number,number,number]) { for(let yy=Math.max(0,y);yy<Math.min(H,y+h);yy++) for(let xx=Math.max(0,x);xx<Math.min(W,x+w);xx++) this.set(xx,yy,c); }
  circle(cx:number,cy:number,r:number,c:[number,number,number]) { const rr=r*r; for(let y=Math.max(0,cy-r);y<Math.min(H,cy+r);y++) for(let x=Math.max(0,cx-r);x<Math.min(W,cx+r);x++){ const dx=x-cx,dy=y-cy;if(dx*dx+dy*dy<=rr)this.set(x,y,c);} }
  text(value:string,x:number,y:number,scale:number,c:[number,number,number],maxWidth=1000): number {
    const s=ascii(value); let cx=x; const cw=6*scale;
    for(const ch of s){ if(cx+cw>x+maxWidth) break; const glyph=FONT[ch]??FONT['?']; for(let gy=0;gy<7;gy++) for(let gx=0;gx<5;gx++) if(glyph[gy][gx]==='1') this.rect(cx+gx*scale,y+gy*scale,scale,scale,c); cx+=cw; }
    return cx;
  }
  wrapped(value:string,x:number,y:number,scale:number,c:[number,number,number],maxWidth:number,maxLines:number,lineGap=5) {
    const words=ascii(value).split(/\s+/).filter(Boolean); const maxChars=Math.max(1,Math.floor(maxWidth/(6*scale))); const lines:string[]=[]; let line='';
    for(const word of words){ const candidate=line?`${line} ${word}`:word; if(candidate.length<=maxChars) line=candidate; else { if(line) lines.push(line); line=word; if(lines.length>=maxLines) break; } }
    if(lines.length<maxLines&&line) lines.push(line);
    if(lines.length===maxLines && words.join(' ').length>lines.join(' ').length) lines[maxLines-1]=lines[maxLines-1].slice(0,Math.max(0,maxChars-3))+'...';
    lines.forEach((l,i)=>this.text(l,x,y+i*(7*scale+lineGap),scale,c,maxWidth));
  }
}

export function renderCertificationPostcardPng(input: PostcardRenderInput): Buffer {
  const canvas=new Canvas();
  const accent=hexColor(input.accent,[20,100,165]);
  const dark=mix(accent,[5,18,38],0.68); const darker=mix(accent,[2,10,24],0.84); const light=mix(accent,[255,255,255],0.78);
  for(let y=0;y<H;y++){ const c=mix(darker,dark,y/H); canvas.rect(0,y,W,1,c); }
  canvas.circle(1080,90,210,mix(accent,[255,255,255],0.08));
  canvas.circle(1110,610,290,mix(accent,[255,255,255],0.03));
  canvas.rect(0,0,18,H,accent);
  canvas.rect(76,74,88,8,accent);
  canvas.text(input.eyebrow,76,108,3,light,760);
  canvas.wrapped(input.title,76,158,7,[255,255,255],790,2,12);
  canvas.wrapped(input.message,76,300,3,[220,230,242],730,4,8);

  const cardX=835,cardY=186,cardW=285,cardH=330;
  canvas.rect(cardX,cardY,cardW,cardH,[245,248,252]);
  canvas.rect(cardX,cardY,cardW,10,accent);
  canvas.text('RESULTADO',cardX+28,cardY+38,2,[85,100,120],220);
  canvas.wrapped(input.resultLabel,cardX+28,cardY+78,4,dark,220,2,6);
  canvas.rect(cardX+28,cardY+160,cardW-56,1,[205,215,226]);
  canvas.text('INTENTO',cardX+28,cardY+186,2,[100,112,130],100);
  canvas.text(input.attemptLabel,cardX+150,cardY+182,3,dark,90);
  canvas.text('FECHA',cardX+28,cardY+230,2,[100,112,130],80);
  canvas.wrapped(input.dateLabel,cardX+150,cardY+226,2,dark,105,2,3);
  canvas.text('BFS TALENT',cardX+28,cardY+286,2,accent,180);

  canvas.text('COLABORADOR',76,542,2,[150,172,198],170);
  canvas.wrapped(input.fullName,76,572,3,[255,255,255],500,2,5);
  canvas.text('CERTIFICACION',610,542,2,[150,172,198],190);
  canvas.wrapped(input.certificationName,610,572,3,[255,255,255],500,2,5);
  return encodePng(canvas.pixels);
}
