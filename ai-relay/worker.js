/*
 * AI 個人化功能用的極簡 Cloudflare Worker（跟 oauth-relay 同一種做法）。
 * 前端只送「已經算好的」當日八字／紫微流運資料（無姓名、無完整生日），
 * 這裡呼叫 Grok（xAI，OpenAI 相容格式）生成白話內容再回傳。不落地、不記錄
 * 任何請求內容；GROK_API_KEY 只存在 Worker 環境變數。
 *
 * 路徑：
 *   POST /reading  今日運勢一次性解讀
 *   POST /chat     跟 AI 問答（多輪對話）
 */
const GROK_MODEL = 'grok-4-fast'; // 如果回傳「model not found」之類錯誤，去 console.x.ai 確認目前可用的模型名稱再換這裡

/* 用量上限（防止單一使用者或單一網路來源刷爆 API 額度）。
   身分用前端隨機產生、存在 localStorage 的 clientId 辨識，不是真的帳號系統，
   擋不住刻意繞過的人，但足夠擋住「不小心/正常使用」造成的失控用量。
   USAGE_KV 沒設定（還沒建立 KV namespace）時會自動略過限制，不影響既有功能。 */
const MAX_READING_PER_DAY_PER_CLIENT = 5;
const MAX_CHAT_PER_DAY_PER_CLIENT = 30;
const MAX_PER_DAY_PER_IP = 100; // 同一個網路來源（含所有 client）當日兩個功能加總上限
const READING_SYSTEM_PROMPT = `你是一位溫和務實的命理老師，根據使用者提供的八字與紫微斗數當日流運資料，
用白話寫一段今日運勢分析。規則：
- 150-220 字，寫成連貫段落，不要條列
- 涵蓋：今天整體基調、最相關的一兩個面向（工作／人際／財務／健康擇要）、一個具體可執行的小建議
- 語氣溫和務實，避免誇大、避免恐嚇性斷言（不要用「一定會」「大凶」之類的詞）
- 不要重複列出干支或術語原文，直接講白話意涵
- 不要開場白或結尾問候語，直接進入分析內容`;

const CHAT_SYSTEM_PROMPT = `你是一位溫和務實的命理助手，根據使用者的八字與紫微斗數資料，
回答使用者關於今天運勢、感情、事業、財運、健康等問題。規則：
- 回答簡潔，一般 2-4 句話，除非使用者明確要求詳細說明
- 語氣溫和務實，避免誇大、避免恐嚇性斷言（不要用「一定會」「大凶」之類的詞）
- 不確定或問題跟命盤資料無直接關聯時，誠實說明命理是輔助參考、不是絕對命定
- 用繁體中文回答，不需要每次都重複開場白或稱謂`;

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || 'https://lwbroo.github.io',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return json({ error: 'not found' }, 404, cors);

    const url = new URL(request.url);
    if (url.pathname === '/reading') return handleReading(request, env, cors);
    if (url.pathname === '/chat') return handleChat(request, env, cors);
    return json({ error: 'not found' }, 404, cors);
  }
};

async function handleReading(request, env, cors) {
  let payload;
  try { payload = await request.json(); } catch (e) { return json({ error: 'invalid json' }, 400, cors); }

  const limitError = await checkUsageLimit(request, env, 'reading', payload.clientId, MAX_READING_PER_DAY_PER_CLIENT,
    '今天的「今日運勢」使用次數已達上限，明天再試。');
  if (limitError) return json({ error: limitError }, 429, cors);

  const summary = buildSummary(payload);
  if (!summary) return json({ error: 'missing data' }, 400, cors);

  const data = await callGrok(env, READING_SYSTEM_PROMPT, [{ role: 'user', content: summary }], 400);
  if (data.error) return json({ error: data.error }, data.status, cors);
  return json({ reading: data.text }, 200, cors);
}

async function handleChat(request, env, cors) {
  let payload;
  try { payload = await request.json(); } catch (e) { return json({ error: 'invalid json' }, 400, cors); }

  const limitError = await checkUsageLimit(request, env, 'chat', payload.clientId, MAX_CHAT_PER_DAY_PER_CLIENT,
    '今天的「AI 問答」使用次數已達上限，明天再試。');
  if (limitError) return json({ error: limitError }, 429, cors);

  const history = Array.isArray(payload.history)
    ? payload.history
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
        .slice(-20)
        .map(m => ({ role: m.role, content: m.content }))
    : [];
  if (!history.length) return json({ error: 'missing history' }, 400, cors);

  const summary = buildSummary(payload.context || {});
  const system = CHAT_SYSTEM_PROMPT + (summary ? ('\n\n使用者的命盤與今日流運資料：\n' + summary) : '');

  const data = await callGrok(env, system, history, 400);
  if (data.error) return json({ error: data.error }, data.status, cors);
  return json({ reply: data.text }, 200, cors);
}

/** 回傳 null 代表放行；回傳字串代表被擋下、附上要顯示給使用者的訊息 */
async function checkUsageLimit(request, env, feature, clientId, maxPerClient, clientLimitMessage) {
  if (!env.USAGE_KV) return null; // KV 還沒設定時直接放行，不影響既有功能

  const day = new Date().toISOString().slice(0, 10);
  const id = (typeof clientId === 'string' && clientId) ? clientId.slice(0, 100) : 'anon';
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  const clientOk = await bumpCounter(env.USAGE_KV, `u:${feature}:${id}:${day}`, maxPerClient);
  if (!clientOk) return clientLimitMessage;

  const ipOk = await bumpCounter(env.USAGE_KV, `u:ip:${ip}:${day}`, MAX_PER_DAY_PER_IP);
  if (!ipOk) return '這個網路來源今天的使用量已達上限，請稍後再試。';

  return null;
}

async function bumpCounter(kv, key, max) {
  const raw = await kv.get(key);
  const count = raw ? parseInt(raw, 10) : 0;
  if (count >= max) return false;
  await kv.put(key, String(count + 1), { expirationTtl: 172800 }); // 48 小時，涵蓋時區誤差後自動清掉
  return true;
}

async function callGrok(env, system, messages, maxTokens) {
  const aiRes = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + env.GROK_API_KEY
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, ...messages]
    })
  });
  const data = await aiRes.json();
  if (!aiRes.ok) return { error: (data.error && (data.error.message || data.error)) || 'AI 服務錯誤', status: 502 };
  const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  if (!text) return { error: '未取得回應內容', status: 502 };
  return { text: text.trim() };
}

function mutagenText(mutagen) {
  const labels = ['祿', '權', '科', '忌'];
  return (mutagen || []).map((star, i) => star ? `${star}化${labels[i]}` : '').filter(Boolean).join('、') || '無';
}

function layerText(name, l) {
  if (!l) return '';
  const stars = (l.palaceStars || []).join('、') || '無主星';
  return `${name}：${l.ganZhi}，命宮落於${l.palaceName}宮（${stars}），四化：${mutagenText(l.mutagen)}`;
}

function buildSummary(p) {
  if (!p || !p.bazi || !p.ziwei) return '';
  const b = p.bazi, z = p.ziwei;
  return [
    `日主：${p.dayMaster}（生肖：${p.shengXiao || '未知'}）`,
    '',
    '【八字流運】',
    `流年：${b.year.gan}${b.year.zhi}，十神：${b.year.shiShen || '—'}`,
    `流月：${b.month.gan}${b.month.zhi}，十神：${b.month.shiShen || '—'}`,
    `流日：${b.day.gan}${b.day.zhi}，十神：${b.day.shiShen || '—'}`,
    '',
    '【紫微流運】',
    layerText('大限', z.decadal),
    layerText('流年', z.yearly),
    layerText('流月', z.monthly),
    layerText('流日', z.daily)
  ].filter(line => line !== '').join('\n');
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, cors)
  });
}
