import assert from 'node:assert/strict';
import { vendorQuarterContext, BBVA_VENDOR_QUARTERS } from '../dist/lib/bbvaVendorCalendar.js';

assert.deepEqual(BBVA_VENDOR_QUARTERS.map(({ code, startDate, endDate }) => ({ code, startDate, endDate })), [
  { code: '2026Q1', startDate: '2025-12-29', endDate: '2026-03-29' },
  { code: '2026Q2', startDate: '2026-03-30', endDate: '2026-06-28' },
  { code: '2026Q3', startDate: '2026-06-29', endDate: '2026-09-27' },
  { code: '2026Q4', startDate: '2026-09-28', endDate: '2026-12-27' },
]);
const eve = vendorQuarterContext(new Date('2026-09-27T12:00:00Z'));
assert.equal(eve.currentQuarter?.code, '2026Q3');
assert.equal(eve.targetQuarter?.code, '2026Q4');
assert.equal(eve.daysToTargetStart, 1);
const q4 = vendorQuarterContext(new Date('2026-09-28T12:00:00Z'));
assert.equal(q4.currentQuarter?.code, '2026Q4');
assert.equal(q4.targetQuarter?.code, '2026Q4');
assert.equal(q4.daysToTargetStart, 0);
console.log('Calendario Vendors/Q V17: OK');
