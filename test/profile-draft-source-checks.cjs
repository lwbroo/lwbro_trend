/* Synthetic controller regression without browser/XPC permissions.
 * Executes real Engine/Store/i18n and the app's settings/status source block.
 * Field shims do not validate native controls, layout, keyboard or announcements.
 * Optional argv[2]/argv[4] supply historical app.js/i18n.js; argv[3] selects a report.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(process.argv[2] || path.join(root, 'js/app.js'), 'utf8');
const i18nSource = fs.readFileSync(process.argv[4] || path.join(root, 'js/i18n.js'), 'utf8');
const checks = [];
const check = (name, ok, detail) => checks.push({name, ok: !!ok, detail});

function harness(profile) {
  const storage = new Map(), fields = new Map(), events = new Map();
  function field(id) {
    if (!fields.has(id)) fields.set(id, {
      value: id.startsWith('gender-') ? id.slice(7) : '', checked: false,
      hidden: false, dataset: {}, listeners: {}, textContent: '',
      classList: {contains: () => false},
      setAttribute(key, value) { this[key] = value; },
      addEventListener(type, handler) { this.listeners[type] = handler; },
      reset() {
        for (const id of ['#p-name', '#p-date', '#p-time']) field(id).value = '';
        for (const gender of ['男', '女']) field('gender-' + gender).checked = false;
      }
    });
    return fields.get(id);
  }
  function query(selector) {
    if (selector === 'input[name="p-gender"]:checked') {
      return ['男', '女'].map(g => field('gender-' + g)).find(f => f.checked);
    }
    const gender = selector.match(/input\[name="p-gender"\]\[value="(.*?)"\]/);
    return field(gender ? 'gender-' + gender[1] : selector);
  }
  const context = {
    console, Map, WeakMap, Date, JSON, Error, Intl, NodeFilter: {SHOW_TEXT: 4},
    CustomEvent: class { constructor(type) { this.type = type; } },
    localStorage: {
      getItem: key => storage.get(key) || null,
      setItem(key, value) {
        if (context.failStorage === key) {
          const error = new Error('Synthetic quota'); error.name = 'QuotaExceededError'; throw error;
        }
        storage.set(key, String(value));
      },
      removeItem: key => storage.delete(key)
    },
    document: {
      body: {querySelectorAll: () => []}, documentElement: {}, querySelector: query,
      createTreeWalker: () => ({nextNode: () => null}),
      addEventListener: (type, handler) => events.set(type, handler),
      dispatchEvent: event => events.get(event.type)?.(event)
    },
    navigator: {language: 'en-US'}, setTimeout: () => {}, confirm: () => false,
    $: query, exportJSONFile: () => {}, renderSyncUI: () => {}, renderProfileChip: () => {},
    renderTrends: () => {}, Sync: {schedulePush: () => {}}, checkinDrafts: new Map(), analyzer: null,
    ZWBZ_NATIVE_OFFLINE: true
  };
  context.window = context; context.self = context;
  vm.createContext(context);
  for (const filename of ['vendor/lunar.js', 'vendor/iztro.min.js', 'js/engine.js', 'js/store.js', 'js/i18n.js']) {
    vm.runInContext(filename === 'js/i18n.js' ? i18nSource : fs.readFileSync(path.join(root, filename), 'utf8'), context, {filename});
  }
  const status = source.slice(source.indexOf('  function setStatus('), source.indexOf('  function todayStr('));
  const settings = source.slice(source.indexOf('  /* ================= 設定 ================= */'),
                               source.indexOf('  /* ================= 啟動 ================= */'));
  const draftDeclaration = source.match(/let profileFormDirty\s*=\s*false;/)?.[0] || '';
  context.switchTab = name => { if (name === 'settings') context.renderSettings(); };
  vm.runInContext(draftDeclaration + status + settings, context, {filename: 'actual app.js settings/status block'});
  const run = script => vm.runInContext(script, context, {timeout: 3000});
  if (profile) run('Store.saveProfile(' + JSON.stringify(profile) + ')');
  context.renderSettings();
  return {
    context, field, storage, run,
    input(id, value) { field(id).value = value; field('#profile-form').listeners.input?.({target: field(id)}); },
    change() { field('#profile-form').listeners.change?.({}); },
    submit() { field('#profile-form').listeners.submit({preventDefault() {}}); },
    back() { context.renderSettings(); },
    language(value) { context.ZWBZI18n.setLanguage(value); },
    clear(confirmed) { context.confirm = () => confirmed; field('#btn-clear-all').listeners.click(); },
    status() { return field('#profile-status'); }
  };
}

const saved = {name: 'Saved synthetic', birthDate: '2000-01-02', birthTime: '12:00', gender: '女'};
const h = harness(saved);
h.run("Store.upsertRecord({date:'2026-10-09',mood:4,energy:3,tags:['筆記'],note:'Saved synthetic note'})");
const originalProfile = h.storage.get('zwbz.profile'), originalRecords = h.storage.get('zwbz.records');
h.input('#p-name', 'Draft 名稱'); h.input('#p-date', '2001-02-03');
h.language('zh-Hant'); h.language('en');
check('actual language events retain exact unsaved profile fields and stored data',
      h.field('#p-name').value === 'Draft 名稱' && h.field('#p-date').value === '2001-02-03' &&
      h.storage.get('zwbz.profile') === originalProfile && h.storage.get('zwbz.records') === originalRecords);
h.back();
check('Settings return retains saved-profile edits instead of overwriting them',
      h.field('#p-name').value === 'Draft 名稱' && h.field('#p-date').value === '2001-02-03');
check('birth draft status describes session-only explicit saving in both languages',
      h.status().dataset.state === 'neutral' && h.status().role === 'status' &&
      h.context.ZWBZI18n.t(h.status().textContent).includes('kept for this session only'));

for (const [label, id, value] of [
  ['missing date', '#p-date', ''], ['invalid year', '#p-date', '0099-01-02'],
  ['non-leap date', '#p-date', '2001-02-29'], ['invalid time', '#p-time', '24:00']
]) {
  h.input('#p-date', '2001-02-03'); h.input('#p-time', '12:00'); h.input(id, value); h.submit();
  check(label + ' is rejected without changing saved profile or records',
        h.status().dataset.state === 'error' && h.status().role === 'alert' &&
        h.storage.get('zwbz.profile') === originalProfile && h.storage.get('zwbz.records') === originalRecords,
        {message: h.context.ZWBZI18n.t(h.status().textContent)});
}
h.input('#p-date', '2001-02-03'); h.input('#p-time', '12:00');
h.field('gender-女').checked = false; h.change(); h.submit();
check('missing gender is rejected without storing partial birth details',
      h.status().dataset.state === 'error' && h.storage.get('zwbz.profile') === originalProfile);
h.field('gender-女').checked = true; h.change();
h.context.failStorage = 'zwbz.profile'; h.submit(); h.context.failStorage = null; h.back();
check('failed save retains exact edits for a later retry and explains recovery',
      h.field('#p-name').value === 'Draft 名稱' && h.field('#p-date').value === '2001-02-03' &&
      h.storage.get('zwbz.profile') === originalProfile && h.context.ZWBZI18n.t(h.status().textContent).includes('try again'));
h.language('zh-Hant'); h.language('en'); h.clear(false); h.back();
check('language changes and cancelled clear preserve failed-save edits and committed records',
      h.field('#p-name').value === 'Draft 名稱' && h.field('#p-date').value === '2001-02-03' &&
      h.storage.get('zwbz.records') === originalRecords);
h.submit(); h.back();
check('explicit retry saves exact profile once and leaves the journal unchanged',
      h.storage.get('zwbz.profile') === JSON.stringify({...saved, name: 'Draft 名稱', birthDate: '2001-02-03'}) &&
      h.storage.get('zwbz.records') === originalRecords && h.status().dataset.state === 'success');
h.input('#p-name', 'Discard after clear'); h.clear(true); h.back();
check('confirmed clear discards stored data and pending profile edits',
      !h.storage.get('zwbz.profile') && !h.storage.get('zwbz.records') &&
      h.field('#p-name').value === '' && h.field('#p-date').value === '' && h.field('#p-time').value === '' &&
      h.status().textContent === '' && h.status().dataset.state === 'neutral');

const fresh = harness(null);
fresh.input('#p-name', 'First unsaved'); fresh.input('#p-date', '2000-02-29');
fresh.language('zh-Hant'); fresh.back(); fresh.language('en');
check('first incomplete profile survives navigation and language without autosaving',
      fresh.field('#p-name').value === 'First unsaved' && fresh.field('#p-date').value === '2000-02-29' &&
      !fresh.storage.get('zwbz.profile'));
fresh.submit();
check('first incomplete profile submission creates no partial saved profile',
      fresh.status().dataset.state === 'error' && !fresh.storage.get('zwbz.profile'));
const imported = harness(null);
imported.run('Store.importJSON(' + JSON.stringify(JSON.stringify({app: 'ziwei-bazi-trend', version: 1, profile: saved, records: []})) + ')');
imported.back();
check('untouched Settings still adopts a profile imported after first launch',
      imported.field('#p-name').value === saved.name && imported.field('#p-date').value === saved.birthDate);
const result = {
  scope: 'Actual controller/Engine/Store/i18n source with field shims; not browser/native validation or layout',
  syntheticOnly: true, nativeUIUsed: false,
  appSourceSHA256: crypto.createHash('sha256').update(source).digest('hex'),
  i18nSourceSHA256: crypto.createHash('sha256').update(i18nSource).digest('hex'),
  passed: checks.filter(c => c.ok).length, checks
};
fs.writeFileSync(process.argv[3] || path.join(root, 'build/profile-draft-source-checks.json'), JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
process.exitCode = checks.every(c => c.ok) ? 0 : 1;
