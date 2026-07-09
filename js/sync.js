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

  /* GitHub OAuth 一鍵登入設定：部署步驟見 oauth-relay/README.md，設定前這兩個留空即可，
     UI 會自動隱藏「使用 GitHub 登入」按鈕、改用下面既有的手動貼 Token 方式。 */
  const OAUTH_CLIENT_ID = 'Ov23liAxeW22ndK8q7iA';
  const OAUTH_RELAY_URL = 'https://ziwei-bazi-oauth-relay.kurtchiang.workers.dev/token';
  const OAUTH_STATE_KEY = 'zwbz.oauth.state';

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

  /* ---------- GitHub 一鍵登入（OAuth，免手動貼 Token） ---------- */

  function oauthConfigured() { return !!(OAUTH_CLIENT_ID && OAUTH_RELAY_URL); }

  /** 導向 GitHub 授權頁；使用者同意後，GitHub 會帶著 code 導回本頁 */
  function loginWithGitHub() {
    const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(OAUTH_STATE_KEY, state);
    const redirectUri = location.origin + location.pathname;
    const authUrl = 'https://github.com/login/oauth/authorize?' + new URLSearchParams({
      client_id: OAUTH_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: 'gist',
      state
    });
    location.href = authUrl;
  }

  /** 啟動時呼叫：若網址帶有 GitHub 導回的 ?code=&state=，用 relay 換成 token 並自動連線 */
  async function handleOAuthCallback() {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const returnedState = params.get('state');
    if (!code) return false;
    history.replaceState(null, '', location.pathname + location.hash);
    const savedState = sessionStorage.getItem(OAUTH_STATE_KEY);
    sessionStorage.removeItem(OAUTH_STATE_KEY);
    if (!returnedState || returnedState !== savedState) {
      emit('error', 'GitHub 登入驗證失敗，請重新點擊登入');
      return false;
    }
    emit('busy', '登入中…');
    try {
      const res = await fetch(OAUTH_RELAY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (!res.ok || !data.access_token) throw new Error(data.error || ('HTTP ' + res.status));
      await connect(data.access_token);
      return true;
    } catch (e) {
      emit('error', 'GitHub 登入失敗：' + e.message);
      return false;
    }
  }

  /* ---------- 同步連結：把連線資訊放在網址 # 之後（fragment 不會送出到伺服器） ---------- */

  /** 產生一鍵連線網址：任何裝置開啟即自動連上同一份雲端資料 */
  function makeLink() {
    const c = config();
    if (!c || !c.token || !c.gistId) return null;
    const packed = btoa(c.token + '|' + c.gistId).replace(/=+$/, '');
    return location.origin + location.pathname + '#sync=' + packed;
  }

  /** 啟動時呼叫：若網址帶有 #sync=…，採用其連線設定並清除網址（避免留在瀏覽紀錄畫面上） */
  function adoptFromUrl() {
    const m = location.hash.match(/[#&]sync=([A-Za-z0-9+/]+)/);
    if (!m) return false;
    try {
      const [token, gistId] = atob(m[1]).split('|');
      if (!token || !gistId) return false;
      Store.saveSyncConfig({ token, gistId, lastSyncAt: null });
      history.replaceState(null, '', location.pathname + location.search);
      return true;
    } catch (e) { return false; }
  }

  return {
    connect, pull, push, syncNow, schedulePush, disconnect, isConnected, onStatus, config, makeLink, adoptFromUrl,
    oauthConfigured, loginWithGitHub, handleOAuthCallback
  };
})();
