(function () {
'use strict';
const E = window.IEPEngine;
const IN_FRAME = (function () { try { return window.self !== window.top; } catch (e) { return true; } })();
const HOSTED = !IN_FRAME;
// Where "Report a problem" sends reports. Set this to your own address before publishing; when it's empty,
// people can still copy the report and send it however they like (for example as a GitHub issue).
const REPORT_TO = 'rtwergrfh@gmail.com';
const VERSION = '0.9 (beta)';

/* ---------- helpers ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = id => document.getElementById(id);
const plural = (n, w, p) => n + ' ' + (n === 1 ? w : (p || w + 's'));
let toastT = null;
function toast(m) { const t = $('toast'); if (!t) return; t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3000); }
async function copyText(text, fallbackId) {
  try { await navigator.clipboard.writeText(text); toast('Copied'); }
  catch (e) { const el = fallbackId && $(fallbackId); if (el) { el.hidden = false; el.focus(); el.select(); } toast('Select the text and copy it'); }
}
const today = () => new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });

/* ---------- constants ---------- */
const ROLES = [['t', 'Classroom teacher', 'Teacher'], ['p', 'Paraprofessional', 'Para'], ['s', 'Substitute or specials teacher', 'Sub/specials'], ['f', 'Family', 'Family']];
const STAFF = ['t', 'p', 's'];
const LG = window.IEPLang;
const TT = () => LG.T[S.lang] || LG.T.en;
const docName = () => TT().doc[S.meta && S.meta.plan === '504' ? '504' : 'iep'];
const DEF_ROLES = { accom: 'tpsf', mods: 'tpf', at: 'tpf', testing: 'tf', services: 'tpf', goals: 'tpf', behavior: 'tpsf', health: 'tpsf', strengths: 'tpsf', personnel: 't' };
const CAT_ORDER = ['health', 'strengths', 'accom', 'mods', 'at', 'testing', 'behavior', 'goals', 'services', 'personnel'];
const CAT_LABEL = { accom: 'Accommodations', mods: 'Modifications', at: 'Assistive technology', testing: 'Testing accommodations', services: 'Services', goals: 'Goals', behavior: 'Behavior plan', health: 'Health and safety', strengths: 'Strengths', personnel: 'Supports for staff' };
const BEH_ORDER = ['Watch for', 'Often triggered by', 'Why it happens', 'Prevent it', 'Teach and accept instead', 'When it happens', 'Reinforce', 'Safety plan', 'Also in the plan'];

/* ---------- state (memory only; nothing is saved) ---------- */
const S = { view: 'home', loading: null, error: null, srcName: '', sample: false, rows: null, ids: [], code: '', extra: [], noName: false, rrows: null, meta: {}, items: [], cov: [], readStats: null, handled: null, role: 'p', cm: { name: '', contact: '', note: '' }, signoff: false, weeks: 1, lang: 'en', showPages: true, filter: '', addFor: null, pasteOpen: false, sections: [] };
let nid = 1000;

/* ---------- icons ---------- */
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const I = {
  wifi: svg('<path d="M2 2l20 20"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 12.9a10 10 0 0 1 5.2-2.8"/><path d="M19 12.9a10 10 0 0 0-3-2.1"/><path d="M12 20h.01"/>'),
  lock: svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  link: svg('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
  eye: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  file: svg('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>'),
  eraser: svg('<path d="M7 21h10"/><path d="M5.5 13.5l7-7a2 2 0 0 1 2.8 0l3.2 3.2a2 2 0 0 1 0 2.8L13 18H8.5z"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  print: svg('<path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v7H7z"/>')
};
const BRAND = `<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="var(--control-primary-bg)"/><rect x="8" y="7" width="16" height="19" rx="2.5" fill="none" stroke="#fff" stroke-width="2.2"/><path d="M12 13h8M12 17h8M12 21h5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><circle cx="24" cy="8" r="3.4" fill="var(--accent)"/></svg>`;

/* ---------- reading files ---------- */
async function pagesFromPdf(data, onPage) {
  // src/pdfread.js: text plus checkboxes and form fields, minus overprinted duplicates and rotated text
  const out = await window.IEPPdf.readPdf(window.pdfjsLib, data, onPage);
  S.readStats = out.stats;
  return out.pages;
}
async function openPdf(bytes, name, sample) {
  S.loading = { msg: 'Opening the PDF', pct: 5 }; S.error = null; S.srcName = name; S.sample = !!sample; render();
  try {
    const pages = await pagesFromPdf(bytes, (p, n) => { S.loading = { msg: 'Reading page ' + p + ' of ' + n, pct: Math.round(p / n * 90) }; const el = $('load-msg'); if (el) { el.textContent = S.loading.msg; $('load-bar').style.width = S.loading.pct + '%'; } });
    const chars = pages.reduce((a, p) => a + p.items.reduce((b, i) => b + i.str.trim().length, 0), 0);
    if (chars < 200) throw Object.assign(new Error('scan'), { code: 'scan' });
    startRedact(E.rowsFromPages(pages));
  } catch (e) {
    S.loading = null;
    S.error = e.code === 'scan' ? "This PDF doesn't contain readable text. It's probably a scan. Download the IEP from your IEP system as a PDF, or paste the text instead."
      : /password/i.test(e.name + e.message) ? 'This PDF is password-protected. Save an unprotected copy from your IEP system and try again.'
      : "This file couldn't be read as a PDF. Try downloading the IEP from your IEP system as a PDF, or paste the text instead.";
    render();
  }
}
function openText(text) {
  const rows = E.rowsFromText(text);
  if (rows.length < 5) { S.error = 'There isn\'t enough text here to read. Paste the full IEP text.'; render(); return; }
  S.srcName = 'Pasted text'; S.sample = false; S.readStats = null; startRedact(rows);
}
function startRedact(rows) {
  S.rows = rows; S.loading = null;
  const f = E.findIdentifiers(rows);
  S.ids = f.list.map(i => Object.assign({}, i, { on: !i.off }));
  S.code = f.code; S.noName = !f.studentFull; S.extra = [];
  go('redact');
}

/* ---------- redaction -> analysis ---------- */
function applyRedaction() {
  const red = E.makeRedactor(S.ids, S.code || 'The student', S.extra);
  S.rrows = S.rows.map(r => Object.assign({}, r, { cells: r.cells.map(red), text: red(r.text) }));
  const res = E.analyze(S.rrows);
  S.meta = res.meta; S.lang = res.meta.lang || 'en'; S.sections = res.sections; S.safety = (res.safety || []).map(x => Object.assign({ added: false }, x)); S.reportDraft = ''; S.reportOpen = false;
  // items sorted only by the model start switched on when it was fairly sure, off otherwise
  S.items = res.items.map(it => withRoles(Object.assign({ on: !it.off && (!it.suggested || (it.conf || 0) >= 0.6), useTip: !!it.tip }, it)));
  S.handled = {
    unchecked: S.rrows.filter(r => r.opt === 'off').length,
    dropped: res.dropped, droppedSet: new Set(res.dropped.map(d => d.text)),
    merged: res.merged, model: res.model,
    sorted: S.items.filter(i => i.suggested).length,
    ocr: S.readStats ? S.readStats.ocrPages || 0 : 0, dupes: S.readStats ? S.readStats.duplicates : 0, fields: S.readStats ? S.readStats.fields : 0, rotated: S.readStats ? S.readStats.rotated : 0
  };
  S.cov = E.coverage(res);
}
function withRoles(it) {
  const d = DEF_ROLES[it.cat] || 'tp';
  it.roles = { t: d.includes('t'), p: d.includes('p'), s: d.includes('s'), f: d.includes('f') };
  if (it.cat === 'goals' && it.who && !/para|aide|assistant/i.test(it.who)) it.roles.p = false;
  if (it.cat === 'behavior' && it.subName === 'Why it happens') it.roles.s = false;
  if (it.offWhy === 'diagnosis') it.roles.s = false;
  return it;
}

/* ---------- views ---------- */
function header() {
  const order = ['home', 'redact', 'review', 'sheets'];
  const idx = order.indexOf(S.view);
  const can = { home: true, redact: !!S.rows, review: !!S.rrows, sheets: !!S.rrows };
  const step = (v, n, l) => `<button class="step${idx > order.indexOf(v) ? ' done' : ''}" data-go="${v}"${S.view === v ? ' aria-current="step"' : ''}${can[v] ? '' : ' disabled'}><span class="n">${n}</span><span class="lbl">${l}</span></button>`;
  return `<header class="top" id="top"><div class="wrap top-in">
    <button class="brand" data-act="home" aria-label="IEP Glance home">${BRAND}<span>IEP Glance</span></button>
    <nav class="steps-pill" aria-label="Steps">${step('home', 1, 'Open')}${step('redact', 2, 'Remove names')}${step('review', 3, 'Check')}${step('sheets', 4, 'Sheets')}</nav>
    <div class="top-right"><span class="local-badge" title="Everything runs in this browser. Nothing is uploaded or saved."><i aria-hidden="true"></i><span>Nothing leaves this device</span></span></div>
  </div></header>`;
}
function footer() {
  return `<footer class="foot no-print"><div class="wrap foot-grid">
    <div><h3>IEP Glance</h3><p>Free, open-source tool that turns an IEP into one-page sheets for the staff who work with a student.</p></div>
    <div><h3>Privacy</h3><p>No server, no accounts, no tracking. The IEP is read in this browser tab and forgotten when you close it.</p></div>
    <div><h3>Important</h3><p>Sheets summarize the IEP; they don't replace it. Check every item before sharing, and follow your district's rules for student records.</p></div>
  </div></footer>`;
}
function viewHome() {
  const r = ' rise';
  return `<main>
  <section class="hero-band"><div class="wrap hero">
    <p class="kicker${r}" style="--d:0">For special education teachers and case managers</p>
    <h1 class="${r.trim()}" style="--d:1">Turn an IEP into <span class="u">one page</span> for every adult in the room</h1>
    <p class="sub${r}" style="--d:2">Open the IEP, check what was found, and print a plain-language sheet for each teacher, para and sub. Every line shows the IEP page it came from. It runs entirely in your browser, so the IEP never leaves your computer.</p>
    <div class="drop${r}" style="--d:3" id="drop">
      ${S.loading ? `<p class="kicker" id="load-msg">${esc(S.loading.msg)}</p><div class="progress"><span id="load-bar" style="width:${S.loading.pct}%"></span></div>` : `
      <div class="row" style="justify-content:center"><label class="btn primary big" for="f-pdf" style="margin:0">${I.file}Choose an IEP PDF</label><input type="file" id="f-pdf" accept="application/pdf,.pdf,.txt,text/plain,.iepglance,.json,application/json" class="sr-only"></div>
      <p class="hint">or drag it here · <button class="linkbtn" data-act="paste-open">paste the IEP text</button> · <button class="linkbtn" data-act="manual">make a sheet by hand</button></p>
      <p class="hint" style="margin-top:0">Saved your work last time? Choose or drop the <b>.iepglance</b> file to pick up where you left off.</p>
      ${S.pasteOpen ? `<div style="width:100%;text-align:left"><label for="f-paste">IEP text</label><textarea id="f-paste" rows="8" placeholder="Paste the full IEP text here"></textarea><div class="row" style="margin-top:var(--space-3)"><button class="btn primary" data-act="paste-go">Read this text</button></div></div>` : ''}
      <p class="or">No IEP handy? Try a sample (the students are fictional):</p>
      <div class="samples">${window.SAMPLES.map((s, i) => `<button class="chip" data-act="sample" data-i="${i}">${esc(s.name)}</button>`).join('')}</div>
      <p class="hint beta"><b>Early version.</b> Reads IEPs and Section 504 plans, in English or Spanish, and prints sheets in either language. Tested on IEPs from New York, Washington, Texas and California systems; other layouts may need more checking in step 3. Scanned (image-only) PDFs aren't supported yet.</p>`}
      ${S.error ? `<p class="banner bad" role="alert" style="text-align:left">${esc(S.error)}</p>` : ''}
    </div>
    <ul class="proof wrap${r}" style="--d:4;padding:0">
      <li>${I.wifi}<span>Works with Wi-Fi turned off. Try it.</span></li>
      <li>${I.lock}<span>No uploads, no accounts. Nothing is saved after you close the tab.</span></li>
      <li>${I.eraser}<span>Removes the student's name, birth date, IDs and contact details first, and lists other names it spots for you to check.</span></li>
      <li>${I.link}<span>Every line links to its IEP page, and you approve everything.</span></li>
    </ul>
  </div></section>
  <section class="band sunken"><div class="wrap split">
    <div class="split-copy"><h2>The IEP at a glance, without retyping it</h2>
      <p class="sub">Paras and gen ed teachers need to know the accommodations, the behavior plan and the health alerts, but rarely see the full IEP. IEP Glance pulls those sections out, puts them in plain language and lets you choose who sees what.</p></div>
    <div class="tiles2">
      <div class="stile"><span class="ic">${I.file}</span><span class="meta">Step 1</span><h3>Open the IEP</h3><p class="muted">A PDF from your IEP system, or pasted text. It's read in this tab only.</p></div>
      <div class="stile"><span class="ic">${I.eraser}</span><span class="meta">Step 2</span><h3>Remove identifying details</h3><p class="muted">The student's name becomes initials. Birth date, IDs, parent names and contact details are removed, and other people's names it spots are listed for you to confirm.</p></div>
      <div class="stile"><span class="ic">${I.eye}</span><span class="meta">Step 3</span><h3>Check what was found</h3><p class="muted">Accommodations, testing, behavior plan, goals, services and health, each with its source page. Unchecked boxes are left out.</p></div>
      <div class="stile"><span class="ic">${I.print}</span><span class="meta">Step 4</span><h3>Print a sheet per role</h3><p class="muted">Classroom teacher, para, and sub or specials, each with only what they need.</p></div>
    </div></div></section>
  <section class="band"><div class="wrap narrow"><details class="it-box"><summary>For your district's technology team</summary>
    <ul>
      <li>IEP Glance is a single static web page. It has no server, database, accounts, cookies or analytics.</li>
      <li>The PDF is read in the browser with Mozilla's pdf.js, which is bundled into the page. The page's content security policy blocks all outgoing network requests${HOSTED ? '' : ' in the hosted version'}.</li>
      <li>Nothing is written to browser storage. Closing the tab discards the IEP and everything derived from it.</li>
      <li>Sorting uses rules plus a small statistical model built into the page (logistic regression, about 260 KB, trained only on fictional IEP-style text). It runs in this tab. It isn't a chatbot or generative AI, it never writes new text, and nothing is sent to any AI service.</li>
      <li>The source code is public, so it can be inspected. It also runs as a downloaded file with no internet connection.</li>
    </ul>
    ${HOSTED ? `<div class="row"><a class="btn small" href="./" download="iep-glance.html">Download the offline copy</a><span class="meta" id="net-count"></span></div>` : ''}
  </details></div></section>
  </main>`;
}
function viewRedact() {
  const on = S.ids.filter(i => i.on).length;
  const rep = i => i.kind === 'student' || i.kind === 'first' ? (S.code || 'The student') : i.kind === 'maybe' || i.kind === 'other' ? '[name]' : i.kind === 'parent' ? '[parent]' : i.kind === 'last' ? '[family name]' : '[' + i.label.toLowerCase() + ']';
  const red = E.makeRedactor(S.ids, S.code || 'The student', S.extra);
  const ex = (S.rows.find(r => r.cells.length === 1 && r.text.length > 60 && red(r.text) !== r.text && /[a-z]{4}/.test(r.text)) || {}).text;
  return `<main class="page"><div class="wrap narrow stack">
    <div class="stack" style="gap:var(--space-3)"><p class="kicker">Step 2 of 4${S.sample ? ' · fictional sample' : ''}</p><h1>Remove identifying details</h1>
      <p class="sub">These were found in ${esc(S.srcName)}. Checked items are replaced everywhere before anything else happens. The sheets use the student code instead of a name.</p></div>
    ${S.noName ? `<p class="banner" role="alert">The student's name wasn't found automatically. Add it below so it's removed everywhere.</p>` : ''}
    <section class="card">
      <div class="row" style="align-items:flex-end"><div style="flex:0 1 220px"><label for="f-code">Student code on the sheets</label><input id="f-code" value="${esc(S.code)}" maxlength="16" autocomplete="off"></div><p class="hint" style="flex:1 1 260px">Initials by default. You can use any code your team recognizes.</p></div>
      <ul class="id-list">${S.ids.map((i, k) => `<li><input type="checkbox" data-act="id-toggle" data-k="${k}" aria-label="Remove ${esc(i.label)}"${i.on ? ' checked' : ''}><div><div class="id-kind">${esc(i.label)}</div><div class="id-val">${esc(i.value)}</div></div><span class="id-rep">${i.on ? esc(rep(i)) : 'kept'}</span></li>`).join('') || '<li><span></span><span class="muted">Nothing identifying was found automatically.</span><span></span></li>'}
      ${S.extra.map((x, k) => `<li><input type="checkbox" checked data-act="extra-remove" data-k="${k}" aria-label="Stop removing ${esc(x)}"><div><div class="id-kind">Added by you</div><div class="id-val">${esc(x)}</div></div><span class="id-rep">[removed]</span></li>`).join('')}</ul>
      <form id="extra-form" class="row" style="align-items:flex-end"><div style="flex:1 1 260px"><label for="f-extra">${S.noName ? "Student's full name, or anything else to remove" : 'Anything else to remove'}</label><input id="f-extra" placeholder="${S.noName ? 'First and last name' : 'A sibling\'s name, a nickname, a street name'}" autocomplete="off"></div><button class="btn" type="submit">Add</button></form>
    </section>
    ${ex ? `<section class="stack" style="gap:var(--space-2)"><p class="meta">Example after removal</p><p class="preview-line">${esc(red(ex).slice(0, 240))}${ex.length > 240 ? '…' : ''}</p></section>` : ''}
    <div class="row"><button class="btn primary big" data-act="to-review">Remove ${plural(on + S.extra.length, 'detail')} and continue</button><button class="btn" data-act="home">Use a different IEP</button></div>
  </div></main>`;
}
function itemCard(it) {
  const sub = it.cat === 'behavior' && it.subName ? `<span class="sublabel">${esc(it.subName)}</span>` : it.cat === 'goals' && it.area ? `<span class="sublabel">${esc(it.area)}</span>` : '';
  const extra = (it.cat === 'goals' && it.measure ? `<p class="meta">Measured by: ${esc(it.measure)}</p>` : '')
    + (it.offWhy === 'diagnosis' ? `<p class="ml-badge">Mentions a diagnosis, so it starts switched off. Turn it on only if staff need it.</p>` : '')
    + (it.fromPresent ? `<p class="ml-badge">From the present levels narrative. Starts switched off; turn it on if it's a support staff should use.</p>` : '')
    + (it.suggested ? `<p class="ml-badge" title="Placed here by the built-in model, not by a heading it recognized. Check that it belongs.">Sorted by the model · ${Math.round((it.conf || 0) * 100)}% sure${it.why && it.why.length ? ` · because of ${esc(it.why.map(w => /^heading/.test(w) ? w : '"' + w + '"').join(', '))}` : ''}</p>` : '');
  const tip = it.tip ? `<label class="tipline"><input type="checkbox" data-act="tip" data-id="${it.id}"${it.useTip ? ' checked' : ''}><span class="t">In practice: ${esc(it.tip)}</span></label>` : '';
  const roles = ROLES.map(([k, , short]) => `<button class="role" data-act="role" data-id="${it.id}" data-r="${k}" aria-pressed="${!!it.roles[k]}">${short}</button>`).join('');
  return `<article class="item cat-${it.cat}${it.on ? '' : ' off'}" id="card-${it.id}">
    <input type="checkbox" data-act="on" data-id="${it.id}" aria-label="Include on sheets"${it.on ? ' checked' : ''}>
    <div class="body">${sub}
      <textarea rows="1" data-edit="${it.id}" aria-label="Wording on the sheet">${esc(it.plain)}</textarea>
      ${tip}${extra}
      <div class="row" style="justify-content:space-between"><div class="roles" role="group" aria-label="Who sees this">${roles}</div>
      ${it.manual && !it.page ? '<span class="src">Added by you</span>' : `<details class="src"><summary>${it.page ? (S.meta && S.meta.plan === '504' ? '504 plan' : 'IEP') + ' page ' + it.page : 'Source'}${it.alsoPages ? ' (also p. ' + it.alsoPages.join(', ') + ')' : ''} · original</summary><q>${esc(it.src || it.text)}</q></details>`}</div>
    </div></article>`;
}
function viewReview() {
  const by = {}; S.items.forEach(i => (by[i.cat] = by[i.cat] || []).push(i));
  const covMap = {}; S.cov.forEach(c => covMap[c.cat] = c);
  const warn = S.cov.filter(c => c.important && !(by[c.cat] || []).length);
  const chips = CAT_ORDER.map(c => { const n = (by[c] || []).length; const w = covMap[c] && covMap[c].important && !n; return `<a class="cov cat-${c}${n ? '' : ' zero'}${w ? ' warn' : ''}" href="#sec-${c}"><span class="dot" aria-hidden="true"></span>${CAT_LABEL[c]} <b>${n}</b></a>`; }).join('');
  const secs = CAT_ORDER.map(c => {
    const list = by[c] || []; const note = covMap[c] && covMap[c].note;
    const manual = !(S.rrows && S.rrows.length);
    if (!list.length && !note && !(covMap[c] && covMap[c].important) && !['behavior', 'health'].includes(c) && !manual) return '';
    return `<section class="cat-sec cat-${c}" id="sec-${c}"><div class="cat-head"><h2><span class="dot" aria-hidden="true"></span>${CAT_LABEL[c]} <span class="meta">${list.length || ''}</span></h2><button class="btn small" data-act="add-own" data-cat="${c}">Add your own</button></div>
      ${note ? `<p class="cat-note">${esc(note)}</p>` : !list.length && manual ? `<p class="hint">Nothing yet. Choose "Add your own" to type one in.</p>` : !list.length ? `<p class="hint">None found. If the IEP has ${CAT_LABEL[c].toLowerCase()}, add them from the IEP text${window.innerWidth > 1100 ? ' on the right' : ' below'}.</p>` : ''}
      ${list.map(itemCard).join('')}</section>`;
  }).join('');
  return `<main class="page"><div class="wrap stack">
    <div class="stack" style="gap:var(--space-3)"><p class="kicker">Step 3 of 4${S.sample ? ' · fictional sample' : ''}</p><h1>${S.rrows && S.rrows.length ? 'Check what was found' : S.srcName === 'By hand' ? 'Write the sheet' : 'Check your saved sheet'}</h1>
      <p class="sub">Everything below came from the IEP. Edit the wording, turn off anything that shouldn't be on a sheet, and choose who sees each item. Open "original" to compare with the IEP.</p></div>
    <div class="coverage">${chips}</div>
    ${handledNote()}
    ${safetyBanner()}
    ${warn.length ? `<p class="banner" role="note">Nothing was found for ${warn.map(w => '<b>' + esc(w.name.toLowerCase()) + '</b>').join(', ').replace(/, ([^,]*)$/, ' or $1')}. IEP layouts vary, so check the IEP text and add anything that was missed. If the IEP really has none, you can ignore this.</p>` : ''}
    <div class="review${S.rrows && S.rrows.length ? '' : ' solo'}"><div class="stack" style="gap:var(--space-8)">${secs}
      <div class="row"><button class="btn primary big" data-go="sheets">Make the sheets</button><span class="hint">${plural(S.items.filter(i => i.on).length, 'item')} selected</span></div>
      ${reportBox()}</div>
      ${S.rrows && S.rrows.length ? sourcePanel() : ''}</div>
  </div></main>`;
}
/* "Report a problem": the form's headings and counts only, never the IEP text */
function reportText() {
  const by = {}; S.items.forEach(i => { by[i.cat] = (by[i.cat] || 0) + 1; });
  const name = { present: 'present levels', skip: 'skipped', setting: 'setting', factors: 'special factors', mixed: 'mixed', unknown: 'unrecognized', id: 'student information' };
  const heads = (S.sections || []).filter(x => x.title !== 'Start').map(x => `- p${x.page} ${(CAT_LABEL[x.cat] || name[x.cat] || x.cat).toLowerCase()}${x.how === 'model' ? ' (model)' : ''}: ${x.title.replace(/\s+/g, ' ').slice(0, 70)}`);
  return [
    'IEP Glance problem report (version ' + VERSION + ')',
    '',
    'What went wrong (missing items, items in the wrong section, form text that showed up):',
    '',
    '',
    'IEP system or form (for example SEIS, IEP Direct, Frontline, eSped, a state form): ',
    'State: ',
    '',
    'Pages: ' + ((S.readStats && S.readStats.pages) || '?') + (S.handled && S.handled.ocr ? ' · scanned pages: ' + S.handled.ocr : ''),
    'Items found: ' + CAT_ORDER.map(c => CAT_LABEL[c] + ' ' + (by[c] || 0)).join(', '),
    'Section headings the tool found (form headings only, no IEP text):',
    ...heads.slice(0, 60)
  ].join('\n');
}
function reportBox() {
  return `<details class="report no-print" id="report"${S.reportOpen ? ' open' : ''}><summary>Something look wrong? Report a problem</summary>
    <p class="hint">This report lists only the form's section headings and how many items were found, never the IEP itself. Add what went wrong and the name of your IEP system, read it over, and remove anything that could identify a student before you send it.</p>
    <textarea id="report-text" rows="12" aria-label="Problem report">${esc(S.reportDraft || reportText())}</textarea>
    <div class="row"><button class="btn small" data-act="report-copy">Copy report</button>${REPORT_TO ? '<button class="btn small" data-act="report-mail">Email it</button>' : ''}</div>
  </details>`;
}
// health and safety lines the sorting missed: quoted so they can't slip through
function safetyBanner() {
  const list = (S.safety || []).filter(x => !x.added);
  if (!list.length) return '';
  return `<section class="banner bad safety" role="alert"><p><b>Possible health or safety information that isn't on the sheets.</b> These lines mention things like seizures, allergies, medication or 911. Check each one and add any that staff need to know.</p>
    <ul class="safety-list">${S.safety.map((x, k) => x.added ? '' : `<li><q>${esc(x.text)}</q> <span class="meta">IEP page ${x.page}</span> <button class="btn small" data-act="safety-add" data-k="${k}">Add to Health and safety</button></li>`).join('')}</ul></section>`;
}
function handledNote() {
  const h = S.handled; if (!h) return '';
  const bits = [];
  if (h.sorted) bits.push(`${plural(h.sorted, 'item')} sorted by the model (marked, check these)`);
  if (h.unchecked) bits.push(`${plural(h.unchecked, 'unchecked box', 'unchecked boxes')} left out`);
  if (h.dropped.length) bits.push(`${plural(h.dropped.length, 'line')} of form instructions or admin text skipped`);
  if (h.merged) bits.push(`${plural(h.merged, 'duplicate')} merged`);
  if (h.fields) bits.push(`${plural(h.fields, 'form field')} read`);
  if (h.dupes) bits.push(`${plural(h.dupes, 'overprinted word')} removed`);
  const scan = h.ocr ? `<p class="banner" role="note">This PDF is a scan (${plural(h.ocr, 'page')} of machine-read text). Scans come out jumbled and miss things, so expect a lot of cleanup. If you can, download the IEP from your IEP system as a PDF instead.</p>` : '';
  if (!bits.length) return scan;
  return scan + `<p class="handled"><strong>Reading notes:</strong> ${esc(bits.join(' · '))}. Skipped lines are marked in the IEP text.</p>`;
}
function sourcePanel() {
  const used = S.items.map(i => (i.src || i.text || '').slice(0, 40)).filter(Boolean);
  const f = S.filter.toLowerCase();
  let lastPage = 0; const html = [];
  S.rrows.forEach((r, k) => {
    if (f && !r.text.toLowerCase().includes(f)) return;
    if (r.page !== lastPage) { html.push(`<div class="src-row h"><span>Page ${r.page}</span><span></span></div>`); lastPage = r.page; }
    const isUsed = used.some(u => r.text.includes(u.slice(0, 30)));
    const off = r.opt === 'off', skipped = S.handled && S.handled.droppedSet.has(r.text);
    html.push(`<div class="src-row${r.heading ? ' h' : ''}${isUsed ? ' used' : ''}${off ? ' off' : ''}${skipped ? ' skipped' : ''}"><span class="t">${esc(r.text)}</span>${r.heading ? '<span></span>' : `<button class="btn small" data-act="src-add" data-k="${k}" aria-label="Add this line to a sheet">Add</button>`}
      ${S.addFor === k ? `<div class="add-menu">${CAT_ORDER.map(c => `<button class="chip" style="min-height:30px;padding:2px 10px;font-size:12px" data-act="src-add-to" data-k="${k}" data-cat="${c}">${CAT_LABEL[c]}</button>`).join('')}</div>` : ''}</div>`);
  });
  return `<aside class="source-panel" aria-label="IEP text"><div><h2 style="font-size:var(--text-lg)">IEP text</h2><p class="hint">After removing identifying details. Add any line that was missed.</p></div>
    <input id="f-filter" type="search" placeholder="Search the IEP" value="${esc(S.filter)}" aria-label="Search the IEP text">
    <div class="src-list" id="src-list">${html.join('') || '<div class="src-row"><span class="muted">No matches.</span><span></span></div>'}</div></aside>`;
}

/* ---------- saving your work (to your own computer, only when you ask) ---------- */
const KEEP = ['id', 'cat', 'text', 'src', 'plain', 'page', 'on', 'roles', 'subName', 'area', 'measure', 'who', 'tip', 'tipK', 'useTip', 'manual', 'objectives', 'lang', 'tr', 'svc', 'offWhy'];
function saveWork() {
  const data = { app: 'iep-glance', version: 1, saved: new Date().toISOString().slice(0, 10), code: S.code, meta: S.meta, cm: S.cm, signoff: S.signoff, lang: S.lang,
    items: S.items.map(it => { const o = {}; KEEP.forEach(k => { if (it[k] !== undefined) o[k] = it[k]; }); return o; }) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'IEP Glance - ' + (S.code || 'student').replace(/[^\w.-]+/g, '') + ' - ' + data.saved + '.iepglance';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast('Saved to your Downloads folder');
}
function openWork(txt) {
  let d; try { d = JSON.parse(txt); } catch (e) { d = null; }
  if (!d || d.app !== 'iep-glance' || !Array.isArray(d.items)) { S.error = "That file isn't a saved IEP Glance sheet."; render(); return; }
  Object.assign(S, { srcName: 'Saved work from ' + (d.saved || 'earlier'), sample: false, rows: null, rrows: [], ids: [], extra: [], code: d.code || 'Student', meta: d.meta || {}, cm: Object.assign({ name: '', contact: '', note: '' }, d.cm || {}), signoff: !!d.signoff, lang: d.lang || (d.meta && d.meta.lang) || 'en',
    items: d.items.map(it => { const o = Object.assign({ tip: '', plain: it.text || '' }, it); o.roles = Object.assign({ t: true, p: true, s: false, f: false }, it.roles || {}); return o; }), handled: null, safety: [], sections: [], error: null, loading: null });
  S.cov = E.coverage({ items: S.items, meta: S.meta });
  go('sheets'); toast('Opened your saved sheet');
}
function startManual() {
  Object.assign(S, { srcName: 'By hand', sample: false, rows: null, rrows: [], ids: [], extra: [], code: 'Student', meta: {}, items: [], handled: null, safety: [], sections: [], error: null, loading: null });
  S.cov = E.coverage({ items: [], meta: {} }).map(c => Object.assign(c, { important: false }));
  go('review');
}

/* ---------- trackers: a weekly accommodation log and a goal data sheet ---------- */
const dateStr = () => new Date().toLocaleDateString(S.lang === 'es' ? 'es' : [], { month: 'long', day: 'numeric', year: 'numeric' });
// an item's wording in the sheet language, marked when it still needs translating
function word(it) { const x = LG.itemText(it, S.lang); return x.ok ? esc(x.text) : `<span class="untr" title="${esc(TT().notTranslated)}">${esc(x.text)}</span>`; }
function wordText(it) { const x = LG.itemText(it, S.lang); return x.text + (x.ok ? '' : ' [' + TT().notTranslated + ']'); }
function tipOf(it) { if (it.tipK !== undefined && it.tipK >= 0) return (S.lang === 'es' ? E.TIPS_ES : E.TIPS_EN)[it.tipK]; return (it.lang || 'en') === S.lang ? it.tip : ''; }
function trackerHTML(kind, week) {
  const T = TT(), D = docName(), code = esc(S.code || 'Student');
  const head = (title, sub) => `<div class="sheet-head"><div><div class="for">${title}</div><h1>${code}</h1></div><div class="facts">${sub}</div></div>`;
  const foot = `<div class="sheet-foot"><span>${T.keep}</span><span>${T.madeWith} ${dateStr()}.${S.meta.iepDate ? T.fromDoc(D, esc(S.meta.iepDate)) : ''}</span></div>`;
  if (kind === 'goals') {
    const goals = S.items.filter(i => i.on && i.cat === 'goals' && (i.plain || '').trim());
    if (!goals.length) return `<p class="muted">${T.noGoals}</p>`;
    return `<div class="sheet tracker">${head(T.goalSheet, T.staff + ': ____________________')}
      ${goals.map((g, n) => `<div class="tk-goal"><p><b>${T.goal} ${n + 1}.</b> ${word(g)}${g.measure && !(g.plain || '').toLowerCase().includes(g.measure.toLowerCase()) && (g.lang || 'en') === S.lang ? ` <span class="muted">${T.measuredBy}: ${esc(g.measure)}</span>` : ''}</p>
        <table class="tk"><thead><tr><th style="width:15%">${T.date}</th><th style="width:30%">${T.result}</th><th style="width:20%">${T.prompting}</th><th>${T.notes}</th><th style="width:9%">${T.initials}</th></tr></thead>
        <tbody>${'<tr><td></td><td></td><td></td><td></td><td></td></tr>'.repeat(5)}</tbody></table></div>`).join('')}
      ${foot}</div>`;
  }
  const rows = S.items.filter(i => i.on && ['accom', 'mods', 'at'].includes(i.cat) && (i.plain || '').trim());
  const tests = S.items.filter(i => i.on && i.cat === 'testing' && (i.plain || '').trim());
  if (!rows.length && !tests.length) return `<p class="muted">${T.noAccom}</p>`;
  const table = (list, label) => `<table class="tk"><thead><tr><th>${label}</th>${T.days.map(d => `<th class="d">${d}</th>`).join('')}<th style="width:22%">${T.notes}</th></tr></thead>
    <tbody>${list.map(i => `<tr><td>${word(i)}</td>${T.days.map(() => '<td class="d"></td>').join('')}<td></td></tr>`).join('')}</tbody></table>`;
  return `<div class="sheet tracker">${head(T.log, T.weekOf + ': ______________' + (week > 1 ? ' (' + T.week + ' ' + week + ')' : '') + '<br>' + T.teacherClass + ': ______________________')}
    <p class="tk-key">${T.key}</p>
    ${rows.length ? table(rows, T.accCol) : ''}
    ${tests.length ? `<div style="margin-top:10px">${table(tests, T.testsCol)}</div>` : ''}
    <p class="tk-sign">${T.teacherSig}: ______________________________ &nbsp; ${T.date}: ____________</p>
    ${foot}</div>`;
}
function printTracker(kind) {
  const n = kind === 'accom' ? Math.max(1, Math.min(9, S.weeks || 1)) : 1;
  $('print-area').innerHTML = Array.from({ length: n }, (_, k) => `<div class="paper print-sheet">${trackerHTML(kind, n > 1 ? k + 1 : 0)}</div>`).join('');
  window.print();
}

/* ---------- sheets ---------- */
function sheetModel(role) {
  const T = TT(), D = docName(), fam = role === 'f';
  const pick = c => S.items.filter(i => i.on && i.cat === c && i.roles[role] && (i.plain || '').trim());
  const secs = [];
  const sec = (key, title, items, opts) => { if (items.length) secs.push(Object.assign({ key, title, items }, opts || {})); };
  if (fam) {
    sec('strengths', T.fam.strengths, pick('strengths'));
    sec('health', T.fam.health, pick('health'), { alert: true });
    sec('accom', T.fam.accom, [...pick('accom'), ...pick('mods'), ...pick('at')]);
    sec('testing', T.fam.testing, pick('testing'));
  } else {
    sec('health', T.sec.health, pick('health'), { alert: true });
    sec('strengths', T.sec.strengths, pick('strengths'));
    sec('accom', role === 's' ? T.sec.accomS : T.sec.accom, [...pick('accom'), ...pick('mods'), ...pick('at')]);
  }
  const beh = pick('behavior');
  if (beh.length) { const groups = BEH_ORDER.map(g => ({ g, label: T.beh[g] || g, items: beh.filter(b => (b.subName || 'Prevent it') === g) })).filter(x => x.items.length); secs.push({ key: 'behavior', title: fam ? T.fam.behavior : T.sec.behavior, groups }); }
  if (!fam) sec('testing', T.sec.testing, pick('testing'));
  sec('goals', fam ? T.fam.goals : role === 'p' ? T.sec.goalsP : T.sec.goals(D), pick('goals'));
  sec('services', fam ? T.fam.services : role === 't' ? T.sec.services : T.sec.servicesO, pick('services'));
  if (!fam) sec('personnel', T.sec.personnel, pick('personnel'));
  return secs;
}
const roleName = r => ROLES.find(x => x[0] === r)[1];
function sheetItems(role) { return sheetModel(role).reduce((a, s) => a.concat(s.items || s.groups.reduce((b, g) => b.concat(g.items), [])), []); }
function sheetHTML(role) {
  const T = TT(), D = docName(), secs = sheetModel(role), m = S.meta, fam = role === 'f';
  const pref = it => S.showPages && it.page ? ` <span class="pref">p.${it.page}</span>` : '';
  const li = it => { const tp = !fam && it.useTip && tipOf(it); return `<li>${word(it)}${pref(it)}${tp ? `<span class="tp">${esc(tp)}</span>` : ''}</li>`; };
  const facts = [m.grade ? T.grade + ' ' + m.grade : '', m.reviewDate ? T.through(D) + ' ' + m.reviewDate : ''].filter(Boolean).join(' · ');
  const cm = [S.cm.name, S.cm.contact].filter(Boolean).join(' · ');
  const title = fam ? T.familyTitle(D) : T.glance(D) + ' · ' + (S.lang === 'es' ? 'para ' : 'for ') + T.roleFor[role];
  return `<div class="sheet">
    <div class="sheet-head"><div><div class="for">${esc(title)}</div><h1>${esc(S.code || 'Student')}</h1></div>
      <div class="facts">${esc(facts)}${cm ? '<br>' + T.questions + ': ' + esc(cm) : ''}</div></div>
    ${S.cm.note && S.cm.note.trim() ? `<div class="sheet-note"><b>${T.from} ${esc(S.cm.name || T.cm)}:</b> ${esc(S.cm.note.trim())}</div>` : ''}
    ${secs.length ? `<div class="sheet-cols">${secs.map(s => `<section class="ss cat-${s.key}${s.alert ? ' alert' : ''}"><h2><span class="dot" aria-hidden="true"></span>${esc(s.title)}</h2>
      ${s.groups ? s.groups.map(g => `<div class="grp">${esc(g.label)}</div><ul>${g.items.map(li).join('')}</ul>`).join('') : `<ul>${s.items.map(li).join('')}</ul>`}</section>`).join('')}</div>`
      : `<p class="muted">${T.empty}</p>`}
    ${S.signoff && !fam ? `<div class="sheet-sign">${T.signoff.replace('DOC', D)} &nbsp; ${T.name}: ______________________ &nbsp; ${T.signature}: ______________________ &nbsp; ${T.date}: __________</div>` : ''}
    <div class="sheet-foot">${fam ? `<span>${esc(T.famFoot(D))}</span>` : `<span>${T.conf}</span>`}
      <span>${fam ? '' : esc(T.notReplace(D))}${m.iepDate ? esc(T.basedOn(D, m.iepDate)) : ''} ${T.made} ${dateStr()}.</span></div>
  </div>`;
}
function sheetText(role) {
  const T = TT(), D = docName(), secs = sheetModel(role), m = S.meta, out = [], fam = role === 'f';
  out.push((fam ? T.familyTitle(D) : T.glance(D) + ' · ' + (S.lang === 'es' ? 'para ' : 'for ') + T.roleFor[role]) + ': ' + S.code);
  const facts = [m.grade ? T.grade + ' ' + m.grade : '', m.reviewDate ? T.through(D) + ' ' + m.reviewDate : '', S.cm.name || S.cm.contact ? T.questions + ': ' + [S.cm.name, S.cm.contact].filter(Boolean).join(', ') : ''].filter(Boolean).join(' | ');
  if (facts) out.push(facts);
  if (S.cm.note && S.cm.note.trim()) out.push('', T.from + ' ' + (S.cm.name || T.cm) + ': ' + S.cm.note.trim());
  const line = it => { const tp = !fam && it.useTip && tipOf(it); return '- ' + wordText(it) + (S.showPages && it.page ? ` (p.${it.page})` : '') + (tp ? `\n  ${T.inPractice}: ${tp}` : ''); };
  secs.forEach(s => { out.push('', s.title.toUpperCase()); if (s.groups) s.groups.forEach(g => { out.push(g.label + ':'); g.items.forEach(i => out.push(line(i))); }); else s.items.forEach(i => out.push(line(i))); });
  out.push('', fam ? T.famFoot(D) : T.conf.replace(/<[^>]+>/g, '') + ' ' + T.notReplace(D));
  return out.join('\n');
}
// items on the current sheet that aren't in the sheet language yet
function translateBox() {
  const list = (S.role === 'log' ? S.items.filter(i => i.on && ['accom', 'mods', 'at', 'testing', 'goals'].includes(i.cat)) : sheetItems(S.role)).filter(it => (it.lang || 'en') !== S.lang && (!LG.itemText(it, S.lang).ok || (it.tr && it.tr[S.lang] !== undefined)));
  if (!list.length) return '';
  const need = list.filter(it => !LG.itemText(it, S.lang).ok).length;
  const to = S.lang === 'es' ? 'Spanish' : 'English';
  return `<details class="tr-box no-print"${need ? ' open' : ''}><summary>${need ? `${plural(need, 'item')} on this sheet still ${need === 1 ? 'needs' : 'need'} ${to}` : `Your ${to} wording`} <span class="meta">· common accommodations and services are translated automatically</span></summary>
    <p class="hint">There's no translation service here (nothing leaves this computer), so write these in ${to}, or ask your district's interpreter. Until you do, they print in the original language, marked "${esc(TT().notTranslated)}". Your wording is kept if you save your work.</p>
    ${list.map(it => `<div class="tr-row"><div class="tr-src">${esc(it.plain)}</div><textarea rows="2" data-tr="${it.id}" placeholder="${to} wording">${esc((it.tr && it.tr[S.lang]) || '')}</textarea></div>`).join('')}
  </details>`;
}
function viewSheets() {
  const counts = ROLES.map(([k]) => sheetModel(k).reduce((a, s) => a + (s.items ? s.items.length : s.groups.reduce((b, g) => b + g.items.length, 0)), 0));
  const isLog = S.role === 'log';
  return `<main class="page"><div class="wrap stack">
    <div class="stack no-print" style="gap:var(--space-3)"><p class="kicker">Step 4 of 4${S.sample ? ' · fictional sample' : ''}</p><h1>Your sheets</h1>
      <p class="sub">One sheet per role, a summary for the family, and trackers staff can fill in each week, in English or Spanish. Nothing is kept after you close the tab unless you save a file.</p></div>
    <section class="card no-print"><div class="sheet-tools">
      <div><label for="f-cm">Your name (case manager)</label><input id="f-cm" value="${esc(S.cm.name)}" placeholder="Ms. Brooks" autocomplete="name"></div>
      <div><label for="f-cmc">How to reach you</label><input id="f-cmc" value="${esc(S.cm.contact)}" placeholder="Room 14 · brooks@school.org" autocomplete="off"></div>
      <div><label for="f-code2">Student code</label><input id="f-code2" value="${esc(S.code)}" maxlength="16" autocomplete="off"></div>
      <div class="span2"><label for="f-note">A note for staff (optional)</label><textarea id="f-note" rows="2" placeholder="In your own words: what works best with this student, what to try first, what to avoid.">${esc(S.cm.note)}</textarea></div>
      <div class="stack" style="gap:var(--space-2)"><div class="seg" role="group" aria-label="Sheet language"><span class="seg-l">Sheet language</span><button data-act="lang" data-l="en" aria-pressed="${S.lang === 'en'}">English</button><button data-act="lang" data-l="es" aria-pressed="${S.lang === 'es'}">Español</button></div>
        <label class="tipline" style="color:var(--text);font-weight:600"><input type="checkbox" id="f-pages"${S.showPages ? ' checked' : ''}> Show page numbers</label>
        <label class="tipline" style="color:var(--text);font-weight:600"><input type="checkbox" id="f-signoff"${S.signoff ? ' checked' : ''}> Add a "received" signature line</label></div>
    </div></section>
    <div class="tabs no-print" role="tablist">${ROLES.map(([k, n], i) => `<button class="tab" role="tab" data-act="role-tab" data-r="${k}" aria-selected="${S.role === k}">${n} · ${counts[i]}</button>`).join('')}<button class="tab" role="tab" data-act="role-tab" data-r="log" aria-selected="${isLog}">Trackers</button></div>
    ${isLog ? `<p class="hint no-print" style="margin:0">A weekly log for showing accommodations were provided, and a goal data sheet for whoever collects data. They use the items switched on in step 3.</p>
    <div class="row no-print">${HOSTED ? `<button class="btn primary" data-act="print-log">${I.print}Print accommodation log</button><label class="tipline" style="color:var(--text);align-items:center">for <input id="f-weeks" type="number" min="1" max="9" value="${S.weeks}" style="width:4.5em;min-height:36px;padding:4px 8px"> weeks</label><button class="btn" data-act="print-goals">Print goal data sheet</button>` : '<span class="hint">Printing works in the downloaded or hosted version.</span>'}</div>
    <div class="paper screen-sheet">${trackerHTML('accom', 0)}</div><div class="paper screen-sheet" style="margin-top:var(--space-6)">${trackerHTML('goals', 0)}</div>` : `
    <div class="row no-print">${HOSTED ? `<button class="btn primary" data-act="print-one">${I.print}Print this sheet</button><button class="btn" data-act="print-all">Print all three staff sheets</button>` : ''}<button class="btn${HOSTED ? '' : ' primary'}" data-act="copy-sheet">Copy as text</button></div>`}
    <div class="row no-print">${HOSTED ? '<button class="btn" data-act="save-work">Save my work as a file</button>' : ''}<button class="btn" data-go="review">Back to checking</button><button class="btn" data-act="clear">Start over and clear everything</button></div>
    ${HOSTED ? '<p class="hint no-print" style="margin-top:calc(var(--space-2) * -1)">The saved file holds the checked, de-identified items (no PDF). Open it here next time to reprint logs or update the sheets. Keep it where you keep other student records.</p>' : ''}
    ${HOSTED ? '' : '<p class="hint no-print">Printing works in the downloaded or hosted version. Here, copy the text instead.</p>'}
    ${translateBox()}
    <textarea id="sheet-text" class="no-print" rows="6" readonly hidden></textarea>
    ${isLog ? '' : `<div class="paper screen-sheet">${sheetHTML(S.role)}</div>`}
    <div id="print-area" class="print-only"></div>
  </div></main>`;
}

/* ---------- render ---------- */
function render() {
  const v = { home: viewHome, redact: viewRedact, review: viewReview, sheets: viewSheets }[S.view] || viewHome;
  $('app').innerHTML = header() + v() + footer();
  document.querySelectorAll('textarea[data-edit]').forEach(autoGrow);
  onScroll();
  if (S.view === 'home' && HOSTED) { const n = $('net-count'); if (n) { try { const r = performance.getEntriesByType('resource').filter(e => /^https?:/.test(e.name)).length; n.textContent = 'Network requests made by this page so far: ' + r; } catch (e) {} } }
}
function go(v) { S.view = v; S.addFor = null; render(); window.scrollTo(0, 0); }
function autoGrow(t) { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; }
function onScroll() { const t = $('top'); if (t) t.classList.toggle('scrolled', window.scrollY > 4); }
window.addEventListener('scroll', onScroll, { passive: true });
document.addEventListener('toggle', e => { if (e.target.id === 'report') S.reportOpen = e.target.open; }, true);
function findItem(id) { return S.items.find(i => i.id === id); }
function clearAll() {
  Object.assign(S, { view: 'home', loading: null, error: null, srcName: '', sample: false, rows: null, ids: [], code: '', extra: [], rrows: null, meta: {}, items: [], cov: [], filter: '', addFor: null, pasteOpen: false, safety: [], sections: [], role: 'p', cm: { name: S.cm.name, contact: S.cm.contact, note: '' }, signoff: S.signoff });
  render(); window.scrollTo(0, 0); toast('Cleared. Nothing from that IEP remains in this tab.');
}
function b64ToBytes(b64) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
function printRoles(roles) {
  $('print-area').innerHTML = roles.map(r => `<div class="paper print-sheet">${sheetHTML(r)}</div>`).join('');
  window.print();
}

document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (g && !g.disabled) { e.preventDefault(); go(g.dataset.go); return; }
  const a = e.target.closest('[data-act]'); if (!a) return;
  const act = a.dataset.act;
  switch (act) {
    case 'home': go('home'); break;
    case 'sample': { const s = window.SAMPLES[+a.dataset.i]; openPdf(b64ToBytes(s.b64), s.name + ' (fictional sample)', true); break; }
    case 'safety-add': { const x = S.safety[+a.dataset.k]; x.added = true;
      const it = withRoles({ id: 'm' + (++nid), cat: 'health', text: x.text, src: x.text, plain: E.plainText(x.text), page: x.page, on: true, manual: true, tip: '', useTip: false, lang: (S.meta && S.meta.lang) || 'en' }); S.items.push(it);
      S.cov = S.cov.map(c => c.cat === 'health' ? Object.assign({}, c, { n: c.n + 1 }) : c); render(); toast('Added to Health and safety'); break; }
    case 'manual': startManual(); break;
    case 'save-work': saveWork(); break;
    case 'print-log': printTracker('accom'); break;
    case 'print-goals': printTracker('goals'); break;
    case 'report-copy': copyText($('report-text').value, 'report-text'); break;
    case 'report-mail': window.location.href = 'mailto:' + REPORT_TO + '?subject=' + encodeURIComponent('IEP Glance problem report') + '&body=' + encodeURIComponent($('report-text').value); break;
    case 'paste-open': S.pasteOpen = true; render(); { const t = $('f-paste'); t && t.focus(); } break;
    case 'paste-go': openText(($('f-paste') || {}).value || ''); break;
    case 'id-toggle': S.ids[+a.dataset.k].on = a.checked; render(); break;
    case 'extra-remove': S.extra.splice(+a.dataset.k, 1); render(); break;
    case 'to-review': applyRedaction(); go('review'); break;
    case 'on': { const it = findItem(a.dataset.id); it.on = a.checked; $('card-' + it.id).classList.toggle('off', !it.on); break; }
    case 'tip': { const it = findItem(a.dataset.id); it.useTip = a.checked; break; }
    case 'role': { const it = findItem(a.dataset.id); const r = a.dataset.r; it.roles[r] = !it.roles[r]; a.setAttribute('aria-pressed', it.roles[r]); break; }
    case 'add-own': { const it = withRoles({ id: 'm' + (++nid), cat: a.dataset.cat, text: '', plain: '', page: 0, on: true, manual: true, lang: S.lang || 'en', tip: '', useTip: false, subName: a.dataset.cat === 'behavior' ? 'Prevent it' : '' }); S.items.push(it); render(); const t = document.querySelector(`[data-edit="${it.id}"]`); if (t) { t.focus(); t.scrollIntoView({ block: 'center' }); } break; }
    case 'src-add': { const k = +a.dataset.k; S.addFor = S.addFor === k ? null : k; const y = window.scrollY, sl = $('src-list') ? $('src-list').scrollTop : 0; render(); window.scrollTo(0, y); if ($('src-list')) $('src-list').scrollTop = sl; break; }
    case 'src-add-to': { const r = S.rrows[+a.dataset.k]; const cat = a.dataset.cat; const txt = r.cells.length > 1 ? r.cells.join(' — ') : r.text;
      const it = withRoles({ id: 'm' + (++nid), cat, text: txt, src: r.text, plain: E.plainText(txt), page: r.page, on: true, manual: true, lang: (S.meta && S.meta.lang) || 'en', tip: E.tipFor(txt), subName: cat === 'behavior' ? 'Prevent it' : '' }); it.useTip = !!it.tip;
      S.items.push(it); S.addFor = null; const sl = $('src-list') ? $('src-list').scrollTop : 0; render(); if ($('src-list')) $('src-list').scrollTop = sl; toast('Added to ' + CAT_LABEL[cat]); break; }
    case 'role-tab': S.role = a.dataset.r; render(); break;
    case 'copy-sheet': { const t = $('sheet-text'); t.value = sheetText(S.role); copyText(t.value, 'sheet-text'); break; }
    case 'print-one': printRoles([S.role]); break;
    case 'print-all': printRoles(STAFF); break;
    case 'lang': S.lang = a.dataset.l; render(); break;
    case 'clear': clearAll(); break;
  }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset && t.dataset.edit) { const it = findItem(t.dataset.edit); if (it) it.plain = t.value; autoGrow(t); return; }
  if (t.id === 'f-code') { S.code = t.value.trim(); document.querySelectorAll('.id-rep').forEach(() => {}); return; }
  if (t.id === 'f-filter') { S.filter = t.value; const p = document.querySelector('.source-panel'); if (p) { p.outerHTML = sourcePanel(); const f = $('f-filter'); f.focus(); f.setSelectionRange(f.value.length, f.value.length); } return; }
  if (t.id === 'report-text') { S.reportDraft = t.value; return; }
  if (t.dataset && t.dataset.tr) { const it = findItem(t.dataset.tr); if (it) { it.tr = it.tr || {}; it.tr[S.lang] = t.value; } if (S.role === 'log') { document.querySelectorAll('.screen-sheet')[0].innerHTML = trackerHTML('accom', 0); document.querySelectorAll('.screen-sheet')[1].innerHTML = trackerHTML('goals', 0); } else refreshSheet(); return; }
  if (t.id === 'f-note') { S.cm.note = t.value; refreshSheet(); return; }
  if (t.id === 'f-code2') { S.code = t.value.trim() || 'Student'; refreshSheet(); return; }
  if (t.id === 'f-weeks') { S.weeks = +t.value || 1; return; }
  if (t.id === 'f-cm') { S.cm.name = t.value; refreshSheet(); return; }
  if (t.id === 'f-cmc') { S.cm.contact = t.value; refreshSheet(); return; }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'f-pdf' && t.files && t.files[0]) { readFile(t.files[0]); t.value = ''; }
  if (t.id === 'f-pages') { S.showPages = t.checked; refreshSheet(); }
  if (t.id === 'f-signoff') { S.signoff = t.checked; refreshSheet(); }
  if (t.id === 'f-code') { S.code = t.value.trim() || 'Student'; render(); }
});
document.addEventListener('submit', e => {
  if (e.target.id === 'extra-form') { e.preventDefault(); const v = $('f-extra').value.trim(); if (!v) return;
    if (S.noName && !S.extra.length && /\s/.test(v) && !S.ids.some(i => i.kind === 'student')) { S.ids.unshift({ kind: 'student', value: v, label: 'Student name', on: true }); const ps = v.split(/\s+/); S.ids.push({ kind: 'first', value: ps[0], label: 'Student first name', on: true }, { kind: 'last', value: ps[ps.length - 1], label: 'Family name', on: true }); S.code = E.initialsOf(v); S.noName = false; }
    else S.extra.push(v);
    render(); const f = $('f-extra'); f && f.focus(); }
});
function refreshSheet() { if (S.role === 'log') return; const p = document.querySelector('.screen-sheet'); if (p) p.innerHTML = sheetHTML(S.role); }
async function readFile(f) {
  if (/\.(iepglance|json)$/i.test(f.name)) { openWork(await f.text()); return; }
  if (/\.txt$/i.test(f.name) || f.type === 'text/plain') { openText(await f.text()); return; }
  if (/\.docx?$/i.test(f.name)) { S.error = 'Word files aren\'t supported yet. Save the IEP as a PDF, or copy and paste its text.'; render(); return; }
  openPdf(new Uint8Array(await f.arrayBuffer()), f.name, false);
}
['dragenter', 'dragover'].forEach(ev => document.addEventListener(ev, e => { const d = e.target.closest && e.target.closest('#drop'); if (d) { e.preventDefault(); d.classList.add('over'); } }));
['dragleave', 'drop'].forEach(ev => document.addEventListener(ev, e => { const d = e.target.closest && e.target.closest('#drop'); if (d) { e.preventDefault(); d.classList.remove('over'); if (ev === 'drop' && e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]); } }));
window.addEventListener('beforeunload', e => { if (S.items.length && HOSTED) { e.preventDefault(); e.returnValue = ''; } });

render();
})();
