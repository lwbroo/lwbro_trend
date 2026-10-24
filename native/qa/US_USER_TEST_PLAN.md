# Ziwei Bazi simulated US first-user review — 2026-10-06

Review this plan before execution. This is a simulated US-user QA exercise with synthetic data, not customer validation or proof of astrology/calendar accuracy across countries. The product target is now United States first and global; the previous Taiwan-only proposal is superseded. No storefront setting is changed.

Persona: an English-speaking adult in New York who has never used Ziwei or Bazi, wants to understand the chart and keep a daily mood/energy journal, and expects US dates, clear privacy explanations and recoverable mistakes. Success means they can discover setup, enter a fictitious profile, understand the limitations, save/find/edit a record and restore a local backup without outside services.

Candidate: native free offline Release `9f737e0`, `com.lwbroo.ziweibazi`, version 1.0/build 1. Documentation-only `e02c3d9` does not change its runtime. Use a newly created owned iPhone simulator with installed iOS 26.5, initially iPhone 17 Pro; a small-device follow-up is conditional on a concrete readability issue. XCTest drives actual accessible controls, typing, taps, swipes, the keyboard and UIKit Files/share sheets. Inspect the resulting screenshots; test assertion counts alone are not UX evidence. No app fixture bootstrap or localStorage injection.

Request English language/en-US locale through the app's launch settings and the owned simulator. Request `America/New_York` where the supported environment permits it; record whether actual date/timezone presentation is verified, rather than treating a requested setting as proof. The app currently renders Traditional Chinese; English listing text is not an English UI. The current engine uses the entered civil birth date/time without birthplace, birthplace timezone, DST disambiguation or true-solar-time correction. Document a gap; do not add an algorithm in this review.

Fixtures (all fictitious, local only):

- Profile: `Demo US User`, January 2, 2000, 12:00 PM, female. Leap-day variant: February 29, 2000. US date ambiguity probe: January 2 versus February 1.
- Journal: mood 4, energy 3, note `Synthetic US review — first day`; edited note `Synthetic US review — edited`; no real health or birth data.
- DST interpretation probes: New York March 10, 2024 at 02:30 (gap), November 3, 2024 at 01:30 (overlap). These expose unsupported interpretation choices, not a required computed answer.
- Local Documents: valid merge JSON, invalid JSON, UTF-8 malformed file, >5 MB JSON and a repeated valid file. Use known synthetic repository fixtures with SHA checks. Export to the owned simulator's local Files folder only, never a cloud provider.

Severity: P0 data loss/security boundary; P1 prevents a core task or makes the US experience unusable; P2 confusing/error-prone but recoverable; P3 polish. A failed automation locator is BLOCKED, not automatically a product defect.

| ID / severity if broken | Actual interaction steps | Expected result / evidence |
|---|---|---|
| US01 / P1 | Fresh install and launch; inspect first viewport, empty chart/records/trends and available tabs. | A first-time user can discover the next step. Capture first screen and each empty state; record whether instructions/controls are understandable to an English-only user. |
| US02 / P1 | Go to Settings; submit incomplete profile; fill name/date/time/gender through controls and save. | Clear validation; US date order is distinguishable; no accidental date conversion; valid save opens the chart. Capture missing-field feedback, picker, keyboard and result. |
| US03 / P2 | Read Ziwei/Bazi results; scroll the twelve palaces horizontally, then the lower Bazi section. | Chart is navigable without moving the whole page sideways; terms and cultural limitations are discoverable. Record unfamiliar terminology and any obstructed controls. No scientific-prediction claim. |
| US04 / P1 | Select mood/energy, enter synthetic note, save; open Records; quit/relaunch; reopen record and edit/save. | Saved status is visible, one date creates one record, text survives restart and edit does not duplicate. Capture save, card, edited form and reopened content. |
| US05 / P1 | Switch the Daily date, create another record, return to today, switch tabs while form is partly filled. | Selected date is visible; records attach to the intended civil date. Record whether an unsaved draft is lost or clearly warned about. Capture date control and resulting cards. |
| US06 / P2 | View Trends with zero, one, then two entries; inspect filters and historical-average preview threshold. | Useful empty/minimum-data explanation, legible axes and no implication of reliable prediction. Capture each reached state; distinguish ten-entry preview from two-entry trends. |
| US07 / P1 | Open import, cancel and reopen; use actual Files to select malformed/oversized files, then valid and repeated merge. | Cancel/error returns to a usable screen and preserves the profile and existing records; merge rules are understandable. Capture native picker and exact status. Stop a blocked navigation stage instead of blind retries. |
| US08 / P0 | Export JSON; cancel share; export again and Save to Files; select exported file for import; inspect synthetic export. | Real local roundtrip retains nonempty data, cancelled share remains recoverable, export contains no sync credentials. Capture share sheet/local destination, restored state and synthetic file evidence. |
| US09 / P1 | Change to leap-day/date-bound probes and inspect date/time validation. | Invalid civil dates are rejected without corrupting the previous profile. Record actual code bounds versus demonstrated engine bounds; do not infer that accepted years all yield valid astrology. |
| US10 / P1 | Inspect how a US user would specify birthplace/timezone and ambiguous/gap DST times. | Existing lack of correction is visible before reliance on results. Capture the relevant Settings/result disclosure; DST/international algorithm correctness stays unverified. |
| US11 / P2 | Read Settings, local privacy page and return link; inspect backup/clear wording. | Local storage, optional manual sharing, external copies and support email are understandable. Do not finalize legal/retention facts or clear another user's data. |
| US12 / P1 | With keyboard visible, scroll and switch tabs; rotate the owned simulator; inspect large text and available accessibility audit. | Essential controls remain usable and selected date/status stays readable. Capture layout and audit findings. A simulator audit is not physical VoiceOver/Dynamic Type validation. |

For each case record: PASS / ISSUE / BLOCKED / UNTESTED, actual steps reached, exact visible text, screenshot/attachment path, synthetic before/after data when available, and severity. Keep source commit, build configuration, device/runtime, locale/timezone request and actual verification in the result. Distinguish UI observations from source inspection and unsupported international calculations.

Only a clearly demonstrated, small reversible UX change within existing behavior may be fixed (for example an actionable empty-state link or a clipped label). Preserve the observed before state and verify the same interaction after the fix. Translation, new timezone/birthplace algorithms, legal policy, network/AI, account/signing changes, paid calls, publishing and phone installation are outside this pass.

Archive screenshots, hierarchy attachments and local synthetic file evidence under `build/`; keep the reusable UI walkthrough in `native/tests/`. Shut down/delete only the exact newly created review simulator after preserving evidence. Release foreground simulator ownership to Glyco and report incomplete cases honestly.
