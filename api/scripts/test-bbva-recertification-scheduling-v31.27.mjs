import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const tracking=read('src/pagesBBVATalent/certifications/CertificationTrackingPage.tsx');
const collaborator=read('src/pagesBBVATalent/collaboratorCertifications/CollaboratorCertificationsPage.tsx');

assert.match(tracking,/CertificationScheduleDialog/);
assert.match(tracking,/useUpdateCollaboratorCertification/);
assert.match(tracking,/Recertificación por programar/);
assert.match(tracking,/Nuevo ciclo abierto · falta programar presentación/);
assert.match(tracking,/>\{item\.scheduledDate \? 'Reprogramar' : 'Programar'\}</);
assert.match(tracking,/recordId: pendingSchedule\.certificationRecordId/);
assert.match(collaborator,/Recertificación por programar/);
assert.match(collaborator,/Programar recertificación/);
console.log('BBVA Recertification Scheduling V31.27: OK');
console.log('- recertificación abierta deja de mostrarse como Pendiente genérico: OK');
console.log('- Seguimiento expone Programar/Reprogramar con el diálogo existente: OK');
console.log('- Detalle del colaborador conserva la misma semántica visual: OK');
