(function () {
'use strict';
/* Class Glance: every IEP and 504 plan in a class, on one page.
   Plans are read in this browser tab with the IEP Glance reader (src/pdfread.js + src/engine.js),
   names are replaced with the label the teacher picks, and accommodations are sorted by src/class/sort.js.
   Nothing is sent anywhere: the page's Content-Security-Policy blocks all network requests. */
const E = window.IEPEngine, C = window.ClassSort;
const SITE = 'https://rtwergrfh-cmyk.github.io/iep/class.html';
const CONTACT = 'rtwergrfh@gmail.com';
const STORE = 'classglance.v1';
const VERSION = '1.0 (beta)';

/* ---------- helpers ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = id => document.getElementById(id);
const uid = () => Math.random().toString(36).slice(2, 9);
const plural = (n, w, p) => n + ' ' + (n === 1 ? w : (p || w + 's'));
const today = () => new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
let toastT;
function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function b64ToBytes(b64) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
const COLOR = k => `var(--c-${k})`;
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const I = {
  plus: svg('<path d="M12 5v14M5 12h14"/>'), print: svg('<path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v7H7z"/>'),
  edit: svg('<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-4-4L4 16z"/>'), trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  lock: svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'), wifi: svg('<path d="M2 2l20 20"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 12.9a10 10 0 0 1 5.2-2.8"/><path d="M12 20h.01"/>'),
  free: svg('<path d="M20 12v8H4v-8M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>'),
  more: svg('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'), mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'),
  file: svg('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>')
};
const BRAND = `<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#1f1f1f"/><rect x="7" y="8" width="18" height="16" rx="2.5" fill="none" stroke="#fff" stroke-width="2"/><path d="M7 13h18M13 13v11" stroke="#fff" stroke-width="2"/><circle cx="24.5" cy="8" r="3.4" fill="#0f7c78"/></svg>`;

/* ---------- state ---------- */
const S = { view: 'home', classes: [], cur: null, filter: null, add: null, menu: false, keep: true, loaded: false, ask: null, preview: null };
const cls = () => S.classes.find(c => c.id === S.cur) || null;
function load() {
  try { const raw = localStorage.getItem(STORE); if (!raw) return; const d = JSON.parse(raw); if (d && Array.isArray(d.classes)) { S.classes = d.classes; S.cur = d.cur || (d.classes[0] && d.classes[0].id); S.keep = d.keep !== false; S.loaded = S.classes.length > 0; } } catch (e) { /* private window or blocked storage: work in memory */ }
}
function persist() {
  try {
    if (!S.keep) { localStorage.removeItem(STORE); return; }
    localStorage.setItem(STORE, JSON.stringify({ classes: S.classes.filter(c => !c.sample), cur: S.cur, keep: S.keep }));
  } catch (e) { /* ignore */ }
}
function newClass(name) { const c = { id: uid(), name: name || 'Period ' + (S.classes.filter(x => !x.sample).length + 1), students: [] }; S.classes.push(c); S.cur = c.id; return c; }

/* ---------- reading a plan ---------- */
async function readPlan(input) {
  const A = S.add;
  A.step = 'loading'; A.msg = 'Opening the plan'; A.pct = 4; A.error = ''; render();
  try {
    let rows;
    if (input.text != null) {
      rows = E.rowsFromText(input.text);
      if (rows.length < 3) throw Object.assign(new Error('short'), { code: 'short' });
    } else {
      const out = await window.IEPPdf.readPdf(window.pdfjsLib, input.bytes, (p, n) => { A.msg = 'Reading page ' + p + ' of ' + n; A.pct = Math.round(p / n * 85); const m = $('ld-msg'); if (m) { m.textContent = A.msg; $('ld-bar').style.width = A.pct + '%'; } });
      const chars = out.pages.reduce((a, p) => a + p.items.reduce((b, i) => b + i.str.trim().length, 0), 0);
      if (chars < 120) throw Object.assign(new Error('scan'), { code: 'scan' });
      rows = E.rowsFromPages(out.pages);
    }
    await new Promise(r => setTimeout(r, 30));
    const st = C.processRows(E, rows, A.label);
    A.student = { id: uid(), label: st.label, plan: st.plan, src: input.name || 'Pasted text', items: st.items, sample: !!input.sample };
    A.label = st.label; A.step = 'review';
  } catch (e) {
    A.step = 'input';
    A.error = e.code === 'scan' ? "This PDF has no readable text; it's probably a scan or a photo. Download the plan as a PDF from your student system, copy and paste its text, or type the accommodations in yourself."
      : e.code === 'short' ? "There isn't enough text here. Paste the full accommodations section, or type them in yourself."
      : /password/i.test(String(e.name) + e.message) ? 'This PDF is password-protected. Save an unprotected copy and try again.'
      : "This file couldn't be read. Try downloading the plan as a PDF again, paste its text, or type the accommodations in yourself.";
  }
  render();
}
async function readFiles(files) {
  const list = [...files].filter(f => /\.(pdf|txt)$/i.test(f.name) || /pdf|text\/plain/.test(f.type));
  if (!list.length) { S.add.error = 'Choose a PDF (or a .txt file). Word files: save as PDF first, or paste the text.'; render(); return; }
  S.add.queue = list.slice(1);
  readOne(list[0]);
}
async function readOne(f) {
  if (/\.txt$/i.test(f.name) || f.type === 'text/plain') return readPlan({ text: await f.text(), name: f.name });
  return readPlan({ bytes: new Uint8Array(await f.arrayBuffer()), name: f.name });
}

/* ---------- views ---------- */
function header() {
  const c = cls();
  return `<header class="top"><div class="wrap top-in">
    <button class="brand" data-act="home" aria-label="Class Glance home">${BRAND}<span>Class Glance</span></button>
    <span class="spacer"></span>
    ${S.view === 'home' && S.classes.some(x => !x.sample) ? `<button class="btn small" data-act="open-classes">My classes</button>` : ''}
    ${S.view === 'class' && c ? `<button class="btn small ghost" data-act="share">${I.mail}<span>Send to a colleague</span></button>` : ''}
    <span class="local" title="Everything runs in this browser. Nothing is uploaded."><i></i><span>Nothing leaves this device</span></span>
  </div></header>`;
}

function miniChart() {
  // a tiny, fictional preview for the home page
  const rows = [['N.D.', '504', ['Front seat near teacher'], ['Time and a half'], ['Breaks, up to 3 a day'], ''],
    ['S.R.', 'IEP', ['Calm corner breaks'], ['1.5x on classwork and tests'], ['Watch for: leaving the room'], 'Peanut allergy: EpiPen in backpack'],
    ['P.R.', 'IEP', ['Seat near the teacher'], ['1.5x; word bank'], ['Agreed hand signal'], 'Diabetes: snacks and water OK'],
    ['A.B.', 'IEP', ['Away from two peers'], ['2x on state tests; small group'], ['2-minute warning before transitions'], 'Seizures: time it, call 911 after 5 min']];
  return `<div class="preview" aria-label="Example class chart with fictional students"><table class="chart" style="min-width:0"><thead><tr><th class="stu">Student</th><th><span style="background:${COLOR('health')}"></span>Health</th><th><span style="background:${COLOR('seat')}"></span>Seating</th><th><span style="background:${COLOR('tests')}"></span>Tests</th><th><span style="background:${COLOR('beh')}"></span>Behavior</th></tr></thead><tbody>
    ${rows.map(r => `<tr><th class="stu"><span class="stu-name">${r[0]}</span><span class="badge">${r[1]}</span></th><td>${r[5] ? `<ul><li>${r[5]}</li></ul>` : '<span class="tiny">—</span>'}</td><td><ul><li>${r[2]}</li></ul></td><td><ul><li class="${/1\.5|half|2x/.test(r[3]) ? 'hit' : ''}">${r[3]}</li></ul></td><td><ul><li>${r[4]}</li></ul></td></tr>`).join('')}
  </tbody></table><p class="tiny" style="margin-top:8px">Fictional students. Highlighted: everyone who gets extended time.</p></div>`;
}

function viewHome() {
  const mine = S.classes.filter(x => !x.sample);
  const n = mine.reduce((a, c) => a + c.students.length, 0);
  return `<main>
  <section class="wrap hero">
    <div>
      <p class="kicker">For general education teachers</p>
      <h1>Every IEP and 504 plan in your class, on one page</h1>
      <p class="lead">Drop in your students' IEPs, 504 plans or at-a-glance pages. Class Glance pulls out the accommodations and builds one chart for your whole class, plus a test-day list and a sub sheet. It runs entirely in your browser, so nothing is uploaded.</p>
      <div class="row">
        ${mine.length ? `<button class="btn primary" data-act="open-classes">Open my classes (${plural(n, 'student')})</button><button class="btn" data-act="new-class">${I.plus}Start a new class</button>`
          : `<button class="btn primary" data-act="new-class">Start my class</button>`}
        <button class="btn" data-act="sample-class">Try a sample class</button>
      </div>
      <div class="trust"><span>${I.wifi}Works offline, no uploads</span><span>${I.lock}No account, no sign-in</span><span>${I.free}Free</span></div>
    </div>
    ${miniChart()}
  </section>
  <section class="band"><div class="wrap">
    <h2>What you get</h2>
    <div class="cards">
      <div class="card"><h3>One chart for the whole class</h3><p>Every student's supports in one table: seating, instruction, assignments, tests, breaks and behavior, tools, and health alerts. Tap a filter like "Extended time" to see exactly who gets it.</p></div>
      <div class="card"><h3>A test-day list</h3><p>Who gets extended time (and how much), a small group or separate room, read-aloud, breaks or a calculator. Print it before every quiz or test.</p></div>
      <div class="card"><h3>A sub sheet</h3><p>Health and safety alerts first, then behavior plans, seating and key supports, on one printed page your sub can actually use.</p></div>
    </div>
  </div></section>
  <section class="wrap section">
    <h2>How it works</h2>
    <ol class="steps">
      <li><h3>Add a student</h3><p>Give them a first name or initials, then drop in their IEP, 504 plan or at-a-glance PDF, or paste the text. Other names, birth dates and ID numbers are removed automatically.</p></li>
      <li><h3>Check what was found</h3><p>Every accommodation is shown with the line it came from. Uncheck anything wrong, fix wording, or move it to another column.</p></li>
      <li><h3>Use and print</h3><p>Your class chart updates as you go. Print the chart, test-day list or sub sheet, or export to Google Sheets or Excel.</p></li>
    </ol>
  </section>
  <section class="band"><div class="wrap">
    <h2>Private by design</h2>
    <div class="cards">
      <div class="card"><h3>Nothing is uploaded</h3><p>Plans are read inside this browser tab. The page is locked so it can't send data anywhere, and it works with Wi-Fi turned off.</p></div>
      <div class="card"><h3>Names stay out</h3><p>You choose what to call each student. Full names, family names, birth dates, ID numbers and phone numbers found in the plan are replaced.</p></div>
      <div class="card"><h3>The plan is still the plan</h3><p>The chart is a summary to help you follow each IEP and 504 plan. The plan itself is the legal document; check it whenever you're unsure.</p></div>
    </div>
  </div></section>
  ${footer()}
  </main>`;
}

function footer() {
  return `<footer class="foot"><div class="wrap"><div class="row">
    <span><b>Class Glance</b> ${VERSION}. Free and open source, built by a student.</span>
    <span class="spacer"></span>
    <a href="${usedLink()}">I used this</a>
    <a href="${shareLink()}">Send to a colleague</a>
    <a href="mailto:${CONTACT}?subject=${encodeURIComponent('Class Glance: problem or idea')}&body=${encodeURIComponent('What happened or what would help (please do not include any student information):\n\n')}">Report a problem</a>
    <a href="https://rtwergrfh-cmyk.github.io/iep/" rel="noopener">IEP Glance (one student)</a>
    <a href="https://github.com/rtwergrfh-cmyk/iep" rel="noopener">Code</a>
  </div></div></footer>`;
}
function shareLink() {
  const body = "Hi,\n\nI've been using Class Glance, a free tool that turns our students' IEPs and 504 plans into one accommodations chart for the whole class, plus a test-day list and a sub sheet. It runs in the browser and doesn't upload anything.\n\n" + SITE + "\n\nIf the link is blocked at school, try it from home.\n";
  return `mailto:?subject=${encodeURIComponent('A free accommodations chart for your class')}&body=${encodeURIComponent(body)}`;
}
function usedLink() {
  const body = "Hi Ritik,\n\nI used Class Glance.\n\nSchool:\nDistrict:\nState:\nRole (for example, 9th grade biology teacher):\nDid you use it with a real class? (yes/no)\nWhat worked or didn't:\n\n(Sending from my school email so you can count my district. No student information included.)\n";
  return `mailto:${CONTACT}?subject=${encodeURIComponent('I used Class Glance')}&body=${encodeURIComponent(body)}`;
}

function colsInClass(c) { const set = new Set(); c.students.forEach(s => s.items.forEach(i => { if (i.on) i.cols.forEach(k => set.add(k)); })); return C.COLS.map(x => x[0]).filter(k => set.has(k)); }
function tagCounts(c) { const m = {}; c.students.forEach(s => { const t = new Set(); s.items.forEach(i => { if (i.on) i.tags.forEach(x => t.add(x)); }); t.forEach(x => { m[x] = (m[x] || 0) + 1; }); }); return m; }
const has = (s, tag) => s.items.some(i => i.on && i.tags.includes(tag));
const short = t => t.length > 140 ? t.slice(0, 137).replace(/\s+\S*$/, '') + '…' : t;

function chartTable(c, opts) {
  opts = opts || {};
  const cols = colsInClass(c);
  const f = opts.print ? null : S.filter;
  const head = `<thead><tr><th class="stu">Student</th>${cols.map(k => `<th><span style="background:${COLOR(k)}"></span>${esc(C.COL_NAME[k])}</th>`).join('')}</tr></thead>`;
  const body = c.students.map(s => {
    const dim = f && !has(s, f);
    const alert = s.items.some(i => i.on && i.cols.includes('health'));
    return `<tr class="${dim ? 'dim' : ''}"><th class="stu"><span class="stu-name">${esc(s.label)}</span><span class="badge">${esc(s.plan)}</span>${alert ? '<span class="badge alert">Health</span>' : ''}
      ${opts.print ? '' : `<div class="stu-actions"><button class="icon-btn" data-act="edit-student" data-id="${s.id}" aria-label="Edit ${esc(s.label)}" title="Edit">${I.edit}</button><button class="icon-btn" data-act="del-student" data-id="${s.id}" aria-label="Remove ${esc(s.label)}" title="Remove">${I.trash}</button></div>`}</th>
      ${cols.map(k => { const its = s.items.filter(i => i.on && i.cols.includes(k)); return its.length ? `<td><ul>${its.map(i => `<li class="${f && i.tags.includes(f) ? 'hit' : ''}"${opts.print ? '' : ` title="${esc(i.text)}"`}>${esc(opts.print ? i.text : short(i.text))}</li>`).join('')}</ul></td>` : '<td class="empty">·</td>'; }).join('')}</tr>`;
  }).join('');
  return `<table class="chart">${head}<tbody>${body}</tbody></table>`;
}

function answerLine(c) {
  const f = S.filter; if (!f) return '';
  const who = c.students.filter(s => has(s, f));
  const detail = s => { if (f !== 'ext') return ''; const d = s.items.filter(i => i.on && i.tags.includes('ext')).map(i => C.extDetail(i.text)).filter(Boolean); return d.length ? ' (' + [...new Set(d)].join(', ') + ')' : ''; };
  const verb = f === 'health' ? 'have a health alert' : f === 'bip' ? 'have a behavior plan' : 'get ' + C.TAG_NAME[f].toLowerCase();
  return `<div class="answer"><b>${who.length} of ${plural(c.students.length, 'student')}</b> ${who.length === 1 ? verb.replace(/^have/, 'has').replace(/^get/, 'gets') : verb}${who.length ? ': ' + who.map(s => '<b>' + esc(s.label) + '</b>' + esc(detail(s))).join(', ') : ''}${who.length && /\.$/.test(who[who.length - 1].label + detail(who[who.length - 1])) ? '' : '.'}</div>`;
}

function viewClass() {
  const c = cls(); if (!c) { S.view = 'home'; return viewHome(); }
  const tabs = S.classes.map(x => `<button class="tab" data-act="tab" data-id="${x.id}" aria-current="${x.id === S.cur}">${esc(x.name)}${x.students.length ? ' · ' + x.students.length : ''}</button>`).join('') + `<button class="tab add" data-act="new-class">+ New class</button>`;
  const counts = tagCounts(c);
  const chips = C.TAGS.filter(t => counts[t[0]]).map(t => `<button class="chip${t[0] === 'health' ? ' health' : ''}" data-act="filter" data-tag="${t[0]}" aria-pressed="${S.filter === t[0]}">${esc(t[1])}<b>${counts[t[0]]}</b></button>`).join('');
  return `<main class="wrap">
    <div class="tabs" role="tablist" aria-label="Your classes">${tabs}</div>
    ${c.sample ? `<p class="sample-note">This is a sample class with fictional students. Try the filters and printouts, then start your own class.</p>` : ''}
    <div class="classbar">
      <h1>${esc(c.name)}</h1><button class="icon-btn" data-act="rename" title="Rename class" aria-label="Rename class">${I.edit}</button>
      <span class="spacer"></span>
      <button class="btn primary" data-act="add">${I.plus}Add student</button>
      ${c.students.length ? `<button class="btn" data-act="print" data-what="chart">${I.print}Class chart</button><button class="btn" data-act="print" data-what="tests">${I.print}Test-day list</button><button class="btn" data-act="print" data-what="sub">${I.print}Sub sheet</button>` : ''}
      <div class="menu"><button class="icon-btn" data-act="menu" aria-label="More" aria-expanded="${S.menu}">${I.more}</button>${S.menu ? `<div class="menu-list">
        ${c.students.length ? `<button data-act="csv">Export for Google Sheets / Excel</button>` : ''}
        <button data-act="save-file">Save classes to a file</button>
        <button data-act="open-file">Open a saved file</button>
        <button data-act="keep">${S.keep ? 'Stop keeping classes on this computer' : 'Keep classes on this computer'}</button>
        <button data-act="del-class" style="color:var(--danger)">Delete this class</button>
      </div>` : ''}</div>
    </div>
    ${c.students.length ? `
      ${chips ? `<div class="filters"><span class="lbl">Who gets:</span>${chips}${S.filter ? `<button class="linkish" data-act="filter" data-tag="">Clear</button>` : ''}</div>` : ''}
      ${answerLine(c)}
      <div class="chart-wrap">${chartTable(c)}</div>
      <p class="disclaimer">A summary to help you follow each plan. The IEP or 504 plan is the legal document; check it whenever you're unsure. ${S.keep ? 'Your classes are kept in this browser on this computer only.' : 'Classes are not being kept: save a file before you close this tab.'}</p>
      ${c.sample ? '' : `<div class="used"><span>Is this useful? Tell me, so I can count your school and keep it free.</span><span class="row"><a class="btn small" href="${usedLink()}">I used this</a><a class="btn small" href="${shareLink()}">Send to a colleague</a></span></div>`}
    ` : `<div class="empty-state"><h2>Add your first student</h2><p>Drop in an IEP, 504 plan or at-a-glance PDF, paste the text, or type the accommodations yourself. You choose the name shown, such as a first name or initials.</p><div class="row" style="justify-content:center"><button class="btn primary" data-act="add">${I.plus}Add student</button><button class="btn" data-act="sample-class">See a sample class</button></div></div>`}
    <div style="height:40px"></div>
  </main>${footer()}`;
}

function viewAdd() {
  const A = S.add; if (!A) return '';
  const c = cls();
  let inner = '';
  if (A.step === 'loading') {
    inner = `<h2>Reading the plan</h2><p class="muted" id="ld-msg">${esc(A.msg)}</p><div class="progress"><span id="ld-bar" style="width:${A.pct}%"></span></div><p class="tiny">This happens on your computer. Nothing is uploaded.</p>`;
  } else if (A.step === 'input') {
    inner = `<h2>Add a student${c ? ' to ' + esc(c.name) : ''}</h2>
      <p class="muted">Use a PDF of the IEP, 504 plan or at-a-glance page from your student system, or paste the text.</p>
      <div class="field"><label for="f-label">What should the chart call this student?</label><input class="input" id="f-label" value="${esc(A.label)}" placeholder="First name or initials, e.g. Maya or M.T." autocomplete="off"><span class="tiny">Leave it blank to use initials from the plan. Other names and personal details in the plan are replaced.</span></div>
      ${A.paste ? `<div class="field"><label for="f-paste">Paste the plan's text</label><textarea id="f-paste" placeholder="Copy the accommodations section (or the whole plan) from your student system and paste it here.">${esc(A.pasteText)}</textarea></div>
        <div class="row"><button class="btn primary" data-act="read-paste">Read this text</button><button class="linkish" data-act="paste-toggle">Use a PDF instead</button></div>`
      : `<div class="drop" id="drop"><h3>Drop a PDF here</h3><p>IEP, 504 plan or at-a-glance page. Several at once is fine: each becomes a student.</p>
          <label class="btn primary" for="f-file">${I.file}Choose PDF</label><input type="file" id="f-file" accept=".pdf,.txt,application/pdf,text/plain" multiple hidden>
          <div class="or"><button class="linkish" data-act="paste-toggle">Paste text instead</button><button class="linkish" data-act="manual">Type it in myself</button><button class="linkish" data-act="sample-plan">Try a sample plan</button></div></div>`}
      ${A.error ? `<p class="err">${esc(A.error)}</p>` : ''}
      <div class="modal-foot"><button class="btn" data-act="close-add">Cancel</button></div>`;
  } else if (A.step === 'review') {
    const st = A.student;
    const found = st.items.filter(i => !i.suggested).length;
    const groups = C.COLS.map(([k, name]) => {
      const its = st.items.filter(i => (i.cols[0] || 'other') === k);
      if (!its.length && k === 'other') return '';
      return `<div class="rv-col"><h3><span class="dot" style="background:${COLOR(k)}"></span>${esc(name)} <span class="tiny">${its.length || ''}</span><span class="spacer"></span><button class="linkish small" data-act="add-item" data-col="${k}">+ Add</button></h3>
        ${its.map(i => `<div class="rv-item${i.on ? '' : ' off'}">
          <input type="checkbox" data-act="toggle-item" data-id="${i.id}" ${i.on ? 'checked' : ''} aria-label="Include this item">
          <div>${i.suggested ? '<span class="sugg">Suggested: a health or safety line found elsewhere in the plan</span>' : ''}<textarea data-edit="${i.id}" rows="1" aria-label="Accommodation text">${esc(i.text)}</textarea>${i.src && i.src !== i.text ? `<p class="src">From the plan${i.page ? ', page ' + i.page : ''}: “${esc(short(i.src))}”</p>` : (i.page ? `<p class="src">Page ${i.page}</p>` : '')}</div>
          <select data-col-of="${i.id}" aria-label="Column">${C.COLS.map(([ck, cn]) => `<option value="${ck}"${(i.cols[0] || 'other') === ck ? ' selected' : ''}>${esc(cn)}</option>`).join('')}</select>
          <button class="icon-btn" data-act="del-item" data-id="${i.id}" aria-label="Delete item" title="Delete">${I.trash}</button>
        </div>`).join('') || '<p class="tiny">Nothing here.</p>'}</div>`;
    }).join('');
    inner = `<h2>Check what was found for <input class="input" id="f-relabel" value="${esc(st.label)}" style="display:inline-block;width:170px;font-size:22px;font-weight:800;padding:4px 10px" aria-label="Student name or initials"> <span class="badge">${esc(st.plan)}</span></h2>
      <p class="muted">${found ? `Found ${plural(found, 'item')} in ${esc(st.src)}${st.sample ? ' (a fictional sample)' : ''}. Uncheck anything that's wrong, fix the wording, or move it to another column.` : `Nothing was found automatically in ${esc(st.src)}. Add the accommodations yourself below, or cancel and paste the accommodations section instead.`}</p>
      ${groups}
      <div class="modal-foot">${A.queue && A.queue.length ? `<span class="tiny" style="margin-right:auto">${plural(A.queue.length, 'more plan')} to go</span>` : ''}<button class="btn" data-act="close-add">Cancel</button><button class="btn primary" data-act="save-student">${A.editId ? 'Save changes' : (A.queue && A.queue.length ? 'Add and read the next one' : 'Add to ' + esc(c ? c.name : 'class'))}</button></div>`;
  }
  return `<div class="scrim" data-act="scrim"><div class="modal" role="dialog" aria-modal="true" aria-label="Add a student">${inner}</div></div>`;
}

function viewAsk() {
  const q = S.ask; if (!q) return '';
  return `<div class="scrim" data-act="ask-cancel"><form class="modal small-modal" id="ask-form" role="dialog" aria-modal="true" aria-label="${esc(q.title)}">
    <h2>${esc(q.title)}</h2>${q.text ? `<p class="muted" style="margin-top:6px">${esc(q.text)}</p>` : ''}
    ${q.value != null ? `<div class="field"><input class="input" id="ask-val" value="${esc(q.value)}" autocomplete="off"></div>` : ''}
    <div class="modal-foot"><button type="button" class="btn" data-act="ask-cancel">Cancel</button><button type="submit" class="btn ${q.danger ? 'danger-fill' : 'primary'}">${esc(q.ok || 'OK')}</button></div>
  </form></div>`;
}
function viewPreview() {
  if (!S.preview) return '';
  const names = { chart: 'Class chart', tests: 'Test-day list', sub: 'Sub sheet' };
  return `<div class="scrim pv" data-act="pv-close"><div class="pv-box" role="dialog" aria-modal="true" aria-label="${names[S.preview]} preview">
    <div class="pv-bar"><h2>${names[S.preview]}</h2><span class="spacer"></span><button class="btn" data-act="pv-close">Close</button><button class="btn primary" data-act="pv-print">${I.print}Print</button></div>
    <div class="paper${S.preview === 'chart' ? ' wide' : ''}">${printHTML(S.preview)}</div>
    <p class="tiny" style="text-align:center;margin-top:10px">If printing doesn't start, press Ctrl+P (Cmd+P on a Mac).</p>
  </div></div>`;
}
function render() {
  const app = $('app');
  const y = window.scrollY;
  app.innerHTML = header() + (S.view === 'class' ? viewClass() : viewHome()) + viewAdd() + viewPreview() + viewAsk();
  if (S.ask) { const v = $('ask-val'); if (v) { v.focus(); v.select(); } }
  if (S.add && S.add.step === 'input') { const l = $('f-label'); if (l && !S.add.focused) { l.focus(); S.add.focused = true; } }
  window.scrollTo(0, y);
  document.querySelectorAll('textarea[data-edit]').forEach(autoGrow);
}
function autoGrow(t) { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; }

/* ---------- printouts ---------- */
function pHead(title, c) { return `<div class="p-head"><h1>${esc(title)}</h1><span>${esc(c.name)} · ${today()}</span></div>`; }
const P_FOOT = `<div class="p-foot">Confidential student information: keep it secure and shred when done. This is a summary; the IEP or 504 plan is the legal document. Made with Class Glance.</div>`;
function printChart(c) { return pHead('Class accommodations chart', c) + chartTable(c, { print: true }) + P_FOOT; }
function printTests(c) {
  const sec = (title, tag, filterFn) => {
    const rows = c.students.map(s => { const its = s.items.filter(i => i.on && i.tags.includes(tag) && filterFn(i)); return its.length ? `<li><b>${esc(s.label)}</b>: ${its.map(i => esc(i.text)).join('; ')}</li>` : ''; }).filter(Boolean);
    return rows.length ? `<div class="p-sec"><h2>${esc(title)} (${rows.length})</h2><ul>${rows.join('')}</ul></div>` : '';
  };
  const testish = i => i.cols.includes('tests') || C.R.test.test(i.text);
  const used = new Set();
  const parts = [['Extended time', 'ext'], ['Small group or separate room', 'small'], ['Read aloud or text-to-speech', 'read'], ['Breaks during the test', 'breaks'], ['Calculator', 'calc'], ['Scribe or speech-to-text', 'scribe'], ['Word banks, organizers or models', 'org']].map(([t, g]) => {
    c.students.forEach(s => s.items.forEach(i => { if (i.on && i.tags.includes(g) && testish(i)) used.add(i); }));
    return sec(t, g, testish);
  }).join('');
  const other = c.students.map(s => { const its = s.items.filter(i => i.on && i.cols.includes('tests') && !used.has(i)); return its.length ? `<li><b>${esc(s.label)}</b>: ${its.map(i => esc(i.text)).join('; ')}</li>` : ''; }).filter(Boolean);
  const health = c.students.map(s => { const its = s.items.filter(i => i.on && i.cols.includes('health')); return its.length ? `<li><b>${esc(s.label)}</b>: ${its.map(i => esc(i.text)).join(' ')}</li>` : ''; }).filter(Boolean);
  return pHead('Test-day accommodations', c) +
    `<p style="margin-bottom:10px">Test or quiz: <span class="write"></span> &nbsp; Date: <span class="write" style="min-width:110px"></span></p>` +
    (health.length ? `<div class="p-sec p-alert"><h2>Health and safety (check before the test)</h2><ul>${health.join('')}</ul></div>` : '') +
    (parts || '<p>No test accommodations were found in this class.</p>') +
    (other.length ? `<div class="p-sec"><h2>Other test accommodations</h2><ul>${other.join('')}</ul></div>` : '') +
    `<p class="tiny">Lines that mention "state tests" may apply only to state testing; check the plan if unsure.</p>` + P_FOOT;
}
function printSub(c) {
  const list = (pick, fmt) => c.students.map(s => { const its = s.items.filter(i => i.on && pick(i)); return its.length ? `<li><b>${esc(s.label)}</b>: ${its.slice(0, fmt || 9).map(i => esc(i.text)).join(' · ')}</li>` : ''; }).filter(Boolean);
  const health = list(i => i.cols.includes('health'));
  const beh = list(i => i.tags.includes('bip') && /^(Watch for|When it happens|Prevent it|Safety plan):/.test(i.text), 4);
  const seat = list(i => i.cols.includes('seat'), 2);
  const breaks = list(i => i.tags.includes('breaks') && !i.tags.includes('bip'), 2);
  const key = list(i => (i.cols.includes('instr') || i.cols.includes('tools')) && !i.tags.includes('bip'), 3);
  const sec = (t, rows, cls2) => rows.length ? `<div class="p-sec${cls2 ? ' ' + cls2 : ''}"><h2>${t}</h2><ul>${rows.join('')}</ul></div>` : '';
  return pHead('Sub sheet: students with plans', c) +
    `<p style="margin-bottom:10px">Welcome! These students have an IEP or 504 plan. Please read the health and safety section first. Questions: <span class="write"></span></p>` +
    sec('Health and safety: read first', health, 'p-alert') +
    sec('Behavior plans', beh) +
    `<div class="p-cols">` + sec('Seating', seat) + sec('Breaks', breaks) + sec('Key supports during lessons', key) + `</div>` +
    `<p class="tiny">Giving a quiz or test? Use the test-day list.</p>` + P_FOOT;
}
function printHTML(what) { const c = cls(); return what === 'tests' ? printTests(c) : what === 'sub' ? printSub(c) : printChart(c); }
function doPrint(what) {
  const c = cls(); if (!c) return;
  const pa = $('print-area');
  pa.innerHTML = printHTML(what);
  let st = $('page-style'); if (!st) { st = document.createElement('style'); st.id = 'page-style'; document.head.appendChild(st); }
  st.textContent = what === 'chart' ? '@media print{@page{size:landscape;margin:.4in}}' : '@media print{@page{size:portrait;margin:.5in}}';
  setTimeout(() => window.print(), 50);
}

/* ---------- files ---------- */
function saveFile() {
  const data = { app: 'class-glance', version: 1, saved: new Date().toISOString().slice(0, 10), classes: S.classes.filter(c => !c.sample) };
  download('Class Glance - ' + data.saved + '.classglance', JSON.stringify(data), 'application/json');
  toast('Saved to your Downloads folder');
}
function openFile(text) {
  let d; try { d = JSON.parse(text); } catch (e) { d = null; }
  if (!d || d.app !== 'class-glance' || !Array.isArray(d.classes)) { toast("That isn't a saved Class Glance file"); return; }
  d.classes.forEach(c => { c.id = uid(); S.classes.push(c); });
  S.cur = d.classes[0] ? d.classes[0].id : S.cur; S.view = 'class'; persist(); render(); toast('Opened ' + plural(d.classes.length, 'class', 'classes'));
}
function csv() {
  const c = cls(); const q = v => '"' + String(v).replace(/"/g, '""') + '"';
  const lines = [['Class', 'Student', 'Plan', 'Column', 'Accommodation', 'Filters'].map(q).join(',')];
  c.students.forEach(s => s.items.filter(i => i.on).forEach(i => lines.push([c.name, s.label, s.plan, i.cols.map(k => C.COL_NAME[k]).join(' + '), i.text, i.tags.map(t => C.TAG_NAME[t]).join('; ')].map(q).join(','))));
  download('Class Glance - ' + c.name.replace(/[^\w .-]+/g, '') + '.csv', '\ufeff' + lines.join('\r\n'), 'text/csv');
  toast('Exported. Open it in Google Sheets or Excel.');
}

/* ---------- events ---------- */
function startAdd(editId) {
  const c = cls() || newClass();
  if (editId) { const s = c.students.find(x => x.id === editId); S.add = { step: 'review', editId, student: JSON.parse(JSON.stringify(s)), label: s.label, queue: [] }; }
  else S.add = { step: 'input', label: '', paste: false, pasteText: '', error: '', queue: [] };
  render();
}
function syncReview() {
  const st = S.add && S.add.student; if (!st) return;
  document.querySelectorAll('textarea[data-edit]').forEach(t => { const it = st.items.find(i => i.id === t.dataset.edit); if (it && it.text !== t.value) { it.text = t.value; C.retag(it); } });
  const rl = $('f-relabel'); if (rl && rl.value.trim()) st.label = rl.value.trim();
}
let sampleN = 0;
document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]'); if (!a) { if (S.menu) { S.menu = false; render(); } return; }
  const act = a.dataset.act;
  if (act === 'scrim' && e.target !== a) return;
  if (act !== 'menu' && S.menu && !a.closest('.menu-list')) S.menu = false;
  switch (act) {
    case 'home': S.view = 'home'; S.filter = null; render(); window.scrollTo(0, 0); break;
    case 'open-classes': S.view = 'class'; if (!cls() || cls().sample) { const m = S.classes.find(c => !c.sample); if (m) S.cur = m.id; } render(); window.scrollTo(0, 0); break;
    case 'new-class': {
      const make = name => { newClass(name || 'My class'); S.view = 'class'; S.filter = null; persist(); render(); window.scrollTo(0, 0); };
      if (!S.classes.some(c => !c.sample)) { make('My class'); break; }
      S.ask = { title: 'Name your new class', text: 'For example "Period 3 Biology".', value: 'Period ' + (S.classes.filter(x => !x.sample).length + 1), ok: 'Create class', fn: v => make(v.trim()) }; render(); break;
    }
    case 'sample-class': {
      let c = S.classes.find(x => x.sample);
      if (!c) { c = { id: uid(), name: 'Sample: Period 3 Biology', sample: true, students: JSON.parse(JSON.stringify(window.SAMPLE_CLASS)).map(s => Object.assign(s, { id: uid() })) }; S.classes.unshift(c); }
      S.cur = c.id; S.view = 'class'; S.filter = null; render(); window.scrollTo(0, 0); break;
    }
    case 'tab': S.cur = a.dataset.id; S.filter = null; persist(); render(); break;
    case 'rename': { const c = cls(); S.ask = { title: 'Rename this class', value: c.name, ok: 'Save', fn: v => { if (v.trim()) { c.name = v.trim(); persist(); } } }; render(); break; }
    case 'del-class': { const c = cls(); S.ask = { title: 'Delete "' + c.name + '"?', text: 'This removes the class and its ' + plural(c.students.length, 'student') + ' from this computer. It can\'t be undone.', ok: 'Delete class', danger: true, fn: () => { S.classes = S.classes.filter(x => x !== c); S.cur = S.classes[0] ? S.classes[0].id : null; if (!S.cur) S.view = 'home'; persist(); } }; render(); break; }
    case 'menu': S.menu = !S.menu; render(); break;
    case 'filter': S.filter = a.dataset.tag && S.filter !== a.dataset.tag ? a.dataset.tag : null; render(); break;
    case 'add': startAdd(); break;
    case 'edit-student': startAdd(a.dataset.id); break;
    case 'del-student': { const c = cls(); const s = c.students.find(x => x.id === a.dataset.id); S.ask = { title: 'Remove ' + s.label + ' from ' + c.name + '?', ok: 'Remove', danger: true, fn: () => { c.students = c.students.filter(x => x !== s); persist(); } }; render(); break; }
    case 'close-add': S.add = null; render(); break;
    case 'paste-toggle': S.add.label = ($('f-label') || {}).value || S.add.label; S.add.paste = !S.add.paste; S.add.error = ''; render(); break;
    case 'read-paste': { S.add.label = $('f-label').value.trim(); S.add.pasteText = $('f-paste').value; if (S.add.pasteText.trim().length < 20) { S.add.error = 'Paste the plan\'s text first.'; render(); return; } readPlan({ text: S.add.pasteText, name: 'Pasted text' }); break; }
    case 'manual': { const l = ($('f-label') || {}).value || ''; S.add.student = { id: uid(), label: l.trim() || 'Student ' + ((cls() ? cls().students.length : 0) + 1), plan: 'IEP', src: 'typed in', items: [] }; S.add.step = 'review'; render(); break; }
    case 'sample-plan': { const s = window.SAMPLE_PDFS[sampleN++ % window.SAMPLE_PDFS.length]; S.add.label = ($('f-label') || {}).value.trim(); readPlan({ bytes: b64ToBytes(s.b64), name: s.name, sample: true }); break; }
    case 'add-item': { syncReview(); const it = { id: 'm' + uid(), text: '', src: '', page: null, cols: [a.dataset.col], tags: [], on: true }; S.add.student.items.push(it); render(); const t = document.querySelector(`textarea[data-edit="${it.id}"]`); if (t) t.focus(); break; }
    case 'del-item': syncReview(); S.add.student.items = S.add.student.items.filter(i => i.id !== a.dataset.id); render(); break;
    case 'save-student': {
      syncReview();
      const c = cls(); const st = S.add.student;
      st.items = st.items.filter(i => i.text.trim()); st.items.forEach(i => { i.text = i.text.trim(); });
      if (S.add.editId) { const k = c.students.findIndex(x => x.id === S.add.editId); c.students[k] = st; }
      else c.students.push(st);
      persist();
      const q = S.add.queue || [];
      if (q.length && !S.add.editId) { S.add = { step: 'input', label: '', paste: false, pasteText: '', error: '', queue: q.slice(1), focused: true }; readOne(q[0]); }
      else { S.add = null; render(); toast(st.label + ' added'); }
      break;
    }
    case 'print': S.preview = a.dataset.what; render(); break;
    case 'pv-close': if (e.target !== a && act === 'pv-close' && a.classList.contains('scrim')) return; S.preview = null; render(); break;
    case 'pv-print': doPrint(S.preview); break;
    case 'ask-cancel': if (a.classList.contains('scrim') && e.target !== a) return; S.ask = null; render(); break;
    case 'csv': csv(); break;
    case 'save-file': saveFile(); render(); break;
    case 'open-file': { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.classglance,.json,application/json'; inp.onchange = async () => { if (inp.files[0]) openFile(await inp.files[0].text()); }; inp.click(); render(); break; }
    case 'keep': S.keep = !S.keep; persist(); render(); toast(S.keep ? 'Classes will be kept in this browser' : 'Classes are no longer kept. Save a file before closing.'); break;
    case 'share': window.location.href = shareLink(); break;
  }
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'ask-form') return; e.preventDefault();
  const q = S.ask; const v = $('ask-val'); S.ask = null; q.fn(v ? v.value : ''); render();
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'f-file' && t.files.length) { S.add.label = ($('f-label') || {}).value.trim(); readFiles(t.files); }
  if (t.dataset.act === 'toggle-item') { syncReview(); const it = S.add.student.items.find(i => i.id === t.dataset.id); it.on = t.checked; render(); }
  if (t.dataset.colOf) { syncReview(); const it = S.add.student.items.find(i => i.id === t.dataset.colOf); it.cols = [t.value].concat(it.cols.slice(1).filter(k => k !== t.value)); C.retag(it); if (t.value === 'health' && !it.tags.includes('health')) it.tags.push('health'); render(); }
});
document.addEventListener('input', e => { if (e.target.matches('textarea[data-edit]')) autoGrow(e.target); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (S.ask) { S.ask = null; render(); return; } if (S.preview) { S.preview = null; render(); return; } if (S.add && S.add.step !== 'loading') { S.add = null; render(); } }
  if (e.key === 'Enter' && e.target.id === 'f-label' && S.add && S.add.paste) { e.preventDefault(); }
});
['dragenter', 'dragover'].forEach(ev => document.addEventListener(ev, e => { const d = e.target.closest && e.target.closest('#drop'); if (d) { e.preventDefault(); d.classList.add('over'); } }));
['dragleave', 'drop'].forEach(ev => document.addEventListener(ev, e => { const d = e.target.closest && e.target.closest('#drop'); if (d) { e.preventDefault(); d.classList.remove('over'); if (ev === 'drop' && e.dataTransfer.files.length) { S.add.label = ($('f-label') || {}).value.trim(); readFiles(e.dataTransfer.files); } } }));

load();
if (S.loaded) { S.view = 'class'; if (!cls()) S.cur = S.classes[0].id; }
render();
})();
