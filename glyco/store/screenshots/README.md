# Screenshots

⚠️ **ALL 6 screenshots below are stale as of the rename to Glyco Navigator** — every
one still shows the old app name "GlycoOrder" in the header (verified 2026-08-10 by
opening each file). `android-04-settings.png` is additionally stale on the free-tier
copy (reads "Free plan — 5 analyses/week", changed to 3/week since). **All 6 must be
retaken before store submission** — this sandbox has no Android emulator or Xcode/iOS
Simulator to redo them from here; retake on the Mac once Xcode is installed (iOS
Simulator, no device needed) and/or Android Studio's emulator is available.

Real captures from the debug APK running on an Android emulator (Pixel 7 profile,
API 36), not mockups — `adb exec-out screencap` against the actual native build.

- `android-01-analyze.png` — Analyze tab, empty state — **stale app name**
- `android-02-log.png` — Log tab, empty state — **stale app name**
- `android-03-trends.png` — Trends tab, empty state (fills in with charts once meals
  are logged with follow-up data) — **stale app name**
- `android-04-settings.png` — Settings tab, light theme — Subscription card + Restore
  purchases, confirmed rendering only on a native build (`Capacitor.isNativePlatform()`).
  **Stale app name AND stale free-tier copy**: still reads "Free plan — 5
  analyses/week" (the app said 5 when this was taken; it's 3 now).
- `android-05-dark.png` — Settings tab, dark theme — **stale app name**
- `ios-01-analyze.png` — Analyze tab on a real iOS Simulator, captured by
  `.github/workflows/glyco-ios-build.yml` (GitHub's macOS runners have full Xcode;
  this local dev environment only has Command Line Tools, no iOS compiler at all).
  This is a genuine Xcode build + simulator boot, not a mockup — proof the iOS
  project actually compiles, even before an Apple Developer account exists for
  signing/device/App Store builds. **Stale app name.**

These are raw device captures — crop/frame them in whatever tool you use for the
actual store listings (device frames, required aspect ratios, etc.). Retake once real
meal data exists to show the Analyze-result/Trends-with-data states. For more iOS
screens (Log/Trends/Settings, dark mode), extend the CI workflow's screenshot step the
same way the Android ones were captured, or just run it once Xcode is available
locally/on a real device.
