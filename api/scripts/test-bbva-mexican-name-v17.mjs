import assert from 'node:assert/strict';
import { splitMexicanFullName } from '../dist/lib/bbvaMexicanName.js';

assert.deepEqual(splitMexicanFullName('LUIS FERNANDO CASTILLO CONTRERAS'), { firstName: 'LUIS FERNANDO', lastName: 'CASTILLO CONTRERAS' });
assert.deepEqual(splitMexicanFullName('CINTHIA CRISTINA HERNANDEZ HERNANDEZ'), { firstName: 'CINTHIA CRISTINA', lastName: 'HERNANDEZ HERNANDEZ' });
assert.deepEqual(splitMexicanFullName('OSWALDO DE LOS SANTOS HERNANDEZ'), { firstName: 'OSWALDO', lastName: 'DE LOS SANTOS HERNANDEZ' });
assert.deepEqual(splitMexicanFullName('MARIA DEL CARMEN LOPEZ RUIZ'), { firstName: 'MARIA DEL CARMEN', lastName: 'LOPEZ RUIZ' });
assert.deepEqual(splitMexicanFullName('HERNANDEZ PACHECO, JOSE LUIS'), { firstName: 'JOSE LUIS', lastName: 'HERNANDEZ PACHECO' });
console.log('Nombres México V17: OK');
