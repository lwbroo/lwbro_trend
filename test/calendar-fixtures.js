/* Deterministic internal-consistency checks using fictitious birth details only. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');
global.self = global; // iztro's browser bundle expects a global self.
const { Solar } = require(path.join(root, 'vendor/lunar.js'));
const iztro = require(path.join(root, 'vendor/iztro.min.js'));
const Engine = vm.runInNewContext(fs.readFileSync(path.join(root, 'js/engine.js'), 'utf8') + '; Engine', { Solar, iztro, Date });
const profile = { name: '虛構人物', birthDate: '2000-02-29', birthTime: '12:00', gender: '女' };

function day(ymd, hour = 12) {
  const { y, m, d } = Engine.parseCivilDate(ymd);
  return new Date(y, m - 1, d, hour);
}
function snapshot() {
  const analyzer = Engine.createAnalyzer(profile);
  return ['2024-02-03', '2024-02-04', '2024-02-05', '2023-03-21', '2023-03-22', '2023-04-19', '2023-04-20', '2024-03-10']
    .map(ds => {
      const value = Engine.daily(profile, day(ds));
      const key = analyzer(ds);
      return [ds, value.bazi.year.ganZhi, value.bazi.month.ganZhi, value.bazi.day.ganZhi,
        value.ziwei.daily.palaceName, key.monthGanZhi, key.dayGanZhi, key.ziweiPalace];
    });
}

if (process.argv.includes('--snapshot')) {
  process.stdout.write(JSON.stringify(snapshot()));
  process.exit(0);
}

let checks = 0;
function check(name, fn) { fn(); checks++; }
check('real leap day accepted', () => assert.equal(Engine.parseCivilDate('2000-02-29').d, 29));
for (const bad of ['2023-02-29', '2000-02-30', '2024-13-01', '0099-01-01', '2024-1-01', '2024-01-00']) {
  check('invalid date rejected ' + bad, () => assert.throws(() => Engine.parseCivilDate(bad)));
}
check('profile time validated', () => assert.throws(() => Engine.validateProfile({ ...profile, birthTime: '24:01' })));
check('profile gender validated', () => assert.throws(() => Engine.validateProfile({ ...profile, gender: 'x' })));

const output = snapshot();
check('before LiChun uses prior year and month', () => assert.deepEqual(output[0].slice(1, 3), ['癸卯', '乙丑']));
check('LiChun day at local noon remains prior year and month', () => assert.deepEqual(output[1].slice(1, 3), ['癸卯', '乙丑']));
check('after LiChun uses next year and month', () => assert.deepEqual(output[2].slice(1, 3), ['甲辰', '丙寅']));
check('leap second month is recognized by bundled calendar', () => {
  const months = ['2023-03-21', '2023-03-22', '2023-04-19', '2023-04-20']
    .map(ds => { const { y, m, d } = Engine.parseCivilDate(ds); return Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar().getMonth(); });
  assert.deepEqual(months, [2, -2, -2, 3]);
});
check('trend keys agree with daily calculation', () => {
  for (const row of output) {
    assert.equal(row[2], row[5]);
    assert.equal(row[3], row[6]);
    assert.equal(row[4], row[7]);
  }
});
check('civil-day output does not vary by input hour', () => {
  for (const ds of ['2024-02-04', '2024-03-10', '2023-03-22']) {
    const a = Engine.daily(profile, day(ds, 0));
    const b = Engine.daily(profile, day(ds, 23));
    assert.equal(a.bazi.year.ganZhi + a.bazi.month.ganZhi + a.ziwei.daily.palaceName,
      b.bazi.year.ganZhi + b.bazi.month.ganZhi + b.ziwei.daily.palaceName);
  }
});
check('same civil dates across host timezones', () => {
  const runtimes = ['UTC', 'Asia/Taipei', 'America/Los_Angeles', 'Pacific/Auckland']
    .map(TZ => JSON.parse(execFileSync(process.execPath, [__filename, '--snapshot'], { env: { ...process.env, TZ }, encoding: 'utf8' })));
  for (const rows of runtimes.slice(1)) assert.deepEqual(rows, runtimes[0]);
});

class MemoryStorage {
  constructor() { this.data = new Map(); }
  getItem(k) { return this.data.has(k) ? this.data.get(k) : null; }
  setItem(k, v) { this.data.set(k, String(v)); }
  removeItem(k) { this.data.delete(k); }
}
const localStorage = new MemoryStorage();
const Store = vm.runInNewContext(fs.readFileSync(path.join(root, 'js/store.js'), 'utf8') + '; Store', { Engine, localStorage, Date });
const base = { date: '2024-02-04', mood: 3, energy: 4, tags: ['試用'], note: 'synthetic' };
Store.saveProfile(profile);
Store.upsertRecord(base);
const before = Store.exportJSON();
check('invalid imported profile leaves all data untouched', () => {
  assert.throws(() => Store.importJSON(JSON.stringify({ profile: { ...profile, birthDate: '2023-02-29' }, records: [] })));
  assert.equal(Store.exportJSON().replace(/"exportedAt": ".*?"/, ''), before.replace(/"exportedAt": ".*?"/, ''));
});
check('invalid imported record leaves all data untouched', () => {
  assert.throws(() => Store.importJSON(JSON.stringify({ records: [base, { ...base, date: '2024-02-30' }] })));
  assert.equal(Store.getRecords().length, 1);
});
check('invalid rating rejected on local save', () => assert.throws(() => Store.upsertRecord({ ...base, mood: 7 })));
check('offset timestamps compare by instant when merging', () => {
  const previous = Store.getRecord(base.date);
  Store.importJSON(JSON.stringify({ records: [{ ...base, mood: 5, updatedAt: '2099-01-01T01:00:00+08:00' }] }));
  assert.equal(Store.getRecord(base.date).mood, 5);
  assert.notEqual(previous.mood, 5);
});

console.log(`Calendar and input fixtures: ${checks} checks passed`);
