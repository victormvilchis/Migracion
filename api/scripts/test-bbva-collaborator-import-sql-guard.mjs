import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/lib/bbvaCollaboratorImportRepository.ts', import.meta.url), 'utf8');
const lines = source.split(/\r?\n/);
const usages = [];
for (let index = 0; index < lines.length; index += 1) {
  if (!lines[index].includes('@deliveryManager')) continue;
  const previous = lines.slice(Math.max(0, index - 16), index + 1).join('\n');
  usages.push({ line: index + 1, bound: previous.includes(".input('deliveryManager'") });
}

assert.ok(usages.length >= 4, 'Se esperaban operaciones de Collaborator que utilizan @deliveryManager.');
for (const usage of usages) {
  assert.equal(usage.bound, true, `@deliveryManager no está ligado en la operación cercana a la línea ${usage.line}.`);
}

console.log(`OK: ${usages.length} operaciones SQL con @deliveryManager declaran el parámetro antes de ejecutar.`);
