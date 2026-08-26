/*
 * AI 個人化功能用的極簡 Cloudflare Worker（跟 oauth-relay 同一種做法）。
 * 前端只送「已經算好的」當日八字／紫微流運資料（無姓名、無完整生日），
 * 這裡呼叫 Claude 生成白話內容再回傳。不落地、不記錄任何請求內容；
 * ANTHROPIC_API_KEY 只存在 Worker 環境變數。
 *
 * 路徑：
 *   POST /reading  今日運勢一次性解讀
 *   POST /chat     跟 AI 問答（多輪對話）
 */
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

  const summary = buildSummary(payload);
  if (!summary) return json({ error: 'missing data' }, 400, cors);

  const data = await callClaude(env, READING_SYSTEM_PROMPT, [{ role: 'user', content: summary }], 400);
  if (data.error) return json({ error: data.error }, data.status, cors);
  return json({ reading: data.text }, 200, cors);
}

async function handleChat(request, env, cors) {
  let payload;
  try { payload = await request.json(); } catch (e) { return json({ error: 'invalid json' }, 400, cors); }

  const history = Array.isArray(payload.history)
    ? payload.history
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
        .slice(-20)
        .map(m => ({ role: m.role, content: m.content }))
    : [];
  if (!history.length) return json({ error: 'missing history' }, 400, cors);

  const summary = buildSummary(payload.context || {});
  const system = CHAT_SYSTEM_PROMPT + (summary ? ('\n\n使用者的命盤與今日流運資料：\n' + summary) : '');

  const data = await callClaude(env, system, history, 400);
  if (data.error) return json({ error: data.error }, data.status, cors);
  return json({ reply: data.text }, 200, cors);
}

async function callClaude(env, system, messages, maxTokens) {
  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system,
      messages
    })
  });
  const data = await aiRes.json();
  if (!aiRes.ok) return { error: (data.error && data.error.message) || 'AI 服務錯誤', status: 502 };
  const text = (data.content && data.content[0] && data.content[0].text) || '';
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
