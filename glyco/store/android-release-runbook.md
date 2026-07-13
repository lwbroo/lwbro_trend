# Android release runbook

The Android project itself already builds successfully from the command line in this
repo (`./gradlew assembleDebug`, verified with a local SDK install — no Android Studio
or Google account needed for that part). The steps below need a Google account, a
Play Console enrollment fee, and (optionally, for convenience) Android Studio.

## 1. Create a Google Play Console account
https://play.google.com/console/signup — $25 one-time fee, needs a Google account.

## 2. (Optional) Install Android Studio
Not strictly required — everything can be done with the command-line SDK already set
up in this environment — but Android Studio gives you a device emulator UI, layout
inspector, and an easier signing/upload flow. Download from
https://developer.android.com/studio if you want it.

## 3. Generate a release signing key
```
cd glyco/android
keytool -genkey -v -keystore glycoorder-release.keystore -alias glycoorder \
  -keyalg RSA -keysize 2048 -validity 10000
```
**Back this file up somewhere safe outside git** — if you lose it, you can never
update the app under the same listing again. It is already covered by
`android/.gitignore`'s broad `*.keystore`/`*.jks` patterns if present; double check
before committing anything in `android/`.

Wire it into `android/app/build.gradle`'s `signingConfigs`/`buildTypes.release` block
(Capacitor's default template ships without release signing configured — this is a
manual one-time edit), or let Android Studio's "Generate Signed Bundle/APK" wizard do
it interactively.

## 4. Build the release bundle
```
cd glyco/android
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools   # if not already set
export JAVA_HOME=/opt/homebrew/opt/openjdk@21                       # Capacitor 8 needs JDK 21
./gradlew bundleRelease
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`

## 5. Create the app in Play Console
Play Console → Create app
- Package name: `com.lwbroo.glycoorder` (must match `android/variables.gradle` /
  `android/app/build.gradle`'s `applicationId`, already set)
- Fill in name, category (Health & Fitness likely), description
- **Privacy Policy URL**: `https://lwbroo.github.io/lwbro_trend/glyco/privacy.html`
- **Data Safety form**: fill in using `play-data-safety.md` in this folder
- **Content rating questionnaire**: answer honestly (no violence/objectionable
  content; if asked about medical/health claims, see the framing in
  `app-review-notes.md` — informational dietary-order guidance, not a medical device)
- **Target audience**: general/adult, not primarily for children

## 6. Create the subscription product
Play Console → your app → Monetize → **Subscriptions** → create a subscription,
choose base plan pricing (monthly/annual — your call, not decided in this codebase
yet). Note the **Product ID** for RevenueCat (see `revenuecat-setup.md`).

## 7. Upload the bundle to a testing track
Play Console → Testing → **Internal testing** (fastest to set up) → create a release,
upload the `.aab` from step 4, add yourself as a tester, install via the opt-in link.
Run through the full flow on a real device: photo → analysis → quota chip → paywall →
purchase (test track purchases can use license testers, configured in Play Console →
Setup → License testing) → restore.

## 8. Promote to production
Once internal testing looks right and RevenueCat is fully wired (see
`revenuecat-setup.md`), promote the same release to Production, fill in the
**Store listing** (screenshots — grab these from a running emulator or device,
`adb shell screencap` or Android Studio's device frame screenshot tool), and submit
for review.

## Reference
- `revenuecat-setup.md` — dashboard config needed alongside this
- `play-data-safety.md` — paste directly into the Data Safety form
- `ios-release-runbook.md` — the iOS equivalent, useful for cross-checking listing
  consistency between stores
