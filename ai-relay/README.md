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

## 每日用量上限（USAGE_KV）

`worker.js` 已經內建每日用量上限的邏輯（每個裝置、加上每個網路來源兩層），
但需要額外建立一個 Cloudflare KV namespace 才會真的生效——**沒設定這一步之前
不會出錯，只是用量限制形同虛設**，跟之前一樣可以隨時晚點再補：

1. **建立 KV namespace**（一次性）
   ```bash
   cd ai-relay
   npx wrangler kv namespace create USAGE_KV
   ```
   指令執行完會印出類似這樣的內容：
   ```
   [[kv_namespaces]]
   binding = "USAGE_KV"
   id = "abcd1234..."
   ```

2. **貼進 `wrangler.toml`**——把上面印出的那三行整段貼到 `wrangler.toml`
   檔案最後面（取代裡面提醒你還沒設定的那段註解）。

3. **重新部署**
   ```bash
   npx wrangler deploy
   ```

現在的上限是：`/reading` 每人每天 5 次、`/chat` 每人每天 30 次、
同一個網路來源（不分哪個裝置）兩個功能加總每天 100 次——都寫死在
`worker.js` 開頭的常數，覺得太鬆或太緊都可以直接改數字重新 deploy 就好。

「每人」是用前端隨機產生、存在瀏覽器 localStorage 的一組 ID 辨識，不是
真的帳號系統——擋得住正常使用情境下的失控用量，但擋不住刻意繞過的人
（例如手動清瀏覽器資料換新 ID）。之後真的要開放給不特定的一般大眾，
還是需要接上真正的帳號系統或訂閱／付費閘門（呼應 CLAUDE.md 的商業化規劃）。

## 費用

現在用的是 `grok-4-fast`（模型名稱寫在 `worker.js` 開頭的 `GROK_MODEL` 常數，
如果 xAI 那邊改了型號名稱，改這裡就好），一次解讀在 400 tokens 以內，
成本很低，加上上面的用量上限後，帳單風險已經有基本的防護。

## 看前端錯誤回報（/log）

不用額外設定，`wrangler deploy` 之後就會生效。要看目前有沒有人的畫面壞掉：

```bash
cd ai-relay
npx wrangler tail
```

保持這個指令開著，App 那邊一有錯誤發生就會即時印出 `[client-error]` 開頭的
一行 JSON（哪個入口頁、錯誤訊息、檔名行數、瀏覽器版本）。不想一直開著終端機
盯著看的話，也可以到 Cloudflare dashboard → Workers → `ziwei-bazi-ai-relay`
→ Logs 分頁查歷史紀錄。
