/*
 * store.js — 個人趨勢資料庫（localStorage）
 * profile：出生資料；records：每日心情/狀態記錄（每日一筆，以日期為鍵）。
 * 支援 JSON 匯出/匯入（合併，較新者優先）與 CSV 匯出。
 */
const Store = (() => {
  'use strict';

  /* 客製化入口頁（如 shanshan/）在載入這個檔案前，會先設定 window.ZWBZ_NAMESPACE，
     讓資料存進不同的 localStorage 鍵，即使跟主站在同一個瀏覽器開也不會共用到彼此的
     出生資料/記錄/雲端連線設定（localStorage 是以 origin 為單位，不分路徑）。 */
  const NS = (typeof window !== 'undefined' && window.ZWBZ_NAMESPACE) ? '.' + window.ZWBZ_NAMESPACE : '';
  const PROFILE_KEY = 'zwbz.profile' + NS;
  const RECORDS_KEY = 'zwbz.records' + NS;
  const SYNC_KEY = 'zwbz.sync' + NS;

  /* ---------- profile ---------- */
  function getProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function saveProfile(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  /* ---------- records ---------- */
  function getRecords() {
    try {
      const raw = localStorage.getItem(RECORDS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }
  function saveRecords(records) {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  }

  /** 新增或更新某日記錄（每日一筆） */
  function upsertRecord(rec) {
    const records = getRecords();
    const now = new Date().toISOString();
    const idx = records.findIndex(r => r.date === rec.date);
    if (idx >= 0) {
      records[idx] = { ...records[idx], ...rec, updatedAt: now };
    } else {
      records.push({ ...rec, createdAt: now, updatedAt: now });
    }
    records.sort((a, b) => a.date.localeCompare(b.date));
    saveRecords(records);
    return records;
  }

  function getRecord(dateStr) {
    return getRecords().find(r => r.date === dateStr) || null;
  }

  function deleteRecord(dateStr) {
    const records = getRecords().filter(r => r.date !== dateStr);
    saveRecords(records);
    return records;
  }

  function clearAll() {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(RECORDS_KEY);
    localStorage.removeItem(SYNC_KEY);
  }

  /* ---------- 雲端同步設定 ---------- */
  function getSyncConfig() {
    try {
      const raw = localStorage.getItem(SYNC_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function saveSyncConfig(cfg) {
    localStorage.setItem(SYNC_KEY, JSON.stringify(cfg));
  }
  function clearSyncConfig() {
    localStorage.removeItem(SYNC_KEY);
  }

  /* ---------- 匯出 / 匯入 ---------- */
  function exportJSON() {
    return JSON.stringify({
      app: 'ziwei-bazi-trend',
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: getProfile(),
      records: getRecords()
    }, null, 2);
  }

  /** 匯入 JSON：profile 若本地不存在則採用；records 依日期合併，updatedAt 較新者優先 */
  function importJSON(text) {
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.records)) {
      throw new Error('格式不符：找不到 records 陣列');
    }
    if (data.profile && !getProfile()) saveProfile(data.profile);
    const local = getRecords();
    const byDate = new Map(local.map(r => [r.date, r]));
    let added = 0, updated = 0;
    for (const rec of data.records) {
      if (!rec || !rec.date) continue;
      const cur = byDate.get(rec.date);
      if (!cur) { byDate.set(rec.date, rec); added++; }
      else if ((rec.updatedAt || '') > (cur.updatedAt || '')) { byDate.set(rec.date, rec); updated++; }
    }
    const merged = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
    saveRecords(merged);
    return { added, updated, total: merged.length };
  }

  function exportCSV(rows, header) {
    const esc = v => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return [header, ...rows].map(r => r.map(esc).join(',')).join('\n');
  }

  return {
    getProfile, saveProfile,
    getRecords, getRecord, upsertRecord, deleteRecord,
    clearAll, exportJSON, importJSON, exportCSV,
    getSyncConfig, saveSyncConfig, clearSyncConfig
  };
})();
