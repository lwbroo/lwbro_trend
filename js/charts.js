/*
 * charts.js — 輕量 SVG 圖表（折線圖＋長條圖）
 * 配色與標記規格依 dataviz 準則：細線 2px、資料點 hover 提示、
 * 髮絲格線、基準線、雙系列附圖例與直接標籤。
 */
const Charts = (() => {
  'use strict';

  const INK_FALLBACK = {
    primary: '#0b0b0b',
    secondary: '#52514e',
    muted: '#898781',
    grid: '#e1e0d9',
    baseline: '#c3c2b7',
    surface: '#fcfcfb'
  };
  const SERIES = ['#2a78d6', '#1baf7a']; // 1: 藍（心情）2: 綠（精力）

  // 讀取 CSS 變數（--ink/--ink-2/--muted/--grid/--baseline/--surface），
  // 讓深色主題也能正確配色；沒有定義對應變數的頁面則沿用預設淺色值。
  function readInk() {
    const cs = getComputedStyle(document.documentElement);
    const v = (name, fallback) => (cs.getPropertyValue(name) || '').trim() || fallback;
    return {
      primary: v('--ink', INK_FALLBACK.primary),
      secondary: v('--ink-2', INK_FALLBACK.secondary),
      muted: v('--muted', INK_FALLBACK.muted),
      grid: v('--grid', INK_FALLBACK.grid),
      baseline: v('--baseline', INK_FALLBACK.baseline),
      surface: v('--surface', INK_FALLBACK.surface)
    };
  }

  const NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, children) {
    const node = document.createElementNS(NS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    (children || []).forEach(c => node.appendChild(c));
    return node;
  }
  function txt(x, y, str, attrs) {
    const t = el('text', Object.assign({ x, y, 'font-size': 11, fill: readInk().muted }, attrs || {}));
    t.textContent = str;
    return t;
  }

  function makeTooltip(container) {
    let tip = container.querySelector('.chart-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'chart-tooltip';
      container.appendChild(tip);
    }
    return tip;
  }
  function showTip(tip, container, cx, cy, html) {
    tip.innerHTML = html;
    tip.style.display = 'block';
    const cw = container.clientWidth;
    const tw = tip.offsetWidth;
    let left = cx + 12;
    if (left + tw > cw - 4) left = cx - tw - 12;
    tip.style.left = Math.max(4, left) + 'px';
    tip.style.top = Math.max(4, cy - tip.offsetHeight - 10) + 'px';
  }

  /**
   * 折線圖：series = [{name, points:[{x:'YYYY-MM-DD', y:number}]}...]
   * y 值域固定 1–5（心情/精力量表）。
   */
  function lineChart(container, series, opts) {
    opts = opts || {};
    const INK = readInk();
    container.innerHTML = '';
    container.classList.add('chart-box');

    // 圖例（≥2 系列必附）
    if (series.length >= 2) {
      const legend = document.createElement('div');
      legend.className = 'chart-legend';
      series.forEach((s, i) => {
        const item = document.createElement('span');
        item.className = 'legend-item';
        item.innerHTML = `<span class="legend-swatch" style="background:${SERIES[i]}"></span>${s.name}`;
        legend.appendChild(item);
      });
      container.appendChild(legend);
    }

    const dates = [...new Set(series.flatMap(s => s.points.map(p => p.x)))].sort();
    if (!dates.length) {
      container.innerHTML = `<p class="empty-hint">${opts.emptyText || '尚無足夠資料'}</p>`;
      return;
    }

    const W = Math.max(container.clientWidth || 640, 320);
    const H = opts.height || 220;
    const pad = { top: 12, right: 16, bottom: 28, left: 30 };
    const iw = W - pad.left - pad.right, ih = H - pad.top - pad.bottom;
    // 預設 1–5（心情/精力量表）；傳入 yMin/yMax/yStep 可畫任意數值域（例如血糖 mg/dL）
    const yMin = opts.yMin != null ? opts.yMin : 1;
    const yMax = opts.yMax != null ? opts.yMax : 5;
    const yStep = opts.yStep || 1;
    const xPos = d => pad.left + (dates.length === 1 ? iw / 2 : dates.indexOf(d) / (dates.length - 1) * iw);
    const yPos = v => pad.top + (yMax - v) / (yMax - yMin) * ih;

    const svg = el('svg', { width: '100%', viewBox: `0 0 ${W} ${H}`, role: 'img' });

    // 髮絲格線 + y 軸刻度
    for (let v = yMin; v <= yMax + 1e-6; v += yStep) {
      const vr = Math.round(v * 100) / 100;
      svg.appendChild(el('line', { x1: pad.left, x2: W - pad.right, y1: yPos(vr), y2: yPos(vr), stroke: vr === yMin ? INK.baseline : INK.grid, 'stroke-width': 1 }));
      svg.appendChild(txt(pad.left - 8, yPos(vr) + 4, Number.isInteger(vr) ? String(vr) : vr.toFixed(1), { 'text-anchor': 'end' }));
    }
    // x 軸標籤（最多 6 個，避免擁擠）
    const step = Math.max(1, Math.ceil(dates.length / 6));
    dates.forEach((d, i) => {
      if (i % step === 0 || i === dates.length - 1) {
        svg.appendChild(txt(xPos(d), H - 8, d.slice(5), { 'text-anchor': 'middle' }));
      }
    });

    series.forEach((s, si) => {
      const pts = s.points.filter(p => p.y != null).sort((a, b) => a.x.localeCompare(b.x));
      if (!pts.length) return;
      const dAttr = pts.map((p, i) => `${i ? 'L' : 'M'}${xPos(p.x).toFixed(1)},${yPos(p.y).toFixed(1)}`).join('');
      if (pts.length > 1) {
        svg.appendChild(el('path', { d: dAttr, fill: 'none', stroke: SERIES[si], 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      }
      pts.forEach(p => {
        svg.appendChild(el('circle', { cx: xPos(p.x), cy: yPos(p.y), r: 3.5, fill: SERIES[si], stroke: INK.surface, 'stroke-width': 2 }));
      });
    });

    container.appendChild(svg);

    // 十字游標 + 提示框
    const tip = makeTooltip(container);
    const cross = el('line', { y1: pad.top, y2: H - pad.bottom, stroke: INK.baseline, 'stroke-width': 1, 'stroke-dasharray': '3,3', display: 'none' });
    svg.appendChild(cross);
    svg.addEventListener('mousemove', ev => {
      const rect = svg.getBoundingClientRect();
      const mx = (ev.clientX - rect.left) * (W / rect.width);
      let best = null, bd = Infinity;
      dates.forEach(d => { const dx = Math.abs(xPos(d) - mx); if (dx < bd) { bd = dx; best = d; } });
      if (!best) return;
      cross.setAttribute('x1', xPos(best)); cross.setAttribute('x2', xPos(best));
      cross.setAttribute('display', '');
      const lines = series.map((s, i) => {
        const p = s.points.find(q => q.x === best);
        return p ? `<span class="legend-swatch" style="background:${SERIES[i]}"></span>${s.name} ${p.y}` : '';
      }).filter(Boolean).join('<br>');
      const extra = opts.tipExtra ? opts.tipExtra(best) : '';
      showTip(tip, container, xPos(best) * (rect.width / W), pad.top, `<b>${best}</b>${extra ? ' ' + extra : ''}<br>${lines}`);
    });
    svg.addEventListener('mouseleave', () => { tip.style.display = 'none'; cross.setAttribute('display', 'none'); });
  }

  /**
   * 長條圖（單一系列，平均值 1–5）：
   * data = [{label, value, count}]；n 過少（<3）的長條以淺色呈現並標示。
   */
  function barChart(container, data, opts) {
    opts = opts || {};
    const INK = readInk();
    container.innerHTML = '';
    container.classList.add('chart-box');
    if (!data.length) {
      container.innerHTML = `<p class="empty-hint">${opts.emptyText || '尚無足夠資料'}</p>`;
      return;
    }

    const W = Math.max(container.clientWidth || 640, 320);
    const H = opts.height || 200;
    const pad = { top: 20, right: 12, bottom: 34, left: 30 };
    const iw = W - pad.left - pad.right, ih = H - pad.top - pad.bottom;
    // 預設 0–5（心情/精力量表）；傳入 yMax/yStep 可畫任意數值域（例如血糖 mg/dL）
    const yMax = opts.yMax != null ? opts.yMax : 5;
    const yStep = opts.yStep || (yMax > 10 ? Math.ceil(yMax / 5) : 1);
    const decimals = opts.decimals != null ? opts.decimals : 1;
    const bw = Math.min(40, iw / data.length * 0.62);
    const xPos = i => pad.left + (i + 0.5) * (iw / data.length);
    const yPos = v => pad.top + (yMax - v) / yMax * ih;

    const svg = el('svg', { width: '100%', viewBox: `0 0 ${W} ${H}`, role: 'img' });
    for (let v = 0; v <= yMax + 1e-6; v += yStep) {
      const vr = Math.round(v * 100) / 100;
      svg.appendChild(el('line', { x1: pad.left, x2: W - pad.right, y1: yPos(vr), y2: yPos(vr), stroke: vr === 0 ? INK.baseline : INK.grid, 'stroke-width': 1 }));
      svg.appendChild(txt(pad.left - 8, yPos(vr) + 4, String(vr), { 'text-anchor': 'end' }));
    }

    const tip = makeTooltip(container);
    data.forEach((d, i) => {
      const low = d.count < 3;
      const h = Math.max(2, yPos(0) - yPos(d.value));
      const x = xPos(i) - bw / 2, y = yPos(d.value);
      const r = Math.min(4, bw / 2);
      // 圓角只在頂端（資料端），底部貼齊基準線
      const path = `M${x},${yPos(0)} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + bw - r},${y} Q${x + bw},${y} ${x + bw},${y + r} L${x + bw},${yPos(0)} Z`;
      const bar = el('path', { d: path, fill: d.color || '#2a78d6', 'fill-opacity': low ? 0.35 : 1 });
      svg.appendChild(bar);
      // 直接標籤：平均值
      svg.appendChild(txt(xPos(i), y - 5, d.value.toFixed(decimals), { 'text-anchor': 'middle', fill: INK.secondary, 'font-size': 10.5 }));
      // 類別 + 樣本數
      svg.appendChild(txt(xPos(i), H - 20, d.label, { 'text-anchor': 'middle', fill: INK.primary, 'font-size': 12 }));
      svg.appendChild(txt(xPos(i), H - 6, `n=${d.count}`, { 'text-anchor': 'middle', 'font-size': 9.5 }));

      const hit = el('rect', { x: xPos(i) - iw / data.length / 2, y: pad.top, width: iw / data.length, height: ih, fill: 'transparent' });
      hit.addEventListener('mousemove', ev => {
        const rect = svg.getBoundingClientRect();
        const body = opts.tipFormat
          ? opts.tipFormat(d, low)
          : `平均 ${d.value.toFixed(2)}／樣本 ${d.count} 天${low ? '<br><i>樣本數少，僅供參考</i>' : ''}`;
        showTip(tip, container, (ev.clientX - rect.left), y * (rect.height / H), `<b>${d.label}</b><br>${body}`);
      });
      hit.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
      svg.appendChild(hit);
    });

    container.appendChild(svg);
  }

  return { lineChart, barChart, SERIES };
})();
