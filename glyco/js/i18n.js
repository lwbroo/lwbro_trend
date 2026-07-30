/* Internationalization: English / 繁體中文
 * t(key, params) interpolates {name} placeholders.
 * apply() localizes static DOM ([data-i18n] text, [data-i18n-html] innerHTML,
 * [data-i18n-ph] placeholder). Dynamic strings call I18n.t() at render time. */
const I18n = (() => {
  const DICT = {
    en: {
      lang_name: "EN",
      app_name: "Glyco Navigator",
      page_title: "Glyco Navigator · Eat in the Right Order",
      tagline: "Snap your meal → eat in the smartest order → steadier glucose",
      today: "Today",
      burn_title: "🔥 Burn it off",
      photo_ph: "Tap to snap or choose a meal photo",
      note_ph: "Optional note, e.g. “bowl of rice, chicken leg, greens”",
      analyze: "Analyze this meal",
      loading: "Recognizing your food… (GI comes from the built-in database)",
      order_title: "🥢 Eat in this order",
      order_hint: "Fiber first, then protein & fat, starches last — proven to blunt the post-meal glucose spike.",
      meal_title: "🍽️ This meal",
      tips_title: "💡 Tips",
      save: "Save to log",
      saved: "✅ Saved",
      log_empty: "No meals logged yet.<br>Analyze a meal and save it — it'll show up here.",
      lang_title: "Language",
      data_title: "Data",
      export: "Export log (JSON)",
      clear: "Delete all logged meals",
      sources_title: "Data sources",
      sources_desc: "The built-in GI database covers ~190 common foods (Western & Asian). GI values are primarily referenced from the University of Sydney GI Database and nutrition literature; carb contents are approximate. Foods not in the database fall back to AI estimates, marked with 🤖.",
      disclaimer: "For dietary-order guidance only — not medical advice.<br>If you have diabetes, follow your doctor's and dietitian's instructions.",
      privacy_link: "Privacy Policy",
      nav_analyze: "Analyze",
      nav_log: "Log",
      nav_trends: "Trends",
      nav_settings: "Settings",

      trends_intro_title: "🔎 Does the order help you?",
      trends_intro_text: "Personal evidence built from your own meal follow-ups — not general advice.",
      trends_empty: "Log a few meals with follow-up (did you follow the order? how did you feel?) to build your personal evidence here.",
      trends_n_logs: "{n} follow-ups logged",
      trends_feeling_title: "😊 Feeling by adherence",
      trends_glucose_title: "🩸 Post-meal glucose by adherence",
      trends_feeling_trend_title: "📈 Feeling over time",
      trends_glucose_trend_title: "📈 Glucose over time",
      trends_glucose_empty: "No glucose entries yet — add one in a follow-up to see this chart.",
      trends_insight_feeling: "Followed the order: felt {a}/5 on average (n={na}). Didn't follow: {b}/5 (n={nb}).",
      trends_insight_glucose: "Followed the order: avg post-meal glucose {a} mg/dL (n={na}). Didn't follow: {b} mg/dL (n={nb}).",
      chart_empty: "Not enough data yet",
      chart_tip_avg: "avg {v}",
      chart_tip_n: "n={n}",
      chart_tip_low: "small sample — for reference only",
      metric_feeling: "Feeling",
      metric_glucose: "Glucose",

      chip_meals: "Meals",
      chip_carbs: "Carbs",
      chip_gl: "Glycemic load",
      chip_gl_short: "GL",
      chip_items: "Items",

      gl_light: "Light",
      gl_moderate: "Moderate",
      gl_high: "High",
      gi_low: "Low",
      gi_med: "Medium",
      gi_high: "High",

      cat_vegetable: "Vegetable",
      cat_protein: "Protein",
      cat_fat: "Fat",
      cat_starch: "Starch",
      cat_fruit: "Fruit",
      cat_drink: "Drink",
      cat_dessert: "Dessert",
      cat_other: "Other",

      src_db: "📚 database",
      src_ai: "🤖 AI estimate",
      src_db_title: "GI from built-in database",
      src_db_title_as: "GI from built-in database (matched as “{name}”)",
      src_ai_title: "Not in the database — GI is an AI estimate",

      r_fiber: "Fiber first — it forms a barrier that slows the absorption of the sugars that follow",
      r_protein: "Protein & fat trigger incretin hormones that slow stomach emptying and boost satiety",
      r_starch: "Starches last — eaten now, they raise your glucose far more gently",
      r_fruit: "Fruit at the very end, in a small portion — never on an empty stomach",
      r_sugary: "Sugary drinks spike fastest — save them for last and sip sparingly (unsweetened is best)",
      r_freedrink: "; {items} is sugar-free — sip anytime",
      r_pace: "Eat slowly and chew well — pacing alone flattens the glucose curve",

      t_high_starch: "{items} is high-GI — consider cutting the portion by ¼–⅓, or swapping for a lower-GI option (brown rice, whole grain, sourdough)",
      t_sugary: "{items} → switching to unsweetened or diet is the single easiest glucose win in this meal",
      t_no_veg: "No vegetables in this meal — adding a side of greens or a salad would noticeably flatten the curve",
      t_high_carbs: "Total carbs ≈ {c}g is on the high side — a 10–15 min walk right after eating blunts the spike",
      t_high_fruit: "The fruit here is mid/high GI — keep it to one fist-sized serving",
      t_slow: "Slow down between steps — stretching the meal past 20 minutes flattens the glucose curve",
      t_stop_full: "Stop at 80% full — eating order works best when you don't overeat",

      summary: "{n} items · ~{c}g carbs · glycemic load ≈ {gl} ({level}).",
      no_food: "No food detected.",

      burn_text: "This meal's glycemic load (≈{gl}) is on the higher side. Working muscles pull glucose out of your blood without needing insulin — any of these helps:",
      burn_walk: "🚶 Brisk walk",
      burn_walk_note: "(best right after your meal)",
      burn_cycle: "🚴 Easy cycling",
      burn_squats: "🏋️ Bodyweight squats",
      burn_squats_note: "(big muscles = big glucose sink)",
      unit_min: "min",
      streak: "🔥 {n}-day streak",

      fu_add: "＋ Add follow-up (how did it go?)",
      fu_edit: "edit",
      fu_q_followed: "Did you follow the order?",
      fu_yes: "Yes", fu_partly: "Partly", fu_no: "No",
      fu_q_feeling: "How do you feel 1–2h after eating?",
      fu_q_glucose: "Post-meal glucose — optional (mg/dL)",
      fu_glucose_ph: "e.g. 132",
      fu_save: "Save follow-up",
      fu_followed_yes: "✅ Followed order",
      fu_followed_partly: "🌓 Partly followed",
      fu_followed_no: "❌ Didn't follow",
      feel_1: "Rough", feel_2: "Meh", feel_3: "OK", feel_4: "Good", feel_5: "Great",

      confirm_delete: "Delete this meal?",
      confirm_clear: "Delete ALL logged meals? This cannot be undone.",

      err_read_image: "Couldn't read this image.",
      err_network: "Network error — please check your connection and try again.",
      err_rate: "Too many requests — please wait a moment and retry.",
      err_failed: "Analysis failed",
      err_refusal: "The model declined to analyze this photo — please try a different meal photo.",
      err_maxtokens: "The response was cut off — please try again.",
      err_noresult: "No result received — please try again.",
      err_format: "Unexpected result format — please try again.",
      err_service: "Service temporarily unavailable — please try again in a moment.",

      quota_remaining: "{n} of {limit} analyses left this week",
      quota_resets: "Resets {date}",
      quota_exceeded_title: "Free analyses used up",
      quota_exceeded_body: "You've used all your free analyses for this week.",
      upgrade_cta: "Upgrade to unlimited",
      upgrade_native_only_hint: "Unlimited analyses are available in the app — this web version stays free-tier only.",
      paywall_close: "Close",

      subscription_title: "Subscription",
      subscription_free: "Free plan — 3 analyses/week",
      subscription_active: "✅ Glyco Navigator Pro active — unlimited analyses",
      subscription_restore: "Restore purchases",
      purchase_unavailable: "No subscription plan is available right now — please try again later.",
      purchase_failed: "Purchase couldn't be completed — please try again.",
      restore_failed: "Couldn't find any purchases to restore."
    },
    zh: {
      lang_name: "中",
      app_name: "順順控糖",
      page_title: "順順控糖 · 這樣吃更順",
      tagline: "拍照 → 用最聰明的順序吃 → 血糖更平穩",
      today: "今日",
      burn_title: "🔥 動一動消耗",
      photo_ph: "點這裡拍照或選擇餐點照片",
      note_ph: "補充說明（選填）：例如「白飯一碗、雞腿、燙青菜」",
      analyze: "分析這一餐",
      loading: "正在辨識食物⋯（GI 由內建資料庫查表）",
      order_title: "🥢 這樣吃",
      order_hint: "先吃纖維、再吃蛋白質與脂肪、澱粉放最後，有效減緩餐後血糖上升。",
      meal_title: "🍽️ 這一餐",
      tips_title: "💡 小建議",
      save: "儲存到紀錄",
      saved: "✅ 已儲存",
      log_empty: "還沒有任何紀錄。<br>分析並儲存一餐後就會出現在這裡。",
      lang_title: "語言",
      data_title: "資料",
      export: "匯出紀錄 (JSON)",
      clear: "清除所有紀錄",
      sources_title: "資料來源",
      sources_desc: "內建 GI 資料庫收錄約 190 種常見食物（中西式）。GI 值主要參考雪梨大學 GI Database 與營養學文獻，碳水含量為約略值。資料庫查無的食物才使用 AI 估計值，並以 🤖 標示。",
      disclaimer: "僅供進食順序參考，非醫療建議。<br>糖尿病患者請遵循醫師與營養師指示。",
      privacy_link: "隱私權政策",
      nav_analyze: "分析",
      nav_log: "紀錄",
      nav_trends: "趨勢",
      nav_settings: "設定",

      trends_intro_title: "🔎 進食順序對你有效嗎？",
      trends_intro_text: "根據你自己的餐後回饋整理出的個人實證，不是通用建議。",
      trends_empty: "先記錄幾筆含回饋的用餐（有沒有照順序？感覺如何？），這裡就會開始累積你的個人實證。",
      trends_n_logs: "已記錄 {n} 筆回饋",
      trends_feeling_title: "😊 感覺 vs 是否照順序",
      trends_glucose_title: "🩸 餐後血糖 vs 是否照順序",
      trends_feeling_trend_title: "📈 感覺趨勢",
      trends_glucose_trend_title: "📈 血糖趨勢",
      trends_glucose_empty: "還沒有血糖紀錄——在回饋中填寫後就會出現這張圖。",
      trends_insight_feeling: "有照順序時：平均感覺 {a}/5（{na} 筆）。沒照順序時：{b}/5（{nb} 筆）。",
      trends_insight_glucose: "有照順序時：平均餐後血糖 {a} mg/dL（{na} 筆）。沒照順序時：{b} mg/dL（{nb} 筆）。",
      chart_empty: "資料尚不足",
      chart_tip_avg: "平均 {v}",
      chart_tip_n: "n={n}",
      chart_tip_low: "樣本數少，僅供參考",
      metric_feeling: "感覺",
      metric_glucose: "血糖",

      chip_meals: "餐數",
      chip_carbs: "碳水",
      chip_gl: "升糖負荷",
      chip_gl_short: "升糖負荷",
      chip_items: "項目",

      gl_light: "輕度",
      gl_moderate: "中等",
      gl_high: "偏高",
      gi_low: "低",
      gi_med: "中",
      gi_high: "高",

      cat_vegetable: "蔬菜",
      cat_protein: "蛋白質",
      cat_fat: "脂肪",
      cat_starch: "澱粉",
      cat_fruit: "水果",
      cat_drink: "飲料",
      cat_dessert: "點心",
      cat_other: "其他",

      src_db: "📚 資料庫",
      src_ai: "🤖 AI估計",
      src_db_title: "GI 值來自內建資料庫",
      src_db_title_as: "GI 值來自內建資料庫（比對為「{name}」）",
      src_ai_title: "資料庫查無此食物，GI 為 AI 估計值",

      r_fiber: "纖維先吃——形成屏障，減緩後續糖分吸收",
      r_protein: "蛋白質與脂肪刺激腸泌素，延緩胃排空、增加飽足感",
      r_starch: "澱粉最後吃——此時血糖上升最平緩",
      r_fruit: "水果放最後、少量吃——別空腹吃",
      r_sugary: "含糖飲料升糖最快——留到最後、少量喝（無糖最好）",
      r_freedrink: "；{items} 無糖，隨時喝",
      r_pace: "細嚼慢嚥——放慢速度就能壓平血糖曲線",

      t_high_starch: "{items} 屬高 GI——可考慮減量 ¼–⅓，或換成低 GI 版本（糙米、全麥、酸種麵包）",
      t_sugary: "{items} → 換成無糖或代糖，是這餐最容易的控糖一步",
      t_no_veg: "這餐沒有蔬菜——加一份青菜或沙拉能明顯壓平血糖曲線",
      t_high_carbs: "總碳水約 {c}g 偏高——餐後散步 10–15 分鐘可降低血糖高峰",
      t_high_fruit: "這裡的水果屬中高 GI——控制在一個拳頭大小的份量",
      t_slow: "每一步之間放慢——把用餐時間拉長到 20 分鐘以上能壓平血糖曲線",
      t_stop_full: "吃八分飽就停——不過量時進食順序效果最好",

      summary: "{n} 項 · 碳水約 {c}g · 升糖負荷 ≈ {gl}（{level}）",
      no_food: "沒有辨識到食物。",

      burn_text: "這一餐的升糖負荷（≈{gl}）偏高。運動時肌肉不需胰島素就能消耗血糖——以下任一都有幫助：",
      burn_walk: "🚶 快走",
      burn_walk_note: "（餐後馬上走最好）",
      burn_cycle: "🚴 輕鬆騎車",
      burn_squats: "🏋️ 徒手深蹲",
      burn_squats_note: "（大肌群 = 大量消耗血糖）",
      unit_min: "分鐘",
      streak: "🔥 連續 {n} 天",

      fu_add: "＋ 新增餐後回饋（後來如何？）",
      fu_edit: "編輯",
      fu_q_followed: "有照順序吃嗎？",
      fu_yes: "有", fu_partly: "部分", fu_no: "沒有",
      fu_q_feeling: "餐後 1–2 小時感覺如何？",
      fu_q_glucose: "餐後血糖——選填（mg/dL）",
      fu_glucose_ph: "例如 132",
      fu_save: "儲存回饋",
      fu_followed_yes: "✅ 有照順序",
      fu_followed_partly: "🌓 部分照做",
      fu_followed_no: "❌ 沒照做",
      feel_1: "很差", feel_2: "普通", feel_3: "還好", feel_4: "不錯", feel_5: "很好",

      confirm_delete: "刪除這筆紀錄？",
      confirm_clear: "確定清除所有紀錄？此動作無法復原。",

      err_read_image: "無法讀取這張圖片",
      err_network: "網路連線失敗，請確認網路後再試一次。",
      err_rate: "請求太頻繁，稍等一下再試。",
      err_failed: "分析失敗",
      err_refusal: "模型拒絕分析這張照片，請換一張餐點照片試試。",
      err_maxtokens: "回應被截斷，請再試一次。",
      err_noresult: "沒有收到分析結果，請再試一次。",
      err_format: "分析結果格式錯誤，請再試一次。",
      err_service: "服務暫時無法使用，請稍後再試。",

      quota_remaining: "本週還有 {n}／{limit} 次分析額度",
      quota_resets: "將於 {date} 重置",
      quota_exceeded_title: "本週免費額度已用完",
      quota_exceeded_body: "你已用完本週的免費分析次數。",
      upgrade_cta: "升級為無限次數",
      upgrade_native_only_hint: "無限分析次數僅限 App 內購買——網頁版維持免費額度。",
      paywall_close: "關閉",

      subscription_title: "訂閱",
      subscription_free: "免費方案——每週 3 次分析",
      subscription_active: "✅ 已升級順順控糖 Pro——無限次數分析",
      subscription_restore: "還原購買",
      purchase_unavailable: "目前沒有可購買的方案，請稍後再試。",
      purchase_failed: "購買未完成，請再試一次。",
      restore_failed: "找不到可還原的購買紀錄。"
    }
  };

  let lang = "en";

  function detect() {
    try {
      const saved = JSON.parse(localStorage.getItem("glyco.settings"))?.lang;
      if (saved) return saved;
    } catch {}
    return (navigator.language || "en").toLowerCase().startsWith("zh") ? "zh" : "en";
  }

  function t(key, params) {
    let s = (DICT[lang] && DICT[lang][key]) ?? (DICT.en[key] ?? key);
    if (params) for (const k in params) s = s.replaceAll("{" + k + "}", params[k]);
    return s;
  }

  function setLang(l) { lang = DICT[l] ? l : "en"; }
  function getLang() { return lang; }
  function other() { return lang === "en" ? "zh" : "en"; }

  /** Localize static DOM nodes */
  function apply() {
    document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en";
    document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-html]").forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  }

  lang = detect();
  return { t, setLang, getLang, other, apply, DICT };
})();
