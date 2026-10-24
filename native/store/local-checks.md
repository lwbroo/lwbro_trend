Latest approved offline checkpoint: [actual results and release gates](review-kit/offline-release-verification.txt). Current Release source is `d9f96344605e21f826acdd29e2556ecf9669a078`. Earlier sections retain historical results.

# 本機驗證紀錄

所有出生資料、筆記與檔案皆為合成內容；未安裝實機、上傳 Apple、啟用 AI／同步或選擇外部分享服務。原始網頁 checkout 與舊 iOS 殼保留。

## 已完成

- Library 圖示最新版 2 已實際取得、查看像素並保留 Library 身分；原圖 1254×1254、不透明，候選 App icon 1024×1024、不透明。來源與衍生資產雜湊見 `native/icon-provenance.json`。未修改或替換 Library 原件。
- iPhone 17 Pro／iOS 26.5：實際 UIKit 分享面板開啟／取消、測試專用本機目的地完成、再由實際 Files picker 匯入該備份通過；今日、本命盤、趨勢、設定有截圖。測試目的地只在 Debug＋明確測試環境中出現，Release 不含此程式或合成資料。
- iPad Pro 13-inch (M5)／iOS 26.5：較早的完整執行三組測試通過，包括取消匯入、錯誤 JSON 不改動原資料、有效 JSON 合併、分享回存、設定頁 audit（`build/native-ipad-1791215417.xcresult`）。後續加入回呼身分核對、改用全螢幕截圖後的分享針對性執行仍失敗，詳見下一節；目前不能視為最終原生測試全部通過。這是 iPhone 相容模式，產品 target 仍只宣告 iPhone；沒有宣稱提供最佳化的 iPad 版。
- 設定頁自動 audit 檢查對比、元素辨識、控制項觸控區與描述。WKWebView 的文字／欄位標籤 wrapper 被報成小 hit region，測試明確排除 `.staticText` 的此單一類型，其餘仍會失敗。已觀察的排除文字：副標題、資料 chip、姓名、出生日期、國曆提示、出生時間、時區提示、性別。這不是完整 VoiceOver 或全 App 無障礙認證。
- 瀏覽器的讀取失敗、中斷、超過 5 MB、錯誤 JSON、取消與原有資料保留有離線回歸檢查；表單標籤、狀態播報、選中導覽與 SVG 文字資料已補上。

## 先前失敗紀錄（保留）

iPhone Files picker 取消後立即重開，選取特定 `Synthetic-invalid.json` fixture 時，UI 自動化未穩定取得完成回呼／錯誤提示。最後針對性測試失敗於 `NativeChecks.swift:78`，結果 `build/native-iphone-1791215632.xcresult`。較早的 iPad 相同情境通過，iPhone 分享回存產生的有效備份也能匯入，因此尚不能判定是 App、Files 供應者還是自動化行為。

最後的 iPad 分享針對性測試：分享取消及本機測試目的地完成通過，但按匯入後 8 秒內找不到 `Shared-synthetic` 項目，失敗於 `NativeChecks.swift:54`，結果 `build/native-ipad-1791215864.xcresult`。已匯出該次全螢幕分享面板與本命盤證據；它們僅證明顯示及已執行步驟，不代表後續匯入成功。上述兩項沒有標成通過，也沒有繼續重試。

回呼現在核對其原本的 picker／分享 request，避免舊畫面延遲 dismiss 誤取消新請求；這項修正不代表上述情境已解除。提交前仍需在可協調的前景模擬器或獲准的實機上重現並完成驗證。

## 有界原因區分與共同修復

- 新的 iPhone 診斷執行 `build/native-iphone-1791216774.xcresult` 改為只點一次檔案 cell 的圖示區；結果仍失敗。事件檔 `build/native-iphone-1791216774-files/native-check-events.txt` 顯示第一次取消回呼符合原 picker；第二次請求 `pending=false presented=false`，且新的呈現完成，但點檔後沒有 `didPickDocumentsAt` 回呼。因此這次失敗不是殘留 `importCall` 或新請求被舊畫面擋住；選取未到達 App 的原因仍需人工檢查。沒有把此診斷失敗標成通過。
- 先前 iPad 失敗影片顯示空白 Files 面板，而不是一份有列表但缺少備份的畫面；單憑找不到項目不能宣稱檔案未產生。
- 共用 App 狀態風險已修正：原生請求與控制項保持占用直到 UIKit 關閉動畫完成，分享／匯入互斥，延遲回呼只完成原請求一次。原生 I/O 按鈕防止重複及交叉請求；取消和錯誤後可再試。
- 離線回歸 51 項通過，包含待處理操作、取消、拒絕後再試、有效檔重複匯入與原始記錄完整保留；另有曆法／輸入 20 項、JavaScript 語法 11 個檔案。這些是瀏覽器模擬橋接結果，不能當作真實 Files 選取成功。
- 最終 Release 原生檢查不含 App 診斷注入或測試分享目的地；只有外部 runner 在各自新建的模擬器 UUID 中放置合成檔。分享測試使用真正的本機 Save to Files，必須辨識紫微 App 資料夾才可儲存。

## 最終非診斷 Release 結果

程式與測試主程式來源：`ffb9fe5e4912e030bfa1e9516a8a24ae4c8155b6`；共同狀態修復 commit `c904eae63832e04fd5824beed64818fff617f19a`。Release 已核對不含 `ZIWEI_UI_TEST`、事件檔、合成資料建立程式或本機測試分享目的地。

- iPhone 17 Pro／iOS 26.5：`build/native-iphone-release-1791217665.xcresult`，兩組中一組通過。三次匯入取消／重開皆完成；真正 UIKit 分享取消、儲存到紫微本機資料夾、再以 Files 匯入通過。這次備份為 0 筆且沒有 profile，不能據此宣稱非空資料保留已在 iPhone Release 驗證。實際輸出 JSON 已保存於該次 `-files` 目錄。
- iPhone 另一組在 Files 導航的 `NativeChecks.swift:46` 失敗，未到達第一次 `Synthetic-start` 選取。失敗 hierarchy 同時包含紫微資料夾與合成檔 cell，故不能把「定位失敗」等同「檔案不存在」或 App 匯入拒絕。iPhone 的非法／過大／重複匯入及非空資料保留仍待協調人工前景驗證；已停止重跑。
- iPad Pro 13-inch (M5)／iOS 26.5 相容模式：`build/native-ipad-release-1791217859.xcresult`，兩組全部通過。三次取消／重開、非法 JSON、超過 5 MB、有效檔合併及重複匯入不增加記錄、原始記錄保留，以及真正本機 Save to Files／再匯入皆通過。實際輸出 JSON 包含原始和新增的兩筆合成記錄，已檢查內容與 SHA256。
- iPad 最終回存截圖可見 2 筆與「新增 0、更新 0」；中途的 `release-invalid-size-repeat-preservation` 截圖只拍到桌布，保留原始證據但不把它當成 App 畫面驗證，使用最終回存截圖。
- 首次 Release 執行 `build/native-iphone-release-1791217358.xcresult` 的兩項失敗也保留：資料夾標題有動作選單後綴、空記錄頁沒有計數文字。根據實際 hierarchy 修正這兩個測試假設後，才執行上述最終檢查；沒有以偶然通過取代原因。
- 同一來源的未簽名 device archive、模擬器 Release 與 16 個資產／3 個隱私 manifest／1024 不透明圖示檢查皆成功。所有測試使用紫微獨立 UUID 與 DerivedData，未開啟 Simulator.app，沒有操作血糖的 device 或全域服務。

## 建置／測試環境紀錄

- iOS 27 與未簽名 Debug UI runner 曾卡在自動化啟動；Release 啟動測試已通過。成功的 UI 驗證使用已安裝 iOS 26.5 與本機 ad-hoc 簽名，未建立憑證或使用 Apple 帳號。
- Documents 的檔案供應者會替生成的 storyboard folder 加入 FinderInfo，阻擋 codesign。測試建置移到唯一 `/tmp/ziwei-nativechecks-*` staging 後成功；沒有改全域 `xcode-select` 或移除原始碼／Library 中繼資料。
- Xcode 的部分失敗診斷收集受系統預設 CommandLineTools 路徑影響；直接使用指定 Xcode 的 `xcresulttool` 仍能匯出本任務截圖與紀錄。
- 最終 build、hash、測試結果與截圖索引記在 `build/local-verification.json`。未簽名 archive 不可直接上架。

## 提交前剩餘

核對 iPhone 上述情境、真實 Files／分享目的地、VoiceOver 與大字體／橫向體驗；確認首版範圍、圖示、帳號／App 紀錄／團隊與簽名、正式商店文案和公開隱私／支援 URL。兩種首版路徑見 `release-paths.md`。


## Unpublished store review materials

The [local review kit](review-kit/index.html) contains bilingual listing/review notes, four privacy/support draft pages, the feature/data-flow table, and 12 individually inspected synthetic PNGs. English listing copy does not mean the app interface is translated; the current UI is Traditional Chinese. First-release scope remains undecided.

Screenshot-only Debug collectors at source `0151c76ad80907bdf494b3b91bad701210f57f65` completed once per final device: `build/native-iphone-debug-1791239826.xcresult` and `build/native-ipad-debug-1791239957.xcresult`, each 1/1. These did not run Files/import/share checks. iPhone frames are 1320×2868; iPad compatibility/window frames are 2064×2752. Both transitional `store-02-natal` frames still showed Daily and were excluded. Actual captions, remaining layout issues, and all hashes are in [the screenshot manifest](review-kit/screenshots.json) and [visual review notes](review-kit/screenshot-review.txt). They are review candidates, not submission-ready images.

The prior non-diagnostic Release archive remains sourced from `ffb9fe5e4912e030bfa1e9516a8a24ae4c8155b6`. Its original asset manifest was restored after Debug screenshot preparation; read-only archive checks still verify the 16 asset hashes, three privacy manifests, and unchanged opaque 1024px icon. No Release rebuild or repeated functional test suite was performed for this materials milestone.

[The minimal foreground iPhone Files checklist](review-kit/manual-iphone-checklist.txt) is not executed yet. Its four ready-made fixtures are synthetic; the guarded preparation helper stages them only into a newly created, specifically named simulator and never launches foreground UI. Coordinate the foreground slot before following it. Public policy/support URLs, operator/contact details, account/team/signing, final declarations, scope, and layout/wording gates are listed in [owner decisions](review-kit/owner-decisions.txt).

Static material checks: ten metadata field-size checks pass; 47 local HTML link/resource references exist; no external resource loading in these pages. All four policy/support language pages and the review index/gallery have been rendered in the existing headless browser and inspected. Detailed evidence is in [review-evidence.json](review-kit/review-evidence.json).

The ZIP is `build/ziwei-bazi-offline-store-review-kit.zip` (35 files, approximately 20.7 MB; unmodified PNGs account for most of it). It contains only review materials, synthetic fixtures, and the existing icon copy, without an app executable, credentials, or real birth data. All four screenshot UUIDs were individually removed. Original checkout dirty entries remain only the two pre-existing `.wrangler/` folders.


## Historical iPhone layout milestone — bc9753f

Responsive records now expose all fields and actions on mobile cards; desktop keeps table comparison. The twelve-palace chart retains its arrangement in a bounded, named scroll region with horizontal controls/keyboard navigation and an independent heading. Tab clicks reset page position; editing reveals the specific record form below the sticky header. Native unavailable AI and local-backup wording are explicit without selecting the first-release policy or removing web functionality.

Focused verification is `python3 test/run_layout_checks.py`: 165 checks passed, including narrow/wide viewports, 150% browser font, long notes, named action bounds, chart navigation, edit/save/delete retention, and tab position. Two `--only screenshots` runs at bc9753f included the changed native chart/edit/navigation assertions and each passed 1/1: iPhone 17 Pro Max (`1791247515`) and iPhone SE 3 (`1791247641`). No Files suite was run. The two exact owned UUIDs were removed and verified absent.

The then-current `build/ios-simulator/Build/Products/Release-iphonesimulator/App.app` and `build/ZiweiUnsigned.xcarchive` both built successfully from bc9753f. `native/check_build.py` passed for identity, scene, unchanged opaque icon, 16 resource hashes, three privacy manifests, and exclusion of test bootstrap/recipient. The previous unsigned archive is preserved as `build/ZiweiUnsigned.ffb9fe5.xcarchive`; its verification is separately indexed in `build/pre-layout-local-verification.json` with the original source/hash manifest.

The review kit now has 13 inspected current iPhone PNGs (9 at 1320×2868 and 4 at 750×1334), plus six explicitly marked old iPad references. Current scope and artifact evidence are in [review-evidence.json](review-kit/review-evidence.json). The reviewed index, bilingual copy, and ZIP remain unpublished drafts. iPhone foreground Files, real-device VoiceOver/Dynamic Type/orientation/destinations, public contacts/URLs, authorized Apple account/signing and final declarations remain gates. Prior Files results were retained, not reclassified as current all-green results.

## Approved offline first release — d9f9634

Kurt approved offline charts, journal, trends and backups. Native services/CDN fallback are excluded, five tabs remain, and UIKit safe-area padding prevents status-bar overlap on inspected large/small iPhones. Focused layout 165/165, local data/network 35/35, browser smoke 51/51 and calendar/input 20/20 passed. Final native cases each passed 1/1 (`1791254103`, `1791254226`), including local privacy/back navigation; all four owned UUIDs from this turn were individually deleted and verified absent.

The rebuilt unsigned simulator and device archive at the current paths use d9f9634; identity/icon/14 resource hashes/3 existing manifests/test-fixture exclusions passed `native/check_build.py`. Prior archives are preserved with commit suffixes. These checks do not approve privacy/legal/account declarations or close Files and physical accessibility gates. Exact owner inputs: [owner-decisions.txt](review-kit/owner-decisions.txt). No foreground apps, real-device install, credentials/signing/account mutation, upload, submit or public publication.

Public-contact draft update (2026-10-06): public operator/brand `lwbro` and support email `lwbro@me.com` approved. Legal/copyright/Apple seller identity and private review contact remain unconfirmed. Policy effective date, support-message retention/deletion, and authorized public URLs remain open. Docs and native privacy source only; existing d9f9634 artifacts/tests/screenshots are unchanged and do not yet contain the new native contact text. No native build or functional test was rerun.

最新：9f737e0開發版已安裝並基本啟動（2秒程序存活），不等於完整實機／Files驗證或上架簽名。只讀distribution憑證0，App Store Connect紀錄未知；新發行憑證／profile另需授權。具體提案與待填值：[上架審閱](review-kit/submission-readiness.html)。本輪無phone操作、build/test重跑、上傳或提交。
