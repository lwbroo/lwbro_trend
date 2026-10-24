# Bounded UX fixes — 2026-10-06

The isolated Ziwei project continues at `/Users/kurtchiang/Documents/Codex/2026-10-04/task-2/ziwei-bazi-trend`. This candidate follows the [US first-user review](US_USER_TEST_RESULTS.md) of runtime `9f737e0`; it does not replace that review with a new native UI pass. The original repositories and their dirty relay folders are untouched.

## Verified browser fixes

Daily entries now retain unsaved notes, mood/energy ratings, selected tags, newly added tags and unfinished tag input when navigating tabs or switching dates. Each date has its own session draft. Navigation never writes a record; explicit Save entry commits it. Failed validation or storage writes retain the draft for retry. Confirmed deletion removes that date's draft; confirmed Clear All Data removes all session drafts. Saved records and JSON formats are unchanged.

Drafts are memory-only and labelled as unsaved, retained only during this opening. Closing/reloading the App can discard them. This is not persistent autosave or restart recovery.

Save/import/share failures use explicit error text, dark red styling, `role="alert"`, assertive live announcements and atomic messages. Success/cancellation/draft messages use polite status announcements. Measured error-text contrast is 7.75:1 against the App background. Browser semantics do not establish physical VoiceOver support.

Birth-time fields now show Chinese and English limitations linked through `aria-describedby`: entered civil time is used without birthplace time-zone conversion, DST gap/overlap disambiguation or true-solar-time correction. This English hint is implemented; the core interface remains Traditional Chinese.

## Native keyboard containment candidate — compiled, UI verification pending

The existing WKWebView is contained inside a UIKit view and constrained to its safe area, with clipping enabled. CSS native inset values become zero when those safe-area edges are already excluded, avoiding duplicate padding. This addresses the observed clock/header overlap when keyboard scrolling shifted web content during the earlier review.

The implementation follows the pinned [Capacitor 8.4.1 bridge controller](https://raw.githubusercontent.com/ionic-team/capacitor/8.4.1/ios/Capacitor/Capacitor/CAPBridgeViewController.swift), whose `loadView` assigns the WKWebView as the root view. The candidate adds containment after the superclass loads the page rather than resizing that root view directly.

Unsigned Release compilation for generic iOS Simulator arm64 succeeded using already-installed Xcode and locally cached frameworks. No simulator was launched or installed, and no physical phone was used. Compilation does not prove the keyboard problem is fixed. Glyco currently owns foreground simulator access, so the following checks remain pending:

- Focus name and note fields, type and dismiss the keyboard; verify text and header remain visible and scrollable.
- Rotate portrait/landscape and check top/bottom/side safe areas, tabs and no double inset.
- Open local privacy content and return, then repeat keyboard focus.
- Recheck native JSON picker and share/Save to Files presentation because controller containment changed.
- Verify error announcements and enlarged text with native/physical accessibility tooling when coordinated.

The installed development build remains `9f737e0`. Existing Store screenshots reflect earlier builds and must be rechecked/replaced before submission for this UX candidate.

## Evidence and reproduction

All test inputs were synthetic. Background headless Chromium used isolated temporary profiles and loopback resources; native import/share operations were mocked in the browser test. No external birth data, foreground browser, phone, credentials, installs or publishing were used.

| Verification | Result | Evidence |
|---|---|---|
| Draft/status/recovery/English limitation | 25 passed | [UX report](../../build/ux-regression-checks.json) |
| Responsive layout at 320/375/430/932 px and enlarged text | 165 passed | [Layout report](../../build/layout-checks.json) |
| Offline local-data, import/rollback and network boundary | 35 passed | [Offline report](../../build/offline-release-checks.json) |
| Final native containment source | Release compile succeeded | [Compile report](../../build/ux-fix-native-compile.json), [log](../../build/ux-fix-native-compile.log) |
| Synthetic browser screenshots, visually inspected | 3 | [Draft](../../build/ux-fix-browser-draft.png), [error](../../build/ux-fix-browser-error.png), [birth-time limit](../../build/ux-fix-browser-limits.png), [SHA manifest](../../build/ux-fix-browser-screenshots.json) |

From the repository root, run `python3 test/run_ux_checks.py`, `python3 test/run_layout_checks.py` and `python3 test/run_offline_release_checks.py` sequentially because each prepares the native web assets. They use the existing cached headless browser; a missing runtime is a blocker, not authorization to install software. For unsigned compilation, use the documented native build workflow in [README](../README.md) in a temporary staging directory with Conda compiler overrides removed and a generic destination; do not launch the UI runner until simulator ownership is released.

## English and international scope

[English core-flow draft](ENGLISH_CORE_FLOW_DRAFT.md) provides onboarding, chart terminology, entry/draft/recovery copy and explicit cultural limitations. It is a draft for review, not complete localization. Store listing, support, privacy and reviewer drafts now disclose the Chinese core interface and unsupported time-zone/DST correction. Legal identity, policy dates and actual Store account fields remain unfilled/unmodified.

The confirmed product target is US first, global reach. A future calculation decision is still needed:

1. Retain civil-time-only interpretation, disclose the limits and avoid claiming validated worldwide corrected birth charts.
2. Separately scope birthplace/time-zone-aware calculations, including a supported historical range, time-zone source, DST gap/overlap behavior, solar-term and chart-rule conventions, optional true-solar correction and independent reference fixtures.

No astrology algorithm, time-zone conversion, DST resolver, birthplace service or major feature was added. Astrology outputs remain cultural interpretations rather than scientifically established predictions or medical/financial advice.
