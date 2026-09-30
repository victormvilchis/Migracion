import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tracking = fs.readFileSync(path.join(root, 'src/pagesBBVATalent/certifications/CertificationTrackingPage.tsx'), 'utf8');

assert.match(tracking, /const TECHNOLOGICAL_CERTIFICATION_FILTER = '__TECHNOLOGICAL__';/);
assert.match(tracking, /Todas las tecnologías y certificaciones/);
assert.match(tracking, /Certificaciones · Solo tecnológicas/);
assert.match(tracking, /Tecnología ·/);
assert.match(tracking, /Certificación ·/);
assert.match(tracking, /certification === TECHNOLOGICAL_CERTIFICATION_FILTER[\s\S]*item\.certificationType === 'TECHNOLOGICAL'/);
assert.match(tracking, /matchesCertificationFilter\(item, filters\.certification\)/);
assert.match(tracking, /Buscar colaborador\.\.\./);
assert.doesNotMatch(tracking, /Todos los perfiles/);
assert.doesNotMatch(tracking, /placeholder="Todas las tecnologías"/);

console.log('BBVA Certification Unified Filter V31.17: OK');
console.log('- Tecnología y certificación están fusionadas en un solo selector: OK');
console.log('- Se conserva Solo tecnológicas con certificationType=TECHNOLOGICAL: OK');
console.log('- Se elimina Perfil de la barra visible: OK');
console.log('- Se agrega búsqueda compacta: OK');
