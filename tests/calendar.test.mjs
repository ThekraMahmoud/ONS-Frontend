import test from 'node:test';
import assert from 'node:assert/strict';
import { dateParts, firstWeekday, formatGregorian, isoDate, monthDays } from '../src/utils/gregorianCalendar.js';
test('Gregorian date labels always show the Gregorian year regardless of locale calendar',()=>{
 assert.match(formatGregorian('2026-10-27'),/2026/);assert.match(formatGregorian('2026-10-27'),/أكتوبر/);assert.doesNotMatch(formatGregorian('2026-10-27'),/1448/);
});
test('Gregorian leap days and month bounds are validated without rollover',()=>{
 assert.deepEqual(dateParts('2024-02-29'),{year:2024,month:2,day:29});assert.equal(dateParts('2026-02-29'),null);assert.equal(dateParts('2026-13-01'),null);assert.equal(dateParts('2026-04-31'),null);assert.equal(dateParts(''),null);assert.equal(monthDays(2024,2),29);assert.equal(monthDays(2026,2),28);
});
test('calendar layout uses actual Gregorian weekdays and API ISO format',()=>{
 assert.equal(firstWeekday(2026,10),4);assert.equal(isoDate(2026,1,9),'2026-01-09');assert.equal(formatGregorian('bad'),'');
});
