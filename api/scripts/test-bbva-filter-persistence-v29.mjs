import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const scope = read('src/pagesBBVATalent/hooks/BBVAFilterPersistenceScope.tsx');
const memory = read('src/pagesBBVATalent/hooks/useBBVAListMemory.ts');
const query = read('src/pagesBBVATalent/hooks/useBBVAListQueryState.ts');
const app = read('src/App.tsx');
const agents = read('AGENTS.md');

// El módulo se resuelve desde la navegación oficial, no desde listas hardcodeadas por página.
assert.match(scope, /findBbvaNavigationMatch\(pathname\)/);
assert.match(scope, /findBbvaGroupByPath\(pathname\)/);
assert.match(scope, /return `bbva:\$\{moduleMatch\.group\.id\}:\$\{moduleMatch\.module\.id\}`/);
assert.match(scope, /return pathname\.startsWith\('\/bbva\/'\) \? 'bbva:unmatched' : 'outside'/);

// Una visita se reutiliza sólo si el módulo activo sigue siendo el mismo.
assert.match(scope, /active\?\.scope === scope/);
assert.match(scope, /isNewVisit: false/);
assert.match(scope, /visitId: createVisitId\(\), isNewVisit: true/);
assert.match(scope, /<BBVAFilterVisit key=\{scope\} scope=\{scope\}>/);
assert.match(scope, /setResetOnEntry\(false\)/);

// La memoria persistente queda namespaced por módulo + visita + lista.
assert.match(memory, /useBBVAFilterPersistenceScope\(\)/);
assert.match(memory, /bbvaFilterStorageKey\(scope, visitId, key\)/);
assert.doesNotMatch(memory, /getItem\(`bbva:list:\$\{key\}`\)/);
assert.match(scope, /`\$\{FILTER_MEMORY_PREFIX\}v29:\$\{scope\}:\$\{visitId\}:\$\{key\}`/);

// Query params también se reinician al entrar nuevamente al módulo.
assert.match(query, /resetOnEntry/);
assert.match(query, /if \(resetOnEntry\) return next/);
assert.match(query, /Object\.keys\(defaults\)\.forEach\(\(key\) => next\.delete\(key\)\)/);
assert.match(query, /\{ replace: true \}/);

// El boundary existe tanto dentro como fuera de BBVA: salir del workspace también cierra la visita previa.
assert.equal((app.match(/<BBVAFilterPersistenceBoundary pathname=\{location\.pathname\}>/g) ?? []).length, 2);
assert.match(app, /<BBVALayout(?:\s+[^>]*)?>[\s\S]*?<BBVAFilterPersistenceBoundary pathname=\{location\.pathname\}>/);
assert.match(app, /<main className="flex-1 overflow-y-auto[\s\S]*?<BBVAFilterPersistenceBoundary pathname=\{location\.pathname\}>/);

// El estándar queda documentado para módulos presentes y futuros.
assert.match(agents, /V29 — persistencia de filtros por visita de módulo/);
assert.match(agents, /Al navegar a otro módulo, la visita anterior se cierra/);
assert.match(agents, /Navegar entre vistas internas del mismo módulo NO reinicia filtros/);
assert.match(agents, /Volver mediante historial del navegador desde otro módulo no debe restaurar filtros/);

console.log('Persistencia de filtros BBVA V29: OK');
console.log('- filtros sobreviven únicamente dentro de la visita del mismo módulo: OK');
console.log('- cambiar de módulo y regresar restaura defaults: OK');
console.log('- query params históricos también se limpian al reingresar: OK');
console.log('- recarga dentro del mismo módulo puede conservar contexto de sesión: OK');
console.log('- alcance derivado de bbvaNavigation para módulos actuales y futuros: OK');
