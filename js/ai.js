/*
 * ai.js — 今日運勢 AI 個人化解讀
 * 呼叫 ai-relay/（Cloudflare Worker）把當日已算好的八字／紫微流運資料
 * 轉成白話今日運勢段落。同一人同一天只呼叫一次，結果快取在 localStorage。
 */
const AiReading = (() => {
  'use strict';

  /* 部署步驟見 ai-relay/README.md，設定前留空即可，UI 會自動不顯示 AI 解讀卡片。 */
  const RELAY_URL = 'https://ziwei-bazi-ai-relay.kurtchiang.workers.dev/reading';
  const NS = (typeof window !== 'undefined' && window.ZWBZ_NAMESPACE) ? '.' + window.ZWBZ_NAMESPACE : '';
  const CACHE_KEY = 'zwbz.ai-reading-cache' + NS;

  function configured() { return !!RELAY_URL; }

  function cacheKey(profile, dateStr) {
    return [profile.birthDate, profile.birthTime, profile.gender, dateStr].join('|');
  }

  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch (e) { return {}; }
  }
  function writeCache(all) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(all)); } catch (e) { /* 儲存空間不足時略過快取，不影響功能 */ }
  }

  /** 同步查快取；有結果就不用等網路，避免每次切分頁都重新請求。 */
  function peekCache(profile, dateStr) {
    return readCache()[cacheKey(profile, dateStr)] || null;
  }

  async function getReading(profile, dateStr, info, natal) {
    const key = cacheKey(profile, dateStr);
    const all = readCache();
    if (all[key]) return all[key];

    const res = await fetch(RELAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dayMaster: natal.dayMaster,
        shengXiao: natal.shengXiao,
        bazi: { year: info.bazi.year, month: info.bazi.month, day: info.bazi.day },
        ziwei: { decadal: info.ziwei.decadal, yearly: info.ziwei.yearly, monthly: info.ziwei.monthly, daily: info.ziwei.daily }
      })
    });
    const data = await res.json();
    if (!res.ok || !data.reading) throw new Error(data.error || ('HTTP ' + res.status));
    all[key] = data.reading;
    writeCache(all);
    return data.reading;
  }

  return { configured, peekCache, getReading };
})();
