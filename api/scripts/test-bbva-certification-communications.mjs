import assert from 'node:assert/strict';
import { communicationVariables, renderCommunicationTemplate, resolveCommunicationContext } from '../dist/lib/bbvaCertificationCommunicationDomain.js';
import { renderCertificationPostcardPng } from '../dist/lib/bbvaCertificationPostcardRenderer.js';

const base = {
  collaboratorId:'c',certificationRecordId:'r',certificationId:'x',certificationName:'JAVA - APX',certificationType:'TECHNOLOGICAL',technologyName:'JAVA',
  fullName:'CIRO FUENTES LOPEZ',firstName:'CIRO',recipientEmail:'ciro@example.com',currentCycle:2,maxAttempts:3,baseStatus:'FAILED',attemptId:'a',attemptNumber:1,attemptDate:'2026-09-27',result:'FAILED',score10:7.5,
};
assert.equal(resolveCommunicationContext(base), 'FIRST_FAILED');
assert.equal(resolveCommunicationContext({ ...base, attemptNumber:2 }), 'INTERMEDIATE_FAILED');
assert.equal(resolveCommunicationContext({ ...base, attemptNumber:3 }), 'LAST_FAILED');
assert.equal(resolveCommunicationContext({ ...base, attemptNumber:1, result:'APPROVED' }), 'APPROVED');
assert.equal(resolveCommunicationContext({ ...base, maxAttempts:2, attemptNumber:2, result:'FAILED' }), 'LOW');
assert.equal(resolveCommunicationContext({ ...base, certificationType:'COMPLIANCE', maxAttempts:2, attemptNumber:2, result:'FAILED' }), 'LAST_FAILED');
assert.equal(resolveCommunicationContext({ ...base, maxAttempts:null, attemptNumber:9 }), 'INTERMEDIATE_FAILED');
const vars = communicationVariables(base);
assert.equal(renderCommunicationTemplate('Hola {{firstName}} - {{certificationName}}', vars), 'Hola CIRO - JAVA - APX');
const png = renderCertificationPostcardPng({ eyebrow:'CERTIFICACION',title:'Felicidades Ciro',message:'Has aprobado JAVA APX',fullName:base.fullName,certificationName:base.certificationName,resultLabel:'Aprobado',attemptLabel:'1 / 3',dateLabel:'27 sep 2026',accent:'#1464A5' });
assert.equal(png[0], 137); assert.equal(png.subarray(1,4).toString('ascii'),'PNG');
assert.ok(png.length > 5000);
console.log('OK: 9 escenarios de comunicaciones/postales de certificación.');
