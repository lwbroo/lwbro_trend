/*
 * GitHub OAuth token 交換用的極簡 Cloudflare Worker。
 * 只做一件事：收到前端傳來的 authorization code，用 client secret 向 GitHub 換成 access token 再回傳。
 * 不儲存任何資料；client secret 只存在 Worker 的環境變數（wrangler secret），不會出現在前端程式碼裡。
 */
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || 'https://lwbroo.github.io',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(request.url);
    if (url.pathname !== '/token' || request.method !== 'POST') {
      return json({ error: 'not found' }, 404, cors);
    }

    let code = '';
    try {
      ({ code } = await request.json());
    } catch (e) { /* body 不是合法 JSON，code 保持空字串 */ }
    if (!code) return json({ error: 'missing code' }, 400, cors);

    const ghRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code
      })
    });
    const data = await ghRes.json();
    if (data.error) return json({ error: data.error_description || data.error }, 400, cors);
    return json({ access_token: data.access_token }, 200, cors);
  }
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, cors)
  });
}
