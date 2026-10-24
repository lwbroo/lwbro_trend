/*
 * app.js — UI 主邏輯
 * 分頁：今日流運（含每日記錄）、本命盤、記錄、趨勢分析、設定。
 */
(() => {
  'use strict';

  /* ================= 全域錯誤回報 ================= */
  /* 最多回報 5 個，避免一個迴圈型錯誤瞬間灌爆 log。只送技術資訊，見 ai.js 的 reportError()。 */
  let errorReportCount = 0;
  function reportErrorOnce(info) {
    if (errorReportCount >= 5) return;
    errorReportCount++;
    if (typeof AiReading !== 'undefined') AiReading.reportError(info);
  }
  window.addEventListener('error', ev => {
    reportErrorOnce({ message: ev.message, source: ev.filename, line: ev.lineno });
  });
  window.addEventListener('unhandledrejection', ev => {
    const reason = ev.reason;
    reportErrorOnce({
      message: '(unhandled promise) ' + (reason && reason.message ? reason.message : String(reason)),
      source: (reason && reason.stack) ? String(reason.stack).split('\n')[1] || '' : '',
      line: null
    });
  });

  const $ = sel => document.querySelector(sel);
  const $$ = sel => [...document.querySelectorAll(sel)];
  const appHeader = $('.app-header');
  function updateHeaderScrollGap() {
    document.documentElement.style.setProperty('--app-header-scroll-gap', `${Math.ceil(appHeader.getBoundingClientRect().height) + 12}px`);
  }
  if (window.ResizeObserver) new ResizeObserver(updateHeaderScrollGap).observe(appHeader);
  window.addEventListener('resize', updateHeaderScrollGap);
  updateHeaderScrollGap();

  const PRESET_TAGS = ['工作順利', '壓力大', '人際佳', '有衝突', '身體不適', '睡眠差', '財運佳', '破財', '感情和睦', '心情低落', '學習進步', '運動'];
  const MUTAGEN_LABELS = ['祿', '權', '科', '忌'];
  const MUTAGEN_CLASS = ['lu', 'quan', 'ke', 'ji'];
  const SHISHEN_ORDER = ['比肩', '劫財', '食神', '傷官', '正財', '偏財', '正官', '七殺', '正印', '偏印'];
  const WUXING_ORDER = ['木', '火', '土', '金', '水'];

  let currentDate = todayStr();
  let analyzer = null, analyzerSig = '';
  // Session-only drafts: navigating must not save or discard a user's edits.
  const checkinDrafts = new Map();
  let checkinFormLoaded = false;
  let profileFormDirty = false;

  function setStatus(element, message, state = 'success') {
    element.dataset.state = state;
    element.setAttribute('role', state === 'error' ? 'alert' : 'status');
    element.setAttribute('aria-live', state === 'error' ? 'assertive' : 'polite');
    element.setAttribute('aria-atomic', 'true');
    const update = element.dataset.statusMessage !== message || state === 'error';
    element.dataset.statusMessage = message;
    if (update) element.textContent = message;
  }

  function todayStr() { return fmtDate(new Date()); }
  function fmtDate(d) {
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function getAnalyzer(profile) {
    const sig = JSON.stringify([profile.birthDate, profile.birthTime, profile.gender]);
    if (!analyzer || sig !== analyzerSig) {
      analyzer = Engine.createAnalyzer(profile);
      analyzerSig = sig;
    }
    return analyzer;
  }

  /* ================= 分頁 ================= */
  function switchTab(name, { resetScroll = false } = {}) {
    if (window.ZWBZ_NATIVE_OFFLINE && name === 'ai-chat') return;
    if (checkinFormLoaded && $('#tab-today').classList.contains('active')) captureCheckinDraft();
    $$('.tab').forEach(b => {
      const active = b.dataset.tab === name;
      b.classList.toggle('active', active);
      b.setAttribute('aria-current', active ? 'page' : 'false');
    });
    $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + name));
    const render = { today: renderToday, chart: renderChartTab, records: renderRecords, trends: renderTrends, 'ai-chat': renderChatTab, settings: renderSettings };
    if (render[name]) render[name]();
    if (resetScroll) window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }
  $('#tabs').addEventListener('click', ev => {
    const btn = ev.target.closest('.tab');
    if (btn) switchTab(btn.dataset.tab, { resetScroll: true });
  });

  function renderProfileChip() {
    const p = Store.getProfile();
    $('#profile-chip').textContent = p
      ? `${p.name || (window.ZWBZI18n ? ZWBZI18n.t('我') : '我')} · ${p.birthDate} ${p.birthTime} · ${window.ZWBZI18n ? ZWBZI18n.t(p.gender) : p.gender}`
      : (window.ZWBZI18n ? ZWBZI18n.t('尚未設定出生資料') : '尚未設定出生資料');
  }

  /* ================= 今日流運 ================= */
  function renderToday() {
    const profile = Store.getProfile();
    $('#today-date').value = currentDate;
    $('#today-need-profile').hidden = !!profile;
    $('#checkin-card').style.display = '';
    const box = $('#today-content');
    if (!profile) { box.innerHTML = ''; loadCheckinForm(); return; }

    let y, m, d;
    try { ({ y, m, d } = Engine.parseCivilDate(currentDate)); }
    catch (e) { box.textContent = e.message; return; }
    const info = Engine.daily(profile, new Date(y, m - 1, d, 12, 0, 0));
    const natal = Engine.baziNatal(profile);
    const b = info.bazi, z = info.ziwei;

    const aiConfigured = AiReading.configured();
    const cachedReading = aiConfigured ? AiReading.peekCache(profile, currentDate) : null;
    const aiCard = aiConfigured ? `
      <div class="card">
        <h2>今日運勢 <span class="hint">AI 個人化解讀</span></h2>
        <p id="ai-reading-text" class="reading-text">${cachedReading ? esc(cachedReading) : '尚未取得 AI 解讀。'}</p>
        ${cachedReading ? '' : '<p class="hint">按下方按鈕後，當日推算出的命盤資料會經 Cloudflare 傳給 xAI；不傳姓名或完整生日。</p><button type="button" id="btn-ai-reading" class="btn-primary">同意並取得 AI 解讀</button>'}
      </div>` : '';

    const baziRow = (label, o) => `
      <tr>
        <th>${label}</th>
        <td class="gz">${o.gan}<span class="wx wx-${o.ganWuXing}">${o.ganWuXing}</span>${o.zhi}<span class="wx wx-${o.zhiWuXing}">${o.zhiWuXing}</span></td>
        <td>${o.shiShen}</td>
        <td>${o.zhiShiShen}</td>
      </tr>`;

    const mutagenBadges = mut => mut.map((star, i) =>
      `<span class="mutagen mutagen-${MUTAGEN_CLASS[i]}">${star}化${MUTAGEN_LABELS[i]}</span>`).join(' ');

    const ziweiRow = (label, l) => `
      <tr>
        <th>${label}</th>
        <td class="gz">${l.ganZhi}</td>
        <td>${l.palaceName}宮${l.palaceStars.length ? '（' + l.palaceStars.join('、') + '）' : ''}</td>
        <td>${mutagenBadges(l.mutagen)}</td>
      </tr>`;

    box.innerHTML = `
      ${aiCard}
      <div class="card">
        <h2>八字流運 <span class="hint">${esc(b.lunarDate)}${b.jieQi ? ' · 節氣：' + esc(b.jieQi) : ''}</span></h2>
        <table class="info-table">
          <thead><tr><th></th><th>干支</th><th>天干十神</th><th>地支十神</th></tr></thead>
          <tbody>
            ${b.daYun ? baziRow(`大運<i class="hint">${b.daYun.startYear}–${b.daYun.endYear}</i>`, b.daYun) : ''}
            ${baziRow('流年', b.year)}
            ${baziRow('流月', b.month)}
            ${baziRow('流日', b.day)}
          </tbody>
        </table>
        <p class="hint">十神以你的日主「${natal.dayMaster}」推算；流年以立春換年、流月以節氣換月。每日統一以日期 12:00 作參考；節氣交接日其他時段可能不同，未做出生地時區校正。</p>
      </div>
      <div class="card">
        <h2>紫微流運</h2>
        <table class="info-table">
          <thead><tr><th></th><th>干支</th><th>命宮落點</th><th>四化</th></tr></thead>
          <tbody>
            ${ziweiRow('大限', z.decadal)}
            ${ziweiRow('流年', z.yearly)}
            ${ziweiRow('流月', z.monthly)}
            ${ziweiRow('流日', z.daily)}
          </tbody>
        </table>
        <p class="hint">「命宮落點」指該層流運命宮落在本命盤的哪一宮；四化為該層天干引動的祿權科忌。</p>
      </div>`;

    if (aiConfigured && !cachedReading) {
      $('#btn-ai-reading').addEventListener('click', async ev => {
        const button = ev.currentTarget;
        button.disabled = true;
        const requestedDate = currentDate;
        const result = $('#ai-reading-text');
        result.textContent = '解讀中…';
        try {
          const reading = await AiReading.getReading(profile, requestedDate, info, natal);
          if (currentDate !== requestedDate) return;
          result.textContent = reading;
          button.remove();
        } catch (e) {
          if (currentDate !== requestedDate) return;
          result.textContent = '解讀暫時無法取得，稍後再試。';
          button.disabled = false;
        }
      });
    }

    loadCheckinForm();
  }

  $('#today-date').addEventListener('change', ev => {
    if (ev.target.value) { captureCheckinDraft(); currentDate = ev.target.value; renderToday(); }
  });
  $('#btn-goto-today').addEventListener('click', () => { captureCheckinDraft(); currentDate = todayStr(); renderToday(); });

  /* ---------- 每日記錄表單 ---------- */
  function allTags() {
    const used = new Set(PRESET_TAGS);
    Store.getRecords().forEach(r => (r.tags || []).forEach(t => used.add(t)));
    return [...used];
  }
  function renderTagChips(selected) {
    const box = $('#tag-chips');
    box.innerHTML = '';
    [...new Set([...allTags(), ...selected])].forEach(tag => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip' + (selected.includes(tag) ? ' on' : '');
      chip.dataset.tag = tag;
      chip.textContent = window.ZWBZI18n ? ZWBZI18n.tag(tag) : tag;
      chip.addEventListener('click', () => chip.classList.toggle('on'));
      box.appendChild(chip);
    });
  }
  function checkinValues() {
    return {
      mood: ($('input[name="mood"]:checked') || {}).value || '',
      energy: ($('input[name="energy"]:checked') || {}).value || '',
      tags: $$('#tag-chips .chip.on').map(c => c.dataset.tag),
      note: $('#note').value,
      customTag: $('#custom-tag').value
    };
  }
  function captureCheckinDraft() {
    const values = checkinValues(), rec = Store.getRecord(currentDate);
    const unchanged = values.mood === String(rec?.mood || '') && values.energy === String(rec?.energy || '') &&
      values.note === (rec?.note || '') && !values.customTag &&
      JSON.stringify([...values.tags].sort()) === JSON.stringify([...(rec?.tags || [])].sort());
    if (unchanged) checkinDrafts.delete(currentDate);
    else checkinDrafts.set(currentDate, values);
    return !unchanged;
  }
  function showDraftStatus() {
    if (captureCheckinDraft()) {
      setStatus($('#checkin-status'), '草稿尚未儲存（僅保留於本次開啟；請按「儲存記錄」保存）', 'neutral');
    } else {
      const rec = Store.getRecord(currentDate);
      setStatus($('#checkin-status'), rec ? `此日已有記錄（最後更新 ${new Date(rec.updatedAt).toLocaleString()}）` : '', 'neutral');
    }
  }
  function loadCheckinForm() {
    const rec = Store.getRecord(currentDate);
    const draft = checkinDrafts.get(currentDate);
    const values = draft || rec;
    const form = $('#checkin-form');
    form.reset();
    if (values) {
      if (values.mood) form.querySelector(`input[name="mood"][value="${values.mood}"]`).checked = true;
      if (values.energy) form.querySelector(`input[name="energy"][value="${values.energy}"]`).checked = true;
      $('#note').value = values.note || '';
      $('#custom-tag').value = values.customTag || '';
    }
    renderTagChips(values ? (values.tags || []) : []);
    checkinFormLoaded = true;
    setStatus($('#checkin-status'), draft ? '草稿尚未儲存（僅保留於本次開啟；請按「儲存記錄」保存）' :
      rec ? `此日已有記錄（最後更新 ${new Date(rec.updatedAt).toLocaleString()}）` : '', 'neutral');
  }
  $('#checkin-form').addEventListener('input', showDraftStatus);
  $('#tag-chips').addEventListener('click', showDraftStatus);
  $('#custom-tag').addEventListener('keydown', ev => {
    if (ev.key !== 'Enter') return;
    ev.preventDefault();
    const val = ev.target.value.trim();
    if (!val) return;
    const chips = $$('#tag-chips .chip');
    let chip = chips.find(c => c.dataset.tag === val);
    if (!chip) {
      chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.dataset.tag = val;
      chip.textContent = window.ZWBZI18n ? ZWBZI18n.tag(val) : val;
      chip.addEventListener('click', () => chip.classList.toggle('on'));
      $('#tag-chips').appendChild(chip);
    }
    chip.classList.add('on');
    ev.target.value = '';
    showDraftStatus();
  });
  $('#checkin-form').addEventListener('submit', ev => {
    ev.preventDefault();
    const mood = ($('input[name="mood"]:checked') || {}).value;
    const energy = ($('input[name="energy"]:checked') || {}).value;
    captureCheckinDraft();
    if (!mood && !energy) { setStatus($('#checkin-status'), '請至少選擇心情或精力', 'error'); return; }
    try {
      Store.upsertRecord({
        date: currentDate,
        mood: mood ? Number(mood) : null,
        energy: energy ? Number(energy) : null,
        tags: $$('#tag-chips .chip.on').map(c => c.dataset.tag),
        note: $('#note').value.trim()
      });
    } catch (e) { setStatus($('#checkin-status'), e.name === 'QuotaExceededError' ? '儲存失敗，草稿仍保留。請保持 App 開啟後重試。' : e.message, 'error'); return; }
    checkinDrafts.delete(currentDate);
    $('#note').value = $('#note').value.trim();
    setStatus($('#checkin-status'), `已儲存 ${currentDate} 的記錄 ✓`);
    Sync.schedulePush();
  });

  /* ================= 本命盤 ================= */
  function renderChartTab() {
    const profile = Store.getProfile();
    $('#chart-need-profile').hidden = !!profile;
    $('#ziwei-board-wrap').style.display = profile ? '' : 'none';
    $('#bazi-card').style.display = profile ? '' : 'none';
    if (!profile) return;
    renderZiweiBoard(profile);
    renderBaziCard(profile);
    updateChartScroll();
  }

  const chartScroll = $('#ziwei-board-scroll');
  function updateChartScroll() {
    if (!chartScroll) return;
    const remaining = chartScroll.scrollWidth - chartScroll.clientWidth;
    $('#chart-scroll-left').disabled = chartScroll.scrollLeft <= 1;
    $('#chart-scroll-right').disabled = chartScroll.scrollLeft >= remaining - 1;
    $('.chart-scroll-controls').hidden = remaining <= 1;
    $('#chart-scroll-help').textContent = remaining > 1
      ? '十二宮保持原有排列。左右滑動或使用按鈕查看所有宮位；鍵盤可用左右方向鍵、Home／End。'
      : '十二宮保持原有排列。';
  }
  if (chartScroll) {
    const moveChart = direction => {
      chartScroll.scrollBy({ left: direction * chartScroll.clientWidth * .75, behavior: 'auto' });
      updateChartScroll();
    };
    $('#chart-scroll-left').addEventListener('click', () => moveChart(-1));
    $('#chart-scroll-right').addEventListener('click', () => moveChart(1));
    chartScroll.addEventListener('scroll', updateChartScroll, { passive: true });
    chartScroll.addEventListener('keydown', ev => {
      if (ev.target !== chartScroll || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(ev.key)) return;
      ev.preventDefault();
      if (ev.key === 'Home' || ev.key === 'End') {
        chartScroll.scrollLeft = ev.key === 'Home' ? 0 : chartScroll.scrollWidth;
        updateChartScroll();
      } else moveChart(ev.key === 'ArrowLeft' ? -1 : 1);
    });
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(updateChartScroll).observe(chartScroll);
  }

  function renderZiweiBoard(profile) {
    const a = Engine.ziweiNatal(profile);
    const h = a.horoscope(new Date());
    // 星曜 → 流運四化標籤（年祿/月忌…）
    const flowTags = {};
    [['年', h.yearly], ['月', h.monthly], ['日', h.daily]].forEach(([pre, layer]) => {
      (layer.mutagen || []).forEach((star, i) => {
        (flowTags[star] = flowTags[star] || []).push({ text: pre + MUTAGEN_LABELS[i], cls: MUTAGEN_CLASS[i] });
      });
    });
    const layerBadge = {};
    [['流年', h.yearly.index], ['流月', h.monthly.index], ['流日', h.daily.index]].forEach(([t, idx]) => {
      (layerBadge[idx] = layerBadge[idx] || []).push(t);
    });

    const starHtml = (s, major) => {
      const bright = s.brightness ? `<i class="bright">${s.brightness}</i>` : '';
      const natalMut = s.mutagen ? `<span class="mutagen mutagen-${MUTAGEN_CLASS[MUTAGEN_LABELS.indexOf(s.mutagen)]}">${s.mutagen}</span>` : '';
      const flows = (flowTags[s.name] || []).map(t => `<span class="flow-tag flow-${t.cls}">${t.text}</span>`).join('');
      return `<span class="star ${major ? 'star-major' : 'star-minor'}">${s.name}${bright}${natalMut}${flows}</span>`;
    };

    const board = $('#ziwei-board');
    board.innerHTML = '';
    a.palaces.forEach((p, idx) => {
      const cell = document.createElement('div');
      cell.className = 'palace branch-' + p.earthlyBranch;
      const badges = (layerBadge[idx] || []).map(t => `<span class="layer-badge">${t}</span>`).join('');
      cell.innerHTML = `
        <div class="palace-stars">
          ${p.majorStars.map(s => starHtml(s, true)).join('')}
          ${p.minorStars.map(s => starHtml(s, false)).join('')}
        </div>
        <div class="palace-adj">${p.adjectiveStars.map(s => s.name).join(' ')}</div>
        <div class="palace-foot">
          <span class="palace-name">${p.name}${p.isBodyPalace ? '<b class="body-tag">身</b>' : ''}${badges}</span>
          <span class="palace-meta">${p.decadal && p.decadal.range ? p.decadal.range.join('–') : ''}</span>
          <span class="palace-gz">${p.heavenlyStem}${p.earthlyBranch}</span>
        </div>`;
      board.appendChild(cell);
    });

    const natalBazi = Engine.baziNatal(profile);
    const center = document.createElement('div');
    center.className = 'palace palace-center';
    center.innerHTML = `
      <h3>${esc(profile.name || '我')}（${profile.gender}）</h3>
      <p>國曆 ${profile.birthDate} ${profile.birthTime}</p>
      <p>${esc(natalBazi.lunarDate)} ${natalBazi.shiChen}</p>
      <p>四柱：${natalBazi.pillars.map(p => p.gan + p.zhi).join('　')}</p>
      <p>五行局：${a.fiveElementsClass}　生肖：${natalBazi.shengXiao}</p>
      <p>命主：${a.soul}　身主：${a.body}</p>
      <p class="hint">今日 ${todayStr()}｜流年${h.yearly.heavenlyStem}${h.yearly.earthlyBranch}．流月${h.monthly.heavenlyStem}${h.monthly.earthlyBranch}．流日${h.daily.heavenlyStem}${h.daily.earthlyBranch}</p>`;
    board.appendChild(center);
  }

  function renderBaziCard(profile) {
    const n = Engine.baziNatal(profile);
    const cols = n.pillars;
    $('#bazi-table').innerHTML = `
      <table class="bazi-table">
        <thead><tr><th></th>${cols.map(p => `<th>${p.name}</th>`).join('')}</tr></thead>
        <tbody>
          <tr><th>十神</th>${cols.map(p => `<td>${p.shiShenGan}</td>`).join('')}</tr>
          <tr class="big"><th>天干</th>${cols.map(p => `<td>${p.gan}<span class="wx wx-${p.ganWuXing}">${p.ganWuXing}</span></td>`).join('')}</tr>
          <tr class="big"><th>地支</th>${cols.map(p => `<td>${p.zhi}<span class="wx wx-${p.zhiWuXing}">${p.zhiWuXing}</span></td>`).join('')}</tr>
          <tr><th>藏干</th>${cols.map(p => `<td>${p.cangGan.map(c => `${c.gan}<i class="hint">${c.shiShen}</i>`).join('<br>')}</td>`).join('')}</tr>
          <tr><th>納音</th>${cols.map(p => `<td>${p.naYin}</td>`).join('')}</tr>
        </tbody>
      </table>
      <p class="hint">日主：${n.dayMaster}（${n.dayMasterYinYang}${n.dayMasterWuXing}）</p>`;

    const maxCount = Math.max(...WUXING_ORDER.map(w => n.wuxingCount[w]), 1);
    $('#wuxing-dist').innerHTML = WUXING_ORDER.map(w => `
      <div class="dist-row">
        <span class="dist-label">${w}</span>
        <span class="dist-bar"><i style="width:${n.wuxingCount[w] / maxCount * 100}%"></i></span>
        <span class="dist-count">${n.wuxingCount[w]}</span>
      </div>`).join('');
  }

  /* ================= 記錄 ================= */
  function renderRecords() {
    const records = [...Store.getRecords()].reverse();
    const profile = Store.getProfile();
    const keysOf = profile ? getAnalyzer(profile) : null;
    const box = $('#records-list');
    if (!records.length) {
      box.innerHTML = '<p class="empty-hint">還沒有任何記錄。到「今日流運」記下今天的狀態，就開始累積你的個人趨勢資料庫。</p>';
      return;
    }
    box.innerHTML = `
      <p class="hint">共 ${records.length} 筆記錄</p>
      <table class="records-table" role="table" aria-label="每日狀態記錄">
        <thead role="rowgroup"><tr role="row"><th scope="col" class="record-date">日期</th><th scope="col">流日干支</th><th scope="col">心情</th><th scope="col">精力</th><th scope="col">標籤</th><th scope="col">筆記</th><th scope="col" class="record-actions-heading">操作</th></tr></thead>
        <tbody role="rowgroup">
          ${records.map(r => {
            const k = keysOf ? keysOf(r.date) : null;
            return `<tr role="row">
              <th scope="row" role="rowheader" class="record-date"><time datetime="${r.date}">${r.date}</time></th>
              <td role="cell" data-label="流日干支">${k ? `${k.dayGanZhi} <span class="hint">${k.shiShen}</span>` : '—'}</td>
              <td role="cell" data-label="心情">${r.mood != null ? r.mood : '—'}</td>
              <td role="cell" data-label="精力">${r.energy != null ? r.energy : '—'}</td>
              <td role="cell" data-label="標籤">${(r.tags || []).map(t => `<span class="chip chip-static" data-tag="${esc(t)}">${esc(window.ZWBZI18n ? ZWBZI18n.tag(t) : t)}</span>`).join(' ') || '—'}</td>
              <td role="cell" data-label="筆記" class="note-cell">${esc(r.note || '') || '—'}</td>
              <td role="cell" class="row-actions"><div class="record-actions">
                <button class="btn-mini" data-act="edit" data-date="${r.date}" aria-label="編輯 ${r.date} 的記錄">編輯</button>
                <button class="btn-mini danger" data-act="del" data-date="${r.date}" aria-label="刪除 ${r.date} 的記錄">刪除</button>
              </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;

    box.onclick = ev => {
      const btn = ev.target.closest('button[data-act]');
      if (!btn) return;
      if (btn.dataset.act === 'edit') {
        currentDate = btn.dataset.date;
        switchTab('today', { resetScroll: true });
        const entryTop = $('#checkin-card').getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: Math.max(0, entryTop - $('.app-header').getBoundingClientRect().height - 12), behavior: 'auto' });
      } else if (btn.dataset.act === 'del') {
        if (confirm(window.ZWBZI18n ? ZWBZI18n.t(`確定刪除 ${btn.dataset.date} 的記錄？`) : `確定刪除 ${btn.dataset.date} 的記錄？`)) {
          Store.deleteRecord(btn.dataset.date);
          checkinDrafts.delete(btn.dataset.date);
          renderRecords();
          Sync.schedulePush();
        }
      }
    };
  }

  function download(filename, text, mime) {
    if (window.ZWBZ_NATIVE_EXPORT) {
      nativeIO(() => window.ZWBZ_NATIVE_EXPORT(filename, text))
        .then(result => { if (!result.ignored) setIOStatus(result.completed ? '分享完成' : '已取消分享', result.completed ? 'success' : 'neutral'); })
        .catch(e => setIOStatus('分享失敗：' + e.message, 'error'));
      return;
    }
    const blob = new Blob([text], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const aEl = document.createElement('a');
    aEl.href = url; aEl.download = filename;
    document.body.appendChild(aEl); aEl.click();
    setTimeout(() => { URL.revokeObjectURL(url); aEl.remove(); }, 100);
  }
  function exportJSONFile() {
    download(`ziwei-bazi-trend-${todayStr()}.json`, Store.exportJSON(), 'application/json');
  }
  $('#btn-export-json').addEventListener('click', exportJSONFile);
  $('#btn-export-csv').addEventListener('click', () => {
    const profile = Store.getProfile();
    const keysOf = profile ? getAnalyzer(profile) : null;
    const rows = Store.getRecords().map(r => {
      const k = keysOf ? keysOf(r.date) : {};
      return [r.date, r.mood, r.energy, (r.tags || []).join('；'), r.note || '',
        k.dayGanZhi || '', k.dayGanWuXing || '', k.shiShen || '', k.ziweiPalace || '', k.ziweiHuaJi || ''];
    });
    const csv = Store.exportCSV(rows, ['日期', '心情', '精力', '標籤', '筆記', '流日干支', '流日天干五行', '流日十神', '紫微流日命宮', '流日化忌']);
    download(`ziwei-bazi-records-${todayStr()}.csv`, '﻿' + csv, 'text/csv;charset=utf-8');
  });
  function setIOStatus(message, state = 'success') {
    setStatus($('#records-io-status'), message, state);
    setStatus($('#profile-status'), message, state);
  }
  let nativeIOPending = false;
  async function nativeIO(operation) {
    if (nativeIOPending) return { ignored: true };
    nativeIOPending = true;
    const controls = ['#btn-export-json', '#btn-export-csv', '#btn-import-json', '#btn-settings-export']
      .map(selector => $(selector)).filter(Boolean);
    controls.forEach(control => { control.disabled = true; });
    try { return await operation(); }
    finally {
      nativeIOPending = false;
      controls.forEach(control => { control.disabled = false; });
    }
  }
  function importText(text) {
    try {
      const result = Store.importJSON(text);
      setIOStatus(`匯入完成：新增 ${result.added} 筆、更新 ${result.updated} 筆，共 ${result.total} 筆`);
      renderProfileChip();
      renderRecords();
      Sync.schedulePush();
    } catch (e) { setIOStatus('匯入失敗：' + e.message, 'error'); }
  }
  // Older personalized entrances still use a label wrapping the file input.
  const importButton = $('#btn-import-json');
  if (importButton) importButton.addEventListener('click', async () => {
    if (!window.ZWBZ_NATIVE_IMPORT) { $('#import-file').click(); return; }
    try {
      const result = await nativeIO(() => window.ZWBZ_NATIVE_IMPORT());
      if (result.ignored) return;
      if (result.cancelled) setIOStatus('已取消匯入', 'neutral');
      else importText(result.text);
    } catch (e) { setIOStatus('匯入失敗：' + e.message, 'error'); }
  });
  $('#import-file').addEventListener('cancel', () => setIOStatus('已取消匯入', 'neutral'));
  $('#import-file').addEventListener('change', ev => {
    const file = ev.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setIOStatus('匯入失敗：檔案超過 5 MB，請選擇較小的 JSON 備份', 'error');
      ev.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      importText(reader.result);
      ev.target.value = '';
    };
    reader.onerror = () => { setIOStatus('匯入失敗：無法讀取檔案，請重新選擇備份', 'error'); ev.target.value = ''; };
    reader.onabort = () => { setIOStatus('匯入已中斷，原有資料未變更', 'neutral'); ev.target.value = ''; };
    reader.readAsText(file);
  });

  /* ================= 趨勢分析 ================= */
  function groupAvg(rows, keyFn, metric, order) {
    const groups = new Map();
    rows.forEach(row => {
      const v = row.rec[metric];
      if (v == null) return;
      const key = keyFn(row.keys);
      if (!key) return;
      const g = groups.get(key) || { sum: 0, count: 0 };
      g.sum += v; g.count++;
      groups.set(key, g);
    });
    const cats = [...(order || [])].filter(c => groups.has(c));
    [...groups.keys()].forEach(k => { if (!cats.includes(k)) cats.push(k); });
    return cats.map(label => {
      const g = groups.get(label);
      return { label, value: g.sum / g.count, count: g.count };
    });
  }

  /** 標籤分組平均（一筆記錄可有多個標籤）；取使用次數前 12 名，依平均值排序 */
  function groupAvgByTag(rows, metric) {
    const groups = new Map();
    rows.forEach(({ rec }) => {
      const v = rec[metric];
      if (v == null) return;
      (rec.tags || []).forEach(t => {
        const g = groups.get(t) || { sum: 0, count: 0 };
        g.sum += v; g.count++;
        groups.set(t, g);
      });
    });
    return [...groups.entries()]
      .map(([label, g]) => ({ label, value: g.sum / g.count, count: g.count }))
      .sort((a, b) => b.count - a.count).slice(0, 12)
      .sort((a, b) => b.value - a.value);
  }

  /** 未來 14 天預覽：以「同五行／同十神／同紫微流日命宮」的歷史平均加權推估 */
  function renderForecast(el, rows, keysOf, metric, metricName) {
    const vals = rows.map(r => r.rec[metric]).filter(v => v != null);
    if (vals.length < 10) {
      el.innerHTML = `<p class="empty-hint">累積 10 筆以上有${metricName}的記錄後，這裡會依你的歷史資料預估未來每天的狀態。（目前 ${vals.length} 筆）</p>`;
      return;
    }
    const overall = vals.reduce((a, b) => a + b, 0) / vals.length;
    const avgMap = keyFn => {
      const m = new Map();
      rows.forEach(({ rec, keys }) => {
        const v = rec[metric];
        if (v == null) return;
        const key = keyFn(keys);
        if (!key) return;
        const g = m.get(key) || { sum: 0, count: 0 };
        g.sum += v; g.count++;
        m.set(key, g);
      });
      return m;
    };
    const dims = [
      { map: avgMap(k => k.dayGanWuXing), key: k => k.dayGanWuXing },
      { map: avgMap(k => k.shiShen), key: k => k.shiShen },
      { map: avgMap(k => k.ziweiPalace), key: k => k.ziweiPalace }
    ];
    const WEEKDAY = window.ZWBZI18n && ZWBZI18n.language() === 'en' ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] : ['日', '一', '二', '三', '四', '五', '六'];
    const items = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      const ds = fmtDate(d);
      const k = keysOf(ds);
      let wSum = 0, vSum = 0;
      dims.forEach(dim => {
        const g = dim.map.get(dim.key(k));
        if (!g) return;
        const w = Math.min(g.count, 10); // 樣本越多權重越高，上限 10
        wSum += w; vSum += (g.sum / g.count) * w;
      });
      const score = wSum > 0 ? vSum / wSum : null;
      const diff = score == null ? null : score - overall;
      let cls = 'fc-mid', mark = '≈';
      if (diff != null && diff >= 0.15) { cls = 'fc-up'; mark = '▲'; }
      else if (diff != null && diff <= -0.15) { cls = 'fc-down'; mark = '▼'; }
      items.push({ ds, weekday: WEEKDAY[d.getDay()], k, score, cls, mark, low: wSum < 5, today: i === 0 });
    }
    el.innerHTML = `
      <div class="forecast-grid">
        ${items.map(it => `
          <div class="fc-cell ${it.cls}${it.today ? ' fc-today' : ''}">
            <div class="fc-date">${it.ds.slice(5)}<i>（${it.weekday}）</i>${it.today ? '<b>今天</b>' : ''}</div>
            <div class="fc-gz">${it.k.dayGanZhi}日 · ${it.k.shiShen}</div>
            <div class="fc-palace">${it.k.ziweiPalace}宮</div>
            <div class="fc-score">${it.mark} ${it.score != null ? it.score.toFixed(1) : '—'}${it.low ? '<i class="hint">樣本少</i>' : ''}</div>
          </div>`).join('')}
      </div>
      <p class="hint">▲ 高於／▼ 低於你的整體平均${metricName}（${overall.toFixed(2)}）±0.15；預估值＝同五行、同十神、同紫微流日命宮之歷史平均的加權合成。</p>`;
  }

  function renderTrends() {
    const profile = Store.getProfile();
    const box = $('#trends-content');
    if (!profile) { box.innerHTML = '<p class="notice">請先到「設定」輸入出生資料。</p>'; return; }
    let records = Store.getRecords();
    const range = $('#trend-range').value;
    if (range !== 'all') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - Number(range));
      const cutoffStr = fmtDate(cutoff);
      records = records.filter(r => r.date >= cutoffStr);
    }
    if (records.length < 2) {
      box.innerHTML = '<p class="empty-hint">至少需要 2 筆記錄才能畫出趨勢。持續在「今日流運」記錄你的狀態吧！</p>';
      return;
    }
    const metric = $('#trend-metric').value;
    const metricName = metric === 'mood' ? '心情' : '精力';
    const keysOf = getAnalyzer(profile);
    const rows = records.map(rec => ({ rec, keys: keysOf(rec.date) }));

    box.innerHTML = `
      <div class="card"><h2>心情與精力走勢</h2><div id="tr-line"></div></div>
      <div class="grid-2col">
        <div class="card"><h2>平均${metricName} × 流日天干五行</h2><div id="tr-wx"></div></div>
        <div class="card"><h2>平均${metricName} × 流日十神</h2><p class="hint">流日天干對你日主的十神關係</p><div id="tr-ss"></div></div>
        <div class="card"><h2>平均${metricName} × 流日天干</h2><div id="tr-gan"></div></div>
        <div class="card"><h2>平均${metricName} × 流日地支</h2><div id="tr-zhi"></div></div>
        <div class="card"><h2>平均${metricName} × 流月月支</h2><p class="hint">以節氣換月</p><div id="tr-month"></div></div>
        <div class="card"><h2>平均${metricName} × 狀態標籤</h2><p class="hint">最常用的標籤（依平均${metricName}排序）</p><div id="tr-tags"></div></div>
        <div class="card card-wide"><h2>平均${metricName} × 紫微流日命宮</h2><p class="hint">流日命宮落在本命盤的宮位</p><div id="tr-palace"></div></div>
        <div class="card card-wide"><h2>未來 14 天個人流日預覽</h2><p class="hint">依你過往「同類流日」的平均${metricName}推估，是個人資料的統計參考，不是命理吉凶斷語</p><div id="tr-forecast"></div></div>
        <div class="card card-wide"><h2>觀察摘要</h2><div id="tr-insights"></div></div>
      </div>`;

    Charts.lineChart($('#tr-line'), [
      { name: '心情', points: rows.filter(r => r.rec.mood != null).map(r => ({ x: r.rec.date, y: r.rec.mood })) },
      { name: '精力', points: rows.filter(r => r.rec.energy != null).map(r => ({ x: r.rec.date, y: r.rec.energy })) }
    ], { tipExtra: dateStr => { const k = keysOf(dateStr); return `<span class="hint">${k.dayGanZhi}日</span>`; } });

    const dataWx = groupAvg(rows, k => k.dayGanWuXing, metric, WUXING_ORDER);
    const dataSs = groupAvg(rows, k => k.shiShen, metric, SHISHEN_ORDER);
    const dataGan = groupAvg(rows, k => k.dayGan, metric, Engine.GAN);
    const dataZhi = groupAvg(rows, k => k.dayZhi, metric, Engine.ZHI);
    const dataMonth = groupAvg(rows, k => k.monthZhi, metric, Engine.ZHI);
    const dataTags = groupAvgByTag(rows, metric);
    const dataPalace = groupAvg(rows, k => k.ziweiPalace, metric, null);
    Charts.barChart($('#tr-wx'), dataWx);
    Charts.barChart($('#tr-ss'), dataSs);
    Charts.barChart($('#tr-gan'), dataGan);
    Charts.barChart($('#tr-zhi'), dataZhi);
    Charts.barChart($('#tr-month'), dataMonth);
    Charts.barChart($('#tr-tags'), window.ZWBZI18n ? dataTags.map(item => ({...item, label: ZWBZI18n.tag(item.label)})) : dataTags);
    Charts.barChart($('#tr-palace'), dataPalace, { height: 220 });
    renderForecast($('#tr-forecast'), rows, keysOf, metric, metricName);

    // 觀察摘要：各維度中樣本數 ≥3 的最高／最低
    const insight = (title, data) => {
      const solid = data.filter(d => d.count >= 3);
      if (solid.length < 2) return `<li>${title}：樣本尚不足（各分組需 ≥3 天）</li>`;
      const sorted = [...solid].sort((x, y) => y.value - x.value);
      const hi = sorted[0], lo = sorted[sorted.length - 1];
      return `<li>${title}：<b>${hi.label}</b>日${metricName}最高（平均 ${hi.value.toFixed(2)}，n=${hi.count}）；<b>${lo.label}</b>日最低（平均 ${lo.value.toFixed(2)}，n=${lo.count}）</li>`;
    };
    $('#tr-insights').innerHTML = `
      <ul class="insights">
        ${insight('流日天干五行', dataWx)}
        ${insight('流日十神', dataSs)}
        ${insight('紫微流日命宮', dataPalace)}
      </ul>
      <p class="hint">統計期間 ${records[0].date} ～ ${records[records.length - 1].date}，共 ${records.length} 筆。此為個人資料的相關性觀察，非因果推論。</p>`;
  }
  $('#trend-range').addEventListener('change', renderTrends);
  $('#trend-metric').addEventListener('change', renderTrends);

  /* ================= AI 問答 ================= */
  let chatHistory = []; // 只存記憶體，重新整理頁面就清空
  let chatBusy = false;

  function renderChatTab() {
    const profile = Store.getProfile();
    $('#chat-need-profile').hidden = !!profile;
    $('#chat-body').hidden = !profile;
    if (window.ZWBZ_NATIVE_OFFLINE) {
      $('#chat-need-profile').hidden = true;
      $('#chat-body').hidden = false;
      $('#chat-form').hidden = true;
      $('#chat-consent').closest('label').hidden = true;
      $('#chat-status').textContent = '此 iPhone 離線版本尚未啟用 AI 問答。';
    }
    if (!profile && !window.ZWBZ_NATIVE_OFFLINE) return;
    renderChatLog();
  }

  function renderChatLog() {
    const log = $('#chat-log');
    log.innerHTML = chatHistory.map(m =>
      `<div class="chat-msg ${m.role}${m.pending ? ' pending' : ''}">${esc(m.content)}</div>`
    ).join('');
    log.scrollTop = log.scrollHeight;
  }

  $('#chat-form').addEventListener('submit', async ev => {
    ev.preventDefault();
    if (chatBusy) return;
    const profile = Store.getProfile();
    if (!profile) return;
    const input = $('#chat-input');
    const text = input.value.trim();
    if (!text) return;
    if (!Chat.configured()) {
      $('#chat-status').textContent = 'AI 問答尚未部署，稍後再試。';
      return;
    }
    if (!$('#chat-consent').checked) {
      $('#chat-status').textContent = '請先閱讀並勾選資料傳送說明。';
      return;
    }

    input.value = '';
    chatHistory.push({ role: 'user', content: text });
    chatHistory.push({ role: 'assistant', content: '思考中…', pending: true });
    renderChatLog();
    chatBusy = true;
    $('#chat-status').textContent = '';

    try {
      const info = Engine.daily(profile, new Date());
      const natal = Engine.baziNatal(profile);
      const context = {
        dayMaster: natal.dayMaster,
        shengXiao: natal.shengXiao,
        bazi: { year: info.bazi.year, month: info.bazi.month, day: info.bazi.day },
        ziwei: { decadal: info.ziwei.decadal, yearly: info.ziwei.yearly, monthly: info.ziwei.monthly, daily: info.ziwei.daily }
      };
      const historyForApi = chatHistory.filter(m => !m.pending).map(m => ({ role: m.role, content: m.content }));
      const reply = await Chat.send(historyForApi, context);
      chatHistory[chatHistory.length - 1] = { role: 'assistant', content: reply };
    } catch (e) {
      chatHistory[chatHistory.length - 1] = { role: 'assistant', content: '暫時無法回應（' + e.message + '），稍後再試。' };
    }
    chatBusy = false;
    renderChatLog();
  });

  /* ================= 雲端同步 ================= */
  function renderSyncUI() {
    const connected = Sync.isConnected();
    $('#sync-disconnected').hidden = connected;
    $('#sync-connected').hidden = !connected;
    if (!connected) {
      const oauthReady = Sync.oauthConfigured();
      $('#btn-sync-github-login').hidden = !oauthReady;
      $('#sync-token-details').hidden = oauthReady;
      $('#sync-token-details').open = !oauthReady;
    }
    if (connected) {
      const c = Sync.config();
      const last = c.lastSyncAt ? new Date(c.lastSyncAt).toLocaleString() : '尚未同步';
      $('#sync-info').innerHTML = `已連線雲端資料庫（Gist <code>${esc(String(c.gistId).slice(0, 8))}…</code>）｜最後同步：${esc(last)}<br>其他裝置用同樣方式（GitHub 登入或同一個 Token）連線，就會自動找到並合併這份資料。`;
    }
  }
  function refreshActiveTab() {
    const active = document.querySelector('.tab.active');
    if (active) switchTab(active.dataset.tab);
  }
  Sync.onStatus((state, message) => {
    const el = $('#sync-status');
    el.textContent = message;
    el.style.color = state === 'error' ? 'var(--danger)' : state === 'busy' ? 'var(--muted)' : 'var(--lu)';
    if (state === 'ok' || state === 'off') renderSyncUI();
  });
  $('#btn-sync-github-login').addEventListener('click', () => {
    Sync.loginWithGitHub();
  });
  $('#btn-sync-connect').addEventListener('click', async () => {
    const token = $('#sync-token').value.trim();
    if (!token) { $('#sync-status').textContent = '請先貼上 Token'; return; }
    $('#btn-sync-connect').disabled = true;
    try {
      const result = await Sync.connect(token);
      $('#sync-token').value = '';
      renderProfileChip();
      renderSyncUI();
      if (!result.created) refreshActiveTab();
    } catch (e) {
      $('#sync-status').textContent = '連線失敗：' + e.message;
      $('#sync-status').style.color = 'var(--danger)';
      Store.clearSyncConfig();
    }
    $('#btn-sync-connect').disabled = false;
  });
  $('#btn-sync-now').addEventListener('click', async () => {
    try {
      await Sync.syncNow();
      renderProfileChip();
      refreshActiveTab();
    } catch (e) {
      $('#sync-status').textContent = '同步失敗：' + e.message;
      $('#sync-status').style.color = 'var(--danger)';
    }
  });
  $('#btn-sync-disconnect').addEventListener('click', () => {
    if (confirm('中斷雲端連線？本地資料與雲端 Gist 都會保留，只是不再自動同步。')) {
      Sync.disconnect();
      $('#sync-link-out').textContent = '';
    }
  });
  $('#btn-sync-link').addEventListener('click', async () => {
    const link = Sync.makeLink();
    if (!link) return;
    let copied = false;
    try {
      await navigator.clipboard.writeText(link);
      copied = true;
    } catch (e) { /* 剪貼簿不可用（如 http 環境）時改為顯示網址 */ }
    $('#sync-link-out').textContent = link;
    $('#sync-status').textContent = copied
      ? '同步連結已複製 ✓ 貼到書籤或傳給自己，在其他裝置打開即自動連線'
      : '無法自動複製，請手動複製下方網址';
    $('#sync-status').style.color = 'var(--lu)';
  });

  /* ================= 設定 ================= */
  function renderSettings() {
    const syncCard = $('#sync-card');
    if (syncCard) syncCard.hidden = !!(window.ZWBZ_OFFLINE_DEMO || window.ZWBZ_NATIVE_OFFLINE);
    renderSyncUI();
    if (profileFormDirty) return;
    const p = Store.getProfile();
    if (!p) return;
    $('#p-name').value = p.name || '';
    $('#p-date').value = p.birthDate;
    $('#p-time').value = p.birthTime;
    const g = $(`input[name="p-gender"][value="${p.gender}"]`);
    if (g) g.checked = true;
  }
  function markProfileDraft() {
    profileFormDirty = true;
    setStatus($('#profile-status'), '出生資料尚未儲存（僅保留於本次開啟；請按「儲存並排盤」保存）', 'neutral');
  }
  $('#profile-form').addEventListener('input', markProfileDraft);
  $('#profile-form').addEventListener('change', markProfileDraft);
  $('#profile-form').addEventListener('submit', ev => {
    ev.preventDefault();
    const gender = ($('input[name="p-gender"]:checked') || {}).value;
    const birthDate = $('#p-date').value, birthTime = $('#p-time').value;
    if (!birthDate || !birthTime || !gender) {
      setStatus($('#profile-status'), '請完整填寫出生日期、時間與性別', 'error');
      return;
    }
    try { Store.saveProfile({ name: $('#p-name').value.trim(), birthDate, birthTime, gender }); }
    catch (e) { setStatus($('#profile-status'), e.name === 'QuotaExceededError' ? '無法儲存出生資料；請保持 App 開啟後重試。' : e.message, 'error'); return; }
    profileFormDirty = false;
    analyzer = null;
    renderProfileChip();
    setStatus($('#profile-status'), '已儲存 ✓');
    Sync.schedulePush();
    setTimeout(() => switchTab('chart'), 400);
  });
  $('#btn-settings-export').addEventListener('click', exportJSONFile);
  $('#btn-clear-all').addEventListener('click', () => {
    if (confirm(window.ZWBZI18n ? ZWBZI18n.t('確定清除全部資料（出生資料＋所有記錄）？此動作無法復原，建議先匯出備份。') : '確定清除全部資料（出生資料＋所有記錄）？此動作無法復原，建議先匯出備份。')) {
      Store.clearAll();
      checkinDrafts.clear();
      profileFormDirty = false;
      analyzer = null;
      renderProfileChip();
      switchTab('settings');
      renderSettings();
      $('#profile-form').reset();
      setStatus($('#profile-status'), '', 'neutral');
    }
  });

  document.addEventListener('zwbz-language-change', () => {
    renderProfileChip();
    // No form reset/re-render: preserve unsaved birth fields and session drafts.
    if ($('#tab-trends').classList.contains('active')) renderTrends();
  });
  document.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!window.ZWBZ_NATIVE_OFFLINE || !link || !/^privacy\.html(?:#|$)/.test(link.getAttribute('href') || '')) return;
    if (checkinFormLoaded && $('#tab-today').classList.contains('active')) captureCheckinDraft();
    if (!profileFormDirty && !checkinDrafts.size) return;
    const message = '開啟說明頁會捨棄尚未儲存的出生資料或日誌草稿。要離開並捨棄嗎？按取消返回儲存。';
    if (!confirm(window.ZWBZI18n ? ZWBZI18n.t(message) : message)) event.preventDefault();
  });

  /* ================= 啟動 ================= */
  const adoptedFromLink = Sync.adoptFromUrl(); // 由「同步連結」開啟：自動帶入雲端連線
  const demoBanner = $('#demo-banner');
  if (demoBanner) demoBanner.hidden = !(window.ZWBZ_OFFLINE_DEMO || window.ZWBZ_NATIVE_OFFLINE);
  renderProfileChip();
  if (Store.getProfile()) {
    switchTab('today');
  } else {
    switchTab('settings');
  }
  // 已連線雲端時，啟動即背景同步（拉取其他裝置的更新後刷新畫面）
  if (Sync.isConnected()) {
    Sync.syncNow().then(stats => {
      renderProfileChip();
      if (adoptedFromLink || stats.added || stats.updated) refreshActiveTab();
    }).catch(() => { /* 離線或失敗時保持本地資料，狀態列已顯示訊息 */ });
  }
  // GitHub 登入導回時（網址帶 ?code=&state=）：換取 token 並自動連線
  Sync.handleOAuthCallback().then(ok => {
    if (ok) {
      renderProfileChip();
      switchTab('settings');
      refreshActiveTab();
    }
  });
})();
