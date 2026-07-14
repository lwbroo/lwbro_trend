# Screenshots

Real captures from the debug APK running on an Android emulator (Pixel 7 profile,
API 36), not mockups — `adb exec-out screencap` against the actual native build.

- `android-01-analyze.png` — Analyze tab, empty state
- `android-02-log.png` — Log tab, empty state
- `android-03-trends.png` — Trends tab, empty state (fills in with charts once meals
  are logged with follow-up data)
- `android-04-settings.png` — Settings tab, light theme — note the Subscription card
  showing "Free plan — 5 analyses/week" + Restore purchases: this only renders on a
  native build (`Capacitor.isNativePlatform()`), confirmed working here for real
- `android-05-dark.png` — Settings tab, dark theme
- `ios-01-analyze.png` — Analyze tab on a real iOS Simulator, captured by
  `.github/workflows/glyco-ios-build.yml` (GitHub's macOS runners have full Xcode;
  this local dev environment only has Command Line Tools, no iOS compiler at all).
  This is a genuine Xcode build + simulator boot, not a mockup — proof the iOS
  project actually compiles, even before an Apple Developer account exists for
  signing/device/App Store builds.

These are raw device captures — crop/frame them in whatever tool you use for the
actual store listings (device frames, required aspect ratios, etc.). Retake once real
meal data exists to show the Analyze-result/Trends-with-data states. For more iOS
screens (Log/Trends/Settings, dark mode), extend the CI workflow's screenshot step the
same way the Android ones were captured, or just run it once Xcode is available
locally/on a real device.
