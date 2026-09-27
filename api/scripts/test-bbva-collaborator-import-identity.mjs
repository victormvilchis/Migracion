import assert from 'node:assert/strict';
import {
  buildImportIdentityIndex,
  findDuplicateImportIdentityIssues,
  resolveImportIdentity,
} from '../dist/lib/bbvaCollaboratorImportIdentity.js';

const person = (overrides) => ({
  personId: overrides.personId,
  fullName: overrides.fullName ?? 'Persona',
  softtekCode: overrides.softtekCode ?? null,
  corporateUser: overrides.corporateUser ?? null,
  email: overrides.email ?? null,
  bbvaEmail: overrides.bbvaEmail ?? null,
});
const row = (overrides) => ({
  rowKey: overrides.rowKey ?? `row-${overrides.rowNumber}`,
  rowNumber: overrides.rowNumber,
  fullName: overrides.fullName ?? 'Persona',
  softtekCode: overrides.softtekCode ?? null,
  corporateUser: overrides.corporateUser ?? null,
  email: overrides.email ?? null,
  bbvaEmail: overrides.bbvaEmail ?? null,
});

{
  const a = person({ personId:'A', fullName:'Juan Perez', softtekCode:'IS001' });
  const b = person({ personId:'B', fullName:'Juan Perez', softtekCode:'IS002' });
  const result = resolveImportIdentity(row({ rowNumber:2, fullName:'Juan Perez', softtekCode:'IS001' }), buildImportIdentityIndex([a,b]));
  assert.equal(result.person?.personId, 'A');
  assert.equal(result.conflict, null);
}
{
  const a = person({ personId:'A', fullName:'Ana Lopez', softtekCode:'IS010', corporateUser:'XM010', email:'ana@softtek.com' });
  const result = resolveImportIdentity(row({ rowNumber:3, fullName:'Ana Lopez', softtekCode:'IS010', corporateUser:'XM010', email:'ana@softtek.com' }), buildImportIdentityIndex([a]));
  assert.equal(result.person?.personId, 'A');
  assert.deepEqual(result.referencedPersonIds, ['A']);
}
{
  const a = person({ personId:'A', fullName:'Uno', softtekCode:'IS100' });
  const b = person({ personId:'B', fullName:'Dos', email:'dos@softtek.com' });
  const result = resolveImportIdentity(row({ rowNumber:4, fullName:'Cualquiera', softtekCode:'IS100', email:'dos@softtek.com' }), buildImportIdentityIndex([a,b]));
  assert.equal(result.person, null);
  assert.ok(result.conflict);
  assert.deepEqual(new Set(result.referencedPersonIds), new Set(['A','B']));
}
{
  const a = person({ personId:'A', fullName:'Nombre Unico' });
  const result = resolveImportIdentity(row({ rowNumber:5, fullName:'Nombre Unico' }), buildImportIdentityIndex([a]));
  assert.equal(result.person?.personId, 'A');
}
{
  const a = person({ personId:'A', fullName:'Nombre Repetido' });
  const b = person({ personId:'B', fullName:'Nombre Repetido' });
  const result = resolveImportIdentity(row({ rowNumber:6, fullName:'Nombre Repetido' }), buildImportIdentityIndex([a,b]));
  assert.equal(result.person, null);
  assert.ok(result.conflict);
  assert.deepEqual(new Set(result.referencedPersonIds), new Set(['A','B']));
}
{
  const rows = [
    row({ rowNumber:10, fullName:'A', softtekCode:'ISA', email:'repetido@softtek.com' }),
    row({ rowNumber:20, fullName:'B', softtekCode:'ISB', email:'repetido@softtek.com' }),
  ];
  const issues = findDuplicateImportIdentityIssues(rows);
  assert.equal(issues.filter((issue) => issue.code === 'DUPLICATE_SOFTTEK_EMAIL').length, 2);
  assert.equal(issues.some((issue) => issue.code === 'DUPLICATE_SOFTTEK_CODE'), false);
}
{
  const rows = [
    row({ rowNumber:30, fullName:'A', softtekCode:'ISX', email:'a@softtek.com' }),
    row({ rowNumber:31, fullName:'B', softtekCode:'ISX', email:'b@softtek.com' }),
  ];
  const issues = findDuplicateImportIdentityIssues(rows);
  assert.equal(issues.filter((issue) => issue.code === 'DUPLICATE_SOFTTEK_CODE').length, 2);
}
{
  const rows = [
    row({ rowNumber:40, fullName:'Homónimo', softtekCode:'IS40' }),
    row({ rowNumber:41, fullName:'Homónimo', softtekCode:'IS41' }),
  ];
  assert.equal(findDuplicateImportIdentityIssues(rows).length, 0);
}

console.log('OK: 8 escenarios de identidad y duplicados de importación BBVA.');
