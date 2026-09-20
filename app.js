/* ============================================================
   かけい簿 ─ 支出だけを記録する、かんたんアプリ
   ・データは端末の中（localStorage）だけに保存します
   ・通信もログインもしません
   ============================================================ */
'use strict';

/* ---------------- カテゴリ ---------------- */
const CATS = [
  { key:'life',  name:'生活費' },
  { key:'water', name:'水道代' },
  { key:'power', name:'電気代' },
  { key:'gas',   name:'ガス代' },
  { key:'phone', name:'携帯代' },
];
const CAT_NAME = Object.fromEntries(CATS.map(c => [c.key, c.name]));
const DEFAULT_CAT = 'life';

const SVG = {
  life :'<svg viewBox="0 0 24 24" fill="none" stroke="#B0763C" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h16l-1.5 11a2 2 0 0 1-2 1.8H7.5a2 2 0 0 1-2-1.8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  water:'<svg viewBox="0 0 24 24" fill="none" stroke="#2F7AA8" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s6 6.4 6 10.4A6 6 0 0 1 6 13.4C6 9.4 12 3 12 3Z"/></svg>',
  power:'<svg viewBox="0 0 24 24" fill="none" stroke="#D99400" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12Z"/></svg>',
  gas  :'<svg viewBox="0 0 24 24" fill="none" stroke="#E05A2B" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a6 6 0 0 0 6-6c0-5-6-11-6-11S6 11 6 16a6 6 0 0 0 6 6Z"/><path d="M12 19a2.6 2.6 0 0 0 2.6-2.6c0-2-2.6-4.4-2.6-4.4s-2.6 2.4-2.6 4.4A2.6 2.6 0 0 0 12 19Z"/></svg>',
  phone:'<svg viewBox="0 0 24 24" fill="none" stroke="#5B8C3F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="6.5" y="2.5" width="11" height="19" rx="2.6"/><path d="M10.5 18.5h3"/></svg>',
  cam  :'<svg viewBox="0 0 24 24" fill="none" stroke="#C23A6B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5h3.3L8 6h8l1.7 2.5H21v11H3Z"/><circle cx="12" cy="14" r="3.6"/></svg>',
  mic  :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.5"/></svg>',
  hand :'<svg viewBox="0 0 24 24" fill="none" stroke="#5A4A3A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M6.5 14h11"/></svg>',
};

/* ---------------- 保存（端末の中だけ） ---------------- */
const STORE_KEY = 'kakeibo.v1';

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data.entries)) return [];
    return data.entries
      .filter(e => e && typeof e.a === 'number' && e.a > 0 && CAT_NAME[e.c] && /^\d{4}-\d{2}-\d{2}$/.test(e.d))
      .map(e => ({ id: e.id, d: e.d, c: e.c, a: e.a, n: cleanNote(e.n) }));
  } catch (_) { return []; }
}
function saveEntries(list) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ entries: list })); return true; }
  catch (_) { return false; }
}

/* 「なにに使ったか」の短い名前をそろえる */
function cleanNote(v) {
  return String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim().slice(0, 20);
}
const escapeHtml = t => String(t).replace(/[&<>"']/g,
  ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

let entries = loadEntries();

/* ---------------- 日付 ---------------- */
const pad2 = n => String(n).padStart(2, '0');
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
const thisYM   = () => todayISO().slice(0, 7);
const ymOf     = iso => iso.slice(0, 7);
const monthNum = ym => Number(ym.slice(5, 7));
const yearNum  = ym => Number(ym.slice(0, 4));

function addMonths(ym, diff) {
  const y = yearNum(ym), m = monthNum(ym) - 1 + diff;
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}
const fmt = n => Number(n).toLocaleString('ja-JP');

/* ---------------- 集計 ---------------- */
function totalsOf(ym) {
  const t = {}; CATS.forEach(c => { t[c.key] = 0; });
  for (const e of entries) if (ymOf(e.d) === ym) t[e.c] += e.a;
  return t;
}
const sumOf = t => CATS.reduce((s, c) => s + t[c.key], 0);
const monthsWithData = () => [...new Set(entries.map(e => ymOf(e.d)))].sort();
function prevMonthWithData(ym) {
  const older = monthsWithData().filter(m => m < ym);
  return older.length ? older[older.length - 1] : null;
}

/* ---------------- 画面の状態 ---------------- */
let currentYM = thisYM();   // 「今月」
let viewYM    = currentYM;  // 表示している月

const $ = id => document.getElementById(id);
const el = {
  app: $('app'), totalLabel: $('totalLabel'),
  legendCur: $('legendCur'), legendPrev: $('legendPrev'),
  donut: $('donut'), donutCenter: $('donutCenter'), donutLabels: $('donutLabels'),
  foot: document.querySelector('.foot'), chars: document.querySelector('.chars'),
  btnPrev: $('btnPrev'), btnNow: $('btnNow'), btnAdd: $('btnAdd'), btnShare: $('btnShare'),
  viewOnly: $('viewOnly'), scrim: $('scrim'), sheet: $('sheet'),
  confirm: $('confirm'), toast: $('toast'),
};

/* ---------------- 円グラフ（ドーナツ） ---------------- */
/* カテゴリごとの色。arc は輪の色、text は文字の色（背景とのコントラストを上げた濃いめ） */
const CAT_COLOR = {
  life : { arc:'#6CB33F', text:'#3E7A25' },
  water: { arc:'#46A3DC', text:'#1A6A9E' },
  power: { arc:'#F2B134', text:'#946600' },
  gas  : { arc:'#F07C3C', text:'#B9521B' },
  phone: { arc:'#E85C93', text:'#B62A62' },
};
const PAST_LABEL_COLOR = '#245C82';

/* 輪の寸法（viewBox 100×100 のなかでの値） */
const RING = { prevR:47.5, prevW:3.2, curR:40, curW:8.6, gap:1.6, hole:0.714 };

let lastCur = {}, lastPrev = {}, lastIsPast = false, lastMids = [];
let donutS = 0;

function ringInto(g, r, w, totals, opacity) {
  const sum = CATS.reduce((a, c) => a + (totals[c.key] || 0), 0);
  const C = 2 * Math.PI * r;
  if (sum <= 0) {
    g.insertAdjacentHTML('beforeend',
      `<circle cx="50" cy="50" r="${r}" fill="none" stroke="#E8DDCB" stroke-width="${w}" opacity="${opacity}"/>`);
    return [];
  }
  const list = CATS.filter(c => totals[c.key] > 0);
  const gap = list.length > 1 ? RING.gap : 0;
  let off = 0;
  const mids = [];
  for (const c of list) {
    const frac = totals[c.key] / sum;
    const len = Math.max(0.6, frac * C - gap);
    g.insertAdjacentHTML('beforeend',
      `<circle class="slice" data-cat="${c.key}" cx="50" cy="50" r="${r}" fill="none"` +
      ` stroke="${CAT_COLOR[c.key].arc}" stroke-width="${w}" stroke-linecap="butt" opacity="${opacity}"` +
      ` stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}"` +
      ` stroke-dashoffset="${(-(off + gap / 2)).toFixed(2)}"/>`);
    mids.push({
      key: c.key,
      angle: (off + frac * C / 2) / C * 360 - 90,
      start: off / C * 360 - 90,
      end: (off + frac * C) / C * 360 - 90,
    });
    off += frac * C;
  }
  return mids;
}

function drawRings(cur, prev) {
  const gPrev = $('ringPrev'), gCur = $('ringCur');
  gPrev.innerHTML = ''; gCur.innerHTML = '';
  ringInto(gPrev, RING.prevR, RING.prevW, prev, .4);   // 細い外側＝1か月前
  return ringInto(gCur, RING.curR, RING.curW, cur, 1); // 太い内側＝表示中の月
}

/* まんなかの文字 */
function paintCenter() {
  const tag = lastIsPast ? '<span class="past-tag">過去の記録</span>' : '';
  el.totalLabel.innerHTML = `${monthNum(viewYM)}月支出合計${tag}`;
  el.donutCenter.innerHTML = `<span class="dc-big">${fmt(sumOf(lastCur))}<small>円</small></span>`;
  fitCenter();
}

/* まんなかの文字が輪の内側からはみ出さないようにする */
function fitCenter() {
  const big = el.donutCenter.querySelector('.dc-big');
  if (!big || !donutS) return;
  const hole = donutS * RING.hole - 10;
  el.donutCenter.style.width = hole + 'px';
  big.style.transform = 'scale(1)';
  const w = big.scrollWidth;
  if (w > hole) big.style.transform = `scale(${(hole / w).toFixed(3)})`;
}

/* 輪の大きさと位置、まわりのカテゴリ名の置き場所を決める */
function layoutDonut() {
  const box = el.donut.getBoundingClientRect();
  if (!box.width || !box.height) return;
  const S = Math.max(140, Math.min(box.width - 20, box.height - 16));
  donutS = S;
  const svg = $('ring');
  svg.setAttribute('width', S);
  svg.setAttribute('height', S);

  // ① いったん輪をいちばん上に寄せて、キャラクターを最大まで広げる
  svg.style.top = '0px';
  layoutChars();

  // ② 余ったすき間を、輪の上と下で半分ずつに分ける
  const charsTop = el.chars ? el.chars.getBoundingClientRect().top : box.bottom;
  const slack = Math.max(0, (charsTop - 8) - (box.top + S));
  const marginTop = Math.min(Math.max(0, box.height - S), Math.round(slack / 2));
  svg.style.top = marginTop + 'px';

  const cx = box.width / 2, cy = marginTop + S / 2;
  el.donutCenter.style.top = cy + 'px';

  // ③ カテゴリ名を輪のまわりに置く
  el.donutLabels.innerHTML = lastMids.map(o =>
    `<span class="dlabel" data-cat="${o.key}" style="color:${lastIsPast ? PAST_LABEL_COLOR : CAT_COLOR[o.key].text}">${CAT_NAME[o.key]}</span>`
  ).join('');

  const R = (RING.prevR + RING.prevW / 2 + 5) / 100 * S;   // 輪のすぐ外がわ
  const placed = [...el.donutLabels.children].map((n, i) => {
    const a = lastMids[i].angle * Math.PI / 180;
    const w = n.offsetWidth, h = n.offsetHeight;
    const co = Math.cos(a), si = Math.sin(a);
    // 輪の外へ逃がす置きかた（真上・真下では中央ぞろえ、左右では外ぞろえになる）
    const x = cx + co * (R + w / 2) - w / 2;
    const y = cy + si * (R + h / 2) - h / 2;
    return {
      n, w, h, right: co >= 0,
      x: Math.min(Math.max(2, x), Math.max(2, box.width - w - 2)),
      y: Math.min(Math.max(0, y), Math.max(0, box.height - h)),
    };
  });
  for (const side of [true, false]) {          // 左右それぞれで重なりをほどく
    const g = placed.filter(o => o.right === side).sort((p, q) => p.y - q.y);
    for (let i = 1; i < g.length; i++) {
      const min = g[i - 1].y + g[i - 1].h + 4;
      if (g[i].y < min) g[i].y = min;
    }
    if (g.length) {
      const over = g[g.length - 1].y + g[g.length - 1].h - box.height;
      if (over > 0) for (const o of g) o.y = Math.max(0, o.y - over);
    }
  }
  for (const o of placed) { o.n.style.left = o.x + 'px'; o.n.style.top = o.y + 'px'; }

  fitCenter();
}

/* キャラクターを、まわりのボタンや文字に当たらないぎりぎりまで大きくする */
function layoutChars() {
  const img = el.chars;
  if (!img || !img.naturalWidth) return;
  const app = el.app.getBoundingClientRect();
  const visible = e => e && !e.hidden && e.getBoundingClientRect().width > 0;

  // 右がわの限界：「＋」「送る」「見るだけの画面です」より左
  let right = app.right - 8;
  for (const e of [el.btnAdd, el.btnShare, el.viewOnly])
    if (visible(e)) right = Math.min(right, e.getBoundingClientRect().left - 6);

  // 上がわの限界：輪の下ぎりぎりまで
  const top = $('ring').getBoundingClientRect().bottom + 8;

  // 下の端は CSS が安全域（iPhone のホームバーぶん）を引いた位置に置いてくれている
  const bottom = img.getBoundingClientRect().bottom;
  const left = app.left - 10;                       // 左は少しだけ画面の外へ
  const w = Math.min(right - left, (bottom - top) * (img.naturalWidth / img.naturalHeight));
  if (w > 60) img.style.width = Math.round(w) + 'px';
}

/* カテゴリを押したら、その月の内訳をひらく */
function selectCat(key) {
  if (!CAT_NAME[key]) return;
  openBreakdown(key);
}
function clearSelect() { /* いまは何もしない（押したら内訳がひらきます） */ }

function openBreakdown(cat) {
  const ym = viewYM, pm = addMonths(ym, -1);
  const rows = entries
    .map((e, i) => ({ e, i }))
    .filter(o => ymOf(o.e.d) === ym && o.e.c === cat)
    .sort((a, b) => (a.e.d < b.e.d ? 1 : a.e.d > b.e.d ? -1 : b.i - a.i))
    .map(o => o.e);
  const total = rows.reduce((sum, e) => sum + e.a, 0);
  const prev = totalsOf(pm)[cat] || 0;
  const color = lastIsPast ? PAST_LABEL_COLOR : CAT_COLOR[cat].text;

  openSheet(`
    <h2 style="color:${color}">${monthNum(ym)}月の${CAT_NAME[cat]}</h2>
    <div class="bd-total">${fmt(total)}<small>円</small></div>
    <p class="bd-prev">${prev > 0
      ? `${monthNum(pm)}月は ${fmt(prev)}円`
      : `${monthNum(pm)}月は ありません`}</p>
    ${rows.length ? `<div class="bd-list">${rows.map(e => `
      <div class="bd-row">
        <span class="bd-day">${Number(e.d.slice(5, 7))}/${Number(e.d.slice(8, 10))}</span>
        <span class="bd-name">${escapeHtml(e.n || CAT_NAME[e.c])}</span>
        <span class="bd-amt">${fmt(e.a)}<small>円</small></span>
      </div>`).join('')}</div>` : '<p class="bd-prev">まだありません</p>'}
    <button type="button" class="btn-wide" data-act="close">とじる</button>
  `);
}

/* 輪のどこを押したかを、中心からの向きで決める。
   （スライスの図形そのものを当たり判定に使うとブラウザによって差が出るため） */
function onDonutTap(ev) {
  const label = ev.target.closest && ev.target.closest('.dlabel');
  if (label) { selectCat(label.dataset.cat); return; }
  if (!lastMids.length) { clearSelect(); return; }

  const svg = $('ring').getBoundingClientRect();
  if (!svg.width) return;
  const S = svg.width;
  const dx = ev.clientX - (svg.left + S / 2);
  const dy = ev.clientY - (svg.top + S / 2);
  const dist = Math.hypot(dx, dy) / S * 100;              // viewBox の単位に直す
  const inner = RING.curR - RING.curW / 2 - 1;            // 穴のふち
  const outer = RING.prevR + RING.prevW / 2 + 3;          // いちばん外がわ
  if (dist < inner || dist > outer) { clearSelect(); return; }

  let deg = Math.atan2(dy, dx) * 180 / Math.PI;           // 0度＝3時、-90度＝12時
  const base = lastMids[0].start;
  const rel = ((deg - base) % 360 + 360) % 360;
  for (const m of lastMids) {
    const a = ((m.start - base) % 360 + 360) % 360;
    const b = a + (m.end - m.start);
    if (rel >= a && rel < b) { selectCat(m.key); return; }
  }
  selectCat(lastMids[lastMids.length - 1].key);
}

/* ---------------- 画面を描く ---------------- */
function render() {
  const isPast = viewYM !== currentYM;
  lastCur  = totalsOf(viewYM);
  lastPrev = totalsOf(addMonths(viewYM, -1));
  lastIsPast = isPast;

  document.body.classList.toggle('is-past', isPast);
  el.app.classList.toggle('past', isPast);
  el.legendCur.textContent  = monthNum(viewYM) + '月';
  el.legendPrev.textContent = monthNum(addMonths(viewYM, -1)) + '月';

  lastMids = drawRings(lastCur, lastPrev);
  paintCenter();
  layoutDonut();
  requestAnimationFrame(layoutDonut);   // 文字の幅が確定してからもう一度ととのえる

  el.btnPrev.disabled = !prevMonthWithData(viewYM);
  el.btnNow.classList.toggle('hide', !isPast);
  // 過去の月は見るだけ（入力も送るもしない）
  el.btnAdd.hidden = isPast;
  el.btnShare.hidden = isPast;
  el.viewOnly.hidden = !isPast;
}

/* 月がかわったら今月を入れかえる */
function refreshCurrentMonth() {
  const now = thisYM();
  if (now === currentYM) return;
  const wasOnCurrent = viewYM === currentYM;
  currentYM = now;
  if (wasOnCurrent) viewYM = now;
  render();
}

/* ---------------- かさねて出すもの ---------------- */
let sheetOnClose = null;

function openSheet(html, onClose) {
  sheetOnClose = onClose || null;
  el.sheet.innerHTML = html;
  el.sheet.hidden = false;
  el.scrim.hidden = false;
}
function closeSheet() {
  const fn = sheetOnClose; sheetOnClose = null;
  el.sheet.hidden = true;
  el.sheet.innerHTML = '';
  if (el.confirm.hidden) el.scrim.hidden = true;
  setKeyboardOffset(0);
  if (fn) fn();
}
function closeAll() {
  sheetOnClose = null;
  el.sheet.hidden = true; el.sheet.innerHTML = '';
  el.confirm.hidden = true; el.confirm.innerHTML = '';
  el.scrim.hidden = true;
  setKeyboardOffset(0);
}
function showToast(text, sub, ms) {
  el.toast.innerHTML = text + (sub ? `<small>${sub}</small>` : '');
  el.toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { el.toast.hidden = true; }, ms || 1800);
}

/* ---------------- 入力：はじめの画面 ---------------- */
function openAddMenu() {
  openSheet(`
    <h2>どうやって入力しますか？</h2>
    <button type="button" class="opt one" data-act="camera">${SVG.cam}
      <span>カメラで<br>レシートを読み取る<small>合計の金額を読み取ります</small></span></button>
    <button type="button" class="opt two" data-act="voice" style="color:var(--green-deep)">${SVG.mic}
      <span style="color:var(--ink)">声で入力する<small>「電気代 5000円」のように話します</small></span></button>
    <button type="button" class="opt" data-act="manual">${SVG.hand}
      <span>手で入力する<small>数字を打ちます</small></span></button>
    <button type="button" class="btn-del" data-act="delete">さいごの入力を消す</button>
    <button type="button" class="btn-wide" data-act="close">とじる</button>
  `);
}

/* ---------------- 入力：手で入力する ---------------- */
function openManual(preset) {
  openSheet(`
    <p class="sheet-lead">いくら使いましたか？</p>
    <div class="amount-field">
      <input id="amt" type="text" inputmode="numeric" pattern="[0-9]*"
             autocomplete="off" autocorrect="off" spellcheck="false"
             placeholder="0" aria-label="金額">
      <span class="unit">円</span>
    </div>
    <button type="button" class="btn-go" id="amtNext" disabled>次へ</button>
    <button type="button" class="btn-wide" data-act="close">やめる</button>
  `);
  const input = $('amt'), next = $('amtNext');
  if (preset) input.value = fmt(preset);
  next.disabled = !digitsOf(input.value);

  input.addEventListener('input', () => {
    const d = digitsOf(input.value);
    input.value = d ? fmt(Number(d)) : '';
    next.disabled = !d;
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); if (!next.disabled) next.click(); }
  });
  next.addEventListener('click', () => {
    const v = Number(digitsOf(input.value));
    if (!v) return;
    input.blur();
    openCategory(v);
  });
  // 数字キーボードをすぐ開く（タップ直後なので iPhone でも開きます）
  input.focus();
  try { input.setSelectionRange(input.value.length, input.value.length); } catch (_) {}
}

function digitsOf(s) {
  return String(s)
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[^0-9]/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, 9);
}

/* ---------------- 入力：カテゴリを選ぶ ---------------- */
function openCategory(amount, selected) {
  const sel = selected || DEFAULT_CAT;
  openSheet(`
    <p class="sheet-lead">${fmt(amount)}円は何に使いましたか？</p>
    <div class="catgrid">
      ${CATS.map(c => `<button type="button" class="catbtn${c.key === sel ? ' sel' : ''}"
          data-cat="${c.key}">${SVG[c.key]}${c.name}</button>`).join('')}
    </div>
    <button type="button" class="btn-wide" data-act="close">やめる</button>
  `);
  el.sheet.querySelectorAll('.catbtn').forEach(b => {
    b.addEventListener('click', () => openConfirm(amount, b.dataset.cat, () => openManual(amount)));
  });
}

/* ---------------- 保存まえの確認 ---------------- */
function openConfirm(amount, cat, onRedo, note) {
  sheetOnClose = null;
  el.sheet.hidden = true; el.sheet.innerHTML = '';
  el.scrim.hidden = false;
  el.confirm.innerHTML = `
    <div class="confirm-q">これでよろしいですか？</div>
    <div class="confirm-big">${fmt(amount)}<small>円</small></div>
    <div class="confirm-cat">${CAT_NAME[cat]}</div>
    ${note ? `<div class="confirm-note">${escapeHtml(note)}</div>` : ''}
    <div class="confirm-btns">
      <button type="button" class="btn-ok"   id="cfOk">これでOK</button>
      <button type="button" class="btn-redo" id="cfNg">やり直す</button>
    </div>`;
  el.confirm.hidden = false;
  setKeyboardOffset(0);

  $('cfOk').addEventListener('click', () => { closeAll(); addEntry(amount, cat, note); });
  $('cfNg').addEventListener('click', () => {
    el.confirm.hidden = true; el.confirm.innerHTML = '';
    if (onRedo) onRedo(); else openAddMenu();
  });
}

function addEntry(amount, cat, note) {
  entries.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
                 d: todayISO(), c: cat, a: amount, n: cleanNote(note) });
  if (!saveEntries(entries)) {
    entries.pop();
    showToast('保存できませんでした', 'もう一度おためしください', 2600);
    return;
  }
  refreshCurrentMonth();
  viewYM = currentYM;
  render();
  const n = cleanNote(note);
  showToast('保存しました', `${n || CAT_NAME[cat]} ${fmt(amount)}円`, 1900);
}

/* ---------------- さいごの入力を消す ---------------- */
function openDeleteLast() {
  const last = entries[entries.length - 1];
  if (!last) {
    closeSheet();
    showToast('消すものがありません', '', 1800);
    return;
  }
  openSheet(`
    <h2>消しますか？</h2>
    <div class="confirm-cat" style="display:block;text-align:center;margin:0 0 6px">${CAT_NAME[last.c]}</div>
    <div style="text-align:center;font-size:clamp(44px,7vh,62px);font-weight:900;margin-bottom:16px">
      ${fmt(last.a)}<span style="font-size:.5em">円</span></div>
    <button type="button" class="btn-danger" data-act="delete-yes">消す</button>
    <button type="button" class="btn-wide" data-act="close">やめる</button>
  `);
}
function deleteLast() {
  const removed = entries.pop();
  if (!saveEntries(entries)) { entries.push(removed); showToast('消せませんでした', '', 2200); return; }
  closeAll();
  refreshCurrentMonth();
  if (viewYM !== currentYM && !totalsOfHasData(viewYM)) viewYM = currentYM;
  render();
  showToast('消しました', `${CAT_NAME[removed.c]} ${fmt(removed.a)}円`, 1800);
}
const totalsOfHasData = ym => entries.some(e => ymOf(e.d) === ym);

/* ---------------- 入力：声で入力する ---------------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recog = null;

function openVoice() {
  if (!SR) { openVoiceUnavailable(); return; }
  openSheet(`
    <div class="mic-stage">
      <p class="sheet-lead" id="vTitle">お話しください</p>
      <div class="mic-circle on" id="vCircle" style="color:var(--green-deep)">${SVG.mic}</div>
    </div>
    <div class="mic-heard" id="vHeard">「電気代 5000円」</div>
    <button type="button" class="btn-wide" data-act="close">やめる</button>
  `, stopVoice);

  let finalText = '';
  try { recog = new SR(); } catch (_) { openVoiceUnavailable(); return; }
  recog.lang = 'ja-JP';
  recog.interimResults = true;
  recog.continuous = false;
  recog.maxAlternatives = 3;

  recog.onresult = ev => {
    let interim = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const r = ev.results[i];
      if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript;
    }
    const heard = $('vHeard');
    if (heard) heard.textContent = (finalText + interim) || '…';
  };
  recog.onerror = ev => {
    recog = null;
    if (ev.error === 'aborted') return;
    if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
      openVoiceUnavailable('マイクを使う許可がありません。');
    } else if (ev.error === 'no-speech') {
      openVoiceRetry('声が聞こえませんでした。');
    } else {
      openVoiceUnavailable('声の入力がうまく動きませんでした。');
    }
  };
  recog.onend = () => {
    if (!recog) return;          // すでに別の画面に移っている
    recog = null;
    const parsed = parseSpeech(finalText);
    if (!parsed.amount) { openVoiceRetry('金額が聞き取れませんでした。'); return; }
    openConfirm(parsed.amount, parsed.cat, openVoice, parsed.note);
  };
  try { recog.start(); } catch (_) { recog = null; openVoiceUnavailable(); }
}

function stopVoice() {
  if (!recog) return;
  const r = recog; recog = null;
  try { r.abort(); } catch (_) {}
}

function openVoiceRetry(msg) {
  openSheet(`
    <h2>${msg}</h2>
    <p class="sheet-lead">「電気代 5000円」のように、<br>ゆっくり話してみてください。</p>
    <button type="button" class="btn-go" data-act="voice">もう一度話す</button>
    <button type="button" class="btn-wide" data-act="manual">手で入力する</button>
    <button type="button" class="btn-wide" data-act="close">やめる</button>
  `);
}

/* 端末が声の入力に対応していないとき（キーボードのマイクの案内） */
function openVoiceUnavailable(msg) {
  openSheet(`
    <h2>${msg || 'この端末では声の入力が使えません'}</h2>
    <div class="mic-help">
      かわりに、こうすると声で入れられます。<br>
      ① 下の<b>「手で入力する」</b>を押す<br>
      ② 数字のキーボードが出る<br>
      ③ キーボードの<b>マイクの絵</b>を押して、金額を話す
    </div>
    <button type="button" class="btn-go" data-act="manual">手で入力する</button>
    <button type="button" class="btn-wide" data-act="close">やめる</button>
  `);
}

/* 話した言葉から、金額とカテゴリを取り出す */
function parseSpeech(text) {
  const s = String(text || '')
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[,、\s]/g, '');
  let cat = DEFAULT_CAT;
  if (/携帯|ケータイ|けいたい|スマホ|スマートフォン|電話/.test(s)) cat = 'phone';
  else if (/水道|すいどう/.test(s))                                 cat = 'water';
  else if (/電気|でんき/.test(s))                                   cat = 'power';
  else if (/ガス|がす/.test(s))                                     cat = 'gas';

  // カテゴリ名にふくまれる漢数字を金額と取りちがえないよう、先に消す
  const cleaned = s.replace(
    /(?:携帯電話|携帯|ケータイ|けいたい|スマホ|スマートフォン|電話|水道|すいどう|電気|でんき|ガス|がす|生活費|食費)(?:代|料金|りょうきん)?/g, '');
  let amount = 0;
  for (const chunk of cleaned.match(/[0-9〇零一壱二弐三参四五六七八九十百千万億]+/g) || []) {
    amount = Math.max(amount, toNumber(chunk));
  }
  // 金額とカテゴリ名をのぞいた言葉を「なにに使ったか」として残す
  const note = cleaned
    .replace(/[0-9〇零一壱二弐三参四五六七八九十百千万億]+/g, '')
    .replace(/円|えん/g, '')
    .replace(/(?:です|でした|だよ)\s*$/, '')
    .replace(/^[でをにのへとがはも、。・\s]+/, '')
    .replace(/[でをにのへとがはも、。・\s]+$/, '')
    .slice(0, 12);
  return { amount: amount > 0 && amount < 1e9 ? amount : 0, cat, note };
}

const KANJI_DIGIT = { '〇':0,'零':0,'一':1,'壱':1,'二':2,'弐':2,'三':3,'参':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9 };
const KANJI_UNIT  = { '十':10, '百':100, '千':1000 };
const KANJI_BIG   = { '万':10000, '億':100000000 };

function toNumber(str) {
  if (/^[0-9]+$/.test(str)) return Number(str);
  let total = 0, section = 0, num = 0, sawDigit = false;
  for (const ch of str) {
    if (ch >= '0' && ch <= '9') { num = num * 10 + Number(ch); sawDigit = true; continue; }
    if (ch in KANJI_DIGIT)      { num = KANJI_DIGIT[ch]; sawDigit = true; continue; }
    if (ch in KANJI_UNIT)       { section += (num || 1) * KANJI_UNIT[ch]; num = 0; sawDigit = true; continue; }
    if (ch in KANJI_BIG)        { total += (section + (num || 1)) * KANJI_BIG[ch]; section = 0; num = 0; sawDigit = true; }
  }
  return sawDigit ? total + section + num : 0;
}

/* ---------------- 入力：カメラでレシートを読み取る ---------------- */
/* Google Gemini（無料わく）に写真をわたして、支払った金額と種類をひとつだけ返してもらいます。
   APIキーはこの端末の中だけに入れておき、写真は読み取りのときだけ Google に送られます。 */
const GKEY_STORE  = 'kakeibo.gemini.key';
const GMODEL_STORE = 'kakeibo.gemini.model';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
// 見つからないときにためす名前（新しいものから順に）
const MODEL_FALLBACK = [
  'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3-flash',
  'gemini-2.5-flash', 'gemini-flash-latest',
];

let ocrRunId = 0;

const readStore = k => { try { return localStorage.getItem(k) || ''; } catch (_) { return ''; } };
const writeStore = (k, v) => {
  try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (_) {}
};
const geminiKey = () => readStore(GKEY_STORE);

function httpError(status, body) {
  const e = new Error('http ' + status);
  e.status = status; e.body = body || '';
  return e;
}

/* この鍵で使える、いちばん新しい Flash（無料わく）を選ぶ */
async function pickModel(key, again) {
  if (!again) {
    const saved = readStore(GMODEL_STORE);
    if (saved) return saved;
  }
  let list = [];
  try {
    const res = await fetch(`${GEMINI_BASE}/models?pageSize=200&key=${encodeURIComponent(key)}`);
    if (!res.ok) throw httpError(res.status, await res.text().catch(() => ''));
    const data = await res.json();
    list = (data.models || []).map(m => ({
      id: String(m.name || '').replace(/^models\//, ''),
      methods: m.supportedGenerationMethods || m.supportedActions || [],
    })).filter(m =>
      m.methods.indexOf('generateContent') >= 0 &&
      /flash/i.test(m.id) &&
      !/image|tts|audio|embedding|live|dialog|thinking/i.test(m.id));
  } catch (err) {
    if (err.status === 400 || err.status === 403) throw err;   // 鍵がちがう
    list = [];
  }
  if (!list.length) {
    writeStore(GMODEL_STORE, MODEL_FALLBACK[0]);
    return MODEL_FALLBACK[0];
  }
  const score = id => {
    const v = parseFloat((id.match(/gemini-(\d+(?:\.\d+)?)/) || [0, 0])[1]) || 0;
    let s = v * 100;
    if (/lite/.test(id))         s -= 30;
    if (/preview|exp\b/.test(id)) s -= 20;
    if (/latest/.test(id))       s -= 5;
    return s;
  };
  list.sort((a, b) => score(b.id) - score(a.id));
  writeStore(GMODEL_STORE, list[0].id);
  return list[0].id;
}

const RECEIPT_PROMPT = [
  'これは日本のレシート、または電気・ガス・水道・携帯電話の請求書の写真です。',
  '実際に支払う合計金額を、ひとつだけ読み取ってください。',
  '・「合計」「お買上計」「ご請求金額」「お支払金額」など、最終的に支払う金額を選びます。',
  '・「小計」「お預り」「お釣り」「ポイント」「残高」「前回」は選びません。',
  '・税込の金額を選びます。金額は円単位の整数で、カンマは付けません。',
  '・種類は次から選びます。',
  '  life = 生活費（食品・日用品・薬・衣類など、下のどれにも当てはまらない買い物すべて）',
  '  water = 水道代 / power = 電気代 / gas = ガス代 / phone = 携帯電話や通信の料金',
  '・あとで何に使ったか分かるように、短い名前を detail に入れます（10文字以内の日本語）。',
  '  飲食店なら主な料理（例：ランチ カレーライス）、お店での買い物なら店の名前（例：スギ薬局）、',
  '  公共料金なら会社やサービスの名前。分からなければ空にします。',
  '・レシートでも請求書でもない、または金額が読み取れないときは found を false にします。',
].join('\n');

const RECEIPT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    found:    { type: 'BOOLEAN' },
    amount:   { type: 'INTEGER' },
    category: { type: 'STRING', enum: ['life', 'water', 'power', 'gas', 'phone'] },
    detail:   { type: 'STRING' },
  },
  required: ['found', 'amount', 'category', 'detail'],
};

async function askGemini(key, model, b64) {
  const res = await fetch(
    `${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: RECEIPT_PROMPT },
            { inline_data: { mime_type: 'image/jpeg', data: b64 } },
          ],
        }],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: RECEIPT_SCHEMA,
        },
      }),
    });
  if (!res.ok) throw httpError(res.status, await res.text().catch(() => ''));
  const data = await res.json();
  const cand = (data.candidates || [])[0] || {};
  const parts = (cand.content || {}).parts || [];
  const text = parts.map(x => x.text || '').join('');
  try { return JSON.parse(text); } catch (_) { return null; }
}

/* 写真を、送るのにちょうどよい大きさの JPEG にする */
function toJpegBase64(img, max) {
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const cx = cv.getContext('2d');
  cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h);
  cx.drawImage(img, 0, 0, w, h);
  return cv.toDataURL('image/jpeg', 0.85).split(',')[1];
}

function readImageFile(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('image')); };
    img.src = url;
  });
}

/* ---- 画面まわり ---- */
function openCamera() {
  if (!geminiKey())      { openKeyNeeded(); return; }
  if (!navigator.onLine) { openCameraOffline(); return; }
  const input = $('shot');
  input.value = '';
  input.onchange = () => {
    const f = input.files && input.files[0];
    input.onchange = null;
    if (f) runOcr(f);
  };
  input.click();   // 押したその場でひらく（iPhone でも動くように）
}

async function runOcr(file) {
  const runId = ++ocrRunId;
  openSheet(`
    <h2>レシートを読んでいます</h2>
    <p class="sheet-lead">しばらくお待ちください</p>
    <div class="ocr-bar wait"><i></i></div>
    <button type="button" class="btn-wide" data-act="close">やめる</button>
  `, () => { ocrRunId++; });

  const key = geminiKey();
  try {
    const img = await readImageFile(file);
    if (runId !== ocrRunId) return;
    const b64 = toJpegBase64(img, 1152);
    if (runId !== ocrRunId) return;

    let model = await pickModel(key, false);
    let out;
    try {
      out = await askGemini(key, model, b64);
    } catch (err) {
      // 名前が古くなっていたら、選びなおしてもう一度だけためす
      if (err.status === 404 || err.status === 400) {
        model = await pickModel(key, true);
        out = await askGemini(key, model, b64);
      } else throw err;
    }
    if (runId !== ocrRunId) return;

    const amount = Math.round(Number(out && out.amount) || 0);
    const cat = out && CAT_NAME[out.category] ? out.category : DEFAULT_CAT;
    if (!out || out.found === false || !(amount >= 1 && amount <= 9999999)) {
      openOcrFailed();
      return;
    }
    openConfirm(amount, cat, openCamera, cleanNote(out.detail));
  } catch (err) {
    if (runId !== ocrRunId) return;
    const st = err && err.status;
    if (st === 400 || st === 403)      openKeyBad();
    else if (st === 429)               openQuotaOver();
    else if (!navigator.onLine)        openCameraOffline();
    else                               openOcrFailed(true);
  }
}

function openOcrFailed(broken) {
  openSheet(`
    <h2>うまく読めませんでした</h2>
    <div class="ocr-note">${broken
      ? 'もう一度おためしください。'
      : '明るいところで、レシート全体がまっすぐ入るように<br>うつすと読みやすくなります。'}</div>
    <button type="button" class="btn-go" data-act="camera">もう一度うつす</button>
    <button type="button" class="btn-wide" data-act="manual">手で入力する</button>
    <button type="button" class="btn-wide" data-act="close">やめる</button>
  `);
}

function openCameraOffline() {
  openSheet(`
    <h2>ネットにつながっていません</h2>
    <div class="ocr-note">レシートの読み取りには、インターネットが必要です。<br>
      Wi-Fi のあるところでおためしください。</div>
    <button type="button" class="btn-go" data-act="manual">手で入力する</button>
    <button type="button" class="btn-wide" data-act="close">やめる</button>
  `);
}

function openQuotaOver() {
  openSheet(`
    <h2>きょうのぶんを使い切りました</h2>
    <div class="ocr-note">レシートの読み取りは、あすまた使えます。</div>
    <button type="button" class="btn-go" data-act="manual">手で入力する</button>
    <button type="button" class="btn-wide" data-act="close">やめる</button>
  `);
}

function openKeyNeeded() {
  openSheet(`
    <h2>カメラの準備がまだです</h2>
    <div class="ocr-note">レシートの読み取りを使うには、はじめに設定が必要です。<br>
      ご家族の方に設定してもらってください。</div>
    <button type="button" class="btn-go" data-act="settings">設定する</button>
    <button type="button" class="btn-wide" data-act="manual">手で入力する</button>
    <button type="button" class="btn-wide" data-act="close">やめる</button>
  `);
}

function openKeyBad() {
  openSheet(`
    <h2>設定が正しくないようです</h2>
    <div class="ocr-note">読み取りの設定（APIキー）をもう一度たしかめてください。</div>
    <button type="button" class="btn-go" data-act="settings">設定を見る</button>
    <button type="button" class="btn-wide" data-act="manual">手で入力する</button>
    <button type="button" class="btn-wide" data-act="close">やめる</button>
  `);
}

/* ---- 設定（ご家族の方むけ。合計の見出しを1秒ちょっと長押しでひらきます） ---- */
function openSettings() {
  const key = geminiKey();
  const model = readStore(GMODEL_STORE);
  openSheet(`
    <h2>カメラの設定</h2>
    <div class="ocr-note">
      レシートの読み取りに Google Gemini（無料わく）を使います。<br>
      ① <b>aistudio.google.com/apikey</b> で API キーを作る<br>
      ② 下に貼りつけて「保存する」<br>
      キーはこの端末の中だけに保存します。
    </div>
    <input id="gkey" class="keyfield" type="text" autocomplete="off" autocorrect="off"
           spellcheck="false" placeholder="AIza..." value="${key.replace(/"/g, '&quot;')}">
    <p class="sheet-lead" id="gmsg">${key
      ? '設定ずみです' + (model ? `（${model}）` : '')
      : 'まだ設定されていません'}</p>
    <button type="button" class="btn-go" id="gsave">保存する</button>
    ${key ? '<button type="button" class="btn-del" data-act="key-clear">設定を消す</button>' : ''}
    <button type="button" class="btn-wide" data-act="close">とじる</button>
  `);
  const input = $('gkey'), msg = $('gmsg'), save = $('gsave');
  save.addEventListener('click', async () => {
    const k = input.value.trim();
    if (!k) { msg.textContent = 'キーを貼りつけてください'; return; }
    writeStore(GKEY_STORE, k);
    writeStore(GMODEL_STORE, '');
    save.disabled = true;
    msg.textContent = 'たしかめています…';
    try {
      const m = await pickModel(k, true);
      msg.textContent = `使えます（${m}）`;
    } catch (err) {
      msg.textContent = (err && (err.status === 400 || err.status === 403))
        ? 'このキーは使えないようです' : 'たしかめられませんでした（ネットの状態をご確認ください）';
    }
    save.disabled = false;
  });
}

function clearSettings() {
  writeStore(GKEY_STORE, '');
  writeStore(GMODEL_STORE, '');
  closeSheet();
  showToast('設定を消しました', '', 1800);
}

/* リンクで渡されたキーを受け取る（?key=… または ?gkey=…） */
function takeKeyFromUrl() {
  const m = location.search.match(/[?&](?:g?key)=([^&]+)/);
  if (!m) return;
  writeStore(GKEY_STORE, decodeURIComponent(m[1]).trim());
  writeStore(GMODEL_STORE, '');
  try { history.replaceState(null, '', location.pathname + location.hash); } catch (_) {}
}

/* ---------------- LINEなどへ送る（画像2枚） ---------------- */
const CREAM = '#FFF6E9', INK = '#2E2118', INK2 = '#6E5A48';
const BAR_CUR = '#5FA03F', BAR_PREV = '#D7C7B0', HILIGHT = '#DE4E84';
const FONT = '"Hiragino Maru Gothic ProN","Hiragino Sans","Noto Sans JP",sans-serif';

let charsImg = null;
function loadChars() {
  if (charsImg) return Promise.resolve(charsImg);
  return new Promise(resolve => {
    const im = new Image();
    im.onload  = () => { charsImg = im; resolve(im); };
    im.onerror = () => resolve(null);
    im.src = './assets/chars.png';
  });
}

function newCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = CREAM; x.fillRect(0, 0, w, h);
  x.textBaseline = 'alphabetic';
  return { c, x };
}
const setFont = (x, size, weight) => { x.font = `${weight || 900} ${size}px ${FONT}`; };

function roundRect(x, l, t, w, h, r) {
  x.beginPath();
  x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r);
  x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath();
}

function drawFooter(x, W, H) {
  if (charsImg) {
    const w = 320, h = w * charsImg.height / charsImg.width;
    x.drawImage(charsImg, W - w - 40, H - h - 24, w, h);
  }
  setFont(x, 40, 800); x.fillStyle = '#B09A82'; x.textAlign = 'left';
  x.fillText('かけい簿', 56, H - 54);
}

/* 1枚目：今月の記録（画面と同じドーナツ＋金額の一覧） */
function drawMonthImage(ym) {
  const W = 1080, PAD = 56;
  const t = totalsOf(ym), total = sumOf(t);
  const rowH = 96, H = 820 + rowH * CATS.length + 250;
  const { c, x } = newCanvas(W, H);
  const d = new Date();
  const upto = ym === thisYM() ? `${monthNum(ym)}月${d.getDate()}日まで` : `${monthNum(ym)}月ぜんぶ`;

  x.textAlign = 'left';
  setFont(x, 78, 900); x.fillStyle = INK;
  x.fillText(`${yearNum(ym)}年 ${monthNum(ym)}月の記録`, PAD, 150);
  setFont(x, 46, 800); x.fillStyle = INK2;
  x.fillText(upto, PAD, 214);

  // ドーナツ
  const cx = W / 2, cy = 520, R = 232, LW = 76;
  x.lineCap = 'butt';
  x.lineWidth = LW;
  x.strokeStyle = '#EFE4D3';
  x.beginPath(); x.arc(cx, cy, R - LW / 2, 0, Math.PI * 2); x.stroke();
  if (total > 0) {
    const list = CATS.filter(k => t[k.key] > 0);
    const gap = list.length > 1 ? 0.028 : 0;
    let a0 = -Math.PI / 2;
    for (const k of list) {
      const sweep = t[k.key] / total * Math.PI * 2;
      x.strokeStyle = CAT_COLOR[k.key].arc;
      x.beginPath();
      x.arc(cx, cy, R - LW / 2, a0 + gap / 2, a0 + sweep - gap / 2);
      x.stroke();
      a0 += sweep;
    }
  }
  x.textAlign = 'center';
  setFont(x, 46, 800); x.fillStyle = INK2; x.fillText('支出合計', cx, cy - 34);
  const money = `${fmt(total)}円`, holeW = (R - LW) * 2 - 18;
  let f = 82;
  setFont(x, f, 900);
  while (f > 44 && x.measureText(money).width > holeW) { f -= 2; setFont(x, f, 900); }
  x.fillStyle = INK; x.fillText(money, cx, cy + 20 + f / 2.6);

  // カテゴリごとの金額
  let y = 820;
  for (const cat of CATS) {
    const v = t[cat.key];
    x.beginPath(); x.arc(PAD + 18, y + 26, 18, 0, Math.PI * 2);
    x.fillStyle = v > 0 ? CAT_COLOR[cat.key].arc : '#D9CBB8'; x.fill();
    x.textAlign = 'left'; setFont(x, 54, 900); x.fillStyle = v > 0 ? INK : '#9C8977';
    x.fillText(cat.name, PAD + 54, y + 44);
    x.textAlign = 'right';
    if (v > 0) { setFont(x, 54, 900); x.fillStyle = INK; x.fillText(`${fmt(v)}円`, W - PAD, y + 44); }
    else       { setFont(x, 44, 800); x.fillStyle = '#9C8977'; x.fillText('まだありません', W - PAD, y + 42); }
    y += rowH;
  }
  drawFooter(x, W, H);
  return c;
}

/* 2枚目：年間の記録 */
function drawYearImage(year) {
  const W = 1080, PAD = 56;
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const ym = `${year}-${pad2(m)}`;
    months.push({ m, ym, total: sumOf(totalsOf(ym)) });
  }
  const max = Math.max(1, ...months.map(o => o.total));
  const rowH = 96, H = 300 + rowH * 12 + 260;
  const { c, x } = newCanvas(W, H);
  const nowYM = thisYM();

  x.textAlign = 'left'; setFont(x, 78, 900); x.fillStyle = INK;
  x.fillText(`${year}年の記録`, PAD, 150);
  setFont(x, 44, 800); x.fillStyle = INK2;
  x.fillText('1月から12月までの支出', PAD, 212);

  const labelW = 120, amtW = 250;
  const track = W - PAD * 2 - labelW - amtW;
  let y = 280;
  for (const o of months) {
    const isNow = o.ym === nowYM;
    if (isNow) { x.fillStyle = '#FDE0E9'; roundRect(x, PAD - 14, y - 6, W - PAD * 2 + 28, rowH - 10, 20); x.fill(); }
    x.textAlign = 'left'; setFont(x, 50, 900); x.fillStyle = isNow ? '#B33E6B' : INK;
    x.fillText(`${o.m}月`, PAD, y + 56);
    x.fillStyle = '#EFE4D3'; roundRect(x, PAD + labelW, y + 24, track, 38, 19); x.fill();
    if (o.total > 0) {
      x.fillStyle = isNow ? HILIGHT : BAR_CUR;
      roundRect(x, PAD + labelW, y + 24, Math.max(38, track * o.total / max), 38, 19); x.fill();
    }
    x.textAlign = 'right'; setFont(x, 44, 900); x.fillStyle = o.total > 0 ? (isNow ? '#B33E6B' : INK) : '#B5A392';
    x.fillText(o.total > 0 ? `${fmt(o.total)}円` : '—', W - PAD, y + 58);
    y += rowH;
  }
  drawFooter(x, W, H);
  return c;
}

const canvasToBlob = c => new Promise(res => c.toBlob(res, 'image/png'));

async function doShare() {
  showToast('画像を作っています', '', 6000);
  try {
    await loadChars();
    const ym = thisYM();
    const [b1, b2] = await Promise.all([
      canvasToBlob(drawMonthImage(ym)),
      canvasToBlob(drawYearImage(yearNum(ym))),
    ]);
    if (!b1 || !b2) throw new Error('no blob');
    const files = [
      new File([b1], `kakeibo-${ym}.png`, { type: 'image/png' }),
      new File([b2], `kakeibo-${yearNum(ym)}.png`, { type: 'image/png' }),
    ];
    el.toast.hidden = true;
    if (navigator.canShare && navigator.canShare({ files }) && navigator.share) {
      await navigator.share({ files, title: 'かけい簿' });
      return;
    }
    offerDownload(files);
  } catch (err) {
    el.toast.hidden = true;
    if (err && err.name === 'AbortError') return;   // 本人がやめただけ
    shareFailed();
  }
}

function shareFailed(files) {
  openSheet(`
    <h2>うまく送れませんでした</h2>
    <p class="sheet-lead">もう一度おためしください。</p>
    ${files ? '<button type="button" class="btn-go" data-act="save-images">画像を保存する</button>' : ''}
    <button type="button" class="btn-wide" data-act="close">とじる</button>
  `);
  if (files) {
    el.sheet.querySelector('[data-act="save-images"]').addEventListener('click', () => {
      files.forEach(f => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(f); a.download = f.name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      });
      closeSheet();
      showToast('画像を保存しました', '写真から送ってください', 2600);
    });
  }
}
const offerDownload = files => shareFailed(files);

/* ---------------- キーボードの高さ ---------------- */
function setKeyboardOffset(px) {
  document.documentElement.style.setProperty('--kb', px + 'px');
}
function lockAppHeight() {
  const a = document.activeElement;
  if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) return;
  const h = window.innerHeight;
  document.documentElement.style.setProperty('--apph', h + 'px');
  document.documentElement.style.setProperty('--u', (h / 100) + 'px');
}
function watchKeyboard() {
  const vv = window.visualViewport;
  if (!vv) return;
  const on = () => {
    const kb = Math.max(0, Math.round(window.innerHeight - (vv.height + vv.offsetTop)));
    setKeyboardOffset(kb > 90 ? kb : 0);
  };
  vv.addEventListener('resize', on);
  vv.addEventListener('scroll', on);
}

/* ---------------- ボタンの受付 ---------------- */
function onTap(ev) {
  const btn = ev.target.closest('[data-act]');
  if (!btn) return;
  switch (btn.dataset.act) {
    case 'close':       closeSheet(); break;
    case 'manual':      stopVoice(); openManual(); break;
    case 'voice':       openVoice(); break;
    case 'camera':      openCamera(); break;
    case 'settings':    openSettings(); break;
    case 'key-clear':   clearSettings(); break;
    case 'delete':      openDeleteLast(); break;
    case 'delete-yes':  deleteLast(); break;
  }
}

/* ---------------- 起動アニメーション ---------------- */
function runSplash() {
  const splash = $('splash'), bar = $('splashBar'), pct = $('splashPct');
  const fill = document.querySelector('.mold-fill');
  const liquid = document.querySelector('.mold-liquid');
  const real = document.querySelector('.mold-real');
  const DUR = 3000;
  let t0 = null;

  function tick(t) {
    if (t0 === null) t0 = t;
    const p = Math.min(1, (t - t0) / DUR);
    const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    fill.style.height = (e * 104) + '%';
    bar.style.width = (p * 100) + '%';
    pct.textContent = Math.round(p * 100) + '%';
    if (p < 1) { requestAnimationFrame(tick); return; }
    real.classList.add('show');
    liquid.classList.add('fade');
    setTimeout(() => {
      splash.classList.add('done');
      el.app.classList.add('ready');
      el.app.setAttribute('aria-hidden', 'false');
      setTimeout(() => { splash.hidden = true; }, 500);
    }, 520);
  }
  requestAnimationFrame(tick);
}

/* ---------------- はじめる ---------------- */
function init() {
  takeKeyFromUrl();
  lockAppHeight();
  watchKeyboard();
  render();
  runSplash();
  loadChars();   // 「送る」を押したときにすぐ画像を作れるようにしておく

  el.btnPrev.addEventListener('click', () => {
    const p = prevMonthWithData(viewYM);
    if (p) { viewYM = p; render(); }
  });
  el.btnNow.addEventListener('click', () => { refreshCurrentMonth(); viewYM = currentYM; render(); });
  el.btnAdd.addEventListener('click', () => { refreshCurrentMonth(); openAddMenu(); });
  el.btnShare.addEventListener('click', doShare);
  el.scrim.addEventListener('click', () => { stopVoice(); closeAll(); });
  el.sheet.addEventListener('click', onTap);

  // 円グラフをタップすると、そのカテゴリの金額をまんなかに出す
  el.donut.addEventListener('click', onDonutTap);

  // 合計の見出しを長おしすると、カメラの設定がひらきます（ご家族の方むけ）
  let holdTimer = null;
  const hold = () => { clearTimeout(holdTimer); holdTimer = setTimeout(openSettings, 1200); };
  const release = () => clearTimeout(holdTimer);
  el.totalLabel.addEventListener('pointerdown', hold);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev =>
    el.totalLabel.addEventListener(ev, release));
  el.totalLabel.addEventListener('contextmenu', e => e.preventDefault());
  if (el.chars) el.chars.addEventListener('load', layoutChars);

  // 月がかわったら自動でいれかえる
  setInterval(refreshCurrentMonth, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshCurrentMonth(); });
  window.addEventListener('focus', refreshCurrentMonth);

  window.addEventListener('orientationchange', () => setTimeout(() => { lockAppHeight(); layoutDonut(); }, 350));
  window.addEventListener('resize', () => {
    if (!window.visualViewport) lockAppHeight();
    requestAnimationFrame(layoutDonut);
  });

  // 二本指の拡大や、ダブルタップでの拡大を止める
  document.addEventListener('gesturestart', e => e.preventDefault());

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
    });
  }
}

init();
