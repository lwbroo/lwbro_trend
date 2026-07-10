/* Main UI logic */
(() => {
  const $ = id => document.getElementById(id);
  const t = (k, p) => I18n.t(k, p);

  let currentResult = null;  // { foods, photo_note }
  let currentImage = null;   // { data, thumb }

  /* ── i18n helpers ── */
  function normGi(level) {
    if (["low", "Low", "低"].includes(level)) return "low";
    if (["high", "High", "高"].includes(level)) return "high";
    if (["med", "Medium", "中"].includes(level)) return "med";
    return "med";
  }
  const giClass = lv => ({ low: "gi-low", med: "gi-mid", high: "gi-high" }[normGi(lv)]);
  const giLabel = lv => t("gi_" + normGi(lv));
  const catLabel = c => t("cat_" + c) || c;

  /* ── Tabs ── */
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
  function switchTab(name) {
    document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("active", p.id === "tab-" + name));
    if (name === "history") renderHistory();
    if (name === "analyze") { updateSetupHint(); renderToday(); }
    if (name === "settings") markLangSeg();
  }
  $("goto-settings").addEventListener("click", () => switchTab("settings"));

  /* ── Language ── */
  function markLangSeg() {
    document.querySelectorAll("#lang-seg .seg-btn").forEach(b =>
      b.classList.toggle("on", b.dataset.lang === I18n.getLang()));
  }
  function setLanguage(l) {
    I18n.setLang(l);
    Store.saveSettings({ ...Store.getSettings(), lang: l });
    I18n.apply();
    $("lang-toggle").textContent = I18n.DICT[I18n.other()].lang_name; // shows the OTHER lang to switch to
    markLangSeg();
    // re-render dynamic content in the new language
    if (currentResult) renderResult(currentResult);
    renderToday();
    if (document.getElementById("tab-history").classList.contains("active")) renderHistory();
  }
  $("lang-toggle").addEventListener("click", () => setLanguage(I18n.other()));
  document.querySelectorAll("#lang-seg .seg-btn").forEach(b =>
    b.addEventListener("click", () => setLanguage(b.dataset.lang)));

  /* ── Settings ── */
  function loadSettings() {
    const s = Store.getSettings();
    $("api-key-input").value = s.apiKey || "";
    $("model-select").value = s.model || "claude-haiku-4-5";
    updateSetupHint();
  }
  $("save-settings-btn").addEventListener("click", () => {
    Store.saveSettings({
      ...Store.getSettings(),
      apiKey: $("api-key-input").value.trim(),
      model: $("model-select").value
    });
    flash("settings-saved");
    updateSetupHint();
  });
  $("show-key").addEventListener("change", e => {
    $("api-key-input").type = e.target.checked ? "text" : "password";
  });
  function updateSetupHint() {
    $("setup-hint").classList.toggle("hidden", !!Store.getSettings().apiKey);
    updateAnalyzeBtn();
  }

  /* ── Theme (auto → light → dark) ── */
  const THEMES = ["auto", "light", "dark"];
  const THEME_ICON = { auto: "🌗", light: "☀️", dark: "🌙" };
  let theme = Store.getSettings().theme || "auto";
  function applyTheme() {
    const root = document.documentElement;
    if (theme === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    $("theme-toggle").textContent = THEME_ICON[theme];
    $("theme-toggle").title = `Theme: ${theme}`;
  }
  $("theme-toggle").addEventListener("click", () => {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    Store.saveSettings({ ...Store.getSettings(), theme });
    applyTheme();
  });

  /* ── Today + Burn ── */
  function todayRecords() {
    const today = new Date().toDateString();
    return Store.getRecords().filter(r => new Date(r.time).toDateString() === today);
  }
  function streakDays() {
    const days = new Set(Store.getRecords().map(r => new Date(r.time).toDateString()));
    let streak = 0;
    const d = new Date();
    if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
    while (days.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
    return streak;
  }
  function renderToday() {
    const recs = todayRecords();
    const allFoods = recs.flatMap(r => r.result.foods || []);
    const st = OrderEngine.stats(allFoods);
    const streak = streakDays();
    const show = recs.length > 0 || streak > 0;
    $("today-card").classList.toggle("hidden", !show);
    if (show) {
      const glClass = st.totalGL < 60 ? "" : st.totalGL < 100 ? "warn-chip" : "danger-chip";
      $("today-chips").innerHTML = `
        <div class="chip"><div class="chip-value">${recs.length}</div><div class="chip-label">${t("chip_meals")}</div></div>
        <div class="chip"><div class="chip-value">${Math.round(st.totalCarbs)}g</div><div class="chip-label">${t("chip_carbs")}</div></div>
        <div class="chip ${glClass}"><div class="chip-value">${Math.round(st.totalGL)}</div><div class="chip-label">${t("chip_gl")}</div></div>`;
      const badge = $("streak-badge");
      badge.classList.toggle("hidden", streak < 2);
      badge.textContent = t("streak", { n: streak });
    }
  }

  /* ── Burn it off — based on THIS meal's glycemic load, shown in the result ── */
  function renderBurn(gl) {
    const show = gl >= 20; // moderate or high
    $("burn-card").classList.toggle("hidden", !show);
    if (!show) return;
    const walk = Math.min(45, Math.max(12, Math.round(gl * 0.45)));
    const m = t("unit_min");
    $("burn-text").textContent = t("burn_text", { gl: Math.round(gl) });
    $("burn-options").innerHTML = `
      <div class="burn-opt">${t("burn_walk")} <b>${walk} ${m}</b> <span>${t("burn_walk_note")}</span></div>
      <div class="burn-opt">${t("burn_cycle")} <b>${Math.max(10, Math.round(walk * 0.7))} ${m}</b></div>
      <div class="burn-opt">${t("burn_squats")} <b>3 × 15</b> <span>${t("burn_squats_note")}</span></div>`;
  }

  /* ── Photo ── */
  $("photo-input").addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      currentImage = await GlycoAPI.prepareImage(file);
      const preview = $("photo-preview");
      preview.src = "data:image/jpeg;base64," + currentImage.data;
      preview.classList.remove("hidden");
      $("photo-placeholder").classList.add("hidden");
      hide("result"); hide("error-box");
      currentResult = null;
    } catch (err) { showError(err.message); }
    updateAnalyzeBtn();
  });
  function updateAnalyzeBtn() {
    $("analyze-btn").disabled = !(currentImage && Store.getSettings().apiKey);
  }

  /* ── Analyze ── */
  $("analyze-btn").addEventListener("click", async () => {
    const s = Store.getSettings();
    if (!s.apiKey || !currentImage) return;
    hide("result"); hide("error-box"); show("loading");
    $("analyze-btn").disabled = true;
    try {
      currentResult = await GlycoAPI.analyzeMeal({
        apiKey: s.apiKey,
        model: s.model || "claude-haiku-4-5",
        imageBase64: currentImage.data,
        note: $("meal-note").value.trim()
      });
      renderResult(currentResult);
      show("result"); hide("save-done");
    } catch (err) { showError(err.message); }
    finally { hide("loading"); $("analyze-btn").disabled = false; }
  });

  function renderResult(r) {
    const foods = r.foods || [];
    const plan = OrderEngine.plan(foods);
    const st = OrderEngine.stats(foods);

    const glClass = st.level === "light" ? "" : st.level === "moderate" ? "warn-chip" : "danger-chip";
    $("summary-chips").innerHTML = `
      <div class="chip"><div class="chip-value">${st.count}</div><div class="chip-label">${t("chip_items")}</div></div>
      <div class="chip"><div class="chip-value">${Math.round(st.totalCarbs)}g</div><div class="chip-label">${t("chip_carbs")}</div></div>
      <div class="chip ${glClass}"><div class="chip-value">${Math.round(st.totalGL)}</div><div class="chip-label">${t("chip_gl_short")} · ${t("gl_" + st.level)}</div></div>`;

    renderBurn(st.totalGL);

    const note = r.photo_note || "";
    $("meal-summary").textContent = note ? `📷 ${note}` : "";
    $("meal-summary").classList.toggle("hidden", !note);

    $("food-list").innerHTML = "";
    foods.forEach(f => {
      const div = document.createElement("div");
      div.className = "food-item";
      const srcTag = f.source === "db"
        ? `<span class="src-tag src-db" title="${esc(f.matched_as ? t("src_db_title_as", { name: f.matched_as }) : t("src_db_title"))}">${t("src_db")}</span>`
        : `<span class="src-tag src-ai" title="${esc(t("src_ai_title"))}">${t("src_ai")}</span>`;
      div.innerHTML = `
        <div class="food-main">
          <div class="food-name">${esc(f.name)} <span class="food-meta">${esc(catLabel(f.category))}</span></div>
          <div class="food-meta">${esc(f.portion_desc)} · ~${Math.round(f.carbs_g)}g · ${srcTag}</div>
        </div>
        <div class="gi-badge ${giClass(f.gi_level)}">GI ${esc(giLabel(f.gi_level))}<br>${f.gi}</div>`;
      $("food-list").appendChild(div);
    });

    $("order-list").innerHTML = "";
    plan.steps.forEach(step => {
      const li = document.createElement("li");
      const sep = I18n.getLang() === "zh" ? "、" : " · ";
      li.innerHTML = `<div>
        <div class="order-items">${step.items.map(esc).join(sep)}</div>
        <div class="order-reason">${esc(step.reason)}</div>
      </div>`;
      $("order-list").appendChild(li);
    });

    $("tips-list").innerHTML = "";
    plan.tips.forEach(tip => {
      const li = document.createElement("li");
      li.textContent = tip;
      $("tips-list").appendChild(li);
    });
  }

  /* ── Save ── */
  $("save-btn").addEventListener("click", () => {
    if (!currentResult) return;
    const foods = currentResult.foods || [];
    const plan = OrderEngine.plan(foods);
    Store.addRecord({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      time: new Date().toISOString(),
      thumb: currentImage ? currentImage.thumb : null,
      note: $("meal-note").value.trim(),
      result: { foods, photo_note: currentResult.photo_note, eating_order: plan.steps, tips: plan.tips, meal_summary: plan.summary },
      followup: null
    });
    flash("save-done");
    renderToday();
  });

  /* ── Log ── */
  function renderHistory() {
    const records = Store.getRecords();
    $("history-empty").classList.toggle("hidden", records.length > 0);
    const list = $("history-list");
    list.innerHTML = "";
    const sep = I18n.getLang() === "zh" ? "、" : ", ";

    records.forEach(rec => {
      const foods = (rec.result.foods || []).map(f => f.name).join(sep);
      const order = (rec.result.eating_order || []).map(s => s.items.join(" + ")).join(" → ");
      const card = document.createElement("div");
      card.className = "card history-card";
      card.innerHTML = `
        <div class="history-item">
          ${rec.thumb ? `<img class="history-thumb" src="data:image/jpeg;base64,${rec.thumb}" alt="">` : `<div class="history-thumb"></div>`}
          <div class="history-main">
            <div class="history-date">${formatTime(rec.time)}</div>
            <div class="history-foods">${esc(foods)}</div>
            <div class="history-order">🥢 ${esc(order)}</div>
          </div>
          <button class="history-del" title="${esc(t("confirm_delete"))}" data-id="${rec.id}">✕</button>
        </div>
        <div class="followup-area" data-id="${rec.id}">${followupHTML(rec)}</div>`;
      list.appendChild(card);
    });

    list.querySelectorAll(".history-del").forEach(btn => {
      btn.addEventListener("click", () => {
        if (confirm(t("confirm_delete"))) { Store.deleteRecord(btn.dataset.id); renderHistory(); renderToday(); }
      });
    });
    list.querySelectorAll(".followup-add").forEach(btn => {
      btn.addEventListener("click", () => openFollowupForm(btn.closest(".followup-area")));
    });
  }

  function followupHTML(rec) {
    const fu = rec.followup;
    if (!fu) return `<button class="btn small followup-add">${t("fu_add")}</button>`;
    const parts = [];
    if (fu.followed) parts.push(t("fu_followed_" + fu.followed));
    if (fu.feeling) parts.push(`${["😫","😕","😐","🙂","😄"][fu.feeling - 1]} ${t("feel_" + fu.feeling)}`);
    if (fu.glucose) parts.push(`🩸 ${fu.glucose} mg/dL`);
    return `<div class="followup-line">${parts.join(" · ")}
      <button class="btn tiny followup-add">${t("fu_edit")}</button></div>`;
  }

  function openFollowupForm(area) {
    const id = area.dataset.id;
    const fu = (Store.getRecords().find(r => r.id === id) || {}).followup || {};
    const feelEmoji = ["😫","😕","😐","🙂","😄"];
    area.innerHTML = `
      <div class="followup-form">
        <div class="fu-label">${t("fu_q_followed")}</div>
        <div class="seg" data-name="followed">
          ${["yes","partly","no"].map(v =>
            `<button class="seg-btn ${fu.followed === v ? "on" : ""}" data-v="${v}">${t("fu_" + v)}</button>`).join("")}
        </div>
        <div class="fu-label">${t("fu_q_feeling")}</div>
        <div class="seg emoji-seg" data-name="feeling">
          ${feelEmoji.map((e, i) =>
            `<button class="seg-btn ${fu.feeling === i + 1 ? "on" : ""}" data-v="${i + 1}" title="${t("feel_" + (i + 1))}">${e}</button>`).join("")}
        </div>
        <div class="fu-label">${t("fu_q_glucose")}</div>
        <input type="number" class="text-input fu-glucose" placeholder="${t("fu_glucose_ph")}" value="${fu.glucose || ""}" min="40" max="500">
        <button class="btn primary full fu-save">${t("fu_save")}</button>
      </div>`;

    area.querySelectorAll(".seg").forEach(seg => {
      seg.querySelectorAll(".seg-btn").forEach(b => {
        b.addEventListener("click", () => {
          seg.querySelectorAll(".seg-btn").forEach(x => x.classList.remove("on"));
          b.classList.add("on");
        });
      });
    });
    area.querySelector(".fu-save").addEventListener("click", () => {
      const followed = area.querySelector('.seg[data-name="followed"] .on')?.dataset.v || null;
      const feeling = Number(area.querySelector('.seg[data-name="feeling"] .on')?.dataset.v) || null;
      const glucose = Number(area.querySelector(".fu-glucose").value) || null;
      Store.updateRecord(id, { followup: { followed, feeling, glucose, at: new Date().toISOString() } });
      renderHistory();
    });
  }

  /* ── Export / clear ── */
  $("export-btn").addEventListener("click", () => {
    const blob = new Blob([Store.exportJSON()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `glyco-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $("clear-btn").addEventListener("click", () => {
    if (confirm(t("confirm_clear"))) { Store.clearRecords(); renderHistory(); renderToday(); }
  });

  /* ── Helpers ── */
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function formatTime(iso) {
    const d = new Date(iso);
    const locale = I18n.getLang() === "zh" ? "zh-TW" : "en-US";
    return d.toLocaleString(locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }
  function show(id) { $(id).classList.remove("hidden"); }
  function hide(id) { $(id).classList.add("hidden"); }
  function flash(id) { show(id); setTimeout(() => hide(id), 2000); }
  function showError(msg) { $("error-box").textContent = "⚠️ " + msg; show("error-box"); }

  /* ── Init ── */
  I18n.apply();
  $("lang-toggle").textContent = I18n.DICT[I18n.other()].lang_name;
  markLangSeg();
  applyTheme();
  loadSettings();
  renderToday();
})();
