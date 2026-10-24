# 已確認離線首版與上架路徑

Kurt 已確認「先完成上線」：首版採離線命盤、記錄、趨勢與備份，AI／同步留待後續版本。此決定已實作，不再重問首版是否必須包含 AI。候選圖示已取自既有 Library 最新版，未替換原件；其 AI 節點意象不代表離線候選版已提供 AI。商店文案與截圖必須符合最終功能。

## 共同必備

1. 在使用者登入的 App Store Connect／Developer 帳號核對既有 `com.lwbroo.ziweibazi` 紀錄與擁有團隊；Developer App ID及開發profile已由本人建立，現有team／certificate／指定手機已驗證；獨立App Store Connect record尚未核對。需要新distribution憑證／profile時，先取得具體授權。
2. 首版免費下載已確認；另確認產品名稱、圖示候選、發行地區、法定身分／私人審查聯絡、年齡問卷、隱私宣告及出口合規。公開品牌 lwbro／支援信箱 lwbro@me.com 已確認；準備正式公開隱私政策與支援 URL，確認生效日期及支援訊息保留／刪除做法。本機草稿沒有發布。
3. 完成真實裝置的檔案供應者／分享目的地、VoiceOver、放大字體、橫向與資料復原檢查。模擬器與程式測試不代表全部實機行為。
4. 使用不受 Documents 檔案同步中繼資料干擾的本機 staging 路徑建置／簽名；目前已確認這個目錄中的 FinderInfo 會阻擋測試簽名。授權後以對應團隊／既有可用的 distribution profile 建立簽名 archive，檢查驗證結果，再依確認的流程使用 TestFlight／送審。目前9f737e0產物已作development簽名與實機安裝；尚無已驗證App Store distribution archive，沒有上傳。
5. 清楚呈現出生時間直接計算、未做出生地時區／真太陽時校正；排盤屬文化詮釋，趨勢反映使用者紀錄，不能作為科學預測或醫療／財務建議。
6. 說明已有的差異化用途：裝置內排盤、逐日心情／精力紀錄、相關性觀察與可攜備份。Apple 4.2 要求足夠 App 功能；4.3(b) 特別列出 fortune telling 為成熟類別，新提交需有明顯不同或改善的體驗。這是本專案具體送審風險，不能以「娛樂」免責或加入 AI 保證通過。[App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

## 首版：離線先上架（已選定）

首版免費下載已由 Kurt 確認；後續商業模式僅探索，未授權新增購買、廣告或 AI 服務。沒有更改 App Store 價格／帳號狀態。

- 排盤／紀錄／趨勢／備份已選定為首版；保留離線 CSP，關閉 AI、同步、自動 diagnostics。
- 已完成五個可用入口；AI／同步面板隱藏且 inert。原生包不帶 AI／OAuth／同步程式或 CDN 備援；後續功能保留在來源。
- 商店說明、審查備註與截圖只描述已啟用的功能；如保留 AI 意象圖示，最終名稱／文案應避免暗示 AI 已可使用。
- 依實際 App 和 SDK 行為確認是否可宣告開發者不收集資料；說明選擇分享目的地、系統備份與本機清除的界線。
- 將目前 `metadata-draft.json`、`review-notes-draft.md` 與 native 隱私頁核對成正式版本。

## 後續版本參考：AI（不屬本次首版）

- 先確認要提供的 AI 功能、服務供應者與是否保留既有 relay；此步沒有建立服務、帳號或購買額度。
- 明確列出每個功能送出的資料：推算命盤、選定日期、對話內容、技術識別等；最小化資料，不能假設推算命盤無法反推出生資訊。
- 每次首次傳輸前清楚披露供應者／中介者、目的與資料類型，取得明確同意；不同意時仍可使用本機核心功能。Apple 5.1.2(i) 明確要求對第三方 AI 的個人資料分享披露與事先許可。[App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- 驗證 Capacitor mobile origin、relay CORS 與請求驗證；避免以萬用 CORS 代替手機支援。先用模擬回應完成測試，再經授權進行限量合成資料的實際服務驗證。
- 加上逾時、取消、離線、配額／服務故障、重試與防重送；輸出不得包裝成確定醫療／投資或科學預測。保護金鑰，確認內容治理與審查可用性。
- 核對供應者的保留／訓練、刪除與日誌政策，更新正式隱私政策與 App Store app-level 資料宣告；包含第三方處理情況。[Apple App Privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy)
- AI 與同步是不同功能。若另決定啟用同步，還需驗證原生 OAuth callback、token 儲存／撤銷、衝突合併、帳號與刪除需求；加入 AI 不必自動啟用同步。

以上依 2026-10-05 檢視的 Apple 官方文件整理；首版離線範圍已確認；實際帳號表單、協議與最終聲明仍待帳號權利人確認。

最新：9f737e0開發版已安裝並基本啟動（2秒程序存活），不等於完整實機／Files驗證或上架簽名。只讀distribution憑證0，App Store Connect紀錄未知；新發行憑證／profile另需授權。具體提案與待填值：[上架審閱](review-kit/submission-readiness.html)。本輪無phone操作、build/test重跑、上傳或提交。
