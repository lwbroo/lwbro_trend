# English core flow draft — US first, global product target

This copy was the basis for the implemented English/Traditional Chinese core-screen follow-up. See [implementation and verification](ENGLISH_CORE_IMPLEMENTATION.md) for exact delivered scope. Detailed traditional chart names remain Chinese, and native iOS UI has not been verified. The tables below preserve the copy/design reference rather than claiming every detailed chart term is translated. No international calculation capability is implied.

## First visit

**Traditional charts and your daily journal**

Explore Ziwei and Bazi as cultural traditions, and keep your own mood and energy notes. Charts are interpretive content, not scientifically established predictions or medical, mental-health or financial advice.

**Before you enter a birth time**

This version uses the Gregorian date and civil time exactly as entered. It does not convert birthplace time zones, resolve daylight-saving times that occur twice or do not exist, or calculate true solar time. An international birth chart should not be treated as corrected or validated. Daily calendar references use noon on the selected date.

**Your data stays in the App**

This offline version has no AI service, account, automatic tracking or App cloud sync. You can choose to export a backup. Your selected sharing destination and system backup settings may involve cloud services. Keep a backup before removing the App or changing devices.

Suggested first steps: enter a profile or use fictitious details to explore; open Birth chart; record a day's mood or energy and tap Save entry; return to Entries to reopen it. Trends begin after two entries. The historical-average preview needs at least ten entries with the chosen metric.

## Names and short explanations

| Current label / term | Proposed English | Help text |
|---|---|---|
| 今日流運 | Daily | Calendar references for a chosen date, followed by your journal entry. |
| 本命盤 | Birth chart | Your Ziwei and Bazi charts based on the entered birth details. |
| 記錄 | Entries | Find, edit, delete or back up saved daily entries. |
| 趨勢分析 | Trends | Summaries of what you recorded; associations do not establish cause or predictive accuracy. |
| 設定 | Settings | Birth details, local backup, data deletion and privacy information. |
| 紫微斗數 | Ziwei Doushu | A traditional Chinese chart organized into twelve “palaces,” or theme areas. |
| 八字／四柱 | Bazi / Four pillars | A traditional chart organized by birth year, month, day and hour. |
| 命宮／宮位 | Life palace / Palace | Names for traditional chart areas; they do not determine real-life outcomes. |
| 日主 | Day master | A reference from the day pillar used for traditional chart relationships. |
| 五行 | Five elements | Wood, Fire, Earth, Metal and Water: symbolic categories in this tradition. |
| 十神 | Ten relationships | Traditional relationship labels within Bazi, not literal gods or personality diagnoses. |
| 未來14天個人流日預覽 | Historical-average day preview | A summary using similar calendar groups in your past entries; it does not predict events. |

Preserve Chinese chart names alongside short English labels where a direct translation could imply an unsupported meaning. Detailed glossary content needs cultural/content review before localization.

## Forms, drafts and recovery

| Control / state | Draft English copy |
|---|---|
| 姓名 | Name (optional) |
| 出生日期 | Birth date — Gregorian calendar |
| 出生時間 | Birth time — used exactly as entered |
| 性別 | Chart gender setting: Male / Female. This setting is used in the current traditional chart rules. |
| 儲存並排盤 | Save profile and open chart |
| 日期／回到今天 | Entry date / Today. Entry cards use YYYY-MM-DD. |
| 心情／精力 | Mood / Energy: 1 is low, 5 is high. |
| 筆記／儲存記錄 | Notes (optional) / Save entry |
| 草稿 | Unsaved draft — kept during this session. Tap Save entry to store it. Closing the App can discard an unsaved draft. |
| 保存成功 | Entry saved for {date}. |
| 缺少評分 | Choose at least one mood or energy rating, then save again. Your draft is still here. |
| 儲存失敗 | Couldn't save this entry. Your draft is still here during this session; keep the App open and try again. |
| 匯出 JSON／CSV | Export JSON backup / Export CSV |
| 匯入 JSON | Import JSON and merge entries |
| 匯入規則 | Adds missing dates and updates a matching date only when the imported modification is newer. Keeps your existing birth profile. It does not replace the whole database. |
| 匯入失敗 | Couldn't import this file. Your saved App data has not changed. Choose a valid UTF-8 JSON backup of 5 MB or less. |
| 匯入／分享取消 | Import cancelled / Sharing cancelled. Your saved entries are unchanged. |
| 清除全部資料 | Delete all App data. This also discards unsaved session drafts. Saved/shared backup copies must be deleted separately at their destinations. |

Use explicit error text, a distinct high-contrast error style and an alert announcement. Do not rely on color alone. Saved/cancelled/unsaved states should use polite status announcements.

## International calculation decision still needed

Choose the intended calculation scope before describing the App as ready for international birth charts:

- **Civil-time interpretation only:** retain the current inputs/rules and clear bilingual limitations. The global target describes availability, not worldwide corrected calculations.
- **Birthplace/time-zone-aware calculations:** separately define supported locations and historical date range, time-zone database/source, how DST gaps/overlaps are handled, solar-term reference/time-zone convention, Ziwei/Bazi rule conventions and whether true solar time is included. Validate against independent reference fixtures before making support claims.

No new timezone, birthplace, DST or astrology algorithm is implemented in this pass. Selecting the second scope authorizes design work only when explicitly scoped; it does not imply approval for external birth-data services or transmission.
