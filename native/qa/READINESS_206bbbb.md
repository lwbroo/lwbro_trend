# e364fc3 英文原生 QA 與上架準備 — 2026-10-08

## 2026-10-09 375pt分頁可讀性修正（接續4c50d0d）

已重現原生375pt Settings拆成Setting/s。固定五等分且允許字內換行的配置，被原生版CSS覆寫為完整按鈕flex換行；字體100–300%時整個按鈕換列，文字不縮小、不省略。短繁中標籤也保留至少44×44點擊區。頁首超過60vh時允許內部垂直捲動，讓大字最後一排可到達；不改JS controller、資料或命盤算法。

[新背景用例](../../test/tab-label-checks.html)檢查中英文、320/375/430px、16/24/32/48px的24組配置：完整單行標籤、無裁切／頁面橫向溢出、44×44目標，以及可見hit target與五頁實際啟用。[4c50d0d修正前98/122](../../build/tabs-browser-before-4c50d0d.json)、[修正後122/122](../../build/tabs-browser-after-scroll-working.json)分別保留。初次候選119/122的兩類真實邊界（中文短按鈕小於44px及300%頁首太高）也保留，之後加入上述最小尺寸與內部捲動。

[既有165項版面／編輯](../../build/tabs-browser-layout-after-working.json)與[18項草稿／privacy返回](../../build/tabs-browser-return-after-working.json)均通過，縮小視窗姓名聚焦仍可見。全部只是background Chromium／CSS字體放大，不能叫作原生Dynamic Type或VoiceOver。接續將使用一個獨立stage／DerivedData與專用375pt simulator、現有SHA鎖定8.4.1 SDK做必要原生重驗；前景、手機、profiles與distribution signing都仍由母執行緒／Glyco協調。[7d3bfec新候選身份](../../build/tabs-candidate-identity.json)在原生驗證前建立並記錄CSS為唯一runtime／打包改變。原生是否有對外流量仍未實際觀察。

原生實際結果：獨立375pt iPhone SE第3代／iOS26.5（23F77），Release新App的來源17／資產15／privacy manifests3核對一致，SDK8.4.1四個來源雜湊不變。正常系統字級large下，[native-normal](../../build/tabs-native-normal-1791521664.log)的三個focused test全部通過：中英文五個tab命名／button trait／44×44目標／頁面切換，以及先前姓名／日誌真正鍵盤、跨頁草稿、native確認取消／同意、privacy返回回歸。實際原生PNG顯示英文Settings完整一行，中英文五個tab均位於一排；沒有沿用4c50或e364圖宣稱新畫面。本輪只建置新的simulator App，未重新建置／簽名iPhoneOS distribution候選。

[Dynamic Type診斷](../../build/tabs-dynamic-type-diagnostic.json)：`simctl ui`確實將本輪owned simulator從large切到accessibility-extra-extra-extra-large，兩個語言tab navigation test仍可操作；但十個tab frame完全相同，中英文各自的前後PNG也逐位元組相同。**目前WebView未跟隨系統Dynamic Type放大；不是Dynamic Type支持PASS。** 16–48px的瀏覽器CSS字體放大與此系統測試不同，不能混用。`simctl ui`沒有VoiceOver控制，本輪XCTest只驗證AX名稱／button trait／可操作，不涵蓋VoiceOver朗讀或手勢，沒有開Mac全域VoiceOver／前景設定。這些已有缺口不在本輪tab修復中擴充。

[新App與本輪9張750×1334原生PNG／9份hierarchy](../../build/ziwei-bazi-tabs-7d3bfec)完整另存：normal兩張語言tab＋五張鍵盤／返回，maximum-category两張診斷。新候選App與每個檔案有雜湊，不是Store主截圖。第一次native runner build因漏寫text locator helper失敗，原始log／JSON／Swift保留；補helper並用實際中文「命盤怎麼讀？」後build成功，沒有App source變更。其後兩次native test run均PASS；不把初次build抹除或算通過。

[清理](../../build/tabs-native-cleanup.json)確認唯一owned UUID已shutdown/delete，其他simulator狀態不變，已向母執行緒回報釋出Glyco資源。沒有新依賴、SDK下載、實機、profiles／security解碼、Apple帳號／distribution簽名或對外資料傳送；XCTest只用既有local ad-hoc `-` runner流程。e364審閱包與4c50兩個App／證據保留。後续必要項目是Dynamic Type／VoiceOver缺口與原生流量觀察；本輪不繼續擴充美化。

## 2026-10-09 接續 trial：保存前修改、說明頁返回與聚焦（4c50d0d歷史候選）

新的來源候選修復三個實際重現問題：出生資料修改／保存失敗後切回 Settings 被舊值覆蓋；開啟本機 privacy／licenses 頁直接丟失未保存 profile 或 journal；姓名欄在縮小可視區域聚焦時藏到固定頁首後方。

出生資料 input/change 標記 session 草稿，返回不覆蓋；明確保存／確認清除後解除。離開 App 進入說明頁前，有草稿才以所選語言確認，取消保留兩種草稿，明確同意可捨棄；不自動保存。捲動預留 ResizeObserver 量得的頁首高度。未改 schema、命盤算法、時區／DST、持久化草稿或法律文字。

Kurt已明確授權這次背景 Chromium／loopback 及 Xcode 快取／服務權限。先前 default sandbox 的 bind／Mach bootstrap 阻擋報告保留作歷史，授權後執行成功；它們不是目前阻擋或 auto-review 拒絕。新候選不沿用 e364fc3 的 App／16張原生截圖冒稱已驗證。

- [來源 controller 15項](../../build/profile-draft-source-return-final.json)通過；[歷史修正前9/15](../../build/profile-draft-source-before-final.json)保留。
- 15502e2 的[真實 DOM 語言／表單82項](../../build/ux-followup-browser-language-15502e2.json)通過；新三項修正後的[同套82項結果](../../build/ux-followup-browser-language-return-final.json)也通過，另存不覆寫155證據。
- [背景 DOM 返回18項](../../build/ux-followup-return-final-working.json)通過：中英文確認、只有journal草稿、privacy與license實際返回、明確捨棄、取消不寫入、保存bytes保留、320/375px與16/24px字體無頁面溢出。confirm在此瀏覽器測試為mock；原生alert仍需單獨驗證。
- [修正前返回10 pass／2 fail](../../build/ux-followup-before-return-15502e2.json)及[修正前聚焦PNG](../../build/ux-followup-browser-focus-before-15502e2.png)保留；[修正後PNG](../../build/ux-followup-browser-focus-after-working.png)僅背景375×340可視區域，不能當原生鍵盤或Store圖。

[瀏覽器返回用例](../../test/return-followup.html)可置於隔離 stage/test，以 stage/native/ios/App/App/public 的實際打包來源執行；只使用合成出生資料／日誌。375px瀏覽器與本輪原生iPhone SE均確認英文Settings呈現Setting/s字內換行；這是下一個小螢幕可讀性修正項，未算已解決，沒有為了測試縮小可及性字體。

已協調 Glyco 釋出重型建置／模擬器資源；接續以現有鎖定8.4.1 SDK位元組、新隔離stage／DerivedData做 unsigned iPhoneOS build及必要原生驗證。沒有實機、Mac前景操作、Claude／Safari／Apple登入或dependency下載。兩種Release建置成功；[新候選身份](../../build/ux-followup-candidate-identity.json)記錄source17、打包15、SDK4、manifests3及兩個App的精確雜湊。實際unsigned iPhoneOS包內兩個SDK二進位逐位元組等於鎖定來源。


[本輪原生結果](../../build/return-native-final-summary.json)：4c50d0d在iPhone SE第3代／375pt／iOS26.5（23F77）通過focused原生test。姓名與日誌欄完整位於真正鍵盤上方；跨頁profile草稿、真正英文native confirm、取消後兩種草稿確切內容、明確同意進privacy與返回、空白表單無提示均驗證。五張750×1334原生PNG與五份hierarchy另存於[本輪候選資料夾](../../build/ziwei-bazi-ux-4c50d0d/native-evidence)，不是Store主截圖。這輪沒有保存完整出生profile，所以已保存profile／journal bytes返回的新增證據是上述18項browser campaign，不能擴充本原生test的範圍。三個初次runner失敗原始xcresult／logs／executed source保留：姓名超過既有20字上限、只向下捲到上方欄位、Ok大小寫定位；最後52.329秒focused run PASS，不把先前run改写為整套綠燈。

[專用模擬器清理](../../build/return-native-cleanup.json)確認已shutdown/delete本輪唯一UUID，其他模擬器狀態不變。原始repo兩個.wrangler dirty目錄、e364 ZIP／16原生圖、歷史audit工具與三份report、App privacy原始bytes保持不變。新本機兩種App存於build/ziwei-bazi-ux-4c50d0d，不是distribution簽名包；無實機／前景／外傳。VoiceOver／原生Dynamic Type、網路實際流量觀察、細部英文術語與合法發布資訊仍有缺口。

## 2026-10-08 已完成的e364fc3原生QA（歷史基準）

本輪已在專用 iPhone 17 Pro／Pro Max、iOS26.5（23F77）完成英文原生操作與截圖；獨立 `/tmp/ziwei-native-english-j9z2apym/DerivedData` 使用現有 Xcode27／SDK27，所有資料都是合成資料。Kurt於2026-10-08 14:25:28 UTC明確同意這次測試使用額外執行權限；XCTest僅用本機 ad-hoc `-` 簽名，沒有Apple identity、帳號、憑證、手機、Claude或distribution操作。沒有開啟Mac前景視窗。兩台本輪建立的模擬器已shutdown及delete，其他模擬器清單及狀態未變。[清理證據](../../build/native-english-cleanup.json)

**本段已驗證runtime是 `e364fc39b59d17315db5530f591b429c9fee6cc8`，仍不是可直接提交的final distribution。** 當時唯一產品程式改動是 `js/app.js` 的初始化guard：原先冷啟動會在載入已保存日誌前，將空白表單當作當日草稿，造成Entries內容仍在、但點Edit得到空白。已先在原生及背景重現，再修正；載入表單後才准capture草稿。沒有改資料格式、自動保存或命盤演算法。`test/ux-regression-checks.html`新增三個有實際前後差異的冷啟動斷言；[修正前失敗](../../build/native-cold-start-before-fix.json)、[修正後28項通過](../../build/native-cold-start-after-fix.json)，原生重開Edit與全文取代也通過。

| 本輪實際完成 | 原生證據／界線 |
|---|---|
| 首次英文UI、文化性限制、空命盤／Entries／Trends提示 | discovery run實際到達；最初runner把未設定profile的提示誤當兩筆門檻，之後修正locator／expectation，沒有把該run寫成整套PASS |
| 合成出生資料與姓名鍵盤、Jan2,2000／12PM／Female保存、命盤左右與八字 | `profile-1791470030` PASS；姓名輸入區位於WebView安全區內；初次iOS鍵盤教學也實際處理 |
| 保存、重啟、冷啟動Edit、原生Select All全文取代、同日更新不重複 | 原版`journal`／`edit-probe`確認上述產品缺陷；修正版`edit-fixed-1791470589`僅focused probe PASS，`journal-resume-1791470942`續測全文取代PASS，不把未執行的02b選項算通過 |
| 跨分頁／Oct6↔Today草稿、明確保存、兩日期記錄、英文Trends | `journal-resume` PASS；SESSION DRAFT ONLY沒自動保存，草稿仍只限本次session |
| Portrait↔landscape、安全區可操作、本機英文privacy全文／返回、返回後姓名鍵盤與資料保留 | `privacy-files-1791471072`的test03 PASS；不是實機／VoiceOver／Dynamic Type pass |
| Files三次取消／重開、非法JSON、5,242,881 bytes超限、非法UTF-8拒絕 | 取消實際通過；Files自動返回本機App目錄造成runner locator失敗，修正runner後`files-errors-resume-1791471260` PASS；原有profile與已保存note均保留 |
| 非空JSON合併、重複匯入零更新 | 同一Files續測PASS：新增／更新後4筆，重複0 added／0 updated／4 total，匯入fixture的不同profile未覆蓋目前profile |
| 原生Share取消、實際Save to Files、同一JSON回匯、暫存清理 | `roundtrip-screens-1791471344`的test05 PASS；[1,043 bytes匯出核對](../../build/native-english-local-export/inspection.json)含四筆正確note／profile，未保存草稿未匯出，專用匯出暫存剩0；僅選On My iPhone→紫微八字 |
| 真正iOS英文候選截圖、21筆合成Trends | test06及`large-screens-1791471745` test07 PASS；21筆由本機Files實際匯入，不注入App storage。未新增filter／十筆preview斷言 |

所有run、實際執行method、runner SHA、失敗分類及後續覆蓋詳見[完成記錄](../../build/native-english-completion.json)。完整 dated runner留在[EnglishNativeQA.swift](../tests/campaigns/EnglishNativeQA.swift)；正常`native/tests/NativeChecks.swift`保持原樣。兩次Conda工具變數造成的build失敗只在子行程移除LD／LIPO等變數處理；一次test-only source編譯錯誤及Select All MenuItem／Files自動導航locator失敗保留原始log，不算產品失敗，不無限重跑。

截圖各8張：[Pro Max manifest](../../build/native-english-screenshots-iphone17promax/manifest.json)為1320×2868、[Pro manifest](../../build/native-english-screenshots-iphone17pro/manifest.json)為1206×2622；RGB PNG、無alpha、未裁切／縮放／合成，來自同一e364fc3候選。03 chart-guide及04 chart在Pro組是相同像素，挑圖時只需選一張，不以8檔宣稱8個獨立畫面。詳細命盤術語仍中文，系統日期／Files部分metadata也仍中文；只強制App English／en_US，沒有完成整台美國系統locale或New York時區試驗。大尺寸Daily／八字／Trends已目視檢查；命盤本身設計為可水平捲動，不能從單張圖宣稱全部內容同時可見。[本機兩尺寸ZIP](../../build/native-english-screenshots-e364fc3.zip)、[Apple截圖規格](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)

[修正版精確包稽核](../../build/native-english-fixed-package-audit.json)核對17個runtime來源、15個打包資產、4個原鎖定SDK8.4.1來源binary及3個privacy manifests；只有打包`js/app.js`改變，其SHA為`c22cc9d51963e7002fa29f88789ee7b4e6c5de2d9a558426b857840426ee9776`。原`0bdc228`稽核工具硬鎖1019c38；本輪只在暫存stage調整接受commit為e364fc3，報告明列原工具／暫存工具SHA。原工具、1019c38歷史報告、native/privacy.html均未改。沒有使用shared 8.5.0 cache替換SDK；CSP不構成native HTTP能力已隔離的證明，尚未做原生流量觀測。

下一步由協調者把e364fc3來源、最終legal／policy文案及上述新截圖對齊實際device／distribution候選，再驗證實機與最終archive。既有Store ZIP仍是1019c38歷史材料，25個舊PNG保持原bytes，沒有覆寫成新候選；手機已安裝版仍9f737e0。App內privacy尚未加入最新確認的法定姓名；seller、審查姓名／電話、有效policy／support URL與支援retention等營運事實、final privacy／age／export聲明仍待處理。實機VoiceOver／Dynamic Type、CSV／其他share provider、全球出生地時區／DST校正與SDK流量驗證未完成。沒有公開上傳、真實出生資料傳輸或外部代理派發；命理輸出僅文化性詮釋。

## e364fc3 本機版本審閱包

另建版本目錄[本機審閱首頁](../../build/ziwei-bazi-review-e364fc3/index.html)及[版本ZIP](../../build/ziwei-bazi-offline-store-review-kit.e364fc3.zip)，由`python3 native/store/build_candidate_review.py`整合完成的同候選證據；該工具只讀／複製本機檔案，不build、test、開UI、簽名或傳輸。實際測過的simulator App保存在`build/ziwei-bazi-review-e364fc3/candidate/App.app`，含完整檔案SHA inventory及deterministic tree SHA；不是device／distribution上傳包。

新版16張英文原生圖、17來源／15資產／4SDK／3manifest身份、before-fix與runner失敗、原生實際執行method、已確認owner facts與原有null欄位一併保存；舊`native/store/review-kit`及1019c38 ZIP／25 PNG完全不改。未知法律／支援及最終privacy／age／export值留空；App內privacy新法定姓名未封裝，distribution必要步驟列於包內`distribution-next-steps.txt`。Library上傳部分先前由權限審核拒絕，已停止；本輪明確只處理local，沒有外部上傳或附件發送。

## 以下為1019c38與更早版本的歷史記錄

保留原文作來源追溯；其中「本輪／待重測／不操作模擬器」描述的是先前2026-10-07至10-08文件輪次，目前結果以上方e364fc3記錄為準。

沿用原有文件，保留 `206bbbb` 歷史修正及 `9f737e0` 原生 QA 來源；不另建版本。

目前仍不適合提交上架。`1019c380588bbf51f6d46d396798e034612f90aa` 已實作英文／繁中五個核心分頁、簡短閱讀指引及本機隱私全文，不能再列為「英文尚未實作」。細部命盤術語及 CSV 欄名仍中文，新版原生 UI、實機與 Store 截圖未驗證；已安裝的 development 版本仍為 `9f737e0`。本輪只更新 Store／QA 文件並核對來源與雜湊，沒有修改程式、重跑 UI、build 或既有測試。

實際專案：`/Users/kurtchiang/Documents/Codex/2026-10-04/task-2/ziwei-bazi-trend`。原始專案 `/Users/kurtchiang/AI/ziwei-bazi/lwbro_trend` 的 `ai-relay/.wrangler/`、`oauth-relay/.wrangler/` 未提交內容保留。母執行緒本輪回報 Glyco 確認 `screenLocked=true`、前景 `loginwindow`，未持有模擬器。此為協調回報，未自行查詢／解鎖；本輪不操作 UI、模擬器或實體手機。

## 已有 QA 計畫與證據

[美國使用者計畫](US_USER_TEST_PLAN.md) 是事先提供的 12 項模擬 QA：英語使用者第一次開啟、出生資料、命盤、日誌保存／編輯、日期、趨勢、Files 匯入／匯出、日期界線、時區限制、隱私及鍵盤／可及性。這不是實際美國客戶測試。

[原生 QA 結果](US_USER_TEST_RESULTS.md) 對應 `9f737e0`、Release、iPhone17Pro／iOS26.5；52 組具名截圖與 hierarchy 已留存。英文鍵盤、日期／時間控制與 Files 曾實際觀察，但 App 維持中文。請求 New York 時區未建立一致的原生／WebView Today，因此不能把它算成美國時區驗證或一般使用者錯日缺陷。專用 QA 模擬器已移除。最近的母執行緒協調回報是 Mac 鎖定／loginwindow、Glyco 未持有模擬器；不表示目前可直接操作前景。

[206bbbb 修正結果](UX_FIXES.md) 對應既有背景驗證：25 UX、165 版面、35 離線檢查通過，精確候選來源的 generic unsigned Release 編譯成功。它們不是新版原生鍵盤、實機 VoiceOver 或 App Store distribution 通過證據。[206bbbb 歷史靜態核對](../../build/readiness-206bbbb-audit.json) 保留當時來源。1019c38 的 [英文完成紀錄](ENGLISH_CORE_IMPLEMENTATION.md) 與 [精確來源證據](../../build/english-core-completion.json) 記錄75／25／165／35背景檢查、generic unsigned simulator編譯及15打包資產雜湊；都不是新版原生通過證據。本次文件核對見 [文案審核](../../build/store-copy-1019c38-audit.json)。

| QA 範圍 | 已完成 | 尚未通過／未覆蓋 |
|---|---|---|
| US01–02 首次開啟／資料設定 | 舊版自動開設定，Jan2,2000／12PM 合成資料可保存並排盤 | 1019c38 核心英文已實作／75項背景檢查通過；首次英文開啟、選語言、設定及原生長字串仍待重測 |
| US03 命盤 | 舊版十二宮左右操作、下方八字可讀 | 1019c38 簡短英文閱讀指引已整合；細部術語仍中文，不能宣稱完整英文命盤；新版原生未覆蓋 |
| US04 保存／重啟／編輯 | 舊版保存、重啟、同日期更新且不重複 | 原生完整「選取、取代全文、再保存」未執行；先前 caret 定位問題屬 runner 限制 |
| US05 日期／草稿 | 舊版兩日期保存成功；206bbbb 跨分頁／日期草稿、評分／自訂標籤、失敗重試通過背景檢查 | 新版原生重測待協調；草稿僅本次開啟保留，關閉／reload 可遺失，不是自動保存 |
| US06 趨勢 | 舊版零／一／兩筆與十筆門檻提示已看過 | 原生 filter 切換及實際十筆 preview 未覆蓋；不宣稱預測效力 |
| US07–08 Files／備份 | 舊版實際取消、非法／超限／UTF-8 拒絕、非空合併保留、重複零更新、Save to Files 與 JSON 回匯通過 | 206bbbb controller 更動後需回歸；CSV、分享中斷、其他 provider、實機流程未覆蓋 |
| US09 日期界線 | 舊版 Feb29,2000 保存；嚴格民用日期驗證有既有程式／測試 | 原生非法日期／時間／年份未逐項輸入；0100–9999 是輸入界線，不是排盤準確範圍 |
| US10 國際出生時間 | 206bbbb 加入中英文時區／DST 不支援提示及 input 說明關聯 | 全球校正與曆法準確性仍未驗證，演算法保留待決 |
| US11 隱私／返回 | 舊版本機說明與返回保留資料；公開品牌與 email 已批准 | 1019c38 本機隱私全文英文已實作；原生返回／切換語言待驗證；2026-10-08法定發布者／版權姓名Kurt Chiang、審查email已確認；seller核對、審查姓名／電話、政策生效／支援 retention 等值仍待填 |
| US12 鍵盤／旋轉／可及性 | 舊版旋轉可操作；新版安全區 containment 已編譯；錯誤 7.75:1 對比與 alert 語意通過背景檢查 | P2 鍵盤重疊尚未確認解決；嚴格 audit 曾失敗，診斷 rerun 不是 a11y pass；實機 VoiceOver／Dynamic Type 未完成 |

## 文件一致性與既有歷史修復

下載版 `owner-decisions.txt` 先前未跟上 canonical `submission-plan.json`，還保留「英文僅商店文案」及未區分舊版 Files 通過／新版待驗證的工程項目。生成器從同一 JSON 重建 TXT 和 HTML。本輪以 1019c38 更新英文 listing、review notes、五張待拍英文文案、現況及 QA 缺件；保留歷史結果。上架首頁也改為如實標示舊版模擬器 Files 已完成，而新版 controller／實機仍待驗證。

五張主截圖 manifest 的「畫面未變」現在明確限定為 `d9f9634 → 9f737e0` 的歷史比較；它不是 `1019c38` 英文候選的畫面保證。所有 PNG 原始 bytes 保留。既有商店截圖仍需在新版原生 UI 檢查後核對／重拍，不能把背景瀏覽器圖當成已完成 iOS 截圖。

## 接續的最小 QA 與 US 產品切片

待 Mac 已解鎖且前景操作重新協調可用後，只重測改動的交互：姓名／筆記鍵盤與 Done、草稿跨分頁／日期且明確保存、失敗提示、portrait／landscape 安全區、本機隱私往返，以及新版 JSON picker／本機 Save to Files。用既有合成 fixture 與非空資料，避免重新跑整個 12 項 baseline。確定結果後再更新 iOS 截圖。實體手機、VoiceOver／系統大字及其他分享目的地仍需另行協調，不以 simulator 取代。

`206bbbb` 當時建議的核心英文切片已由 `1019c38` 完成。Claude 的細部命盤英文輔助／CSV 欄名交接包保持未派發；為10/11目標先暫停擴充翻譯，優先P0及原生試跑，不重做核心五分頁。現在最小有用 QA 是驗證既有英文候選的原生交互，再以真正 iOS 英文畫面更新既有五張 Store 主圖。即使後續細部翻譯完成，也不能取代出生地時區／DST 校正或全球排盤驗證。

## 最少使用者待填／確認（四組）

1. 商品呈現與帳號設定：是否採用現有中英文名稱、圖示、Lifestyle；實際 storefront 與手動發行提案。US 優先／全球產品目標、免費離線首版、lwbro／lwbro@me.com 已確認，不重問。
2. 權利人資料：2026-10-08已確認法定發布者／版權姓名Kurt Chiang、私人App Review email lwbro@me.com；Apple seller帳號核對、完整版權文字／年份及私人審查姓名／電話仍待提供或確認。
3. 可公開政策：已授權的 privacy／support HTTPS 目的地、有效日期，以及支援訊息／附件保留與刪除做法。現有草稿尚未公開或生效。
4. 最終帳號聲明：工程依最終 App／SDK／實際內容填成有來源的 privacy、年齡及出口問卷草稿；Kurt 提供支援／權利等營運事實並審閱，不需猜SDK或技術欄位。未推定 Data Not Collected、4+ 或法律答案。

工程檢查與既有 App record／簽名能力核對是工作項目，不是假定使用者要再批准已完成測試。本機先前查到 development identity 1、distribution identity 0、Ziwei 僅 development profile；不能據此認定帳號沒有既有／雲端 distribution 能力。App Store Connect record、numeric Apple ID 與可用 distribution 包仍未知。先核對既有 record，避免重建；本輪不開帳號、不建立憑證、不接受條款。

全球出生地／時區／DST 計算決定先保留，不列成本輪需要回答的問題，不改演算法。命理輸出是文化性詮釋，沒有科學確立的預測能力，不作醫療或財務建議。沒有上傳、寄信、帳號寫入、公開發布或真實出生資料傳輸。

## 10/11 台灣可下載目標與本輪授權更新

時間基準固定為 Asia/Taipei（UTC+8），目標是2026-10-11當天可下載，不再詢問時區或精確時刻。Kurt已明確同意建立兩App的Apple Distribution憑證及App Store profiles，Glyco獨占辦理；從「等待同意」改為「已授權、辦理／驗證結果待協調者回報」。本worker不操作帳號、Claude、UI、手機或簽名。免費下載、lwbro及lwbro@me.com已批准；2026-10-08法定發布者／版權姓名Kurt Chiang及審查email lwbro@me.com已明確提供，既有Apple seller帳號是否相符仍未知。

| 建議截止（台灣時間） | 負責方／可驗證成果 |
|---|---|
| 10/8 10:00 | Kurt補法定／私人審查聯絡、政策及支援營運／內容權利事實；Glyco回報existing record／簽名進度，不重問distribution建立同意 |
| 10/8 12:00 | 工程凍結最小版本，只修P0／阻斷核心操作的P1，暫停細部翻譯 |
| 10/8 18:00 | 精確來源原生trial run及修復、新版真實iOS截圖、有效政策／聯絡及distribution archive validation完成；崩潰／資料遺失／核心操作阻斷為不通過 |
| 10/8 20:00 | 所有P0通過才由帳號協調者提交；未通過即調整目標，不硬送未驗證版本 |
| 10/10 20:00 | 若Apple已核准且選手動發行，及時發行以預留最多24小時商店傳播；核准時間由Apple決定，不能保證10/11 |

Apple Help目前以90%在48小時內審查為目標，審查不是核准保證；手動發行後可能需最多24小時顯示。參考：[審查狀態](https://developer.apple.com/help/app-review/after-submitting-for-review/review-status/)、[發行選項](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/select-an-app-store-version-release-option/)。上述截止是團隊建議，不是Apple承諾。

## 程式可證實的 privacy 事實與 owner 待填界線

本輪只讀核對1019c38程式；詳細欄位／來源已寫入既有review-kit/content.json的privacyTechnicalEvidence，沒有填最終帳號答案。

| 程式已證實 | 來源／界線 |
|---|---|
| 可選姓名、出生日期／時間及chart gender；每日日誌日期、1–5評分、標籤、筆記與更新時間本機保存，命盤／統計裝置內算 | js/store.js、js/app.js；語言偏好另存，不進JSON；草稿只在記憶體、不自動保存 |
| 原生包排除AI／OAuth／同步程式及CDN fallback，CSP connect-src none，offline adapter拒絕服務 | native/prepare.py、native-runtime.js、offline-services.js；網頁原始碼有未啟用服務，不等於原生包啟用 |
| 沒有App自動診斷上報、廣告／追蹤或寄支援信流程 | App／Capacitor／Cordova三個device privacy manifests無collected types／tracking；manifest聲明本身不能代替最終包及實際SDK核對 |
| JSON匯入只讀使用者選檔、最多5MB UTF-8、全檔驗證後按日期合併；JSON匯出含profile／records，CSV含日誌／曆法欄位 | js/store.js、ZiweiViewController.swift；較新updatedAt優先，保留既有profile |
| 匯出先寫專用暫存，再交使用者選擇的分享目的地，結束／取消及下次啟動清理 | ZiweiViewController.swift；外部副本與系統備份不受App刪除控制，不能宣稱永遠只留手機 |
| 本機清除刪profile及records，已保存／分享副本須另刪 | Store.clearAll；語言偏好是獨立鍵，沒有承諾一併清除或安全抹除 |

已確認法定發布者／版權姓名Kurt Chiang及私人審查email lwbro@me.com（2026-10-08 12:25:33 UTC）；Kurt仍需提供或核對：Apple seller帳號是否相符、完整版權文字／年份與私人審查姓名／電話；已授權policy／support HTTPS目的地與生效日；支援信由誰／哪個服務收取、用作什麼、是否轉交、多久刪、附件及刪除請求如何處理；此App是否另有與候選不同的版本／服務／資料用途；內容及圖示權利人。不推定審查聯絡姓名為Kurt Chiang，不由品牌或姓名推定seller帳號相符；此審查email來自明確回覆，而不是沿用公開email作假設。

工程負責核對SDK、最終archive與metadata／policy一致性、依Apple定義提出標籤／問卷答案草稿，將不確定項目解釋給權利人確認。裝置內儲存本身不是Apple定義的離機collection；主動支援收信是否需申報須依真實流程逐條判斷，不自動套用optional-disclosure例外。[Apple privacy定義](https://developer.apple.com/app-store/app-privacy-details/)

## 精確候選 SDK／privacy／crypto 背景稽核補充

程式仍1019c38，沒有重做已通過的75／25／165／35檢查或compile。本輪新增唯讀工具 `python3 native/audit_submission_technical.py`：核對既有來源SHA、15個完整封裝資產、4個8.4.1 SDK鎖定binary、3個包內manifest、App config、nm imports／otool依賴及JS能力呼叫，報告 `build/submission-technical-audit.json`。精確包為既有unsigned simulator Release；四個舊device archives只有6／6／8／9個資產相符，不可冒充新候選或final distribution。

SDK是既有Capacitor/Cordova 8.4.1 hash provenance，不從framework plist的1.0推定版本。重要限制：Capacitor內建HTTP／Cookies plugins，不因packageClassList空白而移除；fetch/XHR native patching預設關閉，候選JS沒有呼叫native HTTP，CSP只約束Web內容，不能證明native bridge網路絕對不可用。Release已排除UI-test trace／fixture；仍需協調者的精確device包／原生流量驗證。

crypto掃描找到Apple CC_SHA256雜湊及NSURLSession能力，未找到App自訂payload／backup cipher，Info.plist非豁免加密值是false。雜湊不是資料加密；不能因App離線或manifest空白就回答「完全沒有任何crypto／network」。技術答案與限制已同步既有[審閱表](../store/review-kit/submission-readiness.html)及[owner TXT](../store/review-kit/owner-decisions.txt)，canonical來源content.json的technicalQuestionnaireDraft。2026-10-08 owner補充已同步法定發布者／版權姓名與審查email；seller帳號核對、完整版權文字／年份、審查姓名／電話、其餘營運／權利事實及最終帳號聲明仍待確認。既有技術稽核報告與工具0bdc228未變。

最終現成device App由Glyco提供後，用 `python3 native/audit_submission_technical.py --app /absolute/path/App.app --report build/submission-technical-final-device.json` 重核精確包；本工具不build、不執行App、不啟動模擬器、不簽名或上傳。它即使通過，也不代表Apple validation、privacy report、原生UI／網路試跑或實機通過。若候選程式改動，先更新來源證據再核對，不把1019c38證據套用。

共享Xcode cache現況：checkout及artifact收據是8.5.0，四個binary都與候選鎖定hash不同。候選仍是原鎖定bytes，不推定升級；不得用新cache替換，既有build hash guard會拒絕不同bytes。SDK的8.4.1標籤依歷史provenance，未重新下載官方zip作獨立版本鑑定。可加 `--sdk-cache /Users/kurtchiang/Library/Developer/Xcode/DerivedData/App-avipleewibbxxvgobkbehvmoupaw/SourcePackages` 重現此唯讀cache對照。

本次僅更新既有本機Store審閱文件及衍生ZIP，沒有更動1019c38候選的App內privacy.html或封裝內容；新法定姓名尚未加入已安裝版／原生候選。公開policy仍是未發布草稿，最終privacy聲明未填。
