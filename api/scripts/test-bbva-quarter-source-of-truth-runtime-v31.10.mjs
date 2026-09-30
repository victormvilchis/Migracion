import assert from 'node:assert/strict';
import { configuredVendorQuarters, validateOperationalQuarterConfiguration, validateVendorSourceConfiguration, vendorQuarterContext, vendorQuarterForDate } from '../dist/lib/bbvaVendorCalendar.js';
const overrides=[
  {quarterCode:'2026Q3',sourceStartDate:'2026-06-24',sourceEndDate:'2026-09-27',sourceConfigured:true,operationalStartDate:'2026-07-01',operationalEndDate:'2026-09-30'},
  {quarterCode:'2026Q4',sourceStartDate:'2026-09-23',sourceEndDate:'2027-01-03',sourceConfigured:true,operationalStartDate:'2026-10-01',operationalEndDate:'2026-12-31'},
  {quarterCode:'2027Q1',sourceStartDate:'2027-01-01',sourceEndDate:'2027-03-31',sourceConfigured:true,operationalStartDate:'2027-01-01',operationalEndDate:'2027-03-31'},
];
const periods=configuredVendorQuarters(overrides);
validateVendorSourceConfiguration(periods);
validateOperationalQuarterConfiguration(periods);
const q4=periods.find((item)=>item.code==='2026Q4');
const q1=periods.find((item)=>item.code==='2027Q1');
assert.equal(q4?.sourceStartDate,'2026-09-23');
assert.equal(q4?.sourceEndDate,'2027-01-03');
assert.equal(q4?.startDate,'2026-10-01');
assert.equal(q4?.endDate,'2026-12-31');
assert.equal(q1?.sourceStartDate,'2027-01-01');
assert.equal(q1?.startDate,'2027-01-01');
assert.equal(vendorQuarterForDate('2026-12-31',overrides)?.code,'2026Q4');
assert.equal(vendorQuarterForDate('2027-01-01',overrides)?.code,'2027Q1');
assert.equal(vendorQuarterContext(new Date('2026-12-31T18:00:00Z'),null,overrides).currentQuarter?.code,'2026Q4');
assert.equal(vendorQuarterContext(new Date('2027-01-01T18:00:00Z'),null,overrides).currentQuarter?.code,'2027Q1');
console.log('Quarter Runtime V31.14: OK');
console.log('- Vendors Q4 23/09→03/01 puede traslaparse con Q1: OK');
console.log('- Q4 operativo permanece 01/10→31/12: OK');
console.log('- Q1 operativo inicia 01/01 y KPIs cambian en esa frontera: OK');
