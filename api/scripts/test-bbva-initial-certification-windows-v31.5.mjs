import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');

const migration=read('api/scripts/migrate-bbva-initial-certification-windows-v31.5.sql');
const helper=read('api/src/lib/bbvaInitialCertificationSchedule.ts');
const repo=read('api/src/lib/bbvaCollaboratorCertificationRepository.ts');
const collaboratorService=read('api/src/lib/bbvaCollaboratorService.ts');
const form=read('src/componentsBBVATalent/CollaboratorForm.tsx');
const tracking=read('src/pagesBBVATalent/certifications/CertificationTrackingPage.tsx');
const collaboratorCerts=read('src/pagesBBVATalent/collaboratorCertifications/CollaboratorCertificationsPage.tsx');
const frontendTypes=read('src/pagesBBVATalent/types/collaboratorCertification.ts');
const agents=read('AGENTS.md');

// Matriz operativa documentada por BBVA.
assert.match(migration,/CertificationType=N'TECHNOLOGICAL'[\s\S]*InitialCompletionDays=30|InitialCompletionDays=30[\s\S]*CertificationType=N'TECHNOLOGICAL'/);
assert.match(migration,/CertificationType=N'DEVELOPMENT_SECURITY'/);
assert.match(migration,/InitialCompletionDays=90/);
assert.match(migration,/CertificationType=N'NORMATIVE_TESTING'/);
assert.match(migration,/InitialCompletionDays=60/);
assert.match(migration,/UPPER\(LTRIM\(RTRIM\(Name\)\)\)=N'AGILE'/);
assert.equal((migration.match(/MaxAttempts=2/g)??[]).length>=4,true);

// Primer intento = mitad de la ventana: 30->15, 90->45, 60->30.
assert.match(helper,/Math\.ceil\(completionDays\/2\)/);
const add=(iso,days)=>{const d=new Date(`${iso}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
for(const [start,total,first,final] of [
  ['2026-10-01',30,'2026-10-16','2026-10-31'],
  ['2026-10-01',90,'2026-11-15','2026-12-30'],
  ['2026-10-01',60,'2026-10-31','2026-11-30'],
]){assert.equal(add(start,Math.ceil(total/2)),first);assert.equal(add(start,total),final);}

// Alta BBVA obligatoria sólo para nuevos colaboradores.
assert.match(collaboratorService,/fecha de alta BBVA es obligatoria para un nuevo colaborador/i);
assert.match(form,/Fecha de alta BBVA \{mode === 'create' \? <BBVARequiredMark\/> : null\}/);
assert.match(form,/mode === 'create' && !bbvaStartDate/);

// Synchronize genera y conserva límite inicial desde StartDate + configuración.
assert.match(repo,/CONVERT\(VARCHAR\(10\),c\.StartDate,23\) AS bbvaStartDate/);
assert.match(repo,/DATEADD\(day,cc\.InitialCompletionDays,@bbvaStartDate\)/);
assert.doesNotMatch(repo,/p\.StartDate/);
assert.match(migration,/INNER JOIN bbva\.Collaborator c ON c\.PersonId=pc\.PersonId AND c\.Status=N'ACTIVE'/);
assert.match(migration,/DATEADD\(day,cc\.InitialCompletionDays,c\.StartDate\)/);
assert.doesNotMatch(migration,/p\.StartDate/);

assert.match(repo,/InitialDueDate=CASE WHEN pc\.CurrentCycle=1/);
assert.match(repo,/ISNULL\(pc\.LastDataSource,N'AUTO'\)<>N'IMPORT'/);
assert.match(migration,/pc\.InitialDueDate IS NULL/);

// API entrega el milestone actual y el contador de días.
for(const token of ['firstAttemptDueDate','initialSchedulePhase','initialScheduleDueDate','daysToInitialSchedule','initialScheduleTiming']){
  assert.match(repo,new RegExp(token));
  assert.match(frontendTypes,new RegExp(token));
}

// UX: seguimiento global y detalle del colaborador muestran primera/segunda ventana.
assert.match(tracking,/initialCertificationContext/);
assert.match(tracking,/item\.initialScheduleDueDate/);
assert.match(tracking,/Alta BBVA/);
assert.match(tracking,/Límite inicial/);
assert.match(collaboratorCerts,/1er intento fuera de tiempo/);
assert.match(collaboratorCerts,/2do intento fuera de tiempo/);

// El contrato queda documentado para cambios futuros.
assert.match(agents,/V31\.5 — ventanas iniciales de certificación por alta BBVA/);
assert.match(agents,/Tecnológica: 30 días totales, primer intento a los 15 días/);
assert.match(agents,/Desarrollo Seguro: 90 días totales, primer intento a los 45 días/);
assert.match(agents,/Normativa & Testing: 60 días totales, primer intento a los 30 días/);
assert.match(agents,/Agile: 90 días totales, primer intento a los 45 días/);

console.log('Ventanas iniciales de certificación V31.5: OK');
console.log('- fecha de alta BBVA obligatoria en nuevas altas: OK');
console.log('- matriz 15/30, 45/90, 30/60 y 45/90: OK');
console.log('- límite inicial generado desde alta BBVA: OK');
console.log('- countdown de 1er/2do intento disponible en API y UI: OK');
console.log('- datos importados protegidos frente a recálculo automático: OK');
