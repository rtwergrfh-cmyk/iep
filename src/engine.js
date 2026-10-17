/* IEP Glance extraction engine. Runs in the browser and in Node (for tests).
   Input: text items with positions from pdf.js, or pasted text.
   Output: redaction candidates and categorized items, each with its source page and original text.
   Rules first; a small on-device classifier (src/classifier.js) sorts lines the rules can't place.
   No network access. It never writes new text: every item is a line from the IEP. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IEPEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------------- text helpers ---------------- */
  const norm = s => String(s || '').replace(/ /g, ' ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl').replace(/\s+/g, ' ').trim();
  const BULLET = /^\s*(?:[•●▪◦■‣⁃·*]|[-–—](?=\s)|\(?\d{1,2}[.)](?=\s|$)|\d{1,2}\.\d{1,2}\.?(?=\s)|\(?[a-h][.)](?=\s))\s*/;
  const stripBullet = s => s.replace(BULLET, '').trim();
  const isBullet = s => BULLET.test(s);
  const capFirst = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const endPunct = s => /[.!?:;)"']$/.test(s);
  function joinWrapped(a, b) {
    if (!a) return b; if (!b) return a;
    if (/[A-Za-z]-$/.test(a) && /^[a-z]/.test(b)) return a.slice(0, -1) + b;
    return a + ' ' + b;
  }
  function median(arr) { if (!arr.length) return 0; const s = arr.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }

  /* ---------------- 1. rows from positioned items ---------------- */
  /* pages: [{num, width, height, items:[{x, y(baseline from top), w, h, str, font, mark?, brk?}]}]
     mark: '☒' checked box, '☐' unchecked box, 'ambig' filled shape (checkbox or bullet) */
  const ON = '☒', OFF = '☐';
  const MARK_RE = /[☒☐]/;
  // accents removed, for matching Spanish headings with plain-letter patterns
  const fold = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // the document's language, from common short words
  function detectLang(rows) {
    const t = ' ' + fold(rows.slice(0, 400).map(r => r.text).join(' ')).toLowerCase() + ' ';
    const n = re => (t.match(re) || []).length;
    const es = n(/ (el|la|los|las|del|que|para|con|por|una|su|sus|esta|cuando|tiene) /g), en = n(/ (the|and|will|with|for|is|this|when|has|his|her|of) /g);
    return es > en * 1.2 && es > 15 ? 'es' : 'en';
  }
  // IEP or Section 504 plan
  function detectPlan(rows) {
    const head = fold(rows.slice(0, 40).map(r => r.text).join(' '));
    const all = fold(rows.map(r => r.text).join(' '));
    const is504 = /section 504|504 (accommodation )?plan|\b504\b.{0,40}(eligib|accommodation)|seccion 504|plan 504/i.test(head) || (/student accommodation plan|individual accommodation plan/i.test(head) && /\b504\b/.test(all));
    const isIep = /individualized education (program|plan)|programa de educacion individualizad|\bIEP\b/.test(head);
    return is504 && !/individualized education (program|plan)|programa de educacion individualizad/i.test(head) ? '504' : isIep || !is504 ? 'iep' : '504';
  }
  const NUMBERED = /^(?:(?:section|part|step)\s+)?(?:[IVX]{1,5}|\d{1,2}(?:\.\d{1,2})?|[A-H])[.):]\s+(?=\S)/i;
  function rowsFromPages(pages) {
    let lines = [];
    const fontChars = {}, hChars = {};
    // filled squares and dots are checkboxes only when the document also has empty boxes
    // a blank line ("Name ________") with something typed over it: the underscores go, the answer stays
    pages.forEach(pg => {
      const typed = pg.items.filter(it => it.str && /\w/.test(it.str.replace(/_/g, '')) );
      pg.items.forEach(it => {
        if (!it.str || !/_{3,}/.test(it.str)) return;
        const x1 = it.x, x2 = it.x + it.w;
        const over = typed.some(o => o !== it && Math.abs(o.y - it.y) <= Math.max(4, it.h * 0.9) && o.x < x2 && o.x + o.w > x1 && !/_{3,}/.test(o.str));
        if (over) { const n0 = it.str.length; it.str = it.str.replace(/_{3,}/g, ' ').replace(/\s+$/, ''); it.w = it.w * Math.max(0.05, it.str.length / Math.max(1, n0)); }
      });
    });
    // an X or check typed over (or right next to) an empty box checks it
    pages.forEach(pg => {
      const offs = pg.items.filter(it => it.mark === OFF); if (!offs.length) return;
      pg.items.forEach(it => {
        if (it.mark || !/^\s*[xX✓✔√]\s*$/.test(it.str)) return;
        const b = offs.find(o => Math.abs(o.y - it.y) <= Math.max(3, o.h || 8) && it.x >= o.x - 6 && it.x <= o.x + (o.w || 8) + 8);
        if (b) { b.mark = ON; b.str = ON; it.str = ''; }
      });
    });
    const anyOff = pages.some(pg => pg.items.some(it => it.mark === OFF));
    pages.forEach(pg => pg.items.forEach(it => {
      if (it.mark === 'ambig') { if (anyOff) { it.mark = ON; it.str = ON; } else { delete it.mark; it.str = '•'; } }
      else if (it.mark) it.str = it.mark;
    }));
    pages.forEach(pg => {
      const its = pg.items.filter(it => it.str && it.str.trim()).sort((a, b) => a.y - b.y || a.x - b.x);
      const pl = [];
      its.forEach(it => {
        let ln = pl.find(l => Math.abs(l.y - it.y) <= Math.max(2, it.h * 0.3));
        if (!ln) { ln = { page: pg.num, y: it.y, items: [], pageH: pg.height }; pl.push(ln); }
        ln.items.push(it);
        if (it.mark || it.font === '_field') return;
        const n = it.str.length; fontChars[it.font] = (fontChars[it.font] || 0) + n;
        const hk = Math.round(it.h * 2) / 2; hChars[hk] = (hChars[hk] || 0) + n;
      });
      const rules = pg.rules || [];
      pl.forEach(l => {
        l.items.sort((a, b) => a.x - b.x);
        l.brk = l.items.some(it => it.brk);
        const cells = []; let cur = null;
        l.items.forEach(it => {
          const s = it.str;
          if (cur) {
            const gap = it.x - (cur.x2);
            // a checkbox always starts a new cell, unless it is the first thing in the current one
            const ruled = rules.some(r => r.x >= cur.x2 - 2 && r.x <= it.x + 1 && it.y >= r.y1 - 1 && it.y - it.h * 0.5 <= r.y2 + 1);
            if (gap > Math.max(8, it.h * 1.15) || ruled || (it.mark && cur.text.trim())) { cells.push(cur); cur = null; }
            else { cur.text += (gap > it.h * 0.12 && !/\s$/.test(cur.text) && !/^\s/.test(s) ? ' ' : (cur.mark && cur.text.length === 1 ? ' ' : '')) + s; if (cur.mark && cur.labelX === null) cur.labelX = it.x; cur.x2 = Math.max(cur.x2, it.x + it.w); cur.h = Math.max(cur.h, it.h); if (!it.mark) cur.fonts[it.font] = (cur.fonts[it.font] || 0) + s.length; return; }
          }
          cur = { x: it.x, x2: it.x + it.w, text: s, h: it.mark ? 0 : it.h, fonts: it.mark ? {} : { [it.font]: s.length }, mark: !!it.mark, labelX: it.mark ? null : it.x };
        });
        if (cur) cells.push(cur);
        l.cells = cells.map(c => ({ x: c.x, x2: c.x2, labelX: c.labelX === null ? c.x2 : c.labelX, text: norm(c.text), h: c.h || 8, font: (Object.entries(c.fonts).sort((a, b) => b[1] - a[1])[0] || ['_mark'])[0] })).filter(c => c.text);
        l.h = Math.max(...l.cells.map(c => c.h), 0);
        l.x = l.cells.length ? l.cells[0].x : 0;
        l.x2 = l.cells.length ? l.cells[l.cells.length - 1].x2 : 0;
      });
      lines = lines.concat(pl.filter(l => l.cells.length).sort((a, b) => a.y - b.y));
    });
    const bodyFont = Object.entries(fontChars).sort((a, b) => b[1] - a[1])[0];
    const bodyH = +(Object.entries(hChars).sort((a, b) => b[1] - a[1])[0] || [10])[0];
    const env = { bodyFont: bodyFont ? bodyFont[0] : null, bodyH };

    // checkbox lines: a question followed by options keeps only the checked answers;
    // a line made only of options becomes one option per cell
    lines.forEach(l => {
      const starts = l.cells.map(c => MARK_RE.test(c.text.charAt(0)));
      if (!starts.some(Boolean)) return;
      if (!starts[0]) {
        const q = l.cells.filter((c, i) => !starts[i]).map(c => c.text).join(' ');
        const ans = l.cells.filter((c, i) => starts[i] && c.text.charAt(0) === ON).map(c => c.text.slice(1).trim());
        l.cells = [{ x: l.cells[0].x, x2: l.x2, labelX: l.cells[0].x, text: norm(q + (ans.length ? ' ' + ans.join(', ') : ' (no answer checked)')), h: l.h, font: l.cells[0].font }];
        return;
      }
      if (starts.every(Boolean)) { l.options = l.cells.map(c => ({ cell: c, on: c.text.charAt(0) === ON })); return; }
      l.options = [{ cell: l.cells[0], on: l.cells[0].text.charAt(0) === ON, rest: l.cells.slice(1) }];
    });
    // inline marks inside a cell ("Behavior plan? ☒ Yes ☐ No")
    lines.forEach(l => l.cells.forEach(c => {
      if (!MARK_RE.test(c.text.slice(1))) return;
      const parts = c.text.split(/(?=[☒☐])/);
      const keep = parts.filter((p, i) => (i === 0 && !MARK_RE.test(p.charAt(0))) || p.charAt(0) === ON);
      c.text = norm(keep.join(' ').replace(/[☒☐]/g, ''));
    }));

    // right edge of text for each left margin, used to tell wrapped lines from separate lines
    const rightFor = {};
    const byX = {};
    lines.forEach(l => { if (l.cells.length === 1 && l.cells[0].text.length > 30) { const k = Math.round(l.x / 6); (byX[k] = byX[k] || []).push(l.x2); } });
    const pageRight = {};
    lines.forEach(l => { if (l.cells.length === 1 && l.cells[0].text.length > 30) (pageRight[l.page] = pageRight[l.page] || []).push(l.x2); });
    const pct = (arr, q) => { const s = arr.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * q))]; };
    Object.keys(pageRight).forEach(p => { pageRight[p] = pct(pageRight[p], 0.9); });
    const rightEdge = l => { const k = Math.round(l.x / 6); const arr = (byX[k] || []).concat(byX[k - 1] || [], byX[k + 1] || []); if (arr.length >= 4) return (rightFor[k] = rightFor[k] || pct(arr, 0.9)); return pageRight[l.page] || 0; };

    // repeated headers / footers
    const nPages = pages.length;
    if (nPages > 1) {
      const key = l => l.cells.map(c => c.text).join(' ').toLowerCase().replace(/\d+/g, '#');
      const counts = {};
      lines.forEach(l => { const edge = l.y < l.pageH * 0.12 || l.y > l.pageH * 0.9; if (edge) { const k = key(l); (counts[k] = counts[k] || new Set()).add(l.page); } });
      lines = lines.filter(l => { const edge = l.y < l.pageH * 0.12 || l.y > l.pageH * 0.9; if (!edge) return true; const s = counts[key(l)]; return !(s && s.size >= 2 && s.size >= nPages * 0.5); });
    }

    // page-number footers and headers ("Page 3", "p. 3 of 9") even on one-page documents
    lines = lines.filter(l => { const edge = l.y < l.pageH * 0.07 || l.y > l.pageH * 0.93; return !(edge && /\b(page|p\.)\s*\d+(\s*(of|\/)\s*\d+)?\b/i.test(l.cells.map(c => c.text).join(' '))); });

    // mark heading-like lines
    lines.forEach(l => {
      const t = l.cells.map(c => c.text).join(' ');
      const big = l.h >= env.bodyH * 1.12;
      // a different font counts only if it looks like a heading font (bold, black…): typed answers are often in another plain font
      const diffFont = env.bodyFont && l.cells.every(c => c.font !== env.bodyFont && c.font !== '_field' && c.font !== '_mark' && (/bold|black|heavy|semi|demi|bd\b|-b$|,b$|medium|condensed/i.test(c.font) || !/^(helvetica|helv|arial|times|courier)/i.test(c.font)));
      const letters = t.replace(/[^A-Za-z]/g, '');
      const caps = letters.length >= 4 && letters.replace(/[^A-Z]/g, '').length / letters.length > 0.8;
      const styled = big || caps || diffFont;
      const numbered = NUMBERED.test(t) && styled && t.length <= 90;
      l.headLike = !l.options && !l.brk && l.cells.length === 1 && !/^[a-z]/.test(t) && (t.length <= 110 || (caps && t.length <= 260)) && !/[.?]$/.test(t) && !/\?\s/.test(t) && (!isBullet(t) || numbered) && styled;
    });
    // text typed in a different font (italic answers, say) whose first line wrapped: the next line carries on
    // mid-sentence in the same font, so it is a paragraph, not a heading
    lines.forEach((l, i) => {
      const n = lines[i + 1];
      if (!l.headLike || !n || n.page !== l.page || n.cells.length !== 1 || n.y - l.y <= 0 || n.y - l.y > Math.max(l.h, n.h) * 1.6) return;
      if (Math.abs(n.cells[0].x - l.cells[0].x) <= 3 && n.cells[0].font === l.cells[0].font && /^[a-z]/.test(n.cells[0].text) && l.cells[0].text.length > 50) l.headLike = false;
    });

    // merge wrapped lines into rows
    const rows = [];
    let row = null, prev = null, openOpts = null;
    const firstWordW = l => { const w = (l.cells[0].text.split(' ')[0] || '').length; return w * l.h * 0.5; };
    lines.forEach(l => {
      const t0 = l.cells[0].text;
      const near = prev && prev.page === l.page && l.y - prev.y > 0 && l.y - prev.y <= Math.max(l.h, prev.h, 1) * 1.6;
      // checkbox options: one row per option; wrapped option labels continue under their own label
      if (l.options) {
        openOpts = [];
        l.options.forEach(o => {
          const cells = [o.cell.text.slice(1).trim()].concat((o.rest || []).map(c => c.text));
          const r = { page: l.page, y: l.y, heading: false, opt: o.on ? 'on' : 'off', cols: cells.map((t, i) => ({ x: i ? o.rest[i - 1].x : o.cell.labelX, text: t })), h: l.h };
          rows.push(r); openOpts.push(r);
        });
        row = openOpts[openOpts.length - 1]; prev = l; return;
      }
      if (openOpts && near && !l.headLike && !l.brk) {
        const fits = l.cells.every(c => openOpts.some(r => r.cols.some(col => Math.abs(col.x - c.x) <= 6)));
        if (fits) {
          l.cells.forEach(c => { for (const r of openOpts) { const col = r.cols.find(col => Math.abs(col.x - c.x) <= 6); if (col) { col.text = joinWrapped(col.text, c.text); break; } } });
          prev = l; return;
        }
      }
      openOpts = null;
      const isCapsText = x => { const L = x.replace(/[^A-Za-z]/g, ''); return L.length >= 3 && L.replace(/[^A-Z]/g, '').length / L.length > 0.85; };
      // a heading that wraps onto more lines stays one heading; its first line is kept as the title
      if (row && row.heading && near && row.cols.length === 1 && l.cells.length === 1 && isCapsText(row.cols[0].text) && isCapsText(t0)) {
        const pt = row.cols[0].text;
        const joining = /(\b(and|or|of|the|to|for|in|on|with|between|by|from|at|an?|its|their|his|her)|[,\-\/(])$/i.test(pt);
        const ownTitle = classifyHeading(t0) && t0.split(/\s+/).length <= 5;
        if ((l.headLike || joining) && !/[.]$/.test(pt) && (joining || !(ownTitle && /[):.]$/.test(pt)))) {
          if (!row.head0) row.head0 = pt;
          row.cols[0].text = joinWrapped(pt, t0); prev = l; return;
        }
      }
      let cont = false;
      if (row && near && !row.heading && !l.headLike && !l.brk) {
        if (row.cols.length > 1 || l.cells.length > 1) {
          const fits = c => row.cols.some((col, k) => Math.abs(col.x - c.x) <= 6 || (k === 0 && c.x - col.x > 0 && c.x - col.x <= 40 && (row.cols[1] ? c.x < row.cols[1].x - 20 : true)));
          const lone = c => /^[xX✓✔√]$/.test(String(c.text).trim());
          const fullRow = (row.cols.length >= 3 && l.cells.length >= Math.max(3, row.cols.length - 1)) || row.cols.some(lone) || l.cells.some(lone);
          const numbered = /^\d{1,2}(\.\d{1,2})?[.)]?\s/.test(t0) && Math.abs(l.cells[0].x - row.cols[0].x) <= 6;
          cont = !fullRow && !numbered && l.cells.every(fits) && !(isBullet(t0) && Math.abs(l.cells[0].x - row.cols[0].x) <= 6);
        } else {
          const dx = l.cells[0].x - row.cols[0].x;
          const prevText = prev.cells[prev.cells.length - 1].text;
          const right = rightEdge(prev);
          // a wrapped line: the first word of this line would not have fit on the previous one
          const wrapped = !right || prev.x2 + firstWordW(l) + l.h * 0.6 >= right;
          const joins = /^[a-z(]/.test(t0) || /[,;:\-–]$|\b(and|or|the|a|to|of|with|for|in)$/i.test(prevText);
          const dxPrev = l.cells[0].x - prev.cells[0].x;
          cont = ((dx >= -3 && dx <= 40) || (dx < -3 && dx >= -40 && wrapped && joins && !row.multi) || (row.multi && Math.abs(dxPrev) <= 3)) && !isBullet(t0) && (wrapped || joins);
        }
      }
      // looser line spacing: a line that starts in lowercase right under a one-column line still carries on the sentence
      if (!cont && row && prev && !near && prev.page === l.page && !row.heading && !l.headLike && !l.brk && row.cols.length === 1 && l.cells.length === 1 && /^[a-z]/.test(t0) && !endPunct(prev.cells[prev.cells.length - 1].text)) {
        const dy = l.y - prev.y; cont = dy > 0 && dy <= Math.max(l.h, prev.h, 1) * (prev.cells[prev.cells.length - 1].text.length > 60 ? 2.6 : 2.0) && Math.abs(l.cells[0].x - row.cols[0].x) <= 6;
      }
      if (cont) {
        row.multi = true;
        l.cells.forEach(c => { const col = row.cols.reduce((b, col) => Math.abs(col.x - c.x) < Math.abs(b.x - c.x) ? col : b, row.cols[0]); col.text = joinWrapped(col.text, c.text); });
      } else {
        row = { page: l.page, y: l.y, heading: l.headLike, cols: l.cells.map(c => ({ x: c.x, text: c.text })), h: l.h };
        rows.push(row);
      }
      prev = l;
    });
    // labels printed above their values ("Student Name:" with the answer on the next line)
    for (let i = rows.length - 2; i >= 0; i--) {
      const a = rows[i], b = rows[i + 1];
      if (a.page !== b.page || a.heading || b.heading || a.opt || b.opt) continue;
      if (!a.cols.every(c => /:\s*$/.test(c.text) && c.text.length <= 40)) continue;
      if (b.y - a.y > Math.max(a.h, 8) * 3.2 || b.cols.length > a.cols.length) continue;
      if (b.cols.some(c => /^[^:]{1,40}:\s*\S/.test(c.text))) continue;
      const pairs = b.cols.map(c => a.cols.reduce((best, ac) => Math.abs(ac.x - c.x) < Math.abs(best.x - c.x) ? ac : best, a.cols[0]));
      if (!b.cols.every((c, k) => Math.abs(pairs[k].x - c.x) <= 30)) continue;
      a.cols = a.cols.map(ac => { const k = pairs.indexOf(ac); return { x: ac.x, text: k >= 0 ? ac.text + ' ' + b.cols[k].text : ac.text }; });
      rows.splice(i + 1, 1);
    }
    rows.forEach(r => { const cc = r.cols.filter(c => c.text); r.cells = cc.map(c => c.text); r.xs = cc.map(c => Math.round(c.x)); r.text = r.cells.join(' | '); delete r.cols; delete r.multi; if (!r.head0) delete r.head0; });
    rows.forEach(r => {
      if (r.heading || r.opt || r.cells.length < 2 || !/^\d{1,2}(\.\d{1,2})?\.?(\s|$)/.test(r.cells[0].trim())) return;
      const rest = r.cells.join(' ').replace(/^\d{1,2}(\.\d{1,2})?\.?\s*/, ''), L = rest.replace(/[^A-Za-z]/g, '');
      if (L.length >= 6 && L.replace(/[^A-Z]/g, '').length / L.length > 0.85 && rest.length <= 120) { r.heading = true; r.cells = [r.cells[0].match(/^\d{1,2}(\.\d{1,2})?\.?/)[0] + ' ' + rest]; r.xs = [r.xs[0]]; r.text = r.cells[0]; }
    });
    return rows.filter(r => r.cells.length);
  }

  /* ---------------- 1b. rows from pasted text ---------------- */
  function rowsFromText(text) {
    const rows = []; let row = null;
    String(text || '').replace(/\r/g, '').split('\n').forEach(raw => {
      if (!raw.trim()) { row = null; return; }
      const cells = raw.split(/\t+| {3,}/).map(norm).filter(Boolean);
      const t = cells.join(' ');
      const letters = t.replace(/[^A-Za-z]/g, '');
      const caps = letters.length >= 4 && letters.replace(/[^A-Z]/g, '').length / letters.length > 0.8;
      const headLike = cells.length === 1 && t.length <= 90 && !/[.]$/.test(t) && !isBullet(t) && (caps || !!classifyHeading(t));
      // a wrapped line carries on the line above; short capitalized lines under each other are a list
      const listLine = /^[A-Z0-9]/.test(t) && row && row.cells[0].length <= 60 && !/\b(and|or|the|a|an|to|of|with|for|in|on|at|by)$|[,;:\-]$/i.test(row.cells[0]);
      if (row && !row.heading && !headLike && !listLine && cells.length === 1 && row.cells.length === 1 && !isBullet(t) && !endPunct(row.cells[0])) {
        row.cells[0] = joinWrapped(row.cells[0], t); row.text = row.cells[0]; return;
      }
      row = { page: 1, y: rows.length, heading: headLike, cells, text: cells.join(' | ') };
      rows.push(row);
      if (headLike) row = null;
    });
    return rows;
  }

  /* ---------------- 2. headings ---------------- */
  const HEADINGS = [
    ['skip', /\b(signatures?|transportation|placement recommendation|transition (activities|services|plan)|^secondary transition|^post.?secondary|reporting progress|progress report|parent(s'?|al)? (concerns|input)|^concerns of (the )?parents?|12.month|extended school year|meeting (participants|notes)|consent|prior written notice|coordinated set)\b/i],
    ['factors', /special factors/i],
    ['testing', /\b(testing|test|assessment)s? accommodations?\b|statewide assessments?|state (and|&) district|district.?wide (testing|assessments?)|participation in state|state(wide)? testing|designated supports/i],
    ['at', /assistive technology/i],
    ['mods', /^modifications?\b/i],
    ['accom', /supplementary aids|program modifications?|accommodations?\s*(\/|and|&)?\s*modifications?|instructional accommodations?|classroom accommodations?|^accommodations?\b|supports for the student/i],
    ['personnel', /supports? for (school )?personnel/i],
    ['setting', /educational setting|least restrictive|participation with (students|peers) without|^lre\b/i],
    ['services', /special education (programs?|services)|related services|offer of fape.*services|schedule of services|^services\b(?!\s*\/)|services (and|&) supports|^service delivery/i],
    ['goals', /annual goals?|^goals?\b|goal\s*#?\s*\d|goals (and|&) (objectives|benchmarks)|^objectives?\b/i],
    ['behavior', /behavio(u)?r(al)? (intervention|support) plan|\bbip\b|positive behavio|^behavio(u)?r\b/i],
    ['health', /health|medical|allerg|seizure|emergency (plan|care)/i],
    ['strengths', /strengths?\b/i],
    ['present', /present levels?|academic achievement|functional performance|social development|physical development|management needs|areas? of need|effect of (the )?student|evaluation results/i],
    ['id', /identifying information|student information|demographic/i]
  ];
  function classifyHeading(t) {
    const s = fold(norm(t)).replace(NUMBERED, '').replace(/^\d{1,2}(\.\d{1,2})*\.?\s+(?=[A-Z])/, '').replace(/^(section|part|seccion|parte)\s+\w+\s*[:.-]\s*/i, '');
    if (s.length > 260) return null;
    // checked before the general list, because these headings also mention other sections
    if (/^(special )?transportation|^(determination of eligibility|eligibility determination)|^placement (determination|recommendation)|assurances\s*$|deliberations|^meeting minutes|^procedural safeguards|^meeting participants|^consensus\b/i.test(s)) return 'skip';
    if (/^personal care/i.test(s)) return 'health';
    // Section 504 plans
    if (/^(definitions?( of terms)?( used)?( in this plan)?|references:?$|background$|sample .*plan|overview|introduction|instructions|about this (form|plan|template)|documentation of (the )?disability|(504 )?team members|notes:?$|plan approved|date approved|approved and received|(other )?emergency contacts?|emergency contact instructions|student'?s health care providers?|parental notification|(objectives?|goals?)( ?\/ ?(objectives?|goals?))? of this plan)/i.test(s)) return 'skip';
    if (/^(school information|(section )?504 plan for\b)/i.test(s)) return 'id';
    if (/^((teacher|staff) (education|training)( and support)?|trained .*staff|training for staff)/i.test(s)) return 'personnel';
    if (/^(academic.related accommodations|equal treatment|exercise\b|.{0,20}physical (activity|education))/i.test(s)) return 'accom';
    if (/^(trained personnel|staff training)/i.test(s)) return 'personnel';
    if (/blood (glucose|sugar)|glucose tests?|hypoglyc|hyperglyc|ketogenic|vagus nerve|antiepileptic|diastat|seizure (care|first aid|protocol)|health care supervision|diabetes care|provision of .*care|self-care|supplies and equipment|snacks and meals|checking blood (glucose|sugar)|insulin|medication administration|emergency evacuation|shelter-in-place|medical management|health care plan|seizure action plan|allergy action plan/i.test(s)) return 'health';
    if (/^(water and bathroom|physical activity|field trips|extracurricular|tests and classroom work|classroom work)/i.test(s)) return 'accom';
    if (/^(section 504 )?eligibility\b|^(nature|description) of (the )?(disability|impairment|condition)|^(physical or mental )?impairment|^major life activit|^basis for|^committee members|^(who is|persons?) responsible|^responsible (staff|persons?)|^504 (team|committee)/i.test(s)) return 'skip';
    if (/^(accommodations?|supports?) (on|for|during) (tests?|testing|assessments?|exams?|quizzes)/i.test(s)) return 'testing';
    // Spanish headings (accents removed)
    if (/^(firmas?|transporte|transicion|plan de transicion|consentimiento|aviso previo|participantes|miembros del comite|elegibilidad|determinacion de elegibilidad|preocupaciones de los padres|año escolar extendido|ano escolar extendido)\b/i.test(s)) return 'skip';
    if (/(acomodaciones|adaptaciones|apoyos) (para|en|durante) (los |las )?(examenes|pruebas|evaluaciones)|(examenes|pruebas|evaluaciones) (estatales|del estado|del distrito)|participacion en (las )?evaluaciones/i.test(s)) return 'testing';
    if (/^tecnologia (de )?asist(encia|iva)/i.test(s)) return 'at';
    if (/^modificaciones\b/i.test(s)) return 'mods';
    if (/^(acomodaciones|adaptaciones|ayudas y servicios suplementarios|apoyos (en el salon|en clase|en el aula))\b/i.test(s)) return 'accom';
    if (/^apoyos? para el personal/i.test(s)) return 'personnel';
    if (/(entorno|ambiente) menos restrictivo|^ubicacion\b/i.test(s)) return 'setting';
    if (/^servicios\b|servicios de educacion especial|servicios relacionados/i.test(s)) return 'services';
    if (/^metas?\b|metas anuales|^objetivos\b/i.test(s)) return 'goals';
    if (/plan de (intervencion|apoyo) (de|para la|del) (conducta|comportamiento)|^conducta\b|^comportamiento\b/i.test(s)) return 'behavior';
    if (/^(salud|informacion medica|plan de salud|necesidades medicas|alergias)/i.test(s)) return 'health';
    if (/^(fortalezas|puntos fuertes|intereses)/i.test(s)) return 'strengths';
    if (/^niveles? actuales?|^nivel actual de (rendimiento|desempeno)/i.test(s)) return 'present';
    if (/^(informacion|datos) del (estudiante|alumno)/i.test(s)) return 'id';
    if (/supplement\s*:|^supplement\b/i.test(s) && !/supplementary/i.test(s)) return 'skip';
    if (/^(professional educator\/staff support|staff support|professional development)/i.test(s)) return 'personnel';
    if (/^(evaluation results|test results|academic achievement, functional performance|physical development|social development)/i.test(s)) return 'present';
    if (/^management needs/i.test(s)) return 'accom';
    if (/special factors/i.test(s)) return 'factors';
    if (/^offer of fape\b/i.test(s) && !/\bservices\b/i.test(s)) return 'setting';
    if (/needs of the student|student needs (relating|that are)|effect of student needs/i.test(s)) return 'present';
    if (/^(alternate section for students|short-term instructional objectives)/i.test(s)) return null;
    // plain-language headings ("What the team agreed to", "Keeping Jules safe", "What we're working toward")
    if (/^(what (the )?(team|school|staff|teachers?|adults|we) (agreed|will do|will provide|decided)|how (we|staff|teachers?|adults|the team) (will )?(help|support)|(classroom |everyday |daily )?supports? (in|for) (the )?(class(room)?|school day)|what helps|things that help|ways to help)\b/i.test(s)) return 'accom';
    if (/^(keeping \S+( \S+)? safe|staying safe|safety( plan| information| needs)?$|medical (needs|information|alert)|health (needs|information|alert))/i.test(s)) return 'health';
    if (/^(the )?(support|services?|help) (he|she|they|the student|\S+) (will )?(receive|get|gets|receives)\b/i.test(s)) return 'services';
    if (/^(what (we|he|she|they|the student|\S+)( a|')?re? working (on|toward|towards)|what (we|he|she|they) (are|is) working (on|toward|towards)|working (on|toward|towards)\b|targets? for this year|this year'?s goals)/i.test(s)) return 'goals';
    if (/^(about (me|him|her|them|the student|[A-Z][a-z]+|[A-Z]\.([A-Z]\.)?)|all about|who (he|she|they|[A-Z][a-z]+) (is|are)|getting to know)\b/i.test(s)) return 'present';
    if (/^participat(e|ion) in state and district/i.test(s)) return 'testing';
    if (/^testing accommodations?\b/i.test(s)) return 'testing';
    for (const [cat, re] of HEADINGS) if (re.test(s)) return cat;
    return null;
  }

  /* ---------------- 3. redaction candidates ---------------- */
  const LABELS = [
    ['student', /^(?:student(?:'s)? name|student|name of student|learner|child(?:'s name)?|pupil|name|nombre del (?:estudiante|alumno|niñ[oa]|nin[oa])|nombre|estudiante|alumn[oa])\s*[:#]\s*(.+)$/i],
    ['parent', /^(?:parents?(?:\s*\/\s*guardians?)?(?:\s*\/\s*adult student)?|guardians?|parent\/guardian name|mother|father|padres?(?:\s*\/\s*madre)?(?:\s*\/\s*tutor(?:a|es)?)?|madre|tutor(?:a|es)?|padres\/tutores)\s*[:#]\s*(.+)$/i],
    ['dob', /^(?:date of birth|dob|birth ?date|birthday|d\.o\.b\.|fecha de nacimiento)\s*[:#]\s*(.+)$/i],
    ['sid', /^(?:student (?:id|number|#)|ssid|id\s*#|id(?=\s*:)|osis|state id|local id|lasid|sasid)\s*[:#]*\s*([A-Z0-9-]*\d[A-Z0-9-]{3,})/i],
    ['address', /^(?:(?:home )?address|direcci[oó]n|domicilio)\s*[:#]\s*(.+)$/i]
  ];
  const PHONE = /\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
  const EMAIL = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g;
  function splitPeople(v) {
    return v.split(/\s*(?:,|;|\band\b|&|\/)\s*/i).map(x => x.trim()).filter(x => /[A-Za-z]{2,}/.test(x));
  }
  function initialsOf(name) {
    const parts = name.replace(/[^\p{L}' -]/gu, ' ').split(/\s+/).filter(p => p && !/^\p{Lu}\.?$/u.test(p));
    if (!parts.length) return 'Student';
    const f = parts[0][0], l = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (f + '.' + (l ? l + '.' : '')).toUpperCase();
  }
  const ID_HEAD = /^(student(?:['’]s)? name|birth ?date|disability|name|learner|child|pupil|dob|date of birth|birth ?date|student id|id|grade|parents?(?:\/guardians?)?|guardians?|school|phone|email|address|teacher(?: of record)?|case manager|signature|role|date|title|position)$/i;
  // table rows like "Student Name | Jordan Ellis" also count as "Student Name: Jordan Ellis"
  function labelCells(r) {
    const out = r.cells.slice();
    if (r.cells.some(c => /^(role|title|position|attendance signature|signature|contact information)$/i.test(c.trim()))) return out;
    for (let i = 0; i + 1 < r.cells.length; i++) if ((!/:/.test(r.cells[i]) || /^[^:]{2,40}:\s*$/.test(r.cells[i])) && r.cells[i].length <= 40 && /[a-z]/i.test(r.cells[i]) && !ID_HEAD.test(r.cells[i + 1].trim()) && !/:\s*$/.test(r.cells[i + 1])) out.push(r.cells[i].replace(/:\s*$/, '') + ': ' + r.cells[i + 1]);
    return out;
  }
  const COMMON_CAPS = new Set(('English Spanish French Math Mathematics Science Reading Writing Social Studies History Art Music Health Physical Education PE ELA IEP BIP FBA Ms Mr Mrs Dr Miss ' +
    'Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August September October November December ' +
    'School District Elementary Middle High Center Room Plan Program Services Teacher Grade Goal Goals Unit Chromebook iPad Google Microsoft Word Kurzweil Learning Ally ' +
    'Autism Dyslexia Dysgraphia Disability Disabilities Impairment Syndrome Down Asperger Skill Skills Rights Supp Supplement Speech Language Occupational Physical Behavior Behavioral Plan Area Academic Reading Writing Strengths Needs Notice Transition Eligibility Assessment Assessments Accommodations Modifications Services Program Progress Standard Standards Instruction Mastery Baseline Texas California Washington Oregon Florida Georgia Virginia Carolina Ohio Michigan Illinois Pennsylvania Jersey York Massachusetts Arizona Colorado Nevada Utah Idaho Montana Alaska Hawaii Chapter Section Code Federal Regulations Agency Weekly Monthly Daily Yearly Individual Group Small Home Therapy Setting Throughout Classroom Recorded Every Date Name Student Parent Page Phone Address Email Age Gender Birth Grade State City County Department Board Committee Education Common Core Exam Exams Regents Mom Dad Team Office Special General Related Annual Integrated Support Supports ' +
    'Lectura Escritura Matemáticas Matematicas Ciencias Inglés Español Educación Especial Salud Conducta Servicios Programa Meta Metas Estudiante Alumno Padre Madre Tutor Tutora Escuela Distrito Grado Fecha Nombre Maestro Maestra Enfermera Oficina Lunes Martes Miércoles Jueves Viernes Enero Febrero Marzo Abril Mayo Junio Julio Agosto Septiembre Octubre Noviembre Diciembre Acomodaciones Modificaciones Tecnología Plan Equipo Comité Estado Estatal').split(' '));
  const NOT_NAME = new Set('needed daily weekly annually monthly teacher teachers teacher(s) staff information contact cell number home work phone email address attendance plan coordinator approved administrator nurse counselor principal specialist provider team member members type bus homeroom padre madre tutor tutora estudiante alumno fecha nombre ninguno firma presente ausente did not attend attended in person by phone yes no none n/a na signature date parent parents guardian student teacher case manager position title name role present absent excused agree disagree method of attendance mother father both see attached'.split(' '));
  function findIdentifiers(rows) {
    const nameOnly = v => { const m = norm(v).match(/^\p{L}[\p{L}.'\- ,&\/]*/u); return m ? m[0].replace(/[\s,&\/]+$/, '').trim() : ''; };
    const found = []; const add = (kind, value, label) => {
      value = norm(value).replace(/[,;]+$/, '').replace(/([a-z0-9]{2})\.$/, '$1');
      if (kind === 'dob' && !/\d/.test(value)) return false;
      if (['student', 'parent', 'first', 'last', 'other'].includes(kind)) { value = nameOnly(value); if (!/\p{L}{2,}/u.test(value)) return false; if (kind === 'student' && /^(mr|mrs|ms|miss|dr|sr|sra)\.?\s/i.test(value)) return false; if (value.split(/\s+/).some(w => NOT_NAME.has(w.toLowerCase()))) return false; }
      if (!value || value.length < 2) return false;
      if (!found.some(f => f.value.toLowerCase() === value.toLowerCase())) found.push({ kind, value, label });
      return true;
    };
    let studentFull = null;
    const pairRows = [];
    rows.forEach((r, i) => {
      const nx = rows[i + 1];
      if (nx && r.cells.length >= 2 && r.cells.length === nx.cells.length && r.cells.filter(c => ID_HEAD.test(c.trim())).length >= 2 && !r.cells.some(c => /^(role|title|position|signature|attendance signature|contact information)$/i.test(c.trim())))
        pairRows.push({ cells: r.cells.map((c, k) => c + ': ' + nx.cells[k]) });
    });
    rows.forEach((r, i) => {
      if (r.cells.length < 2 || r.cells.filter(c => ID_HEAD.test(c.trim())).length < 2) return;
      let k = i - 1; while (k >= 0 && /^[_\s|]+$/.test(rows[k].text)) k--;
      const pv = rows[k];
      if (!pv || pv.page !== r.page || pv.heading || pv.cells.length !== r.cells.length || pv.cells.some(c => ID_HEAD.test(c.trim()) || /:\s*$/.test(c))) return;
      // a bare "Name" under a contact or doctor line is someone else, never the student
      const cells = []; r.cells.forEach((c, j) => { if (/^name$/i.test(c.trim())) { const v = pv.cells[j].replace(/^(mr|mrs|ms|miss|dr)\.?\s+/i, '').split(',')[0].trim(); if (/^\p{Lu}[\p{L}'\-]+(\s+\p{Lu}[\p{L}'\-]+){0,2}$/u.test(v)) { add('other', v, 'Another person\'s name'); v.split(/\s+/).forEach(w => add('other', w, 'Another person\'s name')); } } else cells.push(c.replace(/['’]/g, "'") + ': ' + pv.cells[j]); });
      pairRows.push({ cells });
    });
    rows.concat(pairRows).forEach(r => labelCells(r).forEach(cell => {
      // a cell may contain several "Label: value" pairs on one line
      const parts = cell.split(/\s{2,}|_{3,}|\s(?=(?:DOB|Date of Birth|ID#?|SSID|Phone|Grade|School|Parents?|Email|Address)\s*[:#])|(?<!Adult|Birth|Plan|Review)\s(?=(?:IEP|Case|Meeting|Date|Phone|Grade|School|Parents?|Guardians?|Email|Address|DOB|ID|Student|Disability|Primary|Teacher|District|Annual|Projected|Eligibility|Home|Language|Age|Gender|Next|Review|Initial|Fecha|Grado|Padres?|Madre|Tutora?|Tel[eé]fono|Escuela|Direcci[oó]n|Nombre|N[uú]mero)(?![\p{L}])[\p{L}#\/ ]{0,25}:\s)/u);
      parts.forEach(p => {
        p = p.trim();
        for (const [kind, re] of LABELS) {
          const m = p.match(re); if (!m) continue;
          let v = m[1].trim();
          if (kind === 'student') {
            v = v.replace(/\s+(DOB|Date|ID|Grade|School|Fecha|Grado|Escuela)\b.*$/i, '').trim();
            if (!/\p{L}{2,}/u.test(v) || v.split(/\s+/).length > 5) continue;
            if (/,/.test(v)) { const [last, first] = v.split(',').map(x => x.trim()); if (first) v = first + ' ' + last; }
            if (add('student', v, 'Student name') && !studentFull) studentFull = nameOnly(v);
          } else if (kind === 'parent') {
            v = v.replace(/\s+(Phone|Email|Address|Tel[eé]fono|Correo|Direcci[oó]n)(?![\p{L}]).*$/iu, '');
            const ppl = splitPeople(v);
            // "Priya and Raj Patel": give the shared last name to first names
            const last = ppl.length ? ppl[ppl.length - 1].split(/\s+/).slice(-1)[0] : '';
            ppl.forEach(pn => { add('parent', pn, 'Parent or guardian'); if (!/\s/.test(pn) && last && last !== pn) add('parent', pn + ' ' + last, 'Parent or guardian'); else if (/\s/.test(pn)) add('parent', pn.split(/\s+/)[0], 'Parent or guardian'); });
          } else if (kind === 'dob') add('dob', v.split(/\s+/)[0], 'Date of birth');
          else if (kind === 'sid') add('sid', v, 'Student ID');
          else if (kind === 'address') add('address', v, 'Home address');
          break;
        }
      });
    }));
    if (!studentFull) rows.slice(0, 40).some(r => { const m = r.text.replace(/\s*\|\s*/g, ' ').match(/\b(?:IEP|Program|Plan|Profile|Summary)\s+for:?\s+(\p{Lu}[\p{Ll}'\-]+(?:\s+\p{Lu}[\p{Ll}'\-]+){1,2})\s*(?:\(name of (?:the )?student\))?\s*$/iu); if (m && !m[1].split(/\s+/).some(w => COMMON_CAPS.has(w))) { studentFull = m[1]; add('student', m[1], 'Student name'); return true; } return false; });
    // team and participant tables ("Role | Name | Contact | Signature"): everyone listed is another person
    let teamCols = null;
    rows.forEach(r => {
      if (r.cells.length >= 2 && r.cells.some(c => /^(role|title|position)$/i.test(c.trim())) && r.cells.some(c => /^((504 )?team members?|name|members?|participants?|attendance signature|signature)$/i.test(c.trim()))) {
        teamCols = r.cells.map((c, k) => /^((504 )?team members?|name|members?|participants?|attendance signature|signature)$/i.test(c.trim()) ? k : -1).filter(k => k >= 0); teamCols.n = r.cells.length; return;
      }
      if (!teamCols) return;
      if (r.heading || r.cells.length < 2 || Math.abs(r.cells.length - teamCols.n) > 1) { if (r.heading || r.cells.length < 2) teamCols = null; return; }
      teamCols.forEach(k => {
        const v = (r.cells[k] || '').replace(/^(mr|mrs|ms|miss|dr|sr|sra)\.?\s+/i, '').replace(/^(?:mr\.? & mrs\.?)\s+/i, '').trim();
        if (!/^\p{Lu}[\p{L}'\-]+(\s+\p{Lu}[\p{L}'\-]+){0,2}$/u.test(v)) return;
        add('other', v, 'Team member\'s name'); const ps = v.split(/\s+/); if (ps.length > 1) ps.forEach(w => { if (w.length > 2) add('other', w, 'Team member\'s name'); });
      });
    });
    rows.forEach(r => { (r.text.match(PHONE) || []).forEach(p => add('phone', p, 'Phone number')); (r.text.match(EMAIL) || []).forEach(e => add('email', e, 'Email address')); });
    // Possible names nobody labeled: capitalized words in mid-sentence that never appear in lowercase
    // (names rarely do) and aren't ordinary IEP words. Shown in step 2, checked, so the teacher can confirm.
    const all = rows.map(r => r.text).join(' \n ');
    const capCount = {}, lower = new Set();
    (all.match(/(?<![\p{L}])\p{Ll}[\p{Ll}']+/gu) || []).forEach(w => lower.add(w));
    const CL0 = classifier(), WL0 = wordList();
    const ordinary = w => COMMON_CAPS.has(w) || NOT_NAME.has(w.toLowerCase()) || lower.has(w.toLowerCase()) || /^(He|She|They|The|His|Her|Their|This|That|These|Those|When|If|And|But|For|With|Our|Your|Its|It|We|You|I|A|An|In|On|At|To|Of|By|As|Or|No|Not|All|Any|Each|Some|Per|El|La|Los|Las|Un|Una|Su|Sus|Si|Cuando|Para|Con|En|De|Del|Por|Y|Es|Este|Esta)$/.test(w) || (CL0 && CL0.known && CL0.known(w)) || (WL0 && WL0.has(w));
    const known = new Set(found.map(f => f.value.toLowerCase()).join(' ').split(/\s+/));
    // other people: staff with a title, and classmates or family members named next to a word that says so
    const NM = "\\p{Lu}\\p{Ll}{2,}(?:-\\p{Lu}\\p{Ll}+)?";
    const OTHER = new RegExp("(?<![\\p{L}])(Mr|Mrs|Ms|Miss|Mx|Dr|Coach|Sr|Sra|Srta|Prof)\\.?\\s+(\\p{Lu}\\p{Ll}+(?:-\\p{Lu}\\p{Ll}+)?(?:\\s+\\p{Lu}\\p{Ll}+(?:-\\p{Lu}\\p{Ll}+)?)?)|(?<![\\p{L}])(away from|apart from|separated? from|near|next to|beside|sits? (?:with|by|near)|seated (?:with|by|near)|friends?(?: named)?|classmates?|peers?(?: named)?|(?:little |big |older |younger |baby )?(?:sister|brother|sibling|cousin|aunt|uncle|grandmother|grandma|grandfather|grandpa|stepmother|stepfather|stepmom|stepdad|twin)s?|lejos de|cerca de|al lado de|junto a|(?:su |sus )?(?:amig[oa]s?|compañer[oa]s?|herman[oa]s?(?: menor(?:es)?| mayor(?:es)?)?|prim[oa]s?|tí[oa]s?|ti[oa]s?|abuel[oa]s?)),?\\s+(" + NM + "(?:(?:\\s*,\\s*|,?\\s+(?:and|or|&|y|o)\\s+)" + NM + ")*)", 'gu');
    let om;
    while ((om = OTHER.exec(all))) {
      const ctx = om[1] ? om[1] + '. ' + om[2] : om[3].toLowerCase() + ' ' + om[4];
      (om[2] ? om[2].split(/\s+/) : om[4].split(/\s*,\s*|,?\s+(?:and|or|&|y|o)\s+/)).forEach(w => {
        if (!w || COMMON_CAPS.has(w) || NOT_NAME.has(w.toLowerCase()) || known.has(w.toLowerCase()) || (!om[2] && ordinary(w))) return;
        add('other', w, 'Another person\'s name ("' + ctx.slice(0, 40) + '")');
      });
    }
    const re = /(?<![\p{L}'])\p{Ll}[\p{Ll}']*,? (\p{Lu}\p{Ll}{2,})(?:'s)?(?![\p{L}])(?! \p{Lu})/gu; let mm;
    while ((mm = re.exec(all))) { const w = mm[1]; capCount[w] = (capCount[w] || 0) + 1; re.lastIndex = mm.index + mm[0].length - w.length; }
    Object.entries(capCount).filter(([w]) => !ordinary(w) && !known.has(w.toLowerCase()) && !found.some(f => f.value === w))
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .forEach(([w, n]) => add('maybe', w, 'Possible name (appears ' + n + (n === 1 ? ' time)' : ' times)')));
    // a capitalized word right after the student's name is often an unlabeled middle or family name
    if (studentFull) {
      const re2 = new RegExp(escRe(studentFull) + "[ \\t]+(\\p{Lu}[\\p{L}\\-]{2,})(?:'s)?(?![\\p{L}])", 'gu'); let m2;
      while ((m2 = re2.exec(all))) if (/[a-z]/.test(m2[1]) && !COMMON_CAPS.has(m2[1]) && !lower.has(m2[1].toLowerCase())) add('maybe', m2[1], 'Possible family name (follows the student\'s name)');
    }
    if (!studentFull) { const m = found.find(f => f.kind === 'maybe' && (all.match(new RegExp('\\b' + escRe(f.value) + "(?:'s)? (?:will|is|has|was|can|does|needs|receives)\\b", 'g')) || []).length >= 2); if (m) { m.kind = 'first'; m.label = 'Likely student first name (appears often)'; studentFull = m.value; } }
    // name parts: first name, last name, middle initial forms
    if (studentFull) {
      const parts = studentFull.split(/\s+/).filter(p => !/^[A-Z]\.?$/.test(p));
      if (parts.length >= 2) {
        add('student', parts[0] + ' ' + parts[parts.length - 1], 'Student name');
        add('student', parts[parts.length - 1] + ', ' + parts[0], 'Student name');
        add('first', parts[0], 'Student first name');
        add('last', parts[parts.length - 1], 'Family name');
      }
    }
    found.forEach(f => {
      if (f.kind === 'parent') { const ps = f.value.split(/\s+/); if (ps.length >= 2) add('last', ps[ps.length - 1], 'Family name'); }
    });
    return { list: found, studentFull, code: studentFull ? initialsOf(studentFull) : 'Student' };
  }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function makeRedactor(ids, code, extra) {
    const subs = [];
    const order = { student: 1, parent: 2, address: 3, email: 4, phone: 5, sid: 6, dob: 7, first: 8, last: 9, maybe: 10, other: 10, custom: 0 };
    ids.filter(i => i.on !== false).slice().sort((a, b) => (order[a.kind] - order[b.kind]) || b.value.length - a.value.length).forEach(i => {
      const rep = i.kind === 'student' || i.kind === 'first' ? code : i.kind === 'maybe' || i.kind === 'other' ? '[name]' : i.kind === 'parent' ? '[parent]' : i.kind === 'last' ? '[family name]' : i.kind === 'dob' ? '[date of birth]' : i.kind === 'sid' ? '[student ID]' : i.kind === 'phone' ? '[phone]' : i.kind === 'email' ? '[email]' : i.kind === 'address' ? '[address]' : '[removed]';
      const word = /^[\p{L}\p{N}]/u.test(i.value) && /[\p{L}\p{N}.]$/u.test(i.value);
      subs.push([new RegExp((word ? '(?<![\\p{L}\\p{N}_])' : '') + escRe(i.value) + (word && /[\p{L}\p{N}]$/u.test(i.value) ? '(?![\\p{L}\\p{N}_])' : ''), 'giu'), rep]);
    });
    (extra || []).forEach(x => { if (x && x.trim()) subs.push([new RegExp('(?<![\\p{L}\\p{N}_])' + escRe(x.trim()) + '(?![\\p{L}\\p{N}_])', 'giu'), '[removed]']); });
    subs.push([PHONE, '[phone]'], [EMAIL, '[email]']);
    return s => { let t = String(s || ''); subs.forEach(([re, rep]) => { t = t.replace(re, rep); }); return t.replace(/\b([A-Z]\.(?:[A-Z]\.)?)\./g, '$1'); };
  }

  /* ---------------- 4. glossary (plain language + in-practice tips) ---------------- */
  const ABBR = [
    [/\((?:the )?student'?s name'?s\)/gi, "the student's"], [/\((?:the )?student'?s name\)|\(name of (?:the )?student\)/gi, 'the student'], [/\bs\/he\b/g, 'they'], [/\bS\/he\b/g, 'They'],
    [/\bOT\b/g, 'occupational therapy'], [/\bPT\b/g, 'physical therapy'], [/\bSLP\b/g, 'speech-language pathologist'],
    [/\bSAI\b/g, 'specialized academic instruction'], [/\bRSP\b/g, 'resource specialist program'], [/\bICT\b/g, 'integrated co-teaching'],
    [/\bBIP\b/g, 'behavior intervention plan'], [/\bFBA\b/g, 'functional behavior assessment'], [/\ban AAC( device)?\b/g, 'a communication device'], [/\bAAC( device)?\b/g, 'communication device'],
    [/\bESY\b/g, 'extended school year'], [/\bGen\.? Ed\.?\b/gi, 'general education'], [/\bw\/\s*/g, 'with '], [/\bmins?\b\.?/g, 'minutes'],
    [/\b(\d+)\s*x\s*(weekly|per week|a week|\/\s*wk|wk)\b/gi, '$1 times a week'], [/\b(\d+)\s*x\s*(monthly|per month|a month|\/\s*mo)\b/gi, '$1 times a month'],
    [/\b(\d+)\s*x\s*daily\b/gi, '$1 times a day'], [/(time and a half|double time) \((1\.5|2)x\)/gi, '$1'], [/\b1\.5x\b/gi, '1.5 times'], [/\b2x\b/gi, '2 times']
  ];
  function plainText(s) { let t = norm(s); ABBR.forEach(([re, r]) => { t = t.replace(re, r); }); return capFirst(t); }
  const GLOSS = [
    [/extended time|extra time|time and a half|1\.5|double time|additional time/i, 'Plan for the extra time before the class moves on, and don\'t mark work late if it was used.'],
    [/preferential seating|seat(ed|ing)? (near|close|away|in the front)|seat away/i, 'Seat the student where you can easily check in, away from doors, windows and busy areas.'],
    [/refocus|redirect/i, 'Use a quiet cue, like a tap on the desk or a code word, without calling the student out in front of the class.'],
    [/check(s|-ins?)? for understanding|check(s)?-?in|frequent check/i, 'Before independent work, have the student explain the task back or show you the first step.'],
    [/copy of (class )?notes|guided notes|notes provided/i, 'Give a printed or digital copy of the notes; the student still follows along.'],
    [/directions? (repeated|clarified|read aloud|restated)|repeat(ed)? directions|read directions/i, 'Repeat directions one-on-one and have the student say them back.'],
    [/visual (checklist|schedule|supports?|timer)/i, 'Keep the visual where the student can see it and point to it instead of repeating verbal directions.'],
    [/speech.to.text|dictat/i, 'Let the student dictate written work; it counts as the student\'s own writing.'],
    [/text.to.speech|read aloud|tests? read|questions read|audio/i, 'Read questions and directions aloud, unless the IEP excludes a test (for example, reading comprehension).'],
    [/separate (location|setting|room)|small group|reduced distraction/i, 'Arrange the quieter room or small group ahead of time, before test day.'],
    [/break(s)?\b|movement break/i, 'Breaks are short and planned. Use a timer and give a clear signal to return.'],
    [/break card|help card/i, 'Honor the card every time it\'s used appropriately; that is how the replacement skill is learned.'],
    [/calculator|multiplication chart|number line/i, 'Allow the tool on classwork and tests unless the skill being tested is the calculation itself.'],
    [/graphic organizer|sentence starter|word bank|model (paragraph|of|or example)|example of completed/i, 'Hand it out at the start of the task, not after the student gets stuck.'],
    [/chunk|break (long )?(assignments|tasks|writing)|smaller (parts|steps)/i, 'Give one part at a time, with a quick check before the next part.'],
    [/reduced (homework|assignments|workload)|shortened (assignments?|tests?|work|spelling)|fewer (problems|questions|items)|odd.numbered/i, 'Grade only the reduced amount; this is planned, not a penalty.'],
    [/slant board|pencil grip|adapted paper|raised.line/i, 'Have the tool ready at the student\'s seat before written work starts.'],
    [/oral(ly)? (response|answer)|answer (questions )?orally|respond orally/i, 'Accept spoken answers when the task isn\'t measuring writing.'],
    [/noise|headphone|ear (muffs|plugs)/i, 'Offer them before noisy activities and during tests.'],
    [/fidget|sensory tool|wiggle seat/i, 'The tool is for focus, not play; set expectations privately.'],
    [/large print|enlarged/i, 'Request enlarged copies ahead of time.'],
    [/\bscribe\b/i, 'Write exactly what the student says, without correcting it.'],
    [/spell.?check/i, 'Don\'t take off points for spelling when the tool is allowed.'],
    [/wait time|extra time to respond|processing time/i, 'Wait several seconds after asking before repeating or rephrasing.'],
    [/praise|positive reinforcement|reinforc/i, 'Be specific: name the behavior you saw ("You started right away").'],
    [/warning before|advance notice|transition warning|warning before (changes|transitions)/i, 'Give a heads-up a few minutes before changes in activity or routine.'],
    [/first.then/i, 'Show the "first" task and the "then" reward together, and follow through.'],
    [/peer (buddy|helper|partner)|partner work/i, 'Choose a patient partner and change partners regularly.']
  ];
  const TIPS_ES = ["Planee el tiempo adicional antes de que la clase siga adelante, y no marque el trabajo como tarde si lo usó.", "Siente al estudiante donde pueda acercarse fácilmente, lejos de puertas, ventanas y zonas con mucho movimiento.", "Use una señal discreta, como tocar el pupitre o una palabra clave, sin señalar al estudiante frente a la clase.", "Antes del trabajo independiente, pida al estudiante que explique la tarea o que le muestre el primer paso.", "Dé una copia impresa o digital de los apuntes; el estudiante sigue la clase de todos modos.", "Repita las instrucciones de forma individual y pida al estudiante que las diga con sus palabras.", "Mantenga el apoyo visual donde el estudiante lo vea y señálelo en lugar de repetir instrucciones.", "Deje que el estudiante dicte el trabajo escrito; cuenta como su propia escritura.", "Lea en voz alta las preguntas y las instrucciones, a menos que el IEP excluya una prueba (por ejemplo, comprensión de lectura).", "Prepare el salón tranquilo o el grupo pequeño con anticipación, antes del día de la prueba.", "Los descansos son cortos y planificados. Use un temporizador y dé una señal clara para regresar.", "Respete la tarjeta cada vez que se use de forma adecuada; así se aprende la conducta de reemplazo.", "Permita la herramienta en tareas y pruebas, a menos que lo que se evalúa sea el cálculo mismo.", "Entréguelo al inicio de la tarea, no después de que el estudiante se atasque.", "Dé una parte a la vez, con una revisión rápida antes de la siguiente.", "Califique solo la cantidad reducida; es algo planificado, no un castigo.", "Tenga la herramienta lista en el lugar del estudiante antes de empezar a escribir.", "Acepte respuestas orales cuando la tarea no evalúa la escritura.", "Ofrézcalos antes de actividades ruidosas y durante las pruebas.", "La herramienta es para concentrarse, no para jugar; explique las expectativas en privado.", "Pida copias ampliadas con anticipación.", "Escriba exactamente lo que dice el estudiante, sin corregirlo.", "No quite puntos por ortografía cuando la herramienta está permitida.", "Espere varios segundos después de preguntar antes de repetir o reformular.", "Sea específico: nombre la conducta que vio (\"Empezaste enseguida\").", "Avise unos minutos antes de cambios de actividad o de rutina.", "Muestre juntas la tarea de \"primero\" y la recompensa de \"después\", y cumpla.", "Elija un compañero paciente y cambie de compañero con regularidad."];
  const GLOSS_ES = [/tiempo (adicional|extra)|tiempo y medio|doble de tiempo|1\.5 veces/i, /asiento preferencial|sentar(lo|la)? cerca/i, null, /(verificar|comprobar) (la )?comprension/i, /copia de (los )?apuntes|notas guiadas/i, /repetir (las )?instrucciones|instrucciones repetidas/i, /horario visual|apoyos? visual|lista visual/i, /dictado|voz a texto/i, /(lectura|leidas?|leer|leen) en voz alta|lectura oral/i, /grupo pequeno|lugar separado|salon separado/i, /descansos?/i, null, null, /organizadores? graficos?|iniciadores de oraciones|banco de palabras/i, /dividir (las )?tareas|partes mas pequenas/i, /(tareas|trabajos)[^.]{0,30}(mas cortas|mas cortos|reducid)|menos (problemas|preguntas)/i, null, /respuestas? orales?|responder oralmente/i, /audifonos|tapones/i, null, null, /\bescriban?o\b|escribiente/i, null, null, null, /aviso (antes|previo)/i, null, null];
  // which tip fits a line (English or Spanish); -1 for none, or for a line that forbids something
  function tipKey(text) {
    const t = String(text || ''), f = fold(t);
    if (/\b(never|do not|don't|does not|doesn't|should not|shouldn't|must not|avoid|no longer)\b/i.test(t) || /\bnunca\b|\bno (le|lo|la|les|se|debe)\b|\bevite\b/i.test(f)) return -1;
    for (let k = 0; k < GLOSS.length; k++) if (GLOSS[k][0].test(t) || (GLOSS_ES[k] && GLOSS_ES[k].test(f))) return k;
    return -1;
  }
  // no tip for a line that forbids something ("Never ask him to read aloud"), since the tip would contradict it
  function tipFor(text) { if (/\b(never|do not|don't|does not|doesn't|should not|shouldn't|must not|avoid|no longer)\b/i.test(text)) return ''; for (const [re, tip] of GLOSS) if (re.test(text)) return tip; return ''; }

  /* ---------------- 5. services parsing ---------------- */
  function parseService(text, cols) {
    const t = norm(text);
    const out = { name: '', freq: '', dur: '', loc: '', provider: '', inClass: null };
    let name = cols && cols[0] ? cols[0] : t;
    name = name.replace(/^\d{3}\s*-\s*/, '').trim();
    out.name = name;
    const all = (cols ? cols.join(' | ') : t);
    let m;
    if ((m = fold(all).match(/(\d+)\s*min(?:utos?)?\b[^|]*?(?:(\d+|una|dos|tres|cuatro|cinco)\s*(?:veces|vez)\s*(?:por|a la|al)\s*(semana|dia|mes))?/i)) && /\bmin(utos?)?\b/i.test(fold(all)) && /minutos|veces|diari|semanal|mensual/i.test(fold(all))) {
      const f = fold(all).toLowerCase();
      out.dur = m[1] + ' min';
      const nn = { una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5 };
      const vm = f.match(/(\d+|una|dos|tres|cuatro|cinco)\s*(?:veces|vez)\s*(?:por|a la|al)\s*(semana|dia|mes)/);
      if (vm) out.freq = (nn[vm[1]] || vm[1]) + 'x/' + ({ semana: 'week', dia: 'day', mes: 'month' })[vm[2]];
      else if (/diari|cada dia|todos los dias/.test(f)) out.freq = 'daily'; else if (/semanal/.test(f)) out.freq = 'weekly'; else if (/mensual/.test(f)) out.freq = 'monthly';
      out.es = true;
      const lf = fold(cols ? cols.slice(1).join(' ') : all).toLowerCase();
      if (/salon (de )?(recursos|terapia|educacion especial)|aula de recursos|fuera del salon|salon separado/.test(lf)) out.inClass = false; else if (/salon general|aula general|clase general|educacion general|en el salon/.test(lf)) out.inClass = true;
      if (cols && cols.length > 2) out.loc = cols[cols.length - 1];
      return out;
    }
    // "310 min x 5 Totaling: 1550 min served Weekly"
    if ((m = all.match(/(\d+)\s*min(?:utes)?\.?\s*x\s*(\d+)\b[^|]*?\b(weekly|monthly|daily|yearly)\b/i))) {
      out.dur = m[1] + ' minutes'; out.freq = m[2] + (m[2] === '1' ? ' time ' : ' times ') + per(m[3]);
      return finish();
    }
    if ((m = all.match(/(\d+)\s*min(?:utes)?\.?\s*(?:x|per|\/|a)\s*(week|weekly|wk|day|daily|month|monthly|mo|year|yearly)\b/i))) {
      out.freq = per(m[2]); out.dur = m[1] + ' minutes total';
    }
    if ((m = all.match(/(\d+|one|two|three|four|five)\s*(?:x|times?|sessions?)\s*(?:per\s*|a\s*|\/\s*|each\s*)?(week|weekly|wk|day|daily|month|monthly|mo|year)\b/i))) { const n = num(m[1]); out.freq = n + (String(n) === '1' ? ' time ' : ' times ') + per(m[2]); }
    else if ((m = all.match(/\b(once|twice)\s*(?:a|per|each)\s*(week|month|day)\b/i))) out.freq = (m[1].toLowerCase() === 'once' ? '1 time' : '2 times') + ' a ' + m[2].toLowerCase();
    else if (!out.freq && /\bdaily|every day|each day\b/i.test(all)) out.freq = 'daily';
    else if (!out.freq && /\bweekly\b/i.test(all)) out.freq = 'weekly';
    else if (!out.freq && /\bmonthly\b/i.test(all)) out.freq = 'monthly';
    if (!/total/.test(out.dur) && (m = all.match(/(\d+)\s*-?\s*min(?:ute)?s?\b/i))) out.dur = m[1] + ' minutes';
    return finish();
    function finish() {
    const locs = [/general education classroom|regular class(room)?|in the classroom|general education setting|gen(eral)? ed(ucation)?\b/i, /resource room|separate (location|classroom|class|setting)|special class|pull.?out|ot room|speech room|therapy room|counseling office|the [a-z]+ room/i];
    if (cols && cols.length > 1) {
      cols.slice(1).forEach(c => { if (locs[0].test(c) || locs[1].test(c) || /classroom|room|facility|setting|school/i.test(c)) if (!out.loc) out.loc = c; if (/teacher|patholog|therapist|psycholog|specialist|counsel|nurse|aide|para/i.test(c) && !/classroom/i.test(c)) out.provider = c; });
    } else {
      const lm = t.match(/(?:in|at) (the )?([a-z -]*(?:room|classroom|class|office|setting))/i); if (lm) out.loc = lm[0].replace(/^(in|at) /i, '');
    }
    const locTxt = out.loc || all;
    if (locs[0].test(locTxt)) out.inClass = true; else if (locs[1].test(locTxt)) out.inClass = false;
    return out;
    }
    function per(w) { w = w.toLowerCase(); return /^(week|weekly|wk)$/.test(w) ? 'a week' : /^(day|daily)$/.test(w) ? 'a day' : /^(month|monthly|mo)$/.test(w) ? 'a month' : 'a year'; }
    function num(w) { const n = { one: 1, two: 2, three: 3, four: 4, five: 5 }[String(w).toLowerCase()]; return n || w; }
  }
  function serviceSentence(s) { return /\b(instruction|therapy|counsel|consult|speech|occupational|physical therapy|services?|co-teaching|resource|support)\b/i.test(s) && /\b(\d+\s*min|minutes|daily|weekly|monthly|times|twice|once|x\s*week)\b/i.test(s); }
  function servicePlain(p) {
    if (p.es) {
      // Spanish IEP: say it in Spanish
      const fq = /^(\d+)x\/(week|day|month)$/.exec(p.freq || '');
      const per = { week: 'por semana', day: 'al día', month: 'al mes' };
      const bits = [];
      if (fq) bits.push(fq[1] + (fq[1] === '1' ? ' vez ' : ' veces ') + per[fq[2]]); else if (p.freq) bits.push({ daily: 'todos los días', weekly: 'cada semana', monthly: 'cada mes' }[p.freq]);
      if (p.dur) bits.push(p.dur.replace(/ min$/, ' minutos') + (fq ? ' cada vez' : ''));
      return capFirst(p.name) + (bits.length ? ': ' + bits.join(', ') : '') + (p.inClass === true ? ' · en el salón de clases' : p.inClass === false ? ' · fuera del salón' + (p.loc ? ' (' + p.loc.toLowerCase() + ')' : '') : '');
    }
    let s = capFirst(plainText(p.name).replace(/^(the student|[A-Z]\.[A-Z]?\.?) will receive /i, ''));
    const bits = [];
    if (p.freq && p.dur && /total/.test(p.dur)) bits.push(p.dur.replace(' total', '') + ' ' + p.freq);
    else { if (p.freq) bits.push(p.freq); if (p.dur) bits.push(p.dur + (p.freq && p.freq !== 'daily' ? ' each' : '')); }
    let line = s + (bits.length ? ': ' + bits.join(', ') : '');
    if (p.inClass === true) line += ' · in the general education classroom';
    else if (p.inClass === false) line += ' · outside the classroom' + (/resource room/i.test(p.loc) ? ' (resource room)' : '');
    else if (p.loc) line += ' · ' + plainText(p.loc).replace(/^[A-Z](?=[a-z])/, c => c.toLowerCase());
    return line;
  }

  /* ---------------- 6. sectioning and item extraction ---------------- */
  const BOILER = /^(none|n\/a|na|not applicable|no|yes|none noted|see attached|-|ninguno|ninguna|no aplica|sí|si|ver adjunto)\.?$/i;
  const BOILER_SENT = /^none needed\b|^(will|and|or|the|of|y|n)$|was reviewed and remains appropriate|^\d*\s*iep dates\b|^n\/a if\b|^refer to\b|^see attached|§|\b\d+ (CFR|TAC|U\.S\.C\.)\b|^(provide|include) (a|an) (statement|explanation|description|justification)\b|\b(committee|team),? (must|shall|has considered)\b|\b(the )?iep must include\b|^(duplicate|complete) (this|these|sections?)\b|^key\s*:|^(special education|related services|supplementary aids and services|program modifications|supports for (school )?personnel|type of services)$|^\*{1,2}\s|^purpose\s*:|^\*{0,2}(conditions|implementation recommendations)\s*[-—:]|^\(to be completed|will participate in the same|accommodations listed above|_{3,}|\(date\)|\b(Volume|Vol\.) \d+, (Supplement|No\.)|\b(describe|list|indicate|explain|write)\b[^.]{0,80}\bhere\b|^(the )?parents?(\s*\/\s*guardians?)? (will|shall|must|is responsible|are responsible) (supply|provide|send|be responsible|for providing)|^the parent\/guardian is responsible|^(the )?parents?(\s*\/\s*guardians?)?(\s*\/\s*adult student)? (will|shall|must|may|should)\b|\bplease (use|list|select|indicate|add|explain|check|circle|attach|complete|note)\b|\(circle one|\(check one|\b(this|the) (504 )?plan (shall|will|must) be reviewed|^(no|n\/a) related service|^\W{0,2}\s*(the )?(iep )?team (has )?(discussed|reviewed|considered)( and determined)?\b|^\W{0,2}\s*if student is taking|^ver (el |la )?(documento|plan|hoja) adjunt[oa]|^(el|la) (estudiante|alumn[oa]) no (requiere|necesita)|^\W{0,2}\s*el equipo (del iep )?(discutió|discutio|consideró|considero|determinó|determino)\b|\b(considered and rejected|considered but rejected|options? (considered and )?rejected|reasons? for rejection|was rejected because)\b|^(the student|[A-Z]\.([A-Z]\.)?|[A-Z][a-z]+|he|she|they) (does not|doesn't|did not) (require|need|qualify for)\b|\b(follow|implement|see|refer to) (the )?(behaviou?r |health |safety )?(plan|bip|document)s? (in|as described in|on) (the )?attached\b|\b(plan|bip) in the attached (document|file)|^[^:]{3,80}:\s*(n\/a|not applicable)\b|does not need special transportation|not eligible for 12.month|progress reports? will be provided|^page \d+/i;
  const HEADER_WORDS_RE = /^(targeted behaviou?r|behaviou?r|undesired behaviou?r|reward for desired|reward or consequence|consequence for|person responsible for|area of( educational need)?|educational need|(accommodation )?or service|accommodation|person\(s\) responsible( for implementing)?|for implementing|frequency of( accommodation or service)?|servicios?|frecuencia|duraci[oó]n|lugar|ubicaci[oó]n|proveedor|responsable|fecha de inicio|fecha (de )?(fin|final|terminaci[oó]n)|acomodaci[oó]n(es)?|[aá]rea|clases?|materias?|classes|frequency|duration|location|criteria|method|schedule|conditions|provider|start date|end date|service delivery|implementation|projected|annual goal|testing accommodation|service|related services|special education program|supplementary aids|assistive technology|supports for school personnel|subject|setting|baseline|how (progress )?(is |will be )?measured|evaluation|progress|assessments?|field|information|accommodations?|supports?|area|who|when|where|description|participation|concurrent|service\(s\)|monitor|assessments?|notes|will participate|assessment\/content area|start\/end dates|services\/supports( \(.*\))?|location of( services\/supports)?|frequency codes|school year\(s\)|grade\(s\)|direct\/?|consult|curriculum|determined by|course\/curriculum|teks curriculum|evaluation procedure|evaluation codes|how often|length of|where service( will be)?|recommendations?\*?|provided|session|beginning\/?|service date\(s\)|special education program\/services|date\(s\)|s\*)\s*$/i;
  const HEADER_WORDS = { test: c => HEADER_WORDS_RE.test(String(c).replace(/\*+\s*$/, '').trim()) };
  const BEH_LABELS = [
    ['target', /^(conducta (objetivo|meta|problema|de preocupaci[oó]n)|descripci[oó]n de la conducta|what it looks like|what we see|target behaviou?rs?|the behaviou?r impeding learning is|behaviou?r impeding learning|problem behaviou?r|behaviou?r of concern|description of (the )?behaviou?r)\s*:?\s*/i],
    ['function', /^(funci[oó]n de la conducta|hip[oó]tesis|por qu[eé] ocurre|why (?:we think )?it happens|likely function|function(?: of (?:the )?behaviou?r)?|hypothes[ie]s(?: statement)?|it impedes learning because|why it happens)\s*:?\s*/i],
    ['triggers', /^(desencadenantes?|detonantes?|antecedentes|cu[aá]ndo ocurre|antecedents?(?:\s*\/\s*triggers?)?|triggers?|setting events?|when it is likely to happen|predictors?)\s*:?\s*/i],
    ['prevent', /^(estrategias? de prevenci[oó]n|prevenci[oó]n|estrategias?|strateg(?:y|ies)|interventions?|teaching strateg(?:y|ies)|prevention strateg(?:y|ies)|prevent it|prevention|what helps(?: beforehand| before)?|before it happens|environmental changes(?:,? structure)?(?: and supports)?|proactive strateg(?:y|ies)|strateg(?:y|ies) to prevent|supports?|antecedent strateg(?:y|ies))\s*:?\s*/i],
    ['replace', /^(conducta (de reemplazo|alternativa)|habilidades? a enseñar|what we teach instead|replacement behaviou?rs?|teach instead|alternative behaviou?r|skills? to teach)\s*:?\s*/i],
    ['respond', /^(respuesta(?: del personal)?|qu[eé] hacer|reacci[oó]n|what adults do|what to do|when it happens|if it happens|responses?(?: when the behaviou?r occurs)?|reactive strateg(?:y|ies)|consequences?|when the behaviou?r occurs|staff response)\s*:?\s*/i],
    ['crisis', /^(plan de (crisis|seguridad|emergencia)|crisis (?:plan|response)|emergency (?:plan|procedures)|safety plan)\s*:?\s*/i],
    ['reinforce', /^(refuerzos?|reforzadores|recompensas?|reinforce(?:ment|rs)?|rewards?)\s*:?\s*/i]
  ];
  const DIAG = /\b(autism|autistic|asd|adhd|attention[- ]deficit|specific learning disabilit|sld\b|dyslexi|dysgraphi|dyscalculi|other health impairment|\bohi\b|emotional (disturbance|disabilit)|intellectual disabilit|down syndrome|developmental delay|speech or language impairment|traumatic brain injury|multiple disabilities|anxiety disorder|depress|bipolar|ptsd|\bocd\b|oppositional|diagnos|eligibility|(primary|secondary) disability|disability category|autismo|tdah|trastorno|discapacidad|diagnóstic|elegibilidad)/i;
  const ACTION = /\b(call|911|give|administer|if|when|do not|don't|never|must|should|needs?|requires?|use|uses|keep|allow|provide|avoid|time it|watch for|check|remind|offer|prompt|seat|break|llame|llamar|llévelo|llévela|dé|dar|administr\w*|si|cuando|nunca|debe|necesita|use|usar|mantenga|permit\w*|evit\w*)\b/i;
  const SAFETY = /\b(seizures?|epilep\w*|epi-?pens?|epinephrine|anaphyla\w*|allerg\w*|911|inhalers?|asthma|medications?|insulin|diabet\w*|glucose|blood sugar|glucagon|rescue (med\w*|inhaler)|nasal spray|diastat|valtoco|midazolam|keppra|levetiracetam|choking|g-?tube|feeding tube|catheter|cardiac|heart condition|shunt|nebulizer|bee stings?|nut[- ]free|peanuts?|tree nuts?|convulsi\w*|epilepsia|alergi\w*|alérgic\w*|inhalador|asma|medicamentos?|medicinas?|insulina|diabetes|glucosa|azúcar en la sangre|epinefrina)\b/i;
  const SUPPORTISH = /\b(needs?|requires?|benefits? from|does best|works best|responds (well )?to|uses?|should|must|helps? (him|her|them)|most successful|when (given|provided|offered)|with (prompts?|support|cues?|reminders?)|is allowed|may use|do not|never)\b/i;
  const PAGE_HEAD = /^(student(?:'s)? name|name|dob|date of birth|student id|nyc id|local id|osis)\s*[:#][^|]*\|\s*(birth ?date|dob|date of birth|iep date|grade|student id|nyc id|osis|id)\b|^[A-Z]\.([A-Z]\.)?\s*\|\s*(nyc id|student id|osis|dob|birth ?date)\b/i;
  const CHECKED = /^\s*(☑|☒|✓|✔)\s*/;
  const BEH_NAMES = { target: 'Watch for', function: 'Why it happens', triggers: 'Often triggered by', prevent: 'Prevent it', replace: 'Teach and accept instead', respond: 'When it happens', crisis: 'Safety plan', reinforce: 'Reinforce', note: 'Also in the plan' };

  /* the on-device line classifier (src/classifier.js), if it is loaded */
  let CL = null;
  let WL = null;
  function wordList() {
    if (WL !== null) return WL;
    const g = typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : {});
    if (g.IEPWords) WL = g.IEPWords; else { try { WL = require('./words.js'); } catch (e) { WL = false; } }
    return WL;
  }
  function classifier() {
    if (CL !== null) return CL;
    const g = typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : {});
    if (g.IEPClassifier) CL = g.IEPClassifier;
    else { try { CL = require('./classifier.js'); } catch (e) { CL = false; } }
    return CL;
  }
  const CONTENT = ['accom', 'mods', 'at', 'testing', 'services', 'goals', 'behavior', 'health', 'strengths', 'personnel'];
  // "Goal 1 (Reading): text", "Goal #2 Area of Need: Math", "Goal 3: text"
  function parseGoalHead(t) {
    const m = norm(t).match(/^(?:annual\s+)?(?:goal|meta(?:\s+anual)?)\s*#?\s*(\d+)\s*(?:\(([^)]{2,40})\))?\s*(?:\|\s*)?(?:[-–:.]\s*)?(?:area(?: of need)?\s*:\s*([^|]+?)(?:\s*\|\s*|$))?(.*)$/i);
    if (!m) return null;
    let text = norm(m[4] || ''); let area = norm(m[2] || m[3] || '');
    if (!m[2] && !m[3]) { const am = text.match(/^(\p{Lu}[\p{L}\/ -]{2,28}):\s+(.+)$/u); if (am) { area = am[1]; text = am[2]; } }
    return { area, text };
  }

  const STRENGTH_LABEL = /^(?:strengths?|areas? of strength|student strengths?|fortalezas)\s*:\s*(.+)$/i;
  /* Checklists on forms. Keeps what was marked and drops the rest:
     - grids of numbered options with marks in columns ("12. Preferential seating | X | X") become one item each,
       with the column names (classes) the marks fall under;
     - options under "select / check all that apply" with a mark next to them keep only the marked labels;
     - a Yes / No / N/A chart keeps the lines marked Yes;
     - numbered lists with empty numbers left over, and instructions written into a table row, are form text. */
  const MARKC = /^(x|✓|✔|√|☑|☒)$/i;
  const TESTISH = /\b(at the time of|during|taking|finish|complete|retake|take) (an? |the |any |regular |all )?(exams?|tests?|testing|quiz(zes)?)\b/i;
  function checklists(rows) {
    rows.forEach(r => { if (r.cells.length > 1 && r.cells.slice(1).some(c => /^(list|indicate|describe|explain|circle) /i.test(c.trim()))) r.blankOpt = true; });
    const isItem = r => r.cells.length && /^\d{1,2}\.(\s|$)/.test(r.cells[0].trim()) && !r.heading;
    const isMarkCell = c => /^(x|✓|✔|√|☑|☒|\d{1,3}\s*%|\d{1,3})$/i.test(c.trim());
    for (let i = 0; i < rows.length; i++) {
      let j = i; while (j < rows.length && isItem(rows[j])) j++;
      if (j - i >= 5) {
        const run = rows.slice(i, j);
        const markedRow = r => r.cells.length > 1 && r.cells.slice(1).every(isMarkCell);
        if (run.some(markedRow) && run.filter(r => r.cells.length === 1).length >= 3) {
          let hdr = null;
          for (let k = i - 1; k >= Math.max(0, i - 4); k--) { const h = rows[k]; if (h.cells.length >= 3 && h.cells.every(c => c.length <= 16) && h.xs) { hdr = h; break; } }
          run.forEach(r => {
            if (!markedRow(r)) { r.blankOpt = true; return; }
            const label = r.cells[0].replace(/^\d{1,2}\.\s*/, '').replace(/(\s+\d{1,2}\.)+\s*$/, '').replace(/(?<=[a-z])X$/, '').replace(/\s*\((by %|frequency\?)\)/i, '').trim();
            const vals = [...new Set(r.cells.slice(1).map(c => c.trim()).filter(v => !MARKC.test(v)))];
            let cols = [];
            if (hdr && r.xs) cols = r.xs.slice(1).map(x => { let b = null, bd = 1e9; hdr.cells.forEach((c, k) => { const d = Math.abs(hdr.xs[k] - x); if (d < bd) { bd = d; b = c; } }); return bd <= 35 ? b : null; }).filter(Boolean);
            const t = label + (vals.length ? ': ' + vals.join(', ') : '') + (cols.length ? ' (' + [...new Set(cols)].join(', ') + ')' : '');
            r.cells = [t]; r.xs = [r.xs ? r.xs[0] : 0]; r.text = t; r.force = /\btest(ing|s)?\b|exam|assessment/i.test(label) ? 'testing' : 'accom';
          });
          if (hdr) hdr.blankOpt = true;
        }
      }
      if (j > i) i = j - 1;
    }
    // "Student need | Accommodation(s) for the need" tables: the accommodation is the item
    for (let i = 0; i < rows.length; i++) {
      const h = rows[i];
      const ni = h.cells.findIndex(c => /\b(student )?needs?\b|area of need/i.test(c)), ai = h.cells.findIndex(c => /^accommodation/i.test(c.trim()));
      if (h.cells.length !== 2 || ni < 0 || ai < 0 || ni === ai) continue;
      h.blankOpt = true;
      for (let j = i + 1; j < rows.length && !rows[j].heading && rows[j].cells.length <= 2; j++) {
        const r = rows[j]; if (r.cells.length < 2) { if (/^\d{1,2}\.?\s*$/.test(r.text.trim())) { r.blankOpt = true; continue; } break; }
        const acc = r.cells[ai].trim(), need = r.cells[ni].replace(/^\d{1,2}\.\s*/, '').replace(/(\s+\d{1,2}\.)+\s*$/, '').trim();
        if (!acc) { r.blankOpt = true; continue; }
        r.cells = [acc + (need ? ' (for: ' + need.charAt(0).toLowerCase() + need.slice(1) + ')' : '')]; r.xs = [0]; r.text = r.cells[0]; r.force = 'accom';
      }
    }
    for (let i = 0; i < rows.length; i++) {
      let j = i; while (j < rows.length && rows[j].cells.length === 1 && /^\d{1,2}\.(\s+.{0,45})?$/.test(rows[j].text.trim()) && !rows[j].force) j++;
      if (j - i >= 6 && rows.slice(i, j).filter(r => /^\d{1,2}\.\s*$/.test(r.text.trim())).length >= 2) rows.slice(i, j).forEach(r => { r.blankOpt = true; });
      if (j > i) i = j;
    }
    let run = null;
    rows.forEach(r => {
      if (r.blankOpt || r.force) return;
      const prompt = /\b(select|check|mark|circle)\b.{0,30}\b(all that apply|one|appropriate|the following|or add)\b|\(check one\)|\(circle one/i.test(r.text);
      const ynHead = r.cells.length >= 2 && r.cells.every(c => /^(yes|no|n\/?a)$/i.test(c.trim()));
      if (prompt && run && run.yn && !ynHead) { r.blankOpt = true; return; }
      if (prompt || ynHead) { run = { prompt: r.text, yn: ynHead && r.xs ? r.cells.map((c, k) => ({ v: c.trim().toLowerCase(), x: r.xs[k] })) : null }; if (ynHead) r.blankOpt = true; return; }
      if (!run) return;
      if (r.heading || r.cells.some(c => c.length > 70) || r.opt) { run = null; return; }
      const mk = r.cells.map(c => MARKC.test(c.trim()));
      if (!mk.some(Boolean)) { if (!/[☑☒✓✔]/.test(r.text)) r.blankOpt = true; return; }
      if (run.yn && r.xs) {
        const x = r.xs[mk.indexOf(true)]; let best = run.yn[0]; run.yn.forEach(h => { if (Math.abs(h.x - x) < Math.abs(best.x - x)) best = h; });
        const label = r.cells.filter((c, k) => !mk[k]).join(' ');
        if (best.v === 'yes' && label) { r.cells = [label]; r.xs = [r.xs[0]]; r.text = label; } else r.blankOpt = true;
        return;
      }
      // marks to the left of their labels: keep only the checked labels
      const picked = []; r.cells.forEach((c, k) => { if (mk[k] && r.cells[k + 1] && !mk[k + 1]) picked.push(r.cells[k + 1]); });
      if (!picked.length) r.blankOpt = true; else { r.picked = picked; r.pickedFrom = run.prompt; }
    });
    const out = [];
    rows.forEach(r => { if (r.picked) r.picked.forEach(t => out.push(Object.assign({}, r, { cells: [t], xs: [0], text: t, picked: null }))); else out.push(r); });
    return out;
  }

  function analyze(rows, opts) {
    opts = opts || {};
    const lang = detectLang(rows), plan = detectPlan(rows);
    // the classifier only knows English; Spanish IEPs are read by the rules alone
    const ML = opts.ml === false || lang !== 'en' ? null : classifier();
    const sections = [];
    let cur = { cat: 'id', title: 'Start', page: rows[0] ? rows[0].page : 1, rows: [] };
    sections.push(cur);
    let presentZone = false; // inside present levels (and its strengths / parent-concerns parts)
    rows = checklists(rows);
    let prevSec = null;
    rows.forEach(r => {
      if (r.opt === 'off' || r.blankOpt) return; // unchecked options do not apply
      // a checked row of a checklist grid: its own section, then back to where we were
      if (r.force) {
        if (!(cur.forced && cur.cat === r.force)) { if (!cur.forced) prevSec = cur; cur = { cat: r.force, title: 'Checklist', page: r.page, rows: [], how: 'rule', forced: true }; sections.push(cur); }
        cur.rows.push(r); return;
      }
      if (cur.forced && prevSec) { cur = Object.assign({}, prevSec, { rows: [], forced: false }); sections.push(cur); prevSec = null; }
      const hc = r.cells.length === 1 ? (r.head0 && classifyHeading(r.head0)) || classifyHeading(r.text) : null;
      if (/^academic or skill area\b/i.test(r.text)) { cur.rows.push(r); return; }
      // the rest of a heading that wrapped ("…SUPPLIES AND" / "EQUIPMENT")
      if (r.heading && !cur.rows.length && cur.title && cur.title !== 'Start' && /\b(and|of|or|the|for|to|in|with|&)$/i.test(cur.title.trim()) && r.text.split(/\s+/).length <= 6) { cur.title += ' ' + r.text; return; }
      if (r.heading) {
        const words = r.text.split(/\s+/).length;
        // "OR", "(see below)" and long prompts ending in ":" are parts of the form, not section titles
        if (/^(school|student name|student|date of plan|date|name|campus|grade|student id)\s*:\s*\S/i.test(r.text)) { cur.rows.push(r); return; }
        if (/^(or|and)$/i.test(r.text) || /^[\[(]/.test(r.text) || (/:\s*$/.test(r.text) && words > 4 && /[a-z]{3}/.test(r.text))) { cur.rows.push(r); return; }
        if (!hc && /^\d{1,2}[.)]\s/.test(r.text) && words > 7 && (r.text.match(/\b[a-z]{3,}\b/g) || []).length >= 4) { cur.rows.push(r); return; }
        // inside present levels, mixed-case topic headings ("Communication Development", "Smarter Balanced Assessment (SBAC)")
        // are parts of the narrative, not new sections
        if (!hc && presentZone && /[a-z]/.test(r.text) && words <= 12) {
          if (cur.cat === 'present') cur.rows.push(r); else { cur = { cat: 'present', title: r.text, page: r.page, rows: [], how: 'rule' }; sections.push(cur); }
          return;
        }
        // a heading straight after another one that only describes it ("SERVICES/SUPPORTS (provided routinely...)")
        if (hc && hc !== cur.cat && cur.how === 'rule' && cur.rows.length <= 3 && cur.rows.every(x => x.text.length < 40) && !['id', 'skip', 'mixed', 'unknown'].includes(cur.cat) && /\([a-z]/.test(r.text)) { cur.rows.push(r); return; }
        // inside skipped parts (placement, deliberations, LRE), unfamiliar headings don't start new sections
        if (!hc && ['skip', 'setting'].includes(cur.cat) && words <= 8) { cur.rows.push(r); return; }
        if (cur.cat === 'skip' && /supplement/i.test(cur.title) && hc !== 'personnel' && !/^[A-Z0-9 ,&:\/-]{10,}$/.test(r.text)) { cur.rows.push(r); return; }
      }
      if (/^(12-month service|extended school year|ESY services)/i.test(r.text)) { cur = { cat: 'skip', title: r.text, page: r.page, rows: [], how: 'rule' }; sections.push(cur); return; }
      if (r.heading && /^(short-term instructional objectives|alternate section for students)/i.test(r.text)) { cur.rows.push(r); return; }
      if (r.heading && !hc && cur.cat === 'testing' && cur.how === 'rule' && r.text.split(/\s+/).length <= 10 && /\(grades?\b|^(english|math|mathematics|ela|reading|science|writing|social studies|history)\b|^\d+\s/i.test(r.text)) { cur.rows.push(r); return; }
      // inside a skipped part (a summer services table, say), stray table-header words don't end it
      if (r.heading && !hc && cur.cat === 'skip' && r.text.split(/\s+/).length < 3) { cur.rows.push(r); return; }
      if (r.heading && cur.cat === 'present' && cur.how === 'rule' && /:\s*$/.test(r.text) && r.text.split(/\s+/).length <= 6 && !/strengths/i.test(r.text)) { cur.rows.push(r); return; }
      const otherPart = () => { if (!ML) return false; const pr = ML.predict(r.text.replace(NUMBERED, '')); return pr.p >= 0.8 && CONTENT.includes(pr.cat) && pr.cat !== cur.cat; };
      if (r.heading && !hc && cur.how !== 'model' && ['present', 'goals', 'behavior', 'strengths', 'health', 'services', 'accom', 'testing', 'personnel'].includes(cur.cat) && !otherPart() && (cur.cat !== 'goals' || !/[a-z]/.test(r.text) || r.text.split(/\s+/).length <= 2 || /\b(evaluation|procedure|criteria|mastery|progress|baseline|standard|goals?|objectives?|benchmarks?|areas?|reading|math|writing|speech|language|motor|social|behaviou?r|communication|academic|functional)\b/i.test(r.text)) && r.text.split(/\s+/).length <= (cur.cat === 'goals' ? 6 : 4) && (['goals', 'services', 'accom', 'testing', 'personnel'].includes(cur.cat) || !/^[A-Z0-9 &\/(),.:-]{6,}$/.test(r.text))) { cur.rows.push(r); return; }
      if (r.heading) {
        let cat = hc, how = 'rule', p = 1;
        if (!cat && ML) {
          // unfamiliar heading: ask the classifier which part of the IEP it introduces
          const pr = ML.predict(r.text.replace(NUMBERED, ''));
          if (pr.p >= 0.6) { cat = pr.cat === 'other' ? 'mixed' : pr.cat; how = 'model'; p = pr.p; }
        }
        if (!cat && (/^[A-Z][A-Z0-9 &\/(),.:-]{3,}$/.test(r.text) || NUMBERED.test(r.text) || (ML && ['id', 'mixed', 'present', 'unknown'].includes(cur.cat)))) cat = ML ? 'mixed' : 'unknown';
        if (cat) { presentZone = how === 'rule' && (cat === 'present' || (presentZone && ['strengths', 'skip'].includes(cat))); cur = { cat, title: r.text, page: r.page, rows: [], how, p }; sections.push(cur); return; }
      }
      // goal subheadings like "Goal #1  Area of Need: Written Expression"
      if (/^(goal|meta)\s*#?\s*\d+/i.test(r.text) && cur.cat !== 'goals') {
        cur = { cat: 'goals', title: 'Goals', page: r.page, rows: [r] }; sections.push(cur); return;
      }
      cur.rows.push(r);
    });

    const items = []; let nid = 0; let curRow = null;
    const meta = { grade: '', school: '', reviewDate: '', iepDate: '', behaviorFlag: false, healthNone: false, behaviorNone: false, lang, plan };
    const add = (cat, text, page, extra) => {
      text = norm(text);
      if (!text || BOILER.test(text) || BOILER_SENT.test(text) || (curRow && BOILER_SENT.test(curRow.text))) return null;
      if (curRow && /^(student(?:'s)? name|name|dob|date of birth|student id|nyc id|local id|osis)\s*[:#]/i.test(curRow.text)) return null; // page headers
      if (curRow && /^[a-z]/.test(curRow.text) && curRow.text.length > 60 && !isBullet(curRow.text)) return null; // sentence fragment
      if (/\?\s*(yes|no|\(no answer checked\))?\.?$/i.test(text) && text.length < 160) return null; // form questions
      const it = Object.assign({ id: 'i' + (++nid), cat, text, page, src: curRow ? curRow.text : text }, extra || {});
      items.push(it); return it;
    };
    // meta from all rows
    rows.forEach(r => labelCells(r).forEach(c => {
      let m;
      if (!meta.grade && (m = c.match(/\b(?:grade|grado)\s*(?:level)?\s*[:#]?\s*(K|Pre-?K|\d{1,2})(?:st|nd|rd|th|º|°)?\b/i))) meta.grade = m[1];
      if (!meta.school && (m = c.match(/^school\s*:\s*([A-Za-z].+)$/i))) meta.school = m[1].replace(/\s+(Grade|Disability|Primary).*$/i, '');
      if (!meta.reviewDate && (m = fold(c).match(/(?:date plan (?:is )?to be reviewed|plan review date|proxima revision(?: anual)?|fecha de (?:la )?proxima revision(?: anual)?|revision anual|next review(?: date)?|review date|plan end date|end date of plan|projected date of annual review|next annual (?:iep|review)(?: date)?|annual review(?: date)?|iep end date|iep expires?|end date of iep)\s*[:#]?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i))) meta.reviewDate = m[1];
      if (!meta.reviewDate && (m = c.match(/iep dates?\s*:\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s*(?:to|-|through)\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i))) meta.reviewDate = m[1];
      if (!meta.iepDate && (m = fold(c).match(/(?:date plan written|date plan goes into effect|fecha de la reunion|fecha del iep|plan date|date of plan|meeting date|iep (?:meeting )?date|implementation date|iep dates?)\s*[:#]?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i))) meta.iepDate = m[1];
    }));
    rows.forEach(r => {
      if (/behaviou?ral intervention plan\??\s*(yes|is attached)|behaviou?ral intervention plan is attached|☑\s*behaviou?r(al)? intervention plan (\(bip\) )?attached|behaviou?r intervention plan has been developed|\bBIP\b[^.]{0,20}\?\s*yes/i.test(r.text)) meta.behaviorFlag = true;
      if (/behaviou?ral intervention plan\??\s*no\b|have a behaviou?ral intervention plan\?\s*no/i.test(r.text)) meta.behaviorNone = true;
      if (!/intervention plan/i.test(r.text) && /behaviou?r[^.]{0,120}(impede|interfere)[^.]{0,80}\?\s*(\w+\.?\s*)?yes/i.test(r.text) && /behaviou?ral intervention plan is attached/i.test(rows.map(x => x.text).join(' '))) meta.behaviorFlag = true;
    });

    // strengths can be inline labels anywhere
    rows.forEach(r => {
      const m = r.text.match(STRENGTH_LABEL);
      if (m) { curRow = r; splitSentences(m[1]).forEach(s => add('strengths', s, r.page)); }
    });

    // the section heading acts as a prior: P(category | line, heading) is proportional to P(category | line) x prior
    const withPrior = (pr, cat, w) => {
      const q = {}; let z = 0; Object.keys(pr.probs).forEach(c => { q[c] = pr.probs[c] * (c === cat ? (w || 4) : 1); z += q[c]; });
      Object.keys(q).forEach(c => { q[c] /= z; }); let best = cat; Object.keys(q).forEach(c => { if (q[c] > q[best]) best = c; });
      return { cat: best, p: q[best], why: pr.why, probs: q };
    };
    sections.forEach(sec => {
      if (sec.how === 'rule' && sec.cat !== 'mixed' && sec.cat !== 'unknown') return;
      const labeled = sec.rows.filter(r => BEH_LABELS.some(([, re]) => { const m = stripBullet(r.text).match(re); return m && /:/.test(stripBullet(r.text).slice(0, m[0].length + 2)); })).length;
      if (labeled >= 2) { sec.cat = 'behavior'; sec.how = 'rule'; }
    });
    const boiler = t => { if (!ML) return false; const pr = ML.predict(t); return pr.cat === 'other' && pr.p >= 0.85; };
    const dropped = [];
    // "Strengths | Needs" tables in present levels: the strengths column becomes strengths items
    sections.forEach(sec => {
      if (!['present', 'mixed', 'unknown'].includes(sec.cat)) return;
      let snCol = -1;
      sec.rows = sec.rows.filter(r => {
        const si = r.cells.findIndex(c => /^strengths?$/i.test(c.trim())), ni = r.cells.findIndex(c => /^(needs?|areas? of need|weaknesses)$/i.test(c.trim()));
        if (si >= 0 && ni >= 0) { snCol = si; return false; }
        if (snCol >= 0 && r.cells.length >= 2) { curRow = r; splitSentences(r.cells[snCol]).forEach(x => add('strengths', x, r.page, { plain: plainText(x) })); return false; }
        return true;
      });
    });
    sections.forEach(sec => {
      const cat = sec.cat;
      if (ML && (cat === 'mixed' || cat === 'present' || cat === 'id')) return sortWithModel(sec);
      if (ML && sec.how === 'model' && ['accom', 'mods', 'at', 'testing', 'strengths', 'health', 'personnel'].includes(cat)) return sortWithModel(sec, cat);
      if (cat === 'factors') return specialFactors(sec);
      if (['skip', 'id', 'present', 'setting', 'unknown', 'mixed'].includes(cat)) return;
      const n0 = items.length; const reroute = [];
      let header = null; let behLabel = /behaviou?rs? targeted|target(ed)? behaviou?r/i.test(sec.title) ? 'target' : null; let goal = null; let subcat = cat; let goalArea = ''; let testLabel = ''; let svc = null;
      if (cat === 'goals') { const g0 = parseGoalHead(sec.title); if (g0) { goal = { id: 'i' + (++nid), cat: 'goals', page: sec.page, area: g0.area, text: g0.text.length > 25 ? g0.text : '', baseline: '', measure: '', who: '', src: sec.title }; items.push(goal); } }
      sec.rows.forEach(r => {
        curRow = r;
        let t = r.text;
        if (PAGE_HEAD.test(t)) return; // "Student Name: … | Birthdate: …" repeated at the top of each page
        // numbered paragraphs laid out as "1.2 | text": the number isn't a column
        if (r.cells.length === 2 && /^(\d{1,2}(\.\d{1,2})*|[a-h])[.)]?$/i.test(r.cells[0].trim())) { r = Object.assign({}, r, { cells: [r.cells[1]], text: r.cells[1] }); t = r.text; }
        // instructions written into a table row ("Required accommodations | List classes … and indicate")
        if (r.cells.length > 1 && r.cells.slice(1).some(c => /^(list|indicate|describe|explain|circle) /i.test(c.trim()))) return;
        // the rest of a table header that wrapped onto more lines ("or service", "for implementing")
        if (header && r.cells.length > 1 && r.cells.every(c => /^[a-z(]/.test(c.trim()) && c.length <= 30 && !/[.;]/.test(c)) && !/\b(will|shall)\b/.test(t)) return;
        if (header && (r.cells.length === 1 ? HEADER_WORDS.test(t) : r.cells.every(c => HEADER_WORDS.test(c) || /\b(of|for|or|and|to|by)\s*$|^(or|and|for|of)\b/i.test(c)))) return;
        // testing: "English Language Arts (Grades 3-8)" then "☑ Alternate Assessment with Accommodations"
        if (cat === 'testing' && r.cells.length === 1 && !CHECKED.test(t)) {
          if (!/^\d/.test(t) && t.length <= 70 && (/\(grades?\b[^)]*\)\s*$/i.test(t) || /\b(test|assessments?|exam)\s*(\([^)]*\))?\s*$/i.test(t) || (r.heading && /^(english|math|mathematics|ela|reading|science|writing)\b/i.test(t)))) { testLabel = t.replace(/\s*\((grades?|e\.g\.)[^)]*\)/gi, '').trim(); return; }
        }
        if (cat === 'testing' && CHECKED.test(t)) { t = t.replace(CHECKED, ''); if (testLabel) t = testLabel + ': ' + t; r = Object.assign({}, r, { cells: [t], text: t }); }
        // header rows of tables
        if (r.cells.length > 1 && r.cells.filter(c => /\b(of|for|or|and|to|by)\s*$|\/\s*$/i.test(c)).length >= 2) { header = header || r.cells; return; }
        if (r.cells.length > 1 && (r.cells.filter(c => HEADER_WORDS.test(c)).length >= Math.min(2, r.cells.length) || r.cells.every(c => !/[a-z]/.test(c) && /[A-Z]{3}/.test(c)))) { header = header && r.cells.every(c => !/[a-z]/.test(c)) && header.every(c => !/[a-z]/.test(c)) ? header : r.cells; return; }
        if (cat === 'behavior' && r.cells.length === 1 && /:\s*$/.test(t) && /behaviou?rs? targeted|target(ed)? behaviou?rs?|behaviou?rs? of concern/i.test(t)) { behLabel = 'target'; return; }
        if (cat === 'behavior' && r.pickedFrom) { const sub = /communicat|parent|home/i.test(r.pickedFrom) ? 'note' : 'prevent'; add('behavior', t, r.page, { sub, subName: BEH_NAMES[sub], plain: plainText(t) }); return; }
        if (r.cells.length === 1 && /:\s*$/.test(t) && t.length > 8 && !(t.length > 80 && /\b(shall|will|may) be (permitted|allowed|given|provided)\b/i.test(t) && !/^(explain|describe|identify|list|indicate|specify|if |for a |when )/i.test(t)) && !/^(annual )?goal|^objective|^(target|function|replacement)/i.test(t) && !BEH_LABELS.some(([, re]) => re.test(t))) { dropped.push(r); return; }
        // sub-headings kept inside the section, and code legends ("D: Daily"), are labels, not items
        if (r.heading && r.cells.length === 1 && cat !== 'goals' && !(cat === 'behavior' && BEH_LABELS.some(([, re]) => re.test(t)))) return;
        if (r.cells.length === 1 && /^[A-Z]{1,2}\s*[:=–-]\s*[A-Za-z ]{2,20}$/.test(t)) return;
        if (/^(yes\s*\|?\s*no)\b/i.test(t)) {
          const m = t.match(/(?:if yes, specify concerns|identified needs include|if yes, describe|specify)\s*:\s*(.+)$/i);
          if (!m) { dropped.push(r); return; }
          const ans = m[1].split(/\s*\bif no\b/i)[0]; r = { page: r.page, cells: [ans], text: ans }; curRow = r; t = ans;
        }
        // form instructions and other boilerplate inside a section
        if (r.cells.length === 1 && cat !== 'goals' && !isBullet(t) && !BEH_LABELS.some(([, re]) => re.test(stripBullet(t)) && /:/.test(t)) && !SAFETY.test(t) && boiler(t)) { dropped.push(r); return; }
        // a heading recognized only by the model: each row must also look like it belongs there
        if (sec.how === 'model' && !(header && ['goals', 'services'].includes(cat)) && !/^goal\s*#?\s*\d/i.test(t)) {
          const raw = ML.predict(t);
          if (CONTENT.includes(raw.cat) && raw.cat !== cat && raw.p >= 0.85) { reroute.push(r); return; }
          const pr = withPrior(raw, cat);
          if (pr.cat !== cat && (pr.cat === 'other' || pr.cat === 'present') && pr.p >= 0.4) { dropped.push(r); return; }
        }
        if (cat === 'strengths') {
          const st = stripBullet(t).replace(/^[A-Z]?\.?[A-Z]?\.?\s*:\s*/, '');
          if (/^(speech[- ]language|occupational therapy|physical therapy|counseling|academic|social|physical|ot|pt)\s*:?$/i.test(st)) return;
          splitSentences(st).forEach(x => add('strengths', x, r.page)); return;
        }
        if (cat === 'health') {
          if (/no (known )?(health|medical) (concerns|needs|issues|conditions)|none noted|no concerns/i.test(t)) { meta.healthNone = true; return; }
          const ht = stripBullet(t); add('health', ht, r.page, { plain: plainText(ht) }); return;
        }
        if (cat === 'behavior' && header && r.cells.length > 1) {
          const subOf = h => /reward|reinforc|incentive/i.test(h) ? 'reinforce' : /consequence|response|when it happens/i.test(h) ? 'respond' : /target|behaviou?r|what it looks/i.test(h) ? 'target' : /trigger|antecedent/i.test(h) ? 'triggers' : /strateg|prevent|intervention/i.test(h) ? 'prevent' : /person|responsible|staff|who/i.test(h) ? null : 'note';
          r.cells.forEach((c, i) => { const sub = subOf(header[i] || ''); if (sub && c.trim()) add('behavior', c.trim(), r.page, { sub, subName: BEH_NAMES[sub], plain: plainText(c.trim()) }); });
          return;
        }
        if (cat === 'behavior') {
          if (/does not impede|no behaviou?r (intervention )?plan(?: is)? (needed|required)|not (needed|required) at this time/i.test(t)) { meta.behaviorNone = true; return; }
          let lab = null, rest = stripBullet(t);
          for (const [k, re] of BEH_LABELS) { const m = rest.match(re); if (m && (m[0].trim().endsWith(':') || /:/.test(rest.slice(0, m[0].length + 2)))) { lab = k; rest = rest.slice(m[0].length).replace(/^:\s*/, ''); break; } }
          if (lab) { behLabel = lab; if (rest) add('behavior', rest, r.page, { sub: lab, subName: BEH_NAMES[lab], plain: plainText(rest), tip: '' }); return; }
          add('behavior', stripBullet(t), r.page, { sub: behLabel || 'prevent', subName: BEH_NAMES[behLabel || 'prevent'], plain: plainText(stripBullet(t)) });
          return;
        }
        if (cat === 'goals') {
          if (BOILER_SENT.test(t)) return;
          if (/^(progress report|summary of progress|comments?$|annual review date)/i.test(t)) return;
          // "Area of Need: Reading | Measurable Annual Goal #2 Goal: By June, …"
          const an = t.match(/^(?:area of need|goal area|area)\s*:\s*([^|]{2,40}?)\s*\|\s*(.+)$/i);
          if (an) { goalArea = capFirst(an[1]); t = an[2].replace(/^(?:measurable\s+)?(?:annual\s+)?goal\s*#?\s*\d*\s*(?:goal)?\s*:?\s*/i, ''); r = { page: r.page, cells: [t], text: t }; goal = null; }
          const so = t.match(/^(?:short[- ]term objective|objective|benchmark)\s*(?:#?\s*\d+)?\s*:\s*(.+)$/i);
          if (so && goal) { (goal.objectives = goal.objectives || []).push(norm(so[1])); return; }
          // short-term objectives ("1.2 will ...") belong to the goal above them
          if (/^\d{1,2}\.\d{1,2}\s/.test(t) && goal) { (goal.objectives = goal.objectives || []).push(norm(t)); return; }
          // form headers inside the goals table, and area labels such as "SPEECH / LANGUAGE"
          if (r.cells.length === 1 && /^[^a-z]{25,}$/.test(t) && t.split(/\s+/).length > 6) return;
          if (/^\d{1,2}\s*-\s*[A-Z][\w\- ]{2,30}$/.test(t) || /^[A-Z]\s*-\s*[A-Z][a-z]+$/.test(t) || /^(standard\s*)+(not assigned)?$/i.test(t) || (r.cells.length > 1 && r.cells.every(c => /^(\d{1,2}|[A-Z])\s*-\s*\S|:\s*$/.test(c.trim())))) return; // code legends, standard labels
          if (r.cells.length === 1 && t.split(/\s+/).length <= 6 && !/\bwill\b/i.test(t) && /^[A-Z][A-Z0-9 \/&(),-]+$/.test(t.replace(/\(alternate assessment\)/i, '').trim())) { goalArea = t.replace(/\s*\(alternate assessment\)/i, '').replace(/\s*\/\s*/g, '/').toLowerCase().replace(/(^|\/|\s)\w/g, m => m.toUpperCase()); return; }
          const g = parseGoalHead(t);
          if (g) { goal = { id: 'i' + (++nid), cat: 'goals', page: r.page, area: g.area, text: g.text.length > 25 ? g.text : '', baseline: '', measure: '', who: '', src: r.text }; items.push(goal); return; }
          const lab = t.match(/^(annual goal|goal|mastery criteria|progress reporting frequency|baseline|person\(s\) responsible|persons? responsible|responsible|measured by|how (?:progress )?(?:will be )?measured|evaluation method|criteria|method|schedule)\s*:\s*(.*)$/i);
          if (lab && goal) {
            const k = lab[1].toLowerCase();
            goal.src = (goal.src ? goal.src + ' / ' : '') + t;
            if (/annual goal|^goal/.test(k)) goal.text = norm(lab[2]);
            else if (/baseline/.test(k)) goal.baseline = norm(lab[2]);
            else if (/respons/.test(k)) goal.who = norm(lab[2]);
            else goal.measure = (goal.measure ? goal.measure + '; ' : '') + norm(lab[2]);
            return;
          }
          if (r.cells.length > 1 && header) {
            const it = { id: 'i' + (++nid), cat: 'goals', page: r.page, area: '', text: r.cells[0], baseline: '', measure: '', who: '', src: r.text };
            header.forEach((h, i) => { if (i > 0 && r.cells[i] && /criteria|method|schedule|measure|evaluat/i.test(h)) it.measure = (it.measure ? it.measure + '; ' : '') + h.replace(/\s*\(.*\)/, '') + ': ' + r.cells[i]; });
            it.text = it.text.replace(/^\d{1,2}[.)]\s+/, '');
            const am = it.text.match(/^([A-Z][A-Za-z\/ -]{2,28}):\s+(.+)$/); if (am) { it.area = am[1]; it.text = am[2]; }
            if (!it.area && goalArea) it.area = goalArea;
            items.push(it); goal = it; return;
          }
          const body = stripBullet(t);
          if (isBullet(t) || !goal || goal.text) {
            const it = { id: 'i' + (++nid), cat: 'goals', page: r.page, area: '', text: body, baseline: '', measure: '', who: '', src: r.text };
            const am = body.match(/^([A-Z][A-Za-z\/ -]{2,28}):\s+(.+)$/); if (am) { it.area = am[1]; it.text = am[2]; }
            if (!it.area && goalArea) it.area = goalArea;
            const mm = it.text.match(/,?\s*as measured by ([^.]+)\.?$/i); if (mm) it.measure = mm[1];
            if (it.text.length > 25) { items.push(it); goal = it; }
          } else { goal.text = body; goal.src = (goal.src ? goal.src + ' / ' : '') + t; }
          return;
        }
        if (cat === 'services') {
          // sub-tables inside the services section (NY puts accommodations here)
          if (header) { const h0 = header[0] || ''; if (/supplementary|accommodation|modification/i.test(h0)) subcat = 'accom'; else if (/assistive/i.test(h0)) subcat = 'at'; else if (/personnel/i.test(h0)) subcat = 'personnel'; else subcat = 'services'; }
          if (subcat !== 'services') return addSupport(subcat, r, header);
          if (/^(total minutes|percent of time|minutes per week)/i.test(t)) return;
          // one service written as labeled lines: "Service: Speech | Start Date: …", "Provider: …", "Duration/Freq: … | Location: …"
          const sv = r.cells[0].match(/^service\s*:\s*(.+)$/i);
          if (sv) { const p = parseService(sv[1]); p.name = sv[1]; svc = add('services', sv[1], r.page, { svc: p, plain: servicePlain(p), detail: '' }); return; }
          if (svc && /^(provider|duration|frequency|freq|location|comments?|start date|end date|ind|grp)\b[^:]{0,20}:/i.test(r.cells[0])) {
            r.cells.forEach(c => {
              const m = c.match(/^([^:]{2,30}):\s*(.*)$/); if (!m || !m[2] || /date/i.test(m[1])) return;
              const v = m[2].replace(/\s*\(no answer checked\)/i, '').replace(/\s*☑.*$/, '').trim(); if (!v) return;
              if (/duration|freq/i.test(m[1])) { const p = parseService(v); svc.svc.freq = p.freq; svc.svc.dur = p.dur; }
              else if (/location/i.test(m[1])) { svc.svc.loc = v; const p = parseService('in ' + v, [svc.svc.name, v]); svc.svc.inClass = p.inClass; }
              else if (/provider/i.test(m[1])) svc.svc.provider = v;
              svc.detail = (svc.detail ? svc.detail + ' · ' : '') + m[1].trim() + ': ' + v;
            });
            svc.plain = servicePlain(svc.svc); return;
          }
          svc = null;
          if (r.cells.length > 1 && /^(yes|no|x|n\/a)$/i.test(r.cells[0].trim())) r = Object.assign({}, r, { cells: r.cells.slice(1), text: r.cells.slice(1).join(' | ') });
          if (r.cells.length > 1) { const p = parseService(r.text, r.cells); add('services', r.cells[0], r.page, { svc: p, plain: servicePlain(p), detail: header ? r.cells.slice(1).map((c, i) => (header[i + 1] ? header[i + 1].replace(/\s*\(.*\)/, '') + ': ' : '') + c).filter(x => !/:\s*$/.test(x)).join(' · ') : r.cells.slice(1).join(' · ') }); return; }
          splitSentences(stripBullet(t)).forEach(s => { if (serviceSentence(s)) { const p = parseService(s); p.name = s.replace(/^[^,]*?\bwill (receive|be provided|have)\s*/i, '').replace(/\s+(for|\d+)\s.*$/, '') || s; add('services', s, r.page, { svc: p, plain: plainText(s), detail: '' }); } });
          return;
        }
        addSupport(cat === 'accom' && header && /^(program |curriculum |instructional )?modifications?\b/i.test(header[0] || '') ? 'mods' : cat, r, header);
      });
      if (sec.how === 'model') items.slice(n0).forEach(i => { i.suggested = true; i.conf = sec.p; i.why = ['heading "' + sec.title.replace(NUMBERED, '') + '"']; });
      if (reroute.length) sortWithModel({ cat: 'mixed', title: sec.title, page: sec.page, rows: reroute });
    });

    /* Special factors: questions answered Yes about assistive technology or behavior, and the answer lines under them */
    function specialFactors(sec) {
      let topic = null;
      sec.rows.forEach(r => {
        curRow = r; const t = r.text;
        if (PAGE_HEAD.test(t)) return;
        if (/\?/.test(t)) {
          const yes = /\?\s*(☑|☒|✓|\[x\]|x)?\s*yes\b/i.test(t) && !/\?\s*(☑|☒|✓)?\s*no\b/i.test(t);
          topic = !yes ? null : /assistive technology/i.test(t) ? 'at' : /behaviou?r[^?]{0,80}(impede|interfere)|positive behaviou?ral interventions/i.test(t) ? 'behavior' : null;
          if (!/^[^?]*\?\s*(☑|☒|✓|\[x\]|x)?\s*(yes|no)\b/i.test(t)) topic = topic && null; // a question without an answer
          return;
        }
        if (!topic || r.opt) return;
        if (/:\s*$/.test(t) || /^if (yes|no)\b/i.test(t) || CHECKED.test(t)) return;
        const v = t.replace(/^(rationale|describe|description|comments?|explain|specify)\s*:\s*/i, '').trim();
        if (!v || BOILER.test(v)) return;
        if (topic === 'at') addSupport('at', Object.assign({}, r, { cells: [v], text: v }), null);
        else add('behavior', v, r.page, { sub: /^see\b/i.test(v) ? 'note' : 'target', subName: BEH_NAMES[/^see\b/i.test(v) ? 'note' : 'target'], plain: plainText(v) });
      });
    }

    /* Sections with no recognized heading (and present-level narratives): split into sentences,
       let the classifier sort each one, and keep only confident results as suggestions. */
    function sortWithModel(sec, prior) {
      if (sec.cat === 'id') return;
      const units = [];
      sec.rows.forEach(r => {
        if (r.opt === 'off') return;
        const t = r.text;
        if (STRENGTH_LABEL.test(t)) return; // already taken by the inline strengths pass
        if (/does not impede|no behaviou?r (intervention )?plan|does not need a behaviou?r plan|not (needed|required) at this time/i.test(t)) meta.behaviorNone = true;
        if (/no (known )?(health|medical) (concerns|needs|issues|conditions)/i.test(t)) meta.healthNone = true;
        const pieces = r.cells.length > 1 ? [t] : (isBullet(t) ? [stripBullet(t)] : splitSentences(t));
        pieces.forEach(x => { if (x && !BOILER.test(x) && !BOILER_SENT.test(x) && !/:\s*$/.test(x)) { const raw = ML.predict(x); units.push({ r, s: x, raw, pr: raw }); } });
      });
      if (prior) units.forEach(u => {
        const raw = u.raw;
        if (raw.cat === 'other' && raw.p >= 0.6) u.pr = raw; // instructions or admin text: dropped below
        else if (CONTENT.includes(raw.cat) && raw.cat !== prior && raw.p >= 0.6) u.pr = raw; // clearly another category
        else u.pr = { cat: prior, p: sec.p, why: ['heading "' + sec.title.replace(NUMBERED, '') + '"'] };
      });
      const ok = u => {
        if (!CONTENT.includes(u.pr.cat)) return false;
        // form text, and sentence tails cut off from the line above (goal tables wrap like this, so those are kept)
        if (BOILER_SENT.test(u.r.text) && !/^\d|will/.test(u.s)) return false;
        if (u.pr.cat !== 'goals' && /^[a-z]/.test(u.r.text) && u.r.text.length > 60 && !isBullet(u.r.text)) return false;
        if (sec.cat === 'present') {
          if ((u.pr.cat === 'strengths' && u.pr.p >= 0.8) || (u.pr.cat === 'health' && u.pr.p >= 0.9)) return true;
          // supports and safety mentioned in the narrative ("She does best with a visual timer"): offered, switched off
          if ((['accom', 'at', 'behavior', 'health', 'mods'].includes(u.pr.cat) && u.pr.p >= 0.6 && SUPPORTISH.test(u.s)) || SAFETY.test(u.s)) { u.fromPresent = true; if (SAFETY.test(u.s) && !['health', 'behavior'].includes(u.pr.cat)) u.pr = Object.assign({}, u.pr, { cat: 'health' }); return true; }
          return false;
        }
        return u.pr.p >= 0.5;
      };
      // neighbouring sentences on the same topic (a health paragraph, say) stay together
      const groups = [];
      units.forEach(u => {
        if (!ok(u)) return;
        const g = groups[groups.length - 1];
        if (g && g.cat === u.pr.cat && !g.fromPresent === !u.fromPresent && ['health', 'strengths'].includes(u.pr.cat) && g.last === units.indexOf(u) - 1) { g.s += ' ' + u.s; g.p = Math.min(g.p, u.pr.p); g.last++; return; }
        groups.push({ cat: u.pr.cat, s: u.s, r: u.r, p: u.pr.p, why: u.pr.why, last: units.indexOf(u), fromPresent: u.fromPresent });
      });
      groups.forEach(g => {
        curRow = g.r; const n1 = items.length;
        const r = g.r.cells.length > 1 && g.s === g.r.text ? g.r : { page: g.r.page, cells: [g.s], text: g.s };
        const c = g.cat;
        if (['accom', 'mods', 'at', 'testing', 'personnel'].includes(c)) addSupport(c, r, null);
        else if (c === 'health' || c === 'strengths') add(c, g.s, r.page, { plain: plainText(g.s) });
        else if (c === 'behavior') {
          let lab = 'note', rest = g.s;
          for (const [k, re] of BEH_LABELS) { const m = rest.match(re); if (m && /:/.test(rest.slice(0, m[0].length + 2))) { lab = k; rest = rest.slice(m[0].length).replace(/^:\s*/, ''); break; } }
          add('behavior', rest, r.page, { sub: lab, subName: BEH_NAMES[lab], plain: plainText(rest) });
        } else if (c === 'goals') {
          const gh = parseGoalHead(g.s) || { area: '', text: g.s };
          let area = gh.area, text = gh.text;
          const am = !area && text.match(/^([A-Z][A-Za-z\/ -]{2,28}):\s+(.+)$/); if (am) { area = am[1]; text = am[2]; }
          if (text.length > 25) items.push({ id: 'i' + (++nid), cat: 'goals', page: r.page, area, text, baseline: '', measure: '', who: '', src: g.r.text });
        } else if (c === 'services') {
          const p = parseService(g.s); p.name = shortServiceName(g.s);
          add('services', g.s, r.page, { svc: p, plain: serviceSentence(g.s) ? servicePlain(p) : plainText(g.s), detail: '' });
        }
        items.slice(n1).forEach(i => { i.suggested = true; i.conf = g.p; i.why = g.why; if (g.fromPresent) { i.fromPresent = true; i.off = true; } });
      });
    }

    function addSupport(cat, r, header) {
      const t = r.text.replace(/^(other|additional|comments?)\s*:\s*/i, '').replace(/^other\s*\[([^\]]+)\]/i, '$1');
      if (!t) return;
      if (t !== r.text) r = Object.assign({}, r, { text: t, cells: r.cells.length > 1 ? [r.cells[0].replace(/^other\s*\[([^\]]+)\]/i, '$1')].concat(r.cells.slice(1)) : [t] });
      if (/^(instructional accommodations|modifications|designated supports|accommodations|supports for school personnel)\s*:?$/i.test(t)) return;
      // assessment rows the student doesn't take ("Math Prof. Lvl. 3 | No")
      if (r.cells.length > 1 && r.cells.slice(1).every(c => /^(yes|no|x|n\/a|)$/i.test(c.trim())) && r.cells.slice(1).some(c => /^no$/i.test(c.trim()))) return;
      // emergency medicine and 911 belong with health and safety, wherever the plan lists them
      if (['accom', 'mods'].includes(cat) && /\b(glucagon|diastat|epi-?pens?|epinephrine|insulin|inhalers?|AEDs?|antiepileptic|seizure medication|rescue medication|911)\b/i.test(t) && /\b(administer\w*|give|given|available|carry|access|keep|kept|stored|call|travel)\b/i.test(t)) cat = 'health';
      // rows labeled as modifications inside an accommodations table
      if (cat === 'accom' && /^(grading |curriculum |program )?modifications?\s*:/i.test(t)) cat = 'mods';
      if (/^(ethan|the student|[A-Z][a-z]+) will take the .* with the following/i.test(t) || /with the following (designated supports|accommodations)/i.test(t)) return;
      if (r.cells.length > 1) {
        // "Area of need | Accommodation | Who | How often": the accommodation column is the item, the area is a detail
        const nc = header && /area|need|subject|domain|category|content|class|setting|skill/i.test(header[0] || '') ? header.findIndex((h, i) => i > 0 && /^(accommodations?|supports?|accommodations? (or|and|\/) ?services?|strateg|interventions?|modifications?|description)/i.test(h.trim())) : -1;
        if (nc > 0 && r.cells[nc]) { const cells = [r.cells[nc]].concat(r.cells.filter((c, i) => i !== nc)), hd = [header[nc]].concat(header.filter((h, i) => i !== nc)); r = Object.assign({}, r, { cells }); header = hd; }
        const name = r.cells[0];
        const det = r.cells.slice(1).map((c, i) => ({ h: header && header[i + 1] ? header[i + 1].replace(/\s*\(.*\)/, '').replace(/\s+/g, ' ') : '', c })).filter(x => x.c && !/^service delivery|projected|begin|start|end date/i.test(x.h) && !/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(x.c));
        const detail = det.map(x => (x.h ? x.h + ': ' : '') + x.c).join(' · ');
        const when = det.filter(x => /condition|frequency|duration|location|implement|accommodation|list/i.test(x.h) || !x.h).map(x => x.c).filter(c => !/^(daily|individual|group|[A-Z]{1,2}|x)$/i.test(c.trim())).join('; ');
        add(cat, name, r.page, { detail, plain: plainText(name) + (when ? ' (' + plainText(when).replace(/^[A-Z](?=[a-z])/, c => c.toLowerCase()) + ')' : ''), tip: tipFor(name + ' ' + detail) });
        if (cat === 'accom' && (TESTISH.test(name) || /\b(state|district|statewide|standardized|end.of.course)\s+(tests?|testing|assessments?|exams?)\b|\b(unit )?tests\b/i.test(detail)) && /\btests?|exams?|quiz/i.test(name + ' ' + detail)) add('testing', name, r.page, { detail, plain: plainText(name) + (when ? ' (' + plainText(when).replace(/^[A-Z](?=[a-z])/, c => c.toLowerCase()) + ')' : ''), tip: tipFor(name + ' ' + detail) });
        return;
      }
      let body = stripBullet(t);
      let where = '';
      const wm = body.match(/\s[-–—]\s+((?:all|math|english|ela|reading|writing|science|social studies|history|specials?|core|academic|elective|pe)\b[^.]*)$/i);
      if (wm) { where = wm[1]; body = body.slice(0, wm.index).trim(); }
      // a paragraph of supports written as prose: one item per sentence
      if (['accom', 'mods', 'at', 'personnel'].includes(cat) && !isBullet(t) && body.length > 120 && splitSentences(body).length >= 2) {
        splitSentences(body).forEach(x => { if (!BOILER_SENT.test(x)) addSupport(cat, { page: r.page, cells: [x], text: x }, null); }); return;
      }
      // "2x on state tests and 1.5x on classwork": goes under testing too
      if (cat === 'accom' && (/\b(state|district|statewide|standardized|end.of.course)\s+(tests?|testing|assessments?|exams?)\b/i.test(body) || TESTISH.test(body))) add('testing', body, r.page, { plain: plainText(body), tip: tipFor(body) });
      if (cat === 'testing' && !isBullet(t) && body.length > 60) { splitSentences(body).forEach(s => { if (!BOILER_SENT.test(s)) add(cat, s, r.page, { plain: plainText(s), tip: tipFor(s) }); }); return; }
      add(cat, body, r.page, { where, plain: plainText(body) + (where ? ' (' + where.replace(/^[A-Z](?=[a-z])/, c => c.toLowerCase()) + ')' : ''), tip: tipFor(body) });
    }

    // goal clean-up and plain text
    items.filter(i => i.cat === 'goals').forEach(g => {
      g.text = norm(g.text); if (!g.text) { g.drop = true; return; }
      const mm = g.text.match(/,?\s*as measured by ([^.]+)\.?$/i); if (mm && !g.measure) g.measure = mm[1];
      g.plain = (g.area ? g.area + ': ' : '') + plainText(g.text);
      g.helpers = /para|aide|assistant/i.test(g.who) ? ['para'] : [];
    });
    for (let i = items.length - 1; i >= 0; i--) if (items[i].drop) items.splice(i, 1);
    items.forEach(i => { if (!i.plain) i.plain = plainText(i.text); if (i.tip === undefined) i.tip = ''; i.lang = lang; i.tipK = tipKey(i.text); if (lang !== 'en') i.tip = i.tipK >= 0 ? TIPS_ES[i.tipK] : ''; });
    // diagnosis and eligibility labels are private and rarely help staff act: they start switched off
    items.forEach(i => { if (!["goals", "services", "personnel"].includes(i.cat) && DIAG.test(i.text) && !ACTION.test(i.text)) { i.off = true; i.offWhy = 'diagnosis'; } });
    const merged = dedupe(items);
    // safety net: health and safety sentences anywhere in the IEP that didn't become an item
    const safety = [];
    const covered = x => { const k = norm(x).toLowerCase().slice(0, 50); return items.some(i => [i.text, i.src, i.plain].some(t => t && norm(t).toLowerCase().includes(k))); };
    rows.forEach(r => {
      if (r.opt === 'off' || r.heading) return;
      splitSentences(r.cells.length > 1 ? r.cells.join('. ') : r.text).forEach(x => {
        x = norm(stripBullet(x));
        if (x.length < 15 || x.length > 400 || !SAFETY.test(x) || BOILER_SENT.test(x) || /\?\s*(yes|no)?\.?$/i.test(x)) return;
        if (/\b(no (known )?(allerg|health|medical|medication)|none (known|noted|reported)|not applicable|n\/a\b|does not (have|take|require))/i.test(x)) return;
        if (/\b(procedural safeguards|medicaid|parental consent|reimburse)/i.test(x)) return;
        if (covered(x) || safety.some(y => y.text === x)) return;
        safety.push({ page: r.page, text: x });
      });
    });
    return { items, meta, safety: safety.slice(0, 8), dropped: dropped.map(r => ({ page: r.page, text: r.text })), merged, model: !!ML, sections: sections.map(s => ({ cat: s.cat, title: s.title, page: s.page, n: s.rows.length, how: s.how || 'rule', p: s.p })) };
  }
  /* near-duplicate items in the same category (IEPs often list the same support twice):
     keep the first, note the other page. Similarity = shared words / all words (Jaccard). */
  const STOP = new Set('the a an and or of to in on for with is are be will by at as from that this student'.split(' '));
  const wordSet = t => new Set(norm(t).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(w => w && !STOP.has(w)).map(w => w.replace(/(ing|ed|es|s)$/, '')));
  function dedupe(items) {
    let n = 0;
    for (let i = 0; i < items.length; i++) {
      const a = items[i]; if (a.dup) continue; const A = wordSet(a.text);
      for (let j = i + 1; j < items.length; j++) {
        const b = items[j]; if (b.dup || b.cat !== a.cat || (a.sub || '') !== (b.sub || '')) continue;
        const B = wordSet(b.text); if (!A.size || !B.size) continue;
        let inter = 0; B.forEach(w => { if (A.has(w)) inter++; });
        const jac = inter / (A.size + B.size - inter), cont = inter / Math.min(A.size, B.size);
        if (jac >= 0.8 || (cont >= 0.9 && Math.min(A.size, B.size) >= 4 && (jac >= 0.5 || b.suggested))) {
          b.dup = true; n++;
          if (b.page !== a.page) a.alsoPages = [...new Set((a.alsoPages || []).concat(b.page))];
          if (!a.detail && b.detail) a.detail = b.detail;
          if (a.suggested && !b.suggested) { a.suggested = false; }
        }
      }
    }
    for (let i = items.length - 1; i >= 0; i--) if (items[i].dup) items.splice(i, 1);
    return n;
  }
  function shortServiceName(s) {
    let m = s.match(/\b(specialized [a-z ]*instruction|occupational therapy|physical therapy|speech(?:[- ]language)? (?:therapy|services)|counseling(?: services)?|consult(?:ation|s)?|co-teaching|resource room|reading instruction|math instruction)\b/i);
    return m ? capFirst(m[1]) : capFirst(s.split(/\bfor\b|,/)[0].slice(0, 60));
  }
  function splitSentences(t) {
    return norm(t).split(/(?<!\b(?:Mr|Mrs|Ms|Dr|St|Soc|No|vs|etc|Jr|Sr|Sra|Prof|approx|Dept|Rm)\.)(?<=[.!?])\s+(?=[\p{Lu}"(¿¡])/u).map(s => s.trim()).filter(s => s.length > 3);
  }

  /* ---------------- 7. coverage ---------------- */
  const CAT_NAMES = { accom: 'Accommodations', mods: 'Modifications', at: 'Assistive technology', testing: 'Testing accommodations', services: 'Services', goals: 'Goals', behavior: 'Behavior plan', health: 'Health and safety', strengths: 'Strengths', personnel: 'Supports for staff' };
  function coverage(result) {
    const by = {}; result.items.forEach(i => { (by[i.cat] = by[i.cat] || []).push(i); });
    const out = [];
    ['accom', 'mods', 'at', 'testing', 'services', 'goals', 'behavior', 'health', 'strengths', 'personnel'].forEach(c => {
      const n = (by[c] || []).length;
      let note = '';
      if (c === 'behavior' && !n) note = result.meta.behaviorNone ? 'The IEP says no behavior plan is needed.' : result.meta.behaviorFlag ? 'The IEP says there is a behavior plan, but it wasn\'t found. It may be a separate document.' : '';
      if (c === 'health' && !n && result.meta.healthNone) note = 'The IEP says there are no health concerns.';
      out.push({ cat: c, name: CAT_NAMES[c], n, pages: [...new Set((by[c] || []).map(i => i.page))], note, important: (result.meta.plan === '504' ? ['accom'] : ['accom', 'testing', 'services', 'goals', 'health', 'behavior']).includes(c) && !note });
    });
    return out;
  }

  const TIPS_EN = GLOSS.map(g => g[1]);
  return { classifier, rowsFromPages, rowsFromText, classifyHeading, findIdentifiers, makeRedactor, analyze, coverage, plainText, tipFor, tipKey, TIPS_EN, TIPS_ES, initialsOf, CAT_NAMES, BEH_NAMES, norm, fold, detectLang, detectPlan };
});
