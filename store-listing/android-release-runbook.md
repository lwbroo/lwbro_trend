# Android 上架流程

Android 專案本身已經在這個 repo 裡用命令列驗證過真的組得起來
（`.github/workflows/ziweibazi-android-build.yml` 在 GitHub 的 runner 上真的跑出
一個 debug APK，見 https://github.com/lwbroo/lwbro_trend/actions/runs/34361974217
那次成功紀錄），不需要 Android Studio 或 Google 帳號。下面這些步驟需要 Google
帳號、Play Console 的申請費，以及（選用）Android Studio。

## 1. 申請 Google Play Console 帳號
https://play.google.com/console/signup —— $25 一次性費用，需要 Google 帳號。

## 2.（選用）安裝 Android Studio
不是必要的——命令列的 SDK 這個環境已經裝好了——但 Android Studio 有模擬器
UI、layout inspector，簽章/上傳的流程也比較好操作。要裝的話：
https://developer.android.com/studio

## 3. 產生 release 簽章金鑰
```bash
cd android
keytool -genkey -v -keystore ziweibazi-release.keystore -alias ziweibazi \
  -keyalg RSA -keysize 2048 -validity 10000
```
**這個檔案要另外備份在 git 以外的地方保管好**——搞丟的話同一個上架列表之後
就無法再更新。`android/.gitignore` 已經有涵蓋 `*.keystore`/`*.jks` 的規則，
但送出前還是要自己確認一次 `android/` 底下沒有不小心把這個檔案加進 git。

接著要接進 `android/app/build.gradle` 的 `signingConfigs`/`buildTypes.release`
區塊（Capacitor 預設的範本沒有帶 release 簽章設定，這是要手動加一次的），
或是讓 Android Studio 的「Generate Signed Bundle/APK」精靈互動式帶你做。

## 4. Build release bundle
```bash
cd android
./gradlew bundleRelease
```
產出：`android/app/build/outputs/bundle/release/app-release.aab`

## 5. 到 Play Console 建立 App
Play Console → Create app
- Package name：`com.lwbroo.ziweibazi`（要跟 `android/variables.gradle` /
  `android/app/build.gradle` 的 `applicationId` 一致，已經設定好）
- 名稱、分類（生活風格 Lifestyle）、說明：照抄 `store-listing/listing-copy.md`
- **隱私權政策網址**：`https://lwbroo.github.io/lwbro_trend/privacy.html`
- **Data Safety 表單**：照 `store-listing/play-data-safety.md` 填
- **內容分級問卷**：如實回答（命理/占卜類內容照問卷實際選項填即可）
- **目標受眾**：一般／成人，不是主要給兒童使用的 App

## 6. 訂閱／內購——目前還不適用
這個 App 目前沒有訂閱或付費功能（AI 功能對所有人免費，只有用量上限）。
之後如果走商業化，這步驟才需要回頭做（Play Console → Monetize →
Subscriptions），可以參考 `glyco/store/revenuecat-setup.md` 的接法。

## 7. 上傳到測試軌道
Play Console → Testing → **Internal testing**（設定最快）→ 建立一個 release，
上傳第 4 步的 `.aab`、加自己當測試者、透過連結安裝。在真機上完整跑一次流程：
出生資料 → 今日流運 → AI 解讀 → AI 問答 → 記錄 → 趨勢分析。

## 8. 推上正式版
Internal testing 沒問題後，把同一個 release 推到 Production，填好 **Store
listing**（截圖可以用 `adb shell screencap` 或 Android Studio 的裝置截圖工具
在跑起來的模擬器/真機上截），送出審核。

## 參考
- `play-data-safety.md` —— 直接照著填 Data Safety 表單
- `app-review-notes.md` —— 原本是寫給 Apple 審核用的，內容分級問卷遇到
  類似問題時也可以參考同樣的說法
- `ios-release-runbook.md` —— iOS 對應版本，兩邊文案要保持一致時可以互相對照
