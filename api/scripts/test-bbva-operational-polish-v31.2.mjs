import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');

const explorer=read('src/pagesBBVATalent/staffing/EngineeringSpecialtyExplorerPage.tsx');
assert.match(explorer,/b\.collaboratorCount-a\.collaboratorCount/);
assert.match(explorer,/b\.specialties\.length-a\.specialties\.length/);
assert.match(explorer,/heatCells\.filter\([\s\S]*?sort\(\(a,b\)=>b\.collaboratorCount-a\.collaboratorCount/);
assert.match(explorer,/description: `\$\{item\.collaboratorCount\} colaboradores`/);

const collaborators=read('src/pagesBBVATalent/collaborators/CollaboratorsPage.tsx');
assert.match(collaborators,/label="Perfil \/ tecnología"/);
assert.doesNotMatch(collaborators,/label="Rol"[\s\S]*label="Tecnología actual"/);
assert.match(collaborators, /table-auto/);
assert.match(collaborators,/colSpan=\{7\}/);

for(const rel of [
  'src/componentsBBVATalent/BBVASearchableSelect.tsx',
  'src/componentsBBVATalent/BBVAMultiSelect.tsx',
  'src/componentsBBVATalent/BBVAStructureFilter.tsx',
]){
  const source=read(rel);
  const positionIndex=source.indexOf('updatePosition();');
  const openIndex=source.indexOf('setOpen(true);', positionIndex);
  assert.ok(positionIndex >= 0 && openIndex > positionIndex, `${rel}: debe posicionar el portal antes de abrir el select.`);
}

const certs=read('src/pagesBBVATalent/collaboratorCertifications/CollaboratorCertificationsPage.tsx');
assert.match(certs,/BBVAFilterBar actions=\{<button[\s\S]*Agregar certificación/);
assert.match(certs,/Seleccionar certificación para agregar/);
assert.match(certs,/text-\[26px\]/);
assert.doesNotMatch(certs,/>Agregar<\/button>/);

console.log('Pulido operativo BBVA V31.2: OK');
console.log('- estructuras ordenadas por colaboradores desc: OK');
console.log('- Colaboradores compacta Perfil / tecnología: OK');
console.log('- selects posicionados antes de renderizar portal: OK');
console.log('- alta de certificación en barra de filtros + KPIs reforzados: OK');
