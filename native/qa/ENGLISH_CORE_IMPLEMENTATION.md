# English / Traditional Chinese core screens — 2026-10-07

The existing isolated Ziwei App now offers an English core flow across Daily, Birth chart, Entries, Trends and Settings, with a persistent Language / 語言 control. This implements the bounded follow-up from [English copy reference](ENGLISH_CORE_FLOW_DRAFT.md). It is background-browser verified and unsigned-build verified, not native UI or customer validation. No physical phone, foreground UI, unlock, account, upload or credential action was performed. Parent reports the Mac remains locked / loginwindow.

Before work, this isolated checkout was clean at `8dfa8de`; the agent tree listed only this worker. The sandbox denied a full-machine process listing, so no claim is made about every Mac background process. Work stayed in this checkout; the original project’s untracked relay directories are preserved.

## Delivered scope

| Area | Implemented English core flow |
|---|---|
| Shared navigation | Five enabled offline tabs, App title, profile summary and English / 繁體中文 selection. Chinese browser languages default to Traditional Chinese; others default to English unless a saved preference exists. |
| Settings | Cultural onboarding, first steps, birth labels, optional name, chart gender labels, save feedback, civil-time/DST limits, backup/deletion and About. Local native privacy information is available in the selected language, with unchanged legal placeholders and full MIT licenses. |
| Daily | Selected date / Today, calendar section headings and explanations, mood/energy labels and accessible ratings, preset tags, notes, explicit save, session-only draft feedback and recoverable validation/storage errors. |
| Birth chart | English overview of twelve palaces/four pillars, navigation help and buttons, headings/table roles and short day-master/five-element explanation. Detailed traditional chart values remain Chinese. |
| Entries | JSON/CSV buttons, merge guidance, English save/import/share status, mobile field labels, edit/delete actions and confirmation. Preset tag displays follow the selected language; authored text is kept. |
| Trends | Range/metric choices, zero/one-entry guidance, headings/legend, chart summaries, historical-average threshold and fourteen-day preview explanations/weekdays. Adjacent endpoint date labels no longer collide. No forecast algorithm or statistical formula changed. |

Language switching preserves the current tab, date, unsaved note/ratings/tags/unfinished tag and unsaved birth fields. It does not reset the forms or auto-save a profile/journal entry. The independent `zwbz.language` preference follows the same optional namespace suffix as existing storage. Preference write failure keeps the selected language for the session and shows a message. It is not part of the JSON backup. Existing birth gender values (`男`/`女`), tag identities, data keys, schemas and merge rules are unchanged.

Translation is confined to presentation text/labels using a project-specific `ZWBZI18n` namespace. The chart vendor’s own `I18n` global is untouched. User names, note cells, custom tags and chart category text have explicit protection; known preset tag labels are rendered from their canonical identity. A canonical status-message value prevents language translation from repeatedly replacing a polite live status on every keystroke. The English tab/table wrapping also handles narrow screens with enlarged text.

## Verified evidence

All inputs were synthetic and all browser profiles were temporary. Headless Chromium used loopback resources; native share/import were mocked in browser tests. Test scripts ran sequentially because each prepares the native assets.

| Check | Result | Evidence |
|---|---|---|
| Language switching/data/English layout | 75 passed | [Report](../../build/language-checks.json), [flow](../../test/language-checks.html), [runner](../../test/run_language_checks.py) |
| Existing draft/status recovery | 25 passed | [Report](../../build/ux-regression-checks.json) |
| Existing Traditional Chinese responsive/navigation checks | 165 passed | [Report](../../build/layout-checks.json) |
| Existing offline data/network isolation | 35 passed | [Report](../../build/offline-release-checks.json) |
| Generic iOS Simulator arm64 Release | Unsigned compilation succeeded | [Source hashes/build result](../../build/english-core-native-compile.json), [log](../../build/english-core-native-compile.log) |
| Five synthetic browser screens | Captured and visually inspected; not Store iOS screenshots | [Settings](../../build/english-core-browser-settings.png), [Daily draft](../../build/english-core-browser-draft.png), [Birth chart](../../build/english-core-browser-chart.png), [Entries](../../build/english-core-browser-entries.png), [Trends](../../build/english-core-browser-trends.png), [manifest](../../build/english-core-browser-screenshots.json) |

English layout checks cover all five tabs at 320/375/430/932 px and 16/24 px root font sizes. The language flow checks fresh English defaults; switching back to Chinese; unsaved birth fields and journal drafts; canonical preset tags; user strings identical to UI labels; explicit save; English delete cancellation and import failure; JSON compatibility; two-entry trend guidance; a 12-entry fixture producing the fourteen-day historical summary; preference quota/reload; and local English privacy/license navigation. A fixed-profile/fixed-date comparison also verifies calculation output is identical across language switching. Adjacent line-chart date ticks are checked for overlap. No coherent US system timezone was established by these browser checks.

Run `python3 test/run_language_checks.py`, `python3 test/run_ux_checks.py`, `python3 test/run_layout_checks.py` and `python3 test/run_offline_release_checks.py` from the repo root, using the already-installed cached browser. No downloads are authorized by these commands. The build uses the documented generic unsigned native workflow with Conda compiler overrides removed in a temporary staging directory, without launching or installing a simulator.

## Remaining Chinese and scope limits

- Original star/palace names, stems/branches, relationship names, lunar/solar-term strings, Nayin, animal/element class and detailed chart annotations remain Chinese. The English reading guide explains this; these results are not fully localized chart terminology.
- User-authored names, notes and non-preset tags retain their original language, including Chinese. They are never translated or rewritten in storage. Preset tag values remain canonical Chinese in backups while their UI labels can be English.
- CSV column names and derived traditional values keep the existing export format. JSON’s existing schema is unchanged.
- Native date/time picker, Files and share-sheet labels follow iOS/system language settings; App language selection does not configure the OS. Those controls have not been retested on this candidate.
- Legacy personalized web entry pages and the existing web-only AI/sync panels remain outside this localization. The approved native offline package continues to exclude those service implementations and hides their navigation.

Native English navigation, keyboard/safe area, rotation, local privacy return and actual Files regressions remain pending until Mac foreground use is coordinated after unlocking. Physical VoiceOver/Dynamic Type and current iOS screenshots remain open. The prior `9f737e0` native Files passes and `206bbbb` compile-only keyboard change are historical evidence, not proof this bilingual candidate passes native UI. Installed development runtime remains `9f737e0`; no new install occurred.

Store/support/reviewer drafts now describe English and Traditional Chinese **core screens**, retaining the traditional-name limitation. Account primary language, pricing/storefronts and legal/privacy/age/export declarations were not changed. The local kit retains its older iOS images as historical material; browser images are not substituted as upload candidates.

Birthplace/time-zone conversion, DST gap/overlap handling, true-solar correction and worldwide calculation validation remain unimplemented/unverified. `js/engine.js`, `js/store.js`, native service isolation and the native controller are byte-identical to the prior checkpoint. Astrology remains cultural interpretation, not scientifically established predictions or medical/financial advice.
