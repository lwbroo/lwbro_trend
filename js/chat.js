/*
 * chat.js — 跟 AI 問答
 * 呼叫 ai-relay/ 的 /chat 路徑，帶上使用者的命盤與今日流運資料當背景，
 * 多輪對話。對話紀錄只存在記憶體（重新整理頁面就清空），不落地任何地方。
 */
const Chat = (() => {
  'use strict';

  /* 跟 js/ai.js 同一個 Worker，路徑是 /chat；部署步驟見 ai-relay/README.md。 */
  const RELAY_URL = 'https://ziwei-bazi-ai-relay.kurtchiang.workers.dev/chat';

  function configured() { return !!RELAY_URL; }

  async function send(history, context) {
    const res = await fetch(RELAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: AiReading.getClientId(), history, context })
    });
    const data = await res.json();
    if (!res.ok || !data.reply) throw new Error(data.error || ('HTTP ' + res.status));
    return data.reply;
  }

  return { configured, send };
})();
