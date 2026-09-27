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

interface WorksheetRef { name: string; path: string; }
interface MatrixRow { rowNumber: number; cells: string[]; }

const decoder = new TextDecoder('utf-8');
const NAME_HEADERS = ['NOMBRE EXTERNO', 'NOMBRE COMPLETO', 'COLABORADOR', 'NOMBRE', 'NAME'];
const DISCOVERY_HEADERS = new Set([
  ...NAME_HEADERS,
  'IS', 'XM', 'USUARIO BBVA', 'USUARIO CORPORATIVO', 'CORREO', 'CORREO SOFTTEK', 'CORREO BBVA', 'CORREO CORPORATIVO',
  'DM', 'DELIVERY MANAGER', 'PERFIL', 'PERFIL TECNOLOGICO', 'PERFIL TECNOLÓGICO', 'TECNOLOGIA EN LA QUE SE CERTIFICA',
  'TECNOLOGÍA EN LA QUE SE CERTIFICA', 'FECHA DE ALTA', 'FECHA ALTA BBVA', 'FECHA ALTA XM',
]);

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

export function normalizedHeader(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
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

async function worksheets(buffer: ArrayBuffer, entries: Map<string, ZipEntry>): Promise<WorksheetRef[]> {
  const workbookEntry = entries.get('xl/workbook.xml');
  const relsEntry = entries.get('xl/_rels/workbook.xml.rels');
  if (!workbookEntry || !relsEntry) {
    return Array.from(entries.keys())
      .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
      .sort()
      .map((path, index) => ({ name: `Hoja ${index + 1}`, path }));
  }

  const workbook = parseXml(await readEntry(buffer, workbookEntry));
  const rels = parseXml(await readEntry(buffer, relsEntry));
  const relationships = new Map(Array.from(rels.querySelectorAll('Relationship')).map((item) => [item.getAttribute('Id') ?? '', item.getAttribute('Target') ?? '']));
  return Array.from(workbook.querySelectorAll('sheets > sheet')).map((sheet, index) => {
    const name = sheet.getAttribute('name') || `Hoja ${index + 1}`;
    const relationId = sheet.getAttribute('r:id') || sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || '';
    const target = relationships.get(relationId) ?? '';
    const path = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`.replace(/\/\.\//g, '/');
    return { name, path };
  }).filter((sheet) => Boolean(sheet.path));
}

function matrixFromWorksheet(worksheet: Document, sharedStrings: string[]): MatrixRow[] {
  const matrix: MatrixRow[] = [];
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
  return matrix;
}

function nameHeaderIndex(cells: string[]): number {
  const names = new Set(NAME_HEADERS.map(normalizedHeader));
  return cells.findIndex((value) => names.has(normalizedHeader(value)));
}

function headerCandidate(matrix: MatrixRow[]): { position: number; score: number } | null {
  let best: { position: number; score: number } | null = null;
  const discovery = new Set([...DISCOVERY_HEADERS].map(normalizedHeader));
  for (let position = 0; position < Math.min(matrix.length, 40); position += 1) {
    const cells = matrix[position].cells;
    if (nameHeaderIndex(cells) < 0) continue;
    const score = cells.reduce((total, value) => total + (discovery.has(normalizedHeader(value)) ? 1 : 0), 0);
    if (!best || score > best.score) best = { position, score };
  }
  return best;
}

function parseMatrix(sheetName: string, matrix: MatrixRow[], headerPosition: number): ParsedExcelSheet {
  const headerRow = matrix[headerPosition];
  const headers = headerRow.cells.map((value, index) => value.trim() || `COLUMNA_${index + 1}`);
  const nameIndex = nameHeaderIndex(headers);
  if (nameIndex < 0) throw new Error(`No se encontró una columna de nombre reconocible en la hoja ${sheetName}.`);

  const rows: ParsedExcelRow[] = [];
  let ignoredRows = 0;
  for (const source of matrix.slice(headerPosition + 1)) {
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
  return { sheetName, headers, rows, ignoredRows };
}

export async function parseFirstExcelSheet(file: File): Promise<ParsedExcelSheet> {
  if (!file.name.toLowerCase().endsWith('.xlsx')) throw new Error('Selecciona un archivo principal con formato .xlsx.');
  if (file.size > 20 * 1024 * 1024) throw new Error('El archivo supera el límite de 20 MB.');

  const buffer = await file.arrayBuffer();
  const entries = readZipEntries(buffer);
  const sharedEntry = entries.get('xl/sharedStrings.xml');
  const sharedStrings = sharedEntry
    ? Array.from(parseXml(await readEntry(buffer, sharedEntry)).querySelectorAll('si')).map((item) => textContent(item))
    : [];
  const sheetRefs = await worksheets(buffer, entries);
  if (!sheetRefs.length) throw new Error('El archivo no contiene hojas de cálculo.');

  let best: { parsed: ParsedExcelSheet; score: number; order: number } | null = null;
  for (let order = 0; order < sheetRefs.length; order += 1) {
    const sheet = sheetRefs[order];
    const sheetEntry = entries.get(sheet.path);
    if (!sheetEntry) continue;
    const worksheet = parseXml(await readEntry(buffer, sheetEntry));
    const matrix = matrixFromWorksheet(worksheet, sharedStrings);
    const candidate = headerCandidate(matrix);
    if (!candidate) continue;
    const parsed = parseMatrix(sheet.name, matrix, candidate.position);
    if (!best || candidate.score > best.score || (candidate.score === best.score && order < best.order)) best = { parsed, score: candidate.score, order };
  }

  if (!best) throw new Error('No se encontró una hoja con una columna de nombre reconocible (NOMBRE EXTERNO, NOMBRE COMPLETO, COLABORADOR, NOMBRE o NAME).');
  if (!best.parsed.rows.length) throw new Error(`La hoja ${best.parsed.sheetName} no contiene filas válidas.`);
  return best.parsed;
}

function detectDelimiter(line: string): string {
  const candidates = ['\t', ';', ','];
  let best = '\t';
  let bestCount = -1;
  for (const delimiter of candidates) {
    let count = 0;
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"') {
        if (quoted && line[index + 1] === '"') index += 1;
        else quoted = !quoted;
      } else if (!quoted && char === delimiter) count += 1;
    }
    if (count > bestCount) { best = delimiter; bestCount = count; }
  }
  return best;
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index += 1; }
      else quoted = !quoted;
      continue;
    }
    if (!quoted && char === delimiter) { row.push(field.trim()); field = ''; continue; }
    if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field.trim()); field = '';
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      continue;
    }
    field += char;
  }
  row.push(field.trim());
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

async function parseTextTable(file: File): Promise<ParsedExcelSheet> {
  if (file.size > 20 * 1024 * 1024) throw new Error('El archivo complementario supera el límite de 20 MB.');
  const text = (await file.text()).replace(/^\uFEFF/, '');
  const firstMeaningful = text.split(/\r?\n/).find((line) => line.trim()) ?? '';
  const delimiter = detectDelimiter(firstMeaningful);
  const rawRows = parseDelimited(text, delimiter);
  const matrix: MatrixRow[] = rawRows.map((cells, index) => ({ rowNumber: index + 1, cells }));
  const candidate = headerCandidate(matrix);
  if (!candidate) throw new Error('El archivo complementario no contiene una columna de nombre reconocible.');
  return parseMatrix(file.name, matrix, candidate.position);
}

export async function parseTabularFile(file: File): Promise<ParsedExcelSheet> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.xlsx')) return parseFirstExcelSheet(file);
  if (lower.endsWith('.csv') || lower.endsWith('.tsv') || lower.endsWith('.txt')) return parseTextTable(file);
  throw new Error('El archivo complementario debe ser .xlsx, .csv, .tsv o .txt.');
}
