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

These are raw device captures (1080×2400) — crop/frame them in whatever tool you use
for the actual Play Store listing (device frames, required aspect ratios, etc.).
Retake once real meal data exists to show the Analyze-result/Trends-with-data states,
and once iOS is buildable, get the equivalent set from a simulator/device for App
Store Connect (`ios-release-runbook.md`).
