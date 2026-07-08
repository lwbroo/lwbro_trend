/* UI 主邏輯 */
(() => {
  const $ = id => document.getElementById(id);

  let currentImage = null;   // { data, thumb }
  let currentResult = null;  // 最近一次分析結果

  /* ── 分頁切換 ── */
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  function switchTab(name) {
    document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("active", p.id === "tab-" + name));
    if (name === "history") renderHistory();
    if (name === "analyze") updateSetupHint();
  }

  $("goto-settings").addEventListener("click", () => switchTab("settings"));

  /* ── 設定 ── */
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

  /* ── 照片選擇 ── */
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

  /* ── 分析 ── */
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
    $("meal-summary").textContent = r.meal_summary || "";

    $("food-list").innerHTML = "";
    (r.foods || []).forEach(f => {
      const div = document.createElement("div");
      div.className = "food-item";
      const giClass = f.gi_level === "低" ? "gi-low" : f.gi_level === "中" ? "gi-mid" : "gi-high";
      const srcTag = f.source === "db"
        ? `<span class="src-tag src-db" title="GI 值來自內建資料庫${f.matched_as ? "（比對為「" + esc(f.matched_as) + "」）" : ""}">📚 資料庫</span>`
        : `<span class="src-tag src-ai" title="資料庫查無此食物，GI 為 AI 估計值">🤖 AI估計</span>`;
      div.innerHTML = `
        <div class="food-main">
          <div class="food-name">${esc(f.name)} <span class="food-meta">${esc(f.category)}</span></div>
          <div class="food-meta">${esc(f.portion_desc)} · 碳水約 ${Math.round(f.carbs_g)}g · ${srcTag}</div>
        </div>
        <div class="gi-badge ${giClass}">GI ${esc(f.gi_level)}<br>${f.gi}</div>`;
      $("food-list").appendChild(div);
    });

    $("order-list").innerHTML = "";
    (r.eating_order || []).forEach(step => {
      const li = document.createElement("li");
      li.innerHTML = `<div>
        <div class="order-items">${step.items.map(esc).join("、")}</div>
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

  /* ── 儲存紀錄 ── */
  $("save-btn").addEventListener("click", () => {
    if (!currentResult) return;
    Store.addRecord({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      time: new Date().toISOString(),
      thumb: currentImage ? currentImage.thumb : null,
      note: $("meal-note").value.trim(),
      result: currentResult
    });
    flash("save-done");
  });

  /* ── 紀錄頁 ── */
  function renderHistory() {
    const records = Store.getRecords();
    $("history-empty").classList.toggle("hidden", records.length > 0);
    const list = $("history-list");
    list.innerHTML = "";

    records.forEach(rec => {
      const foods = (rec.result.foods || []).map(f => f.name).join("、");
      const order = (rec.result.eating_order || [])
        .map(s => s.items.join("+"))
        .join(" → ");
      const card = document.createElement("div");
      card.className = "card history-item";
      card.innerHTML = `
        ${rec.thumb ? `<img class="history-thumb" src="data:image/jpeg;base64,${rec.thumb}" alt="">` : `<div class="history-thumb"></div>`}
        <div class="history-main">
          <div class="history-date">${formatTime(rec.time)}</div>
          <div class="history-foods">${esc(foods)}</div>
          <div class="history-order">🥢 ${esc(order)}</div>
        </div>
        <button class="history-del" title="刪除" data-id="${rec.id}">✕</button>`;
      list.appendChild(card);
    });

    list.querySelectorAll(".history-del").forEach(btn => {
      btn.addEventListener("click", () => {
        if (confirm("刪除這筆紀錄？")) {
          Store.deleteRecord(btn.dataset.id);
          renderHistory();
        }
      });
    });
  }

  /* ── 匯出／清除 ── */
  $("export-btn").addEventListener("click", () => {
    const blob = new Blob([Store.exportJSON()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `glyco-records-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("clear-btn").addEventListener("click", () => {
    if (confirm("確定清除所有用餐紀錄？此動作無法復原。")) {
      Store.clearRecords();
      renderHistory();
    }
  });

  /* ── 小工具 ── */
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function formatTime(iso) {
    const d = new Date(iso);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
})();
