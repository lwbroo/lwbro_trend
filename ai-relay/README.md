# 今日運勢 AI 解讀 Relay

跟 `oauth-relay/` 同一個道理：前端是純靜態頁，API Key 不能放進前端
程式碼，所以獨立一個只做一件事的 Cloudflare Worker：收當日已經算好的八字／
紫微流運資料，丟給 Grok（xAI）生成白話的今日運勢段落，回傳。不落地、不記錄任何
請求內容，也不會收到姓名或完整生日（只有已經算好的干支／十神／四化等衍生
資料）。

## 設定步驟

1. **取得 xAI (Grok) API Key**
   到 https://console.x.ai/ 建立一個新的 API Key，並確認帳號已設定好付款方式
   （沒有額度的話呼叫會失敗）。

2. **部署 Worker**
   ```bash
   cd ai-relay
   npx wrangler deploy
   npx wrangler secret put GROK_API_KEY   # 貼上步驟 1 的 key
   ```
   部署完成後會印出一個網址，例如：
   `https://ziwei-bazi-ai-relay.<你的帳號>.workers.dev`

   如果之前設定過 `ANTHROPIC_API_KEY`，可以順便清掉（非必要，留著也不影響，
   worker.js 已經不會再讀取它）：
   ```bash
   npx wrangler secret delete ANTHROPIC_API_KEY
   ```

3. **回填前端設定**
   打開 `../js/ai.js`，把檔案開頭這個常數填上（記得加 `/reading`）：
   ```js
   const RELAY_URL = 'https://ziwei-bazi-ai-relay.xxx.workers.dev/reading';
   ```
   存檔、`git push` 即可。設定完成前，「今日流運」頁不會顯示 AI 解讀卡片，
   其餘功能完全不受影響。

## 費用與濫用風險（重要）

現在用的是 `grok-4-fast`（模型名稱寫在 `worker.js` 開頭的 `GROK_MODEL` 常數，
如果 xAI 那邊改了型號名稱，改這裡就好），一次解讀在 400 tokens 以內，成本
很低，但這個
Worker **目前沒有使用量上限或身分驗證** —— 適合先給少數朋友 trial（用你自己
的 API key），但正式公開給不特定人使用之前，一定要先加上其中一種限制，
否則有被寫程式打爆帳單的風險：

- 訂閱／付費閘門（呼應 CLAUDE.md 的商業化規劃）
- 或至少加上簡單的每日呼叫次數上限（例如用 Cloudflare KV 記每個來源 IP／
  使用者的當日呼叫次數）
