import assert from 'node:assert/strict';
import { configuredVendorQuarters, vendorQuarterContext, vendorQuarterForDate } from '../dist/lib/bbvaVendorCalendar.js';

const overrides=[
  {quarterCode:'2026Q3',sourceStartDate:'2026-06-24',sourceEndDate:'2026-09-23',sourceConfigured:true,operationalStartDate:'2026-06-24',operationalEndDate:'2026-09-23'},
  {quarterCode:'2026Q4',sourceStartDate:'2026-09-24',sourceEndDate:'2026-12-23',sourceConfigured:true,operationalStartDate:'2026-09-24',operationalEndDate:'2026-12-23'},
];
const periods=configuredVendorQuarters(overrides);
const q3=periods.find((item)=>item.code==='2026Q3');
const q4=periods.find((item)=>item.code==='2026Q4');
assert.equal(q3?.startDate,'2026-07-01');
assert.equal(q3?.endDate,'2026-09-30');
assert.equal(q4?.startDate,'2026-10-01');
assert.equal(q4?.endDate,'2026-12-31');
assert.equal(vendorQuarterForDate('2026-09-23',overrides)?.code,'2026Q3');
assert.equal(vendorQuarterForDate('2026-09-30',overrides)?.code,'2026Q3');
assert.equal(vendorQuarterForDate('2026-10-01',overrides)?.code,'2026Q4');
assert.equal(vendorQuarterContext(new Date('2026-09-29T18:00:00Z'),null,overrides).currentQuarter?.code,'2026Q3');
assert.equal(vendorQuarterContext(new Date('2026-10-01T18:00:00Z'),null,overrides).currentQuarter?.code,'2026Q4');
console.log('Quarter Source of Truth Runtime V31.10: OK');
console.log('- Q3 Vendors termina 23/09 pero Q3 operativo cubre hasta 30/09: OK');
console.log('- Q4 Vendors inicia 24/09 pero Q4 operativo inicia 01/10: OK');
console.log('- 29/09 sigue resolviendo Q3; 01/10 resuelve Q4: OK');
