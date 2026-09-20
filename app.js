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
    return data.entries.filter(e =>
      e && typeof e.a === 'number' && e.a > 0 && CAT_NAME[e.c] && /^\d{4}-\d{2}-\d{2}$/.test(e.d));
  } catch (_) { return []; }
}
function saveEntries(list) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ entries: list })); return true; }
  catch (_) { return false; }
}

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
  app: $('app'), chart: $('chart'), totalLabel: $('totalLabel'), totalYen: $('totalYen'),
  legendCur: $('legendCur'), legendPrev: $('legendPrev'),
  btnPrev: $('btnPrev'), btnNow: $('btnNow'), btnAdd: $('btnAdd'), btnShare: $('btnShare'),
  viewOnly: $('viewOnly'), scrim: $('scrim'), sheet: $('sheet'),
  confirm: $('confirm'), toast: $('toast'),
};

/* ---------------- 画面を描く ---------------- */
function render() {
  const isPast = viewYM !== currentYM;
  const cur  = totalsOf(viewYM);
  const prev = totalsOf(addMonths(viewYM, -1));
  const m    = monthNum(viewYM);
  const pm   = monthNum(addMonths(viewYM, -1));

  document.body.classList.toggle('is-past', isPast);
  el.app.classList.toggle('past', isPast);

  el.totalLabel.innerHTML =
    `${m}月支出合計` + (isPast ? '<span class="past-tag">過去の記録</span>' : '');
  el.totalYen.textContent = fmt(sumOf(cur));
  el.legendCur.textContent  = `${m}月`;
  el.legendPrev.textContent = `${pm}月`;

  const max = Math.max(1, ...CATS.map(c => Math.max(cur[c.key], prev[c.key])));
  el.chart.innerHTML = CATS.map(c => {
    const a = cur[c.key], b = prev[c.key];
    const right = a > 0
      ? `<span class="cat-amt">${fmt(a)}<small>円</small></span>`
      : `<span class="cat-none">まだありません</span>`;
    let bars = '';
    if (a > 0) bars += `<div class="bar" style="width:${Math.max(5, a / max * 100)}%"></div>`;
    if (b > 0) bars += `<div class="bar prev" style="width:${Math.max(5, b / max * 100)}%"></div>`;
    if (!bars) bars = `<div class="bar" style="width:0;visibility:hidden"></div>`;
    return `<div class="cat">
        <div class="cat-top"><span class="cat-name">${SVG[c.key]}${c.name}</span>${right}</div>
        <div class="bars">${bars}</div>
      </div>`;
  }).join('');

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
    <button type="button" class="opt one soon" data-act="camera">${SVG.cam}
      <span>カメラで<br>レシートを読み取る<small>じゅんび中です</small></span></button>
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
function openConfirm(amount, cat, onRedo) {
  sheetOnClose = null;
  el.sheet.hidden = true; el.sheet.innerHTML = '';
  el.scrim.hidden = false;
  el.confirm.innerHTML = `
    <div class="confirm-q">これでよろしいですか？</div>
    <div class="confirm-big">${fmt(amount)}<small>円</small></div>
    <div class="confirm-cat">${CAT_NAME[cat]}</div>
    <div class="confirm-btns">
      <button type="button" class="btn-ok"   id="cfOk">これでOK</button>
      <button type="button" class="btn-redo" id="cfNg">やり直す</button>
    </div>`;
  el.confirm.hidden = false;
  setKeyboardOffset(0);

  $('cfOk').addEventListener('click', () => { closeAll(); addEntry(amount, cat); });
  $('cfNg').addEventListener('click', () => {
    el.confirm.hidden = true; el.confirm.innerHTML = '';
    if (onRedo) onRedo(); else openAddMenu();
  });
}

function addEntry(amount, cat) {
  entries.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
                 d: todayISO(), c: cat, a: amount });
  if (!saveEntries(entries)) {
    entries.pop();
    showToast('保存できませんでした', 'もう一度おためしください', 2600);
    return;
  }
  refreshCurrentMonth();
  viewYM = currentYM;
  render();
  showToast('保存しました', `${CAT_NAME[cat]} ${fmt(amount)}円`, 1900);
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
    openConfirm(parsed.amount, parsed.cat, openVoice);
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
  const cleaned = s.replace(/携帯電話|携帯|ケータイ|けいたい|スマホ|スマートフォン|電話|水道|すいどう|電気|でんき|ガス|がす|生活費|食費/g, '');
  let amount = 0;
  for (const chunk of cleaned.match(/[0-9〇零一壱二弐三参四五六七八九十百千万億]+/g) || []) {
    amount = Math.max(amount, toNumber(chunk));
  }
  return { amount: amount > 0 && amount < 1e9 ? amount : 0, cat };
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

/* 1枚目：今月の記録 */
function drawMonthImage(ym) {
  const W = 1080, PAD = 56;
  const t = totalsOf(ym), total = sumOf(t);
  const max = Math.max(1, ...CATS.map(c => t[c.key]));
  const rowH = 132, H = 520 + rowH * CATS.length + 300;
  const { c, x } = newCanvas(W, H);
  const d = new Date();
  const isThis = ym === thisYM();
  const upto = isThis ? `${monthNum(ym)}月${d.getDate()}日まで` : `${monthNum(ym)}月ぜんぶ`;

  x.textAlign = 'left';
  setFont(x, 78, 900); x.fillStyle = INK;
  x.fillText(`${yearNum(ym)}年 ${monthNum(ym)}月の記録`, PAD, 150);
  setFont(x, 46, 800); x.fillStyle = INK2;
  x.fillText(upto, PAD, 214);

  x.fillStyle = '#FFFFFF'; roundRect(x, PAD, 258, W - PAD * 2, 210, 28); x.fill();
  x.strokeStyle = '#E7D9C5'; x.lineWidth = 4; x.stroke();
  setFont(x, 46, 800); x.fillStyle = INK2; x.fillText('支出合計', PAD + 40, 330);
  setFont(x, 116, 900); x.fillStyle = INK; x.textAlign = 'right';
  x.fillText(`${fmt(total)}円`, W - PAD - 40, 430);

  let y = 520;
  for (const cat of CATS) {
    const v = t[cat.key];
    x.textAlign = 'left'; setFont(x, 54, 900); x.fillStyle = INK;
    x.fillText(cat.name, PAD, y + 48);
    x.textAlign = 'right';
    if (v > 0) { setFont(x, 54, 900); x.fillStyle = INK; x.fillText(`${fmt(v)}円`, W - PAD, y + 48); }
    else       { setFont(x, 44, 800); x.fillStyle = '#9C8977'; x.fillText('まだありません', W - PAD, y + 46); }
    const track = W - PAD * 2;
    x.fillStyle = '#EFE4D3'; roundRect(x, PAD, y + 72, track, 34, 17); x.fill();
    if (v > 0) { x.fillStyle = BAR_CUR; roundRect(x, PAD, y + 72, Math.max(34, track * v / max), 34, 17); x.fill(); }
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
    case 'camera':      showToast('まだ使えません', 'つぎの段階で作ります', 2200); break;
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

  // 月がかわったら自動でいれかえる
  setInterval(refreshCurrentMonth, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshCurrentMonth(); });
  window.addEventListener('focus', refreshCurrentMonth);

  window.addEventListener('orientationchange', () => setTimeout(lockAppHeight, 350));
  window.addEventListener('resize', () => { if (!window.visualViewport) lockAppHeight(); });

  // 二本指の拡大や、ダブルタップでの拡大を止める
  document.addEventListener('gesturestart', e => e.preventDefault());

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
    });
  }
}

init();
