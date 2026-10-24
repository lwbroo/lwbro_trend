/* Display-only English/Traditional Chinese UI. Birth/chart/storage schemas are unchanged. */
window.ZWBZI18n = (() => {
  'use strict';
  const key = 'zwbz.language' + (window.ZWBZ_NAMESPACE ? '.' + window.ZWBZ_NAMESPACE : '');
  let preferred; try { preferred = localStorage.getItem(key); } catch (_) {}
  let language = ['en', 'zh-Hant'].includes(preferred) ? preferred : (/^zh/i.test(navigator.language) ? 'zh-Hant' : 'en');
  const originals = new WeakMap(), attributes = new WeakMap();
  const messages = Object.assign(Object.create(null), {
  "紫微八字": "Ziwei Bazi",
  "個人趨勢資料庫": "Personal journal",
  "今日流運": "Daily",
  "本命盤": "Birth chart",
  "記錄": "Entries",
  "趨勢分析": "Trends",
  "設定": "Settings",
  "主要功能": "Main navigation",
  "日期": "Date",
  "回到今天": "Today",
  "當日狀態記錄": "Daily entry",
  "心情": "Mood",
  "精力": "Energy",
  "狀態標籤": "Tags",
  "自訂標籤": "Custom tag",
  "輸入後按 Enter 加入": "Type a tag, then press Enter",
  "筆記": "Notes",
  "今天發生了什麼？（選填）": "What happened today? (optional)",
  "儲存記錄": "Save entry",
  "請先到「設定」輸入出生資料，才能排盤與比對流運。": "Enter birth details in Settings to view calendar references.",
  "請先到「設定」輸入出生資料。": "Enter birth details in Settings.",
  "紫微斗數本命盤": "Ziwei birth chart",
  "（標記：本日的流年／流月／流日命宮與四化）": "Today’s year, month and day chart markers",
  "十二宮保持原有排列。寬盤可左右滑動，或使用下方按鈕查看所有宮位。": "The twelve palaces keep their traditional arrangement. Swipe horizontally or use the buttons.",
  "十二宮保持原有排列。左右滑動或使用按鈕查看所有宮位；鍵盤可用左右方向鍵、Home／End。": "Swipe or use the buttons to explore all twelve palaces. Keyboard: arrow keys, Home / End.",
  "十二宮保持原有排列。": "Twelve palaces in their traditional arrangement.",
  "← 向左": "← Left",
  "向右 →": "Right →",
  "命盤向左捲動": "Scroll chart left",
  "命盤向右捲動": "Scroll chart right",
  "紫微十二宮命盤": "Ziwei twelve-palace chart",
  "八字命盤": "Bazi / Four pillars",
  "五行分佈": "Five elements",
  "匯出 JSON": "Export JSON backup",
  "匯出 CSV": "Export CSV",
  "匯入 JSON": "Import JSON",
  "選擇 JSON 備份": "Choose a JSON backup",
  "期間": "Date range",
  "近 30 天": "Last 30 days",
  "近 90 天": "Last 90 days",
  "近一年": "Last year",
  "全部": "All",
  "指標": "Metric",
  "出生資料": "Birth details",
  "姓名": "Name (optional)",
  "（選填）": "Optional",
  "出生日期": "Birth date",
  "（國曆／西元）": "Gregorian calendar",
  "出生時間": "Birth time",
  "性別": "Chart gender setting",
  "男": "Male",
  "女": "Female",
  "儲存並排盤": "Save profile and open chart",
  "出生資料尚未儲存（僅保留於本次開啟；請按「儲存並排盤」保存）": "Unsaved birth details (kept for this session only; choose Save profile and open chart to save).",
  "開啟說明頁會捨棄尚未儲存的出生資料或日誌草稿。要離開並捨棄嗎？按取消返回儲存。": "Opening this page discards unsaved birth details or journal drafts. Leave and discard them? Cancel to return and save.",
  "資料管理": "Local data",
  "匯出全部資料（JSON）": "Export JSON backup",
  "清除全部資料": "Delete all App data",
  "關於": "About",
  "隱私權政策": "Privacy information",
  "未開啟雲端同步時，所有資料只儲存在你的瀏覽器（localStorage）。換裝置或清瀏覽器資料前，請先匯出 JSON 備份或開啟雲端同步。": "Without sync, data is stored in this browser. Export a JSON backup before changing devices or clearing browser storage.",
  "離線排盤與個人日誌：資料保存在裝置，請定期匯出備份。": "Traditional charts and your daily journal. Data stays on this device; export backups regularly.",
  "資料保存在此 App 的裝置儲存空間。換裝置或移除 App 前，請先匯出 JSON 備份。iOS 系統備份與你選擇的分享目的地，依各自設定處理檔案。": "Data is stored in this App on your device. Export a JSON backup before changing devices or removing the App. System backups and sharing destinations handle files under their own settings.",
  "離線試用模式：資料與一般頁面分開儲存；AI、雲端同步及所有對外連線已停用。請使用虛構出生資料測試。": "Offline demo: separate local storage; AI, cloud sync and external connections are disabled. Use fictitious birth details.",
  "尚未設定出生資料": "No birth details yet",
  "我": "Me",
  "草稿尚未儲存（僅保留於本次開啟；請按「儲存記錄」保存）": "Unsaved draft — kept during this session. Tap Save entry to store it. Closing the App can discard it.",
  "請至少選擇心情或精力": "Choose at least one mood or energy rating, then save again. Your draft is still here.",
  "請完整填寫出生日期、時間與性別": "Enter a birth date, time and chart gender setting.",
  "已儲存 ✓": "Profile saved ✓",
  "分享完成": "Sharing completed",
  "已取消分享": "Sharing cancelled",
  "已取消匯入": "Import cancelled",
  "匯入已中斷，原有資料未變更": "Import interrupted. Saved data is unchanged.",
  "匯入失敗：檔案超過 5 MB，請選擇較小的 JSON 備份": "Could not import: file exceeds 5 MB. Choose a smaller JSON backup.",
  "匯入失敗：無法讀取檔案，請重新選擇備份": "Could not read the file. Choose a backup again.",
  "確定清除全部資料（出生資料＋所有記錄）？此動作無法復原，建議先匯出備份。": "Delete all birth details, entries and unsaved drafts in this App? This cannot be undone. Export a backup first. Saved/shared copies must be deleted separately.",
  "還沒有任何記錄。到「今日流運」記下今天的狀態，就開始累積你的個人趨勢資料庫。": "No saved entries yet. Open Daily, choose a mood or energy rating and tap Save entry.",
  "至少需要 2 筆記錄才能畫出趨勢。持續在「今日流運」記錄你的狀態吧！": "Trends need at least two entries. Record your mood or energy in Daily.",
  "每日狀態記錄": "Daily journal entries",
  "流日干支": "Day stem / branch",
  "標籤": "Tags",
  "操作": "Actions",
  "編輯": "Edit",
  "刪除": "Delete",
  "八字流運": "Bazi calendar references",
  "紫微流運": "Ziwei calendar references",
  "干支": "Stems / branches",
  "天干十神": "Stem relationships",
  "地支十神": "Branch relationships",
  "命宮落點": "Life-palace position",
  "四化": "Four transformations",
  "大運": "Ten-year cycle",
  "大限": "Ten-year cycle",
  "流年": "Year",
  "流月": "Month",
  "流日": "Day",
  "十神": "Ten relationships",
  "天干": "Heavenly stems",
  "地支": "Earthly branches",
  "藏干": "Hidden stems",
  "納音": "Nayin (納音)",
  "年柱": "Year pillar",
  "月柱": "Month pillar",
  "日柱": "Day pillar",
  "時柱": "Hour pillar",
  "「命宮落點」指該層流運命宮落在本命盤的哪一宮；四化為該層天干引動的祿權科忌。": "Life-palace position names a traditional chart area. Four transformations are symbolic chart labels (祿、權、科、忌); they do not predict events.",
  "心情與精力走勢": "Mood and energy history",
  "流日天干對你日主的十神關係": "Traditional day-stem relationships to the day master.",
  "以節氣換月": "Months follow solar terms.",
  "流日命宮落在本命盤的宮位": "Traditional life-palace grouping in the birth chart.",
  "未來 14 天個人流日預覽": "Historical-average day preview",
  "觀察摘要": "Observation summary",
  "尚無足夠資料": "Not enough data yet",
  "今天": "Today",
  "樣本少": "Small sample",
  "樣本數少，僅供參考": "Small sample; reference only",
  "日期格式需為 YYYY-MM-DD": "Use a date in YYYY-MM-DD format.",
  "日期不是有效的國曆日期（支援 0100–9999 年）": "Enter a real Gregorian date (input range 0100–9999; not a validated calculation range).",
  "出生資料格式不正確": "Invalid birth-profile format.",
  "出生時間需為 00:00–23:59": "Enter a birth time from 00:00 to 23:59.",
  "性別需為男或女": "Choose a supported chart gender setting.",
  "姓名格式不正確": "Invalid name format (20 characters maximum).",
  "記錄格式不正確": "Invalid entry format.",
  "心情與精力需為 1–5": "Mood and energy must be from 1 to 5.",
  "標籤格式不正確": "Invalid tag format.",
  "筆記格式不正確": "Invalid note format.",
  "記錄的修改時間格式不正確": "Invalid entry modification time.",
  "格式不符：找不到 records 陣列": "Invalid backup: no records array.",
  "原生分享功能無法使用": "Native sharing is unavailable.",
  "原生匯入功能無法使用": "Native import is unavailable."
});
  const tags = Object.assign(Object.create(null), {"工作順利": "Work went well", "壓力大": "Stress", "人際佳": "Good connections", "有衝突": "Conflict", "身體不適": "Feeling unwell", "睡眠差": "Poor sleep", "財運佳": "Money went well", "破財": "Money loss", "感情和睦": "Relationship harmony", "心情低落": "Low mood", "學習進步": "Learning progress", "運動": "Exercise"});
  Object.assign(messages, {
  "← 回到 App": "← Back to App",
  "iPhone 離線版隱私說明": "Offline iPhone privacy information",
  "草稿更新日期：2026-10-06（非政策生效日期）": "Draft updated: 2026-10-06 (not a policy effective date)",
  "出生日期、時間、性別、姓名與每日心情、精力、標籤及筆記保存在 App 的本機瀏覽器儲存空間，用於排盤和趨勢觀察。此版本沒有 AI、雲端同步、自動錯誤回報或使用行為追蹤，也不會將這些資料傳給開發者。": "Birth date, time, chart gender, optional name, and daily mood, energy, tags and notes are stored locally in this App for charts and journal summaries. This release has no AI, App cloud sync, automatic error reporting or usage tracking, and does not send this information to the developer.",
  "匯出 JSON 或 CSV 時，檔案會先寫到 App 暫存目錄，由 iOS 分享面板交給你選擇的目的地。你選擇的 App 或雲端服務可能有自己的資料處理政策。匯入檔案只在裝置上讀取與解析，不會修改你所選的原檔。": "JSON and CSV exports are written to an App temporary directory and handed to the destination you choose in the iOS share sheet. Your chosen app or cloud service may have its own data policies. Imports are read and parsed on this device; the selected source file is not modified.",
  "「設定 → 清除全部資料」會刪除 App 內出生資料與每日記錄；Files 中已保存的備份與已分享出去的檔案需要在目的地另行刪除。移除 App 可能造成資料遺失，請先匯出備份。": "Settings → Delete all App data removes birth details and entries in the App. Delete saved or shared backup copies separately at their destinations. Removing the App may lose data; export a backup first.",
  "命理內容屬文化性詮釋，不具有已驗證的科學預測能力；趨勢圖只反映你所記錄資料的相關性，不能替代醫療、心理健康或理財建議。此版未做出生地時區、夏令時間（DST）不存在／重複時刻判別或真太陽時校正；國際出生資訊不可直接視為已校正。": "Astrology is cultural interpretation, without scientifically established predictive accuracy. Journal charts describe associations and do not replace medical, mental-health or financial advice. Birthplace time-zone conversion, DST gap/overlap handling and true-solar-time correction are not implemented. International birth data must not be treated as corrected.",
  "iOS 系統備份依你的裝置設定處理 App 儲存；App 不會自行同步，但不能保證系統備份或分享目的地永遠不上雲。匯出暫存檔在完成／取消分享後清理；中斷的暫存檔會在下次啟動清理。": "System backups handle App storage under your device settings. The App does not sync itself; system backups or sharing destinations may involve cloud storage. Temporary exports are cleaned after sharing completes or is cancelled; interrupted exports are cleaned at the next startup.",
  "第三方 MIT 授權": "Third-party MIT licenses",
  "公開品牌／營運稱呼：lwbro；支援信箱：lwbro@me.com。若你自行寄信，支援收件者會收到你提供的訊息與附件；App 不會自動寄信。請避免寄出出生資料、私人筆記或未遮蔽的備份。支援信件保留期限與刪除處理流程尚待確認，沒有承諾固定期限或自動刪除。正式經營者的法定身分、版權人、Apple seller 法定名稱、政策生效日期與公開政策網址仍待確認；目前為發布前資料說明，尚未作正式法律聲明。": "Public brand: lwbro. Support email: lwbro@me.com. If you choose to email support, the recipient receives your message and attachments; the App sends no email automatically. Avoid sending birth details, private notes or unredacted backups. Support-message retention and deletion procedures remain unconfirmed; no fixed period or automatic deletion is promised. Legal operator, copyright owner, Apple seller identity, policy effective date and public policy URL remain unconfirmed. This is pre-release information, not a finalized legal declaration."
});
  const patterns = [
    [/^(心情|精力) (\d) 分$/, (_, metric, n) => `${messages[metric]} ${n} out of 5`],
    [/^此日已有記錄（最後更新 (.+)）$/, (_, stamp) => `Saved entry. Last updated ${stamp}`],
    [/^已儲存 (\d{4}-\d\d-\d\d) 的記錄 ✓$/, (_, date) => `Entry saved for ${date} ✓`],
    [/^共 (\d+) 筆記錄$/, (_, count) => `${count} saved ${count === '1' ? 'entry' : 'entries'}`],
    [/^(編輯|刪除) (\d{4}-\d\d-\d\d) 的記錄$/, (_, action, date) => `${messages[action]} entry for ${date}`],
    [/^確定刪除 (\d{4}-\d\d-\d\d) 的記錄？$/, (_, date) => `Delete the saved entry and any session draft for ${date}?`],
    [/^匯入完成：新增 (\d+) 筆、更新 (\d+) 筆，共 (\d+) 筆$/, (_, add, update, total) => `Import complete: ${add} added, ${update} updated, ${total} total entries`],
    [/^匯入失敗：(.+)$/s, (_, error) => `Could not import. Saved data is unchanged. ${messages[error] || 'Choose a valid UTF-8 JSON backup of 5 MB or less.'}`],
    [/^分享失敗：(.+)$/s, () => 'Could not share the backup. Saved entries are unchanged. Keep the App open and try again.'],
    [/^累積 10 筆以上有(.+)的記錄後，這裡會依你的歷史資料預估未來每天的狀態。（目前 (\d+) 筆）$/, (_, metric, n) => `Historical-average preview needs at least 10 ${messages[metric] || metric} entries; currently ${n}. This summary does not predict events.`],
    [/^平均(心情|精力) × (.+)$/, (_, metric, group) => `Average ${messages[metric]} · ${messages[group] || group}`],
    [/^最常用的標籤（依平均(心情|精力)排序）$/, (_, metric) => `Most-used tags, ordered by average ${messages[metric]}`],
    [/^依你過往「同類流日」的平均(心情|精力)推估，是個人資料的統計參考，不是命理吉凶斷語$/, (_, metric) => `Weighted historical ${messages[metric]} averages for similar calendar groups; associations only, not predictions.`],
    [/^十神以你的日主「(.+)」推算；流年以立春換年、流月以節氣換月。每日統一以日期 12:00 作參考；節氣交接日其他時段可能不同，未做出生地時區校正。$/, (_, master) => `Ten relationships use your day master ${master}. Years follow Start of Spring; months follow solar terms. Daily references use noon; boundary times may differ. No birthplace time-zone or DST correction.`],
    [/^日主：(.+)$/, (_, value) => `Day master: ${value}`],
    [/^國曆 (.+)$/, (_, value) => `Gregorian ${value}`],
    [/^四柱：(.+)$/, (_, value) => `Four pillars: ${value}`],
    [/^五行局：(.+)　生肖：(.+)$/, (_, element, animal) => `Element class: ${element} · Zodiac: ${animal}`],
    [/^命主：(.+)　身主：(.+)$/, (_, soul, body) => `Traditional soul / body stars: ${soul} / ${body}`],
    [/^今日 (.+)｜流年(.+)．流月(.+)．流日(.+)$/, (_, date, year, month, day) => `Today ${date} · Year ${year} · Month ${month} · Day ${day}`],
    [/^統計期間 (.+) ～ (.+)，共 (\d+) 筆。此為個人資料的相關性觀察，非因果推論。$/, (_, start, end, n) => `${start} to ${end} · ${n} entries. Associations in your journal do not establish cause.`],
    [/^(.+)：樣本尚不足（各分組需 ≥3 天）$/, (_, group) => `${messages[group] || group}: not enough samples (at least 3 days per group).`],
    [/^：(.+)日(.+)最高（平均 (.+)，n=(\d+)）；$/, (_, label, metric, avg, n) => `: ${label} has the highest ${messages[metric] || metric} average (${avg}, n=${n}); `],
    [/^日(心情|精力)最高（平均 (.+)，n=(\d+)）；$/, (_, metric, avg, n) => ` highest ${messages[metric]} average (${avg}, n=${n}); `],
    [/^日最低（平均 (.+)，n=(\d+)）$/, (_, avg, n) => ` lowest average (${avg}, n=${n})`],
    [/^▲ 高於／▼ 低於你的整體平均(心情|精力)（(.+)）±0.15；預估值＝同五行、同十神、同紫微流日命宮之歷史平均的加權合成。$/, (_, metric, avg) => `▲ Above / ▼ below your overall ${messages[metric]} average (${avg}) by 0.15. Weighted historical means use element, relationship and life-palace groups; not predictions.`],
    [/^(.+)，平均 (.+)，(\d+) 筆$/, (_, label, avg, n) => `${label}, average ${avg}, ${n} entries`],
    [/^平均 (.+)／樣本 (\d+) 天$/, (_, avg, n) => `Average ${avg} / ${n} sample days`]
  ];
  Object.assign(messages, {
    '無法載入排盤引擎。請關閉 App 後重新開啟；若問題持續，請保留既有備份並聯絡支援。':'Could not load chart libraries. Close and reopen the App. If it continues, keep existing backups and contact support.', '匯出檔名或內容不正確':'Invalid export file name or content.', '請先關閉目前的分享或匯入畫面':'Close the current share or import panel and try again.', '請選擇 .json 備份檔案':'Choose a .json backup file.', '檔案超過 5 MB，請選擇較小的 JSON 備份':'The file exceeds 5 MB. Choose a smaller JSON backup.', '檔案超過 5 MB':'The file exceeds 5 MB.', '檔案不是 UTF-8 JSON 備份':'Choose a UTF-8 JSON backup.', '無法讀取檔案，請重新選擇備份':'Could not read this file. Choose a backup again.', '無法儲存出生資料；請保持 App 開啟後重試。':'Could not save birth details. Keep the App open and try again.',
    '儲存失敗，草稿仍保留。請保持 App 開啟後重試。':'Could not save. Your draft is still here during this session. Keep the App open and try again.', '流日天干五行：':'Day-stem element: ', '流日十神：':'Day relationships: ', '紫微流日命宮：':'Ziwei life palace: ', '流日天干五行':'Day-stem element', '流日十神':'Day relationships', '流日天干':'Day stem', '流日地支':'Day branch', '流月月支':'Month branch', '紫微流日命宮':'Ziwei life palace',
    '排盤引擎：':'Chart libraries: ', '（八字／農曆／節氣）、':' (Bazi, lunar calendar, solar terms), ', '(紫微斗數／流年流月流日四化)，皆為 MIT 授權。':' (Ziwei chart references); both under the MIT license.',
    '流日以立春換年、節氣換月；紫微流運四化依 iztro 預設（中州派）安星規則。命理內容是文化性的自我觀察參考，並非科學預測或醫療、理財建議。':'Calendar years follow Start of Spring and months follow solar terms. Ziwei uses iztro’s default chart rules. These are cultural interpretations, not scientific predictions or medical, mental-health or financial advice.',
    '傳統命盤與你的日誌':'Traditional charts and your daily journal',
    '探索紫微與八字文化，記下自己的心情與精力。命盤不是科學預測，也不提供醫療、心理健康或財務建議。':'Explore Ziwei and Bazi as cultural traditions and keep mood and energy notes. Charts are not scientific predictions or medical, mental-health or financial advice.',
    '先填出生資料，開啟本命盤；到今日流運選擇評分並儲存，再到記錄找回。趨勢需要兩筆，歷史平均預覽需要十筆。':'Enter birth details, open Birth chart, then choose a rating in Daily and tap Save entry. Find it in Entries. Trends need two entries; the historical-average preview needs ten.',
    '命盤怎麼讀？':'Reading the chart',
    '紫微的十二宮是傳統主題區域；八字四柱依年、月、日、時排列。日主是日柱的關係參考，五行是木火土金水等象徵分類。星曜、干支及細部術語保留中文，並不決定真實人生結果。':'Ziwei’s twelve palaces are traditional theme areas. Bazi’s four pillars are year, month, day and hour. The day master is a relationship reference; the five elements are Wood, Fire, Earth, Metal and Water as symbolic categories. Star, stem/branch and detailed traditional terms retain Chinese names; they do not determine real-life outcomes.',
    '評分 1 代表低，5 代表高；標籤與筆記可選填。':'Ratings: 1 is low, 5 is high. Tags and notes are optional.',
    '匯入依日期合併，只有較新修改時間會更新同日記錄；已有出生資料會保留，不是整份覆蓋。支援 UTF-8 JSON，最多 5 MB。':'Import merges by date, updates a matching entry only when its modification is newer and keeps existing birth details. It does not replace all data. Choose UTF-8 JSON up to 5 MB.',
    '出生時間直接依輸入的民用時間使用。未做出生地時區換算、夏令時間不存在／重複時刻判別或真太陽時校正；國際命盤不可視為已校正或驗證。':'Birth time is used as entered. Birthplace time-zone conversion, DST gap/overlap handling and true-solar-time correction are not implemented. International birth data should not be treated as a corrected or validated chart.'
  });
  function translate(source) {
    const text = source.trim();
    let translated = messages[text];
    if (translated == null) {
      for (const [pattern, format] of patterns) {
        if (pattern.test(text)) { translated = text.replace(pattern, format); break; }
      }
    }
    return translated == null ? source : source.replace(text, () => translated);
  }
  const t = source => language === 'en' ? translate(String(source)) : String(source);
  const protectedContent = '.note-cell,.chip,#profile-chip,.palace-center h3,[data-user-content],script,style,#tab-ai-chat,#sync-card,svg text,.chart-tooltip b';
  function apply(root = document.body) {
    if (!root) return;
    document.documentElement.lang = language;
    document.title = document.querySelector('#tabs')
      ? (language === 'en' ? 'Ziwei Bazi · Personal journal' : '紫微八字 · 個人趨勢')
      : (language === 'en' ? 'Ziwei Bazi · Privacy information' : '紫微八字 iPhone 版隱私說明');
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement.closest(protectedContent)) continue;
      if (!originals.has(node)) originals.set(node, node.nodeValue);
      const value = t(originals.get(node));
      if (node.nodeValue !== value) node.nodeValue = value;
    }
    root.querySelectorAll('[placeholder],[aria-label],[data-label]').forEach(el => {
      if (el.closest('#tab-ai-chat,#sync-card')) return;
      let record = attributes.get(el); if (!record) { record = {}; attributes.set(el, record); }
      for (const attr of ['placeholder','aria-label','data-label']) {
        if (!el.hasAttribute(attr)) continue;
        const current = el.getAttribute(attr);
        if (!record[attr] || current !== record[attr].applied) record[attr] = {source:current};
        const value = t(record[attr].source);
        record[attr].applied = value;
        if (current !== value) el.setAttribute(attr, value);
      }
    });
    // Canonical tag strings and user-authored content never pass through text translation.
    root.querySelectorAll('.chip[data-tag]').forEach(chip => { const value = tag(chip.dataset.tag); if (chip.textContent !== value) chip.textContent = value; });
    const englishWarning = document.querySelector('#birth-time-limit-en');
    if (englishWarning) englishWarning.hidden = language === 'en';
    const time = document.querySelector('#p-time');
    if (time) time.setAttribute('aria-describedby', language === 'en' ? 'birth-time-limit' : 'birth-time-limit birth-time-limit-en');
    root.querySelectorAll('#language-select').forEach(select => { select.value = language; });
  }
  function tag(value) { return language === 'en' ? tags[value] || value : value; }
  function setLanguage(value) {
    if (!['en','zh-Hant'].includes(value)) return;
    language = value;
    let saved = true; try { localStorage.setItem(key,value); } catch (_) { saved = false; }
    document.dispatchEvent(new CustomEvent('zwbz-language-change'));
    apply();
    const status = document.querySelector('#language-status');
    if (status) status.textContent = language === 'en'
      ? (saved ? 'Language saved on this device.' : 'Language changed for this session. Could not save the preference.')
      : (saved ? '語言偏好已保存在此裝置。' : '本次語言已切換；無法保存語言偏好。');
  }
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.querySelector('#language-select')?.addEventListener('change', event => setLanguage(event.target.value));
    new MutationObserver(() => apply()).observe(document.body, {childList:true,subtree:true,characterData:true});
  });
  return {t,apply,setLanguage,tag,language:()=>language,locale:()=>language === 'en' ? 'en-US' : 'zh-TW'};
})();
