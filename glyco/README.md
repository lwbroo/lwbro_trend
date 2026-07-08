# 食序 GlycoOrder · 拍照控糖助手（POC）

拍下你的餐點照片，AI（Claude 視覺模型）自動辨識食物、估算每項食物的**升糖指數（GI）**，
並根據「先纖維 → 再蛋白質與脂肪 → 澱粉與糖最後」的原則，給出**建議進食順序**與控糖建議。
目標：不改變吃什麼，只調整**吃的順序**，減緩餐後血糖飆升。

## 功能

- **拍照分析**：手機直接拍照或選相簿照片，可加文字補充（例如「白飯一碗」）
- **食物清單**：每項食物的份量估計、分類、GI 等級（低/中/高）與估計值、碳水克數
- **進食順序**：分步驟的吃法建議，每一步附理由
- **控糖建議**：針對這一餐的 2–4 條具體建議
- **用餐紀錄**：儲存每餐的縮圖與分析結果（localStorage，僅存在自己裝置），可匯出 JSON

## 使用方式

純靜態網頁，無後端：

```bash
cd glyco
python3 -m http.server 8000
# 開 http://localhost:8000
```

第一次使用：到「設定」貼上你自己的 Anthropic API Key
（[到 platform.claude.com 建立](https://platform.claude.com/settings/keys)）。
Key 只儲存在瀏覽器 localStorage，App 直接與 Anthropic API 溝通，不經過任何中間伺服器。

## 技術說明（混合式架構）

AI 只做「辨識」，數據與邏輯都在本地，把每張照片的 token 成本壓到最低：

| 工作 | 由誰做 |
|---|---|
| 照片 → 認出食物與份量 | Claude 視覺模型（`js/api.js`） |
| 食物 → GI 值／碳水 | 內建資料庫查表（`js/gidb.js`，約 190 種台灣常見食物） |
| 進食順序、控糖建議、整餐 GL | 本地規則引擎（`js/order.js`），零 token |

- GI 值主要參考雪梨大學 GI Database 與營養學文獻；碳水參考衛福部食品營養成分資料庫（約略值）
- 資料庫查無的食物 fallback 用 AI 附帶的估計值，UI 以 🤖 標示區別
- 照片在瀏覽器端縮圖（長邊 1344px JPEG）後以 base64 傳給 Claude Messages API
- 使用 [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)（`output_config.format` + JSON Schema）確保回傳固定格式
- 瀏覽器直連 API 需帶 `anthropic-dangerous-direct-browser-access: true` 標頭
- 預設模型 `claude-haiku-4-5`（辨識約 NT$0.1/張），可切換 `claude-opus-4-8`

## Roadmap

- [ ] 餐後感受／血糖值回填，累積個人資料庫驗證效果（與 lwbro_trend 同哲學）
- [ ] 雲端同步（GitHub Gist）
- [ ] Capacitor 打包上架 App Store

> 本工具僅供飲食順序參考，非醫療建議。糖尿病患者請遵循醫師與營養師指示。
