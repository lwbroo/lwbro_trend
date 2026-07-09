/* Main UI logic */
(() => {
  const $ = id => document.getElementById(id);

  let currentImage = null;   // { data, thumb }
  let currentResult = null;  // latest analysis

  const FEELINGS = ["😫", "😕", "😐", "🙂", "😄"];
  const FEELING_LABELS = ["Rough", "Meh", "OK", "Good", "Great"];

  /* ── Tabs ── */
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  function switchTab(name) {
    document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("active", p.id === "tab-" + name));
    if (name === "history") renderHistory();
    if (name === "analyze") { updateSetupHint(); renderToday(); }
  }

  $("goto-settings").addEventListener("click", () => switchTab("settings"));

  /* ── Settings ── */
  function loadSettings() {
    const s = Store.getSettings();
    $("api-key-input").value = s.apiKey || "";
    $("model-select").value = s.model || "claude-haiku-4-5";
    updateSetupHint();
  }

  $("save-settings-btn").addEventListener("click", () => {
    Store.saveSettings({
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
    const hasKey = !!(Store.getSettings().apiKey);
    $("setup-hint").classList.toggle("hidden", hasKey);
    updateAnalyzeBtn();
  }

  /* ── Today strip + Burn it off ── */
  function todayRecords() {
    const today = new Date().toDateString();
    return Store.getRecords().filter(r => new Date(r.time).toDateString() === today);
  }

  function streakDays() {
    const days = new Set(Store.getRecords().map(r => new Date(r.time).toDateString()));
    let streak = 0;
    const d = new Date();
    if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1); // allow "not logged yet today"
    while (days.has(d.toDateString())) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
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
        <div class="chip"><div class="chip-value">${recs.length}</div><div class="chip-label">Meals</div></div>
        <div class="chip"><div class="chip-value">${Math.round(st.totalCarbs)}g</div><div class="chip-label">Carbs</div></div>
        <div class="chip ${glClass}"><div class="chip-value">${Math.round(st.totalGL)}</div><div class="chip-label">Glycemic load</div></div>`;
      const badge = $("streak-badge");
      badge.classList.toggle("hidden", streak < 2);
      badge.textContent = `🔥 ${streak}-day streak`;
    }

    // Burn-it-off: triggers when today's cumulative GL runs high
    const THRESHOLD = 60;
    const excess = st.totalGL - THRESHOLD;
    $("burn-card").classList.toggle("hidden", excess <= 0);
    if (excess > 0) {
      const walk = Math.min(60, Math.max(15, Math.round(excess)));
      $("burn-text").textContent =
        `Today's glycemic load (≈${Math.round(st.totalGL)}) is running high. Working muscles pull glucose out of your blood without needing insulin — any of these helps:`;
      $("burn-options").innerHTML = `
        <div class="burn-opt">🚶 Brisk walk <b>${walk} min</b> <span>(best right after your meal)</span></div>
        <div class="burn-opt">🚴 Easy cycling <b>${Math.max(10, Math.round(walk * 0.7))} min</b></div>
        <div class="burn-opt">🏋️ Bodyweight squats <b>3 × 15</b> <span>(big muscles = big glucose sink)</span></div>`;
    }
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
      hide("result");
      hide("error-box");
    } catch (err) {
      showError(err.message);
    }
    updateAnalyzeBtn();
  });

  function updateAnalyzeBtn() {
    $("analyze-btn").disabled = !(currentImage && Store.getSettings().apiKey);
  }

  /* ── Analyze ── */
  $("analyze-btn").addEventListener("click", async () => {
    const s = Store.getSettings();
    if (!s.apiKey || !currentImage) return;

    hide("result");
    hide("error-box");
    show("loading");
    $("analyze-btn").disabled = true;

    try {
      currentResult = await GlycoAPI.analyzeMeal({
        apiKey: s.apiKey,
        model: s.model || "claude-haiku-4-5",
        imageBase64: currentImage.data,
        note: $("meal-note").value.trim()
      });
      renderResult(currentResult);
      show("result");
      hide("save-done");
    } catch (err) {
      showError(err.message);
    } finally {
      hide("loading");
      $("analyze-btn").disabled = false;
    }
  });

  function renderResult(r) {
    // Summary chips: items / carbs / glycemic load
    const st = OrderEngine.stats(r.foods || []);
    const glClass = st.level === "Light" ? "" : st.level === "Moderate" ? "warn-chip" : "danger-chip";
    $("summary-chips").innerHTML = `
      <div class="chip"><div class="chip-value">${st.count}</div><div class="chip-label">Items</div></div>
      <div class="chip"><div class="chip-value">${Math.round(st.totalCarbs)}g</div><div class="chip-label">Carbs</div></div>
      <div class="chip ${glClass}"><div class="chip-value">${Math.round(st.totalGL)}</div><div class="chip-label">GL · ${esc(st.level)}</div></div>`;

    const note = r.photo_note || "";
    $("meal-summary").textContent = note ? `📷 ${note}` : "";
    $("meal-summary").classList.toggle("hidden", !note);

    $("food-list").innerHTML = "";
    (r.foods || []).forEach(f => {
      const div = document.createElement("div");
      div.className = "food-item";
      const giClass = f.gi_level === "Low" ? "gi-low" : f.gi_level === "Medium" ? "gi-mid" : "gi-high";
      const srcTag = f.source === "db"
        ? `<span class="src-tag src-db" title="GI from built-in database${f.matched_as ? " (matched as “" + esc(f.matched_as) + "”)" : ""}">📚 database</span>`
        : `<span class="src-tag src-ai" title="Not in the database — GI is an AI estimate">🤖 AI estimate</span>`;
      div.innerHTML = `
        <div class="food-main">
          <div class="food-name">${esc(f.name)} <span class="food-meta">${esc(cap(f.category))}</span></div>
          <div class="food-meta">${esc(f.portion_desc)} · ~${Math.round(f.carbs_g)}g carbs · ${srcTag}</div>
        </div>
        <div class="gi-badge ${giClass}">GI ${esc(f.gi_level)}<br>${f.gi}</div>`;
      $("food-list").appendChild(div);
    });

    $("order-list").innerHTML = "";
    (r.eating_order || []).forEach(step => {
      const li = document.createElement("li");
      li.innerHTML = `<div>
        <div class="order-items">${step.items.map(esc).join(" · ")}</div>
        <div class="order-reason">${esc(step.reason)}</div>
      </div>`;
      $("order-list").appendChild(li);
    });

    $("tips-list").innerHTML = "";
    (r.tips || []).forEach(t => {
      const li = document.createElement("li");
      li.textContent = t;
      $("tips-list").appendChild(li);
    });
  }

  /* ── Save ── */
  $("save-btn").addEventListener("click", () => {
    if (!currentResult) return;
    Store.addRecord({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      time: new Date().toISOString(),
      thumb: currentImage ? currentImage.thumb : null,
      note: $("meal-note").value.trim(),
      result: currentResult,
      followup: null
    });
    flash("save-done");
    renderToday();
  });

  /* ── Log (history) ── */
  function renderHistory() {
    const records = Store.getRecords();
    $("history-empty").classList.toggle("hidden", records.length > 0);
    const list = $("history-list");
    list.innerHTML = "";

    records.forEach(rec => {
      const foods = (rec.result.foods || []).map(f => f.name).join(", ");
      const order = (rec.result.eating_order || [])
        .map(s => s.items.join(" + "))
        .join(" → ");
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
          <button class="history-del" title="Delete" data-id="${rec.id}">✕</button>
        </div>
        <div class="followup-area" data-id="${rec.id}">${followupHTML(rec)}</div>`;
      list.appendChild(card);
    });

    list.querySelectorAll(".history-del").forEach(btn => {
      btn.addEventListener("click", () => {
        if (confirm("Delete this meal?")) {
          Store.deleteRecord(btn.dataset.id);
          renderHistory();
          renderToday();
        }
      });
    });

    list.querySelectorAll(".followup-add").forEach(btn => {
      btn.addEventListener("click", () => openFollowupForm(btn.closest(".followup-area")));
    });
  }

  function followupHTML(rec) {
    const fu = rec.followup;
    if (!fu) {
      return `<button class="btn small followup-add">＋ Add follow-up (how did it go?)</button>`;
    }
    const parts = [];
    if (fu.followed) parts.push(fu.followed === "yes" ? "✅ Followed order" : fu.followed === "partly" ? "🌓 Partly followed" : "❌ Didn't follow");
    if (fu.feeling) parts.push(`${FEELINGS[fu.feeling - 1]} ${FEELING_LABELS[fu.feeling - 1]}`);
    if (fu.glucose) parts.push(`🩸 ${fu.glucose} mg/dL`);
    return `<div class="followup-line">${parts.join(" · ")}
      <button class="btn tiny followup-add">edit</button></div>`;
  }

  function openFollowupForm(area) {
    const id = area.dataset.id;
    const rec = Store.getRecords().find(r => r.id === id);
    const fu = (rec && rec.followup) || {};
    area.innerHTML = `
      <div class="followup-form">
        <div class="fu-label">Did you follow the order?</div>
        <div class="seg" data-name="followed">
          ${["yes", "partly", "no"].map(v =>
            `<button class="seg-btn ${fu.followed === v ? "on" : ""}" data-v="${v}">${v === "yes" ? "Yes" : v === "partly" ? "Partly" : "No"}</button>`).join("")}
        </div>
        <div class="fu-label">How do you feel 1–2h after eating?</div>
        <div class="seg emoji-seg" data-name="feeling">
          ${FEELINGS.map((e, i) =>
            `<button class="seg-btn ${fu.feeling === i + 1 ? "on" : ""}" data-v="${i + 1}" title="${FEELING_LABELS[i]}">${e}</button>`).join("")}
        </div>
        <div class="fu-label">Post-meal glucose — optional (mg/dL)</div>
        <input type="number" class="text-input fu-glucose" placeholder="e.g. 132" value="${fu.glucose || ""}" min="40" max="500">
        <button class="btn primary full fu-save">Save follow-up</button>
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
    if (confirm("Delete ALL logged meals? This cannot be undone.")) {
      Store.clearRecords();
      renderHistory();
      renderToday();
    }
  });

  /* ── Helpers ── */
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function cap(s) {
    s = String(s || "");
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  function show(id) { $(id).classList.remove("hidden"); }
  function hide(id) { $(id).classList.add("hidden"); }
  function flash(id) {
    show(id);
    setTimeout(() => hide(id), 2000);
  }
  function showError(msg) {
    $("error-box").textContent = "⚠️ " + msg;
    show("error-box");
  }

  loadSettings();
  renderToday();
})();
