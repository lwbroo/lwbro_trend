/*
 * sync.js — 雲端同步（GitHub Gist）
 * 資料存在使用者自己 GitHub 帳號的「私密 Gist」，App 透過 GitHub API 讀寫。
 * 各裝置只需輸入一次 Personal Access Token（僅需 Gist 權限），
 * App 會自動找到（或建立）同步用的 Gist，之後每次開啟自動拉取合併、每次記錄自動上傳。
 */
const Sync = (() => {
  'use strict';

  const API = 'https://api.github.com';
  const FILE_NAME = 'ziwei-bazi-trend.json';
  const GIST_DESC = '紫微八字個人趨勢資料庫（App 自動同步，請勿手動編輯）';

  let pushTimer = null;
  const listeners = [];

  function onStatus(fn) { listeners.push(fn); }
  function emit(state, message) { listeners.forEach(fn => fn(state, message)); }

  function config() { return Store.getSyncConfig(); }
  function isConnected() { const c = config(); return !!(c && c.token && c.gistId); }

  async function request(path, options) {
    const c = config();
    const res = await fetch(API + path, Object.assign({}, options, {
      headers: Object.assign({
        'Authorization': 'Bearer ' + c.token,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }, (options && options.headers) || {})
    }));
    if (res.status === 401) throw new Error('Token 無效或已過期，請重新產生並連線');
    if (res.status === 404) throw new Error('找不到資料 Gist（可能已被刪除），請中斷連線後重新連線');
    if (!res.ok) throw new Error('GitHub API 錯誤：HTTP ' + res.status);
    return res;
  }

  function payload() {
    return JSON.stringify({
      app: 'ziwei-bazi-trend',
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: Store.getProfile(),
      records: Store.getRecords()
    }, null, 1);
  }

  /**
   * 連線：以 token 尋找既有的同步 Gist（依檔名比對），找不到就建立新的私密 Gist。
   * 回傳 { created:boolean, gistId }
   */
  async function connect(token) {
    Store.saveSyncConfig({ token, gistId: null, lastSyncAt: null });
    emit('busy', '正在尋找既有的雲端資料…');
    const res = await request('/gists?per_page=100');
    const gists = await res.json();
    const found = gists.find(g => g.files && g.files[FILE_NAME]);
    if (found) {
      Store.saveSyncConfig({ token, gistId: found.id, lastSyncAt: null });
      const stats = await syncNow();
      return { created: false, gistId: found.id, stats };
    }
    emit('busy', '未找到既有資料，正在建立新的私密 Gist…');
    const createRes = await request('/gists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: GIST_DESC,
        public: false,
        files: { [FILE_NAME]: { content: payload() } }
      })
    });
    const gist = await createRes.json();
    Store.saveSyncConfig({ token, gistId: gist.id, lastSyncAt: new Date().toISOString() });
    emit('ok', '已建立雲端資料庫並完成首次上傳');
    return { created: true, gistId: gist.id };
  }

  /** 下載雲端資料並合併進本地（記錄依日期合併、較新者優先；本地無出生資料時採用雲端的） */
  async function pull() {
    const c = config();
    const res = await request('/gists/' + c.gistId);
    const gist = await res.json();
    const file = gist.files && gist.files[FILE_NAME];
    if (!file) throw new Error('Gist 內找不到資料檔，請中斷連線後重新連線');
    let text = file.content;
    if (file.truncated) {
      const rawRes = await fetch(file.raw_url);
      if (!rawRes.ok) throw new Error('下載雲端資料失敗：HTTP ' + rawRes.status);
      text = await rawRes.text();
    }
    return Store.importJSON(text);
  }

  /** 上傳目前本地資料到雲端 */
  async function push() {
    const c = config();
    await request('/gists/' + c.gistId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: { [FILE_NAME]: { content: payload() } } })
    });
  }

  /** 完整同步：先拉取合併，再把合併結果上傳 */
  async function syncNow() {
    if (!isConnected()) throw new Error('尚未連線雲端');
    emit('busy', '同步中…');
    const stats = await pull();
    await push();
    const c = config();
    Store.saveSyncConfig(Object.assign({}, c, { lastSyncAt: new Date().toISOString() }));
    emit('ok', `已同步（雲端合併進本地：新增 ${stats.added}、更新 ${stats.updated}）`);
    return stats;
  }

  /** 記錄變更後呼叫：延遲 2 秒自動上傳（多次變更合併為一次） */
  function schedulePush() {
    if (!isConnected()) return;
    clearTimeout(pushTimer);
    emit('busy', '雲端同步中…');
    pushTimer = setTimeout(async () => {
      try {
        await push();
        const c = config();
        Store.saveSyncConfig(Object.assign({}, c, { lastSyncAt: new Date().toISOString() }));
        emit('ok', '已同步至雲端 ☁');
      } catch (e) {
        emit('error', '雲端同步失敗：' + e.message + '（資料仍在本地，可稍後手動同步）');
      }
    }, 2000);
  }

  function disconnect() {
    clearTimeout(pushTimer);
    Store.clearSyncConfig();
    emit('off', '已中斷雲端連線（本地資料保留）');
  }

  return { connect, pull, push, syncNow, schedulePush, disconnect, isConnected, onStatus, config };
})();
