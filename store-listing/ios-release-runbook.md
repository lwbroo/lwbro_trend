# iOS 上架流程

到「Install Xcode」之前的部分都已經在這個 repo 裡用命令列做完了（Capacitor
`ios/` 專案、真的圖示/啟動畫面）。**專案真的 build 得起來這件事也已經驗證過**——
`.github/workflows/ziweibazi-ios-build.yml` 在 GitHub 的 macOS runner（內建完整
Xcode）上真的 build 過、也在 iOS Simulator 開起來過，見
https://github.com/lwbroo/lwbro_trend/actions/runs/34361984705 那次成功的紀錄。
Simulator build 完全不需要簽章/開發者帳號，這也是為什麼下面第 1 步還沒做完之前
CI 就能跑成功的原因。

Kurt 的 Apple Developer Program 已經申請完成 ✅，下面從第 2 步開始。

## 1. ~~加入 Apple Developer Program~~ ✅ 已完成

## 2. 安裝 Xcode
Mac App Store → Xcode（檔案很大，10-15GB），需要用 Apple ID 登入 Mac App Store。

## 3. 打開專案
```bash
cd /Users/kurtchiang/AI/ziwei-bazi/lwbro_trend
git pull origin claude/zi-wei-ba-zi-planner-rnaz10
npm install
npm run sync        # 重新產生 www/，把最新的 ios/ 同步好
npx cap open ios     # 用 Xcode 打開 ios/App/App.xcworkspace
```

## 4. 簽章
- 選 `App` target → **Signing & Capabilities**
- Team：選你的 Apple Developer team（第 1 步做完後這裡就會出現）
- 打開 **Automatically manage signing**——Xcode 會自動幫你建立
  provisioning profile 跟 App ID（`com.lwbroo.ziweibazi`）

## 5. 先在 Simulator 測，再上真機測
- Simulator：選任一台 iPhone 模擬器，⌘R 直接跑，可以測完整的排盤、AI 解讀、
  AI 問答、記錄、趨勢分析——目前這個 App 沒有內購，Simulator 測起來就是完整體驗
- 真機：接上 USB，選你的手機當 destination，⌘R——建議至少在真機上完整跑過一次
  GitHub 登入（OAuth 的網頁跳轉在真機瀏覽器行為有時跟模擬器不同，值得確認一次）

## 6. 到 App Store Connect 建立 App
https://appstoreconnect.apple.com → My Apps → + → New App
- Bundle ID：`com.lwbroo.ziweibazi`（選第 4 步 Xcode 幫你註冊好的那個）
- SKU：任何唯一字串，例如 `ziweibazi-ios`
- 名稱、副標題、分類、說明、關鍵字、支援網址：照抄
  `store-listing/listing-copy.md` 裡寫好的文案
- **隱私權政策網址**：`https://lwbroo.github.io/lwbro_trend/privacy.html`
- 年齡分級問卷：如實回答，命理/占卜類內容照問卷實際選項填即可
  （`listing-copy.md` 裡有更多說明）

## 7. 訂閱／內購——目前還不適用

這個 App 目前沒有訂閱或付費功能（AI 個人化解讀跟 AI 問答對所有人都是免費的，
只有用量上限防濫用）。如果之後要走商業化、把 AI 功能改成訂閱制，這一步才需要
回頭做——到時候会需要：
1. App Store Connect → 你的 App → **Subscriptions** 建立訂閱方案
2. 接 RevenueCat 或直接用 StoreKit（`glyco/store/revenuecat-setup.md` 有
   RevenueCat 接法可以參考，那個專案已經做過一次）
3. 後端（ai-relay Worker）加上訂閱狀態驗證，取代現在單純的每日用量上限

## 8. 截圖
`store-listing/screenshots/` 裡已經有 5 張草稿（用瀏覽器模擬 iPhone 尺寸產生，
示範資料）。正式送審前建議用真機或 Simulator 重新截一次更準：
```bash
xcrun simctl io <device-id> screenshot out.png
```
Apple 目前實際要求的尺寸/張數常常變動，送審當下以 App Store Connect 頁面裡
即時列出的規格為準。

## 9. TestFlight（建議送審前先做這步）
- Xcode → Product → Archive，Archive 完成後 Organizer 視窗可以直接上傳到
  App Store Connect
- App Store Connect → TestFlight 分頁 → 加自己當 internal tester，用 TestFlight
  App 安裝、完整跑一次流程——這是「真機測試」的正式版本，測的是真的要送審的
  那個 binary

## 10. 送出審核
App Store Connect 裡選好 build、填完 App Review Information，提交。

命理類 App 常見的審核提醒：
- 內容框架成「自我觀察／參考用」，不要用絕對斷言的語氣（App 內文案已經是這樣寫）
- AI 問答功能如果被問到，可以在 App Review 備註裡簡單說明「AI 根據使用者命盤
  生成內容，非人工諮詢服務」
