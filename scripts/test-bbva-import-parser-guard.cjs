const fs = require('fs');
const os = require('os');
const path = require('path');
const ts = require('typescript');

const projectRoot = process.cwd();
const sourcePath = path.join(projectRoot, 'src', 'pagesBBVATalent', 'lib', 'xlsxFirstSheet.ts');
if (!fs.existsSync(sourcePath)) throw new Error(`No existe ${sourcePath}`);

const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    esModuleInterop: true,
  },
}).outputText;

const tempPath = path.join(os.tmpdir(), `bfs-xlsx-parser-${process.pid}.cjs`);
fs.writeFileSync(tempPath, compiled, 'utf8');
try {
  delete require.cache[tempPath];
  const parser = require(tempPath);
  const normalize = parser.normalizedHeader;
  if (typeof normalize !== 'function') throw new Error('normalizedHeader no fue exportada.');

  const cases = [
    [undefined, ''],
    [null, ''],
    ['', ''],
    ['  NOMBRE   EXTERNO  ', 'NOMBRE EXTERNO'],
    ['TECNOLOGÍA', 'TECNOLOGIA'],
    ['DM [2]', 'DM'],
    ['\nCORREO\tBBVA\r', 'CORREO BBVA'],
  ];
  for (const [input, expected] of cases) {
    const actual = normalize(input);
    if (actual !== expected) throw new Error(`normalize(${String(input)}) => ${actual}; esperado ${expected}`);
  }

  const sparse = [];
  sparse[4] = 'NOMBRE EXTERNO';
  const normalizedSparse = Array.from({ length: sparse.length }, (_, index) => normalize(sparse[index]));
  if (normalizedSparse[0] !== '' || normalizedSparse[4] !== 'NOMBRE EXTERNO') {
    throw new Error('La normalización de arreglos dispersos no es segura.');
  }

  console.log('OK: parser BBVA tolera celdas undefined, encabezados con acentos y encabezados duplicados.');
} finally {
  try { fs.unlinkSync(tempPath); } catch {}
}
