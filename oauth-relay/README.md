# GitHub 登入用的 OAuth Relay

`index.html` 是純靜態頁面，GitHub OAuth 換 token 這一步需要 client secret，
不能放進前端程式碼，所以獨立出這個只做一件事的 Cloudflare Worker：收 `code`、
用 secret 向 GitHub 換 `access_token`、回傳給前端。不儲存任何資料。

## 設定步驟

1. **建立 GitHub OAuth App**
   GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
   - Homepage URL：`https://lwbroo.github.io/lwbro_trend/`
   - Authorization callback URL：`https://lwbroo.github.io/lwbro_trend/`
   建立後記下 **Client ID**，並產生一個 **Client Secret**。

2. **部署 Worker**（需要 Cloudflare 帳號，免費額度即可）
   ```bash
   cd oauth-relay
   npx wrangler login
   npx wrangler deploy
   npx wrangler secret put GITHUB_CLIENT_ID     # 貼上步驟 1 的 Client ID
   npx wrangler secret put GITHUB_CLIENT_SECRET # 貼上步驟 1 的 Client Secret
   ```
   部署完成後會得到一個網址，例如：
   `https://ziwei-bazi-oauth-relay.<你的帳號>.workers.dev`

3. **回填前端設定**
   打開 `../js/sync.js`，把檔案開頭這兩個常數填上：
   ```js
   const OAUTH_CLIENT_ID = '步驟1的 Client ID';
   const OAUTH_RELAY_URL = '步驟2得到的網址/token'; // 例如 https://ziwei-bazi-oauth-relay.xxx.workers.dev/token
   ```
   存檔、`git push` 到 GitHub Pages 部署的分支即可。

設定完成前，「設定」頁的「使用 GitHub 登入」按鈕會自動隱藏，改顯示原本的
Personal Access Token 手動連線方式，不影響現有功能。
