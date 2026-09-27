export interface ParsedExcelRow {
  rowNumber: number;
  values: Record<string, string>;
}

export interface ParsedExcelSheet {
  sheetName: string;
  headers: string[];
  rows: ParsedExcelRow[];
  ignoredRows: number;
}

interface ZipEntry {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

const decoder = new TextDecoder('utf-8');

function u16(view: DataView, offset: number) { return view.getUint16(offset, true); }
function u32(view: DataView, offset: number) { return view.getUint32(offset, true); }

function findEocd(view: DataView): number {
  const min = Math.max(0, view.byteLength - 0xffff - 22);
  for (let offset = view.byteLength - 22; offset >= min; offset -= 1) {
    if (u32(view, offset) === 0x06054b50) return offset;
  }
  throw new Error('El archivo no parece ser un Excel .xlsx válido.');
}

function readZipEntries(buffer: ArrayBuffer): Map<string, ZipEntry> {
  const view = new DataView(buffer);
  const eocd = findEocd(view);
  const totalEntries = u16(view, eocd + 10);
  const centralOffset = u32(view, eocd + 16);
  const entries = new Map<string, ZipEntry>();
  let offset = centralOffset;

  for (let index = 0; index < totalEntries; index += 1) {
    if (u32(view, offset) !== 0x02014b50) throw new Error('La estructura ZIP del Excel está dañada.');
    const compressionMethod = u16(view, offset + 10);
    const compressedSize = u32(view, offset + 20);
    const uncompressedSize = u32(view, offset + 24);
    const fileNameLength = u16(view, offset + 28);
    const extraLength = u16(view, offset + 30);
    const commentLength = u16(view, offset + 32);
    const localHeaderOffset = u32(view, offset + 42);
    const fileNameBytes = new Uint8Array(buffer, offset + 46, fileNameLength);
    const name = decoder.decode(fileNameBytes).replace(/\\/g, '/');
    entries.set(name, { name, compressionMethod, compressedSize, uncompressedSize, localHeaderOffset });
    offset += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Tu navegador no permite descomprimir archivos Excel. Actualiza el navegador e inténtalo nuevamente.');
  }
  const bytes = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readEntry(buffer: ArrayBuffer, entry: ZipEntry): Promise<string> {
  const view = new DataView(buffer);
  const offset = entry.localHeaderOffset;
  if (u32(view, offset) !== 0x04034b50) throw new Error(`No fue posible leer ${entry.name}.`);
  const fileNameLength = u16(view, offset + 26);
  const extraLength = u16(view, offset + 28);
  const dataOffset = offset + 30 + fileNameLength + extraLength;
  const compressed = new Uint8Array(buffer.slice(dataOffset, dataOffset + entry.compressedSize));
  let bytes: Uint8Array;
  if (entry.compressionMethod === 0) bytes = compressed;
  else if (entry.compressionMethod === 8) bytes = await inflateRaw(compressed);
  else throw new Error(`El Excel usa un método de compresión no soportado (${entry.compressionMethod}).`);
  if (entry.uncompressedSize > 0 && bytes.byteLength === 0) throw new Error(`No fue posible descomprimir ${entry.name}.`);
  return decoder.decode(bytes);
}

function parseXml(xml: string): Document {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.querySelector('parsererror')) throw new Error('El Excel contiene XML inválido.');
  return document;
}

function normalizedHeader(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}

function columnIndex(cellRef: string): number {
  const letters = cellRef.replace(/[^A-Z]/gi, '').toUpperCase();
  let index = 0;
  for (const char of letters) index = index * 26 + (char.charCodeAt(0) - 64);
  return Math.max(0, index - 1);
}

function excelSerialToIso(serial: number): string {
  const wholeDays = Math.floor(serial);
  const epoch = Date.UTC(1899, 11, 30);
  const date = new Date(epoch + wholeDays * 86400000);
  return Number.isNaN(date.getTime()) ? String(serial) : date.toISOString().slice(0, 10);
}

function isDateHeader(header: string): boolean {
  const normalized = normalizedHeader(header);
  return normalized.includes('FECHA') || normalized.includes('LIMITE') || normalized.includes('VENCIMIENTO');
}

function textContent(node: Element | null): string {
  if (!node) return '';
  return Array.from(node.querySelectorAll('t')).map((item) => item.textContent ?? '').join('');
}

function cellValue(cell: Element, sharedStrings: string[]): string {
  const type = cell.getAttribute('t') ?? '';
  if (type === 'inlineStr') return textContent(cell.querySelector('is'));
  const raw = cell.querySelector('v')?.textContent ?? '';
  if (type === 's') return sharedStrings[Number(raw)] ?? '';
  if (type === 'b') return raw === '1' ? 'Sí' : 'No';
  if (type === 'str') return raw;
  return raw;
}

async function firstWorksheet(buffer: ArrayBuffer, entries: Map<string, ZipEntry>): Promise<{ name: string; path: string }> {
  const workbookEntry = entries.get('xl/workbook.xml');
  const relsEntry = entries.get('xl/_rels/workbook.xml.rels');
  if (!workbookEntry || !relsEntry) {
    const fallback = Array.from(entries.keys()).filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name)).sort()[0];
    if (!fallback) throw new Error('El archivo no contiene hojas de cálculo.');
    return { name: 'Hoja 1', path: fallback };
  }

  const workbook = parseXml(await readEntry(buffer, workbookEntry));
  const first = workbook.querySelector('sheets > sheet');
  if (!first) throw new Error('El archivo no contiene hojas de cálculo.');
  const name = first.getAttribute('name') || 'Hoja 1';
  const relationId = first.getAttribute('r:id') || first.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
  if (!relationId) throw new Error('No fue posible resolver la primera hoja del Excel.');

  const rels = parseXml(await readEntry(buffer, relsEntry));
  const relation = Array.from(rels.querySelectorAll('Relationship')).find((item) => item.getAttribute('Id') === relationId);
  const target = relation?.getAttribute('Target');
  if (!target) throw new Error('No fue posible resolver la primera hoja del Excel.');
  const path = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`.replace(/\/\.\//g, '/');
  return { name, path };
}

export async function parseFirstExcelSheet(file: File): Promise<ParsedExcelSheet> {
  if (!file.name.toLowerCase().endsWith('.xlsx')) throw new Error('Selecciona un archivo con formato .xlsx.');
  if (file.size > 15 * 1024 * 1024) throw new Error('El archivo supera el límite de 15 MB.');

  const buffer = await file.arrayBuffer();
  const entries = readZipEntries(buffer);
  const sharedEntry = entries.get('xl/sharedStrings.xml');
  const sharedStrings = sharedEntry
    ? Array.from(parseXml(await readEntry(buffer, sharedEntry)).querySelectorAll('si')).map((item) => textContent(item))
    : [];
  const sheet = await firstWorksheet(buffer, entries);
  const sheetEntry = entries.get(sheet.path);
  if (!sheetEntry) throw new Error(`No fue posible leer la primera hoja (${sheet.name}).`);
  const worksheet = parseXml(await readEntry(buffer, sheetEntry));

  const matrix: Array<{ rowNumber: number; cells: string[] }> = [];
  for (const row of Array.from(worksheet.querySelectorAll('sheetData > row'))) {
    const rowNumber = Number(row.getAttribute('r') || matrix.length + 1);
    const cells: string[] = [];
    for (const cell of Array.from(row.querySelectorAll('c'))) {
      const ref = cell.getAttribute('r') || '';
      const index = ref ? columnIndex(ref) : cells.length;
      cells[index] = cellValue(cell, sharedStrings).trim();
    }
    matrix.push({ rowNumber, cells });
  }

  const headerPosition = matrix.findIndex(({ cells }) => cells.some((value) => normalizedHeader(value) === 'NOMBRE EXTERNO'));
  const fallbackPosition = matrix.findIndex(({ cells }) => cells.some((value) => value.trim()));
  const resolvedHeaderPosition = headerPosition >= 0 ? headerPosition : fallbackPosition;
  if (resolvedHeaderPosition < 0) throw new Error('La primera hoja está vacía.');

  const headerRow = matrix[resolvedHeaderPosition];
  const headers = headerRow.cells.map((value, index) => value.trim() || `COLUMNA_${index + 1}`);
  if (!headers.some((header) => normalizedHeader(header) === 'NOMBRE EXTERNO')) {
    throw new Error('No se encontró el encabezado obligatorio NOMBRE EXTERNO en la primera hoja.');
  }

  const rows: ParsedExcelRow[] = [];
  let ignoredRows = 0;
  const nameIndex = headers.findIndex((header) => normalizedHeader(header) === 'NOMBRE EXTERNO');
  for (const source of matrix.slice(resolvedHeaderPosition + 1)) {
    const name = source.cells[nameIndex]?.trim() ?? '';
    if (!name) {
      if (source.cells.some((value) => value?.trim())) ignoredRows += 1;
      continue;
    }
    const values: Record<string, string> = {};
    headers.forEach((header, index) => {
      let value = source.cells[index]?.trim() ?? '';
      if (value && isDateHeader(header) && /^\d+(?:\.\d+)?$/.test(value)) value = excelSerialToIso(Number(value));
      values[header] = value;
    });
    rows.push({ rowNumber: source.rowNumber, values });
  }

  return { sheetName: sheet.name, headers, rows, ignoredRows };
}
