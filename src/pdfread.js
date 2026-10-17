/* IEP Glance PDF reader. Turns a PDF into positioned text items for the engine.
   Shared by the browser app and the Node tests, so both read PDFs the same way.

   Beyond plain text it handles the quirks that make real IEP PDFs messy:
   - fake bold: the same words drawn 2-3 times with tiny offsets (removed)
   - rotated text such as form numbers printed up the margin (removed)
   - checkboxes drawn as boxes, as symbol-font glyphs (ZapfDingbats, Wingdings) or as
     Unicode characters, turned into ☒ (checked) or ☐ (unchecked) marks
   - fillable forms, whose answers live in form fields rather than the page text */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IEPPdf = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const ON = '☒', OFF = '☐';

  // symbol-font glyphs that are checkboxes. 'ambig' = filled shapes that are also used as bullets.
  const ZAPF = { n: 'ambig', o: OFF, p: OFF, q: OFF, r: OFF, '3': ON, '4': ON, '7': ON, '8': ON, l: 'ambig', m: OFF };
  const WING = { o: OFF, q: OFF, '¨': OFF, x: ON, 'ý': ON, 'þ': ON, 'ü': ON, n: 'ambig', l: 'ambig' };
  const WING2 = { '£': OFF, '¢': OFF, P: ON, Q: ON, R: ON, S: ON, T: ON, O: ON };
  const UNI = { '☐': OFF, '□': OFF, '❏': OFF, '❎': ON, '☑': ON, '☒': ON, '✓': ON, '✔': ON, '✗': ON, '✘': ON, '√': ON, '■': 'ambig', '●': 'ambig', '○': OFF };
  const ZAPF_U = { '\u274f': OFF, '\u2750': OFF, '\u2751': OFF, '\u2752': OFF, '\u274d': OFF };
  const MARK_TEXT = /^(x|✓|✔|✗|✘|√|■|●|☒|☑|✕|✖)$/i;

  function symbolMark(str, fontName) {
    const s = str.trim(); if (s.length !== 1) return null;
    let ch = s;
    const code = ch.charCodeAt(0);
    if (code >= 0xF020 && code <= 0xF0FF) ch = String.fromCharCode(code - 0xF000); // symbol fonts mapped to the private use area
    const f = (fontName || '').toLowerCase();
    if (/zapf|dingbat/.test(f)) return ZAPF[ch] || UNI[s] || ZAPF_U[s] || null;
    if (/wingdings.?2/.test(f)) return WING2[ch] || null;
    if (/wingdings|webdings/.test(f)) return WING[ch] || null;
    // Word's Symbol-font box (U+F0A0) shows as an empty square: an unchecked option
    if (/symbol/.test(f) && code === 0xF0A0) return OFF;
    return UNI[s] || null;
  }

  function mul(m, n) { return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]]; }
  function apply(m, x, y) { return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }

  /* small squares (checkbox outlines), small filled squares and short line segments from the drawing commands */
  function shapesFromOps(lib, ol) {
    const OPS = lib.OPS; const boxes = [], fills = [], segs = [], rules = [];
    let ctm = [1, 0, 0, 1, 0, 0]; const stack = [];
    let pending = null;
    for (let i = 0; i < ol.fnArray.length; i++) {
      const fn = ol.fnArray[i], args = ol.argsArray[i];
      if (fn === OPS.save) stack.push(ctm.slice());
      else if (fn === OPS.restore) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
      else if (fn === OPS.transform) ctm = mul(ctm, args);
      else if (fn === OPS.constructPath) {
        const ops = args[0], co = args[1]; let k = 0; const rects = [], lines = []; let cur = null, start = null;
        for (const op of ops) {
          if (op === OPS.rectangle) {
            const [x, y, w, h] = co.slice(k, k + 4); k += 4;
            const a = apply(ctm, x, y), b = apply(ctm, x + w, y + h);
            rects.push({ x1: Math.min(a[0], b[0]), y1: Math.min(a[1], b[1]), x2: Math.max(a[0], b[0]), y2: Math.max(a[1], b[1]) });
          } else if (op === OPS.moveTo) { cur = start = apply(ctm, co[k], co[k + 1]); k += 2; }
          else if (op === OPS.lineTo) { const p = apply(ctm, co[k], co[k + 1]); k += 2; if (cur) lines.push([cur, p]); cur = p; }
          else if (op === OPS.curveTo) { k += 6; cur = null; }
          else if (op === OPS.curveTo2 || op === OPS.curveTo3) { k += 4; cur = null; }
          else if (op === OPS.closePath) { if (cur && start) lines.push([cur, start]); cur = start; }
        }
        pending = { rects, lines };
      } else if (pending && (fn === OPS.stroke || fn === OPS.closeStroke || fn === OPS.fill || fn === OPS.eoFill || fn === OPS.fillStroke || fn === OPS.eoFillStroke || fn === OPS.closeFillStroke || fn === OPS.closeEOFillStroke)) {
        const filled = fn === OPS.fill || fn === OPS.eoFill;
        pending.rects.forEach(r => {
          const w = r.x2 - r.x1, h = r.y2 - r.y1;
          if (w >= 4.5 && w <= 16 && h >= 4.5 && h <= 16 && Math.abs(w - h) <= 2) (filled ? fills : boxes).push(r);
          else if (h > 6) {
            // table cell borders (and thin filled bars used as lines) mark column boundaries
            if (!filled || w < 2.5) { rules.push({ x: r.x1, y1: r.y1, y2: r.y2 }); if (w >= 2.5) rules.push({ x: r.x2, y1: r.y1, y2: r.y2 }); }
          }
        });
        pending.lines.forEach(([a, b]) => { if (Math.abs(a[0] - b[0]) < 0.8 && Math.abs(a[1] - b[1]) > 6) rules.push({ x: a[0], y1: Math.min(a[1], b[1]), y2: Math.max(a[1], b[1]) }); });
        // a box drawn as four lines
        if (pending.lines.length >= 3 && !pending.rects.length) {
          const xs = pending.lines.flat().map(p => p[0]), ys = pending.lines.flat().map(p => p[1]);
          const r = { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
          const w = r.x2 - r.x1, h = r.y2 - r.y1;
          const axis = pending.lines.every(([a, b]) => Math.abs(a[0] - b[0]) < 0.5 || Math.abs(a[1] - b[1]) < 0.5);
          if (axis && w >= 4.5 && w <= 16 && Math.abs(w - h) <= 2) (filled ? fills : boxes).push(r);
          else pending.lines.forEach(l => segs.push(l));
        } else pending.lines.forEach(l => segs.push(l));
        pending = null;
      } else if (fn === OPS.endPath) pending = null;
    }
    // de-duplicate boxes drawn twice
    const uniq = [];
    boxes.forEach(b => { if (!uniq.some(u => Math.abs(u.x1 - b.x1) < 1.5 && Math.abs(u.y1 - b.y1) < 1.5)) uniq.push(b); });
    return { boxes: uniq, fills, segs, rules };
  }

  const inside = (r, x, y, pad) => x >= r.x1 - pad && x <= r.x2 + pad && y >= r.y1 - pad && y <= r.y2 + pad;

  async function readPdf(lib, data, onPage) {
    const doc = await lib.getDocument({ data, isEvalSupported: false, disableFontFace: true, useSystemFonts: true, verbosity: 0 }).promise;
    const pages = []; const stats = { duplicates: 0, rotated: 0, boxes: 0, glyphMarks: 0, fields: 0 };
    for (let p = 1; p <= doc.numPages; p++) {
      onPage && onPage(p, doc.numPages);
      const page = await doc.getPage(p); const vp = page.getViewport({ scale: 1 }); const PH = vp.height;
      const tc = await page.getTextContent();
      let shapes = { boxes: [], fills: [], segs: [], rules: [] };
      try {
        const ol = await page.getOperatorList({ annotationMode: lib.AnnotationMode ? lib.AnnotationMode.DISABLE : 0 });
        shapes = shapesFromOps(lib, ol);
      } catch (e) { /* drawing commands are optional; text still works */ }
      const fontNames = {};
      Object.keys(tc.styles || {}).forEach(k => { try { const f = page.commonObjs.get(k); fontNames[k] = (f && f.name) || ''; } catch (e) { fontNames[k] = ''; } });
      // scanned pages carry an invisible machine-read (OCR) text layer in a placeholder font
      if (Object.values(fontNames).some(n => /ocr|glyphless/i.test(n))) stats.ocrPages = (stats.ocrPages || 0) + 1;

      // 1. text items, minus rotated text and overprinted duplicates
      const items = []; const seen = new Map();
      tc.items.forEach(i => {
        if (i.str === undefined || !i.str.trim()) return;
        const t = i.transform; const size = Math.hypot(t[2], t[3]) || i.height || 10;
        if (Math.abs(t[1]) > 0.05 * Math.abs(t[0]) + 0.01 || Math.abs(t[2]) > 0.05 * Math.abs(t[3]) + 0.01) { stats.rotated++; return; }
        const fam = (fontNames[i.fontName] || '').replace(/^[A-Z]{6}\+/, '').replace(/[,_-]?(MT|PS|PSMT)$/i, '');
        const it = { x: t[4], y: PH - t[5], w: i.width, h: Math.abs(t[3]) || size, str: i.str, font: fam || i.fontName, pdfY: t[5] };
        const key = it.str.trim();
        const list = seen.get(key) || [];
        if (list.some(o => Math.abs(o.x - it.x) <= Math.max(1.6, it.h * 0.25) && Math.abs(o.y - it.y) <= 1.6)) { stats.duplicates++; return; }
        list.push(it); seen.set(key, list);
        // checkbox glyphs
        const sm = symbolMark(it.str, fontNames[i.fontName]);
        if (sm) { it.mark = sm; stats.glyphMarks++; }
        items.push(it);
      });

      // 2. drawn boxes: checked if a mark, a filled square or crossing lines sit inside
      shapes.boxes.forEach(b => {
        const cx = (b.x1 + b.x2) / 2, cy = (b.y1 + b.y2) / 2;
        let on = false;
        for (let k = items.length - 1; k >= 0; k--) {
          const it = items[k];
          const ix = it.x + it.w / 2, iy = it.pdfY + it.h * 0.35;
          if (inside(b, ix, iy, 1.5) && (MARK_TEXT.test(it.str.trim()) || it.mark)) { if (it.mark !== OFF) on = true; items.splice(k, 1); }
        }
        if (!on && shapes.fills.some(f => inside(b, (f.x1 + f.x2) / 2, (f.y1 + f.y2) / 2, 0.5) && (f.x2 - f.x1) < (b.x2 - b.x1) + 0.5)) on = true;
        if (!on && shapes.segs.filter(([a, c]) => inside(b, a[0], a[1], 1) && inside(b, c[0], c[1], 1) && Math.abs(a[0] - c[0]) > 1 && Math.abs(a[1] - c[1]) > 1).length >= 1) on = true;
        const h = b.y2 - b.y1;
        items.push({ x: b.x1, y: PH - b.y1 - 1, w: b.x2 - b.x1, h: Math.max(h, 7), str: on ? ON : OFF, font: '_mark', mark: on ? ON : OFF });
        stats.boxes++;
        void cx; void cy;
      });

      // 3. fillable form fields
      try {
        const ann = await page.getAnnotations();
        ann.forEach(a => {
          // text boxes typed on top of the page (Acrobat "Fill & Sign", Preview, Edge "Add text"): FreeText annotations
          if (a.subtype === 'FreeText' && a.rect) {
            const txt = (a.textContent && a.textContent.length ? a.textContent.join('\n') : ((a.contentsObj && a.contentsObj.str) || a.contents || '')).replace(/\r\n?/g, '\n');
            if (!txt.trim()) return;
            const [x1, y1, x2, y2] = a.rect;
            const fs = Math.min(14, Math.max(6, (a.defaultAppearanceData && a.defaultAppearanceData.fontSize) || 9));
            const per = Math.max(8, Math.floor((x2 - x1 - 4) / (fs * 0.5)));
            const lines = [];
            txt.split('\n').forEach(par => { let cur = ''; par.split(/\s+/).forEach(w => { if (cur && (cur + ' ' + w).length > per) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }); if (cur) lines.push(cur); });
            lines.forEach((ln, k) => items.push({ x: x1 + 2, y: PH - y2 + fs * 1.2 * (k + 1), w: ln.length * fs * 0.5, h: fs, str: ln, font: '_field', brk: k === 0 }));
            stats.fields++;
            return;
          }
          if (a.subtype !== 'Widget' || !a.rect) return;
          const [x1, y1, x2, y2] = a.rect;
          if (a.checkBox || a.radioButton) {
            const v = a.fieldValue; const on = a.checkBox ? (v && v !== 'Off' && v !== false) : (v && v === a.buttonValue);
            items.push({ x: x1, y: PH - y1 - 1, w: x2 - x1, h: Math.max(7, Math.min(12, y2 - y1)), str: on ? ON : OFF, font: '_mark', mark: on ? ON : OFF });
            stats.fields++;
            return;
          }
          let v = a.fieldValue; if (Array.isArray(v)) v = v.join(', ');
          if (a.fieldType !== 'Tx' && a.fieldType !== 'Ch') return;
          if (!v || !String(v).trim()) return;
          v = String(v);
          // skip values that are already printed on the page (flattened forms)
          const first = v.trim().slice(0, 12);
          if (items.some(it => it.str.includes(first) && it.x >= x1 - 4 && it.x <= x2 && PH - it.y >= y1 - 4 && PH - it.y <= y2 + 4)) return;
          const fs = Math.min(11, Math.max(7, a.multiLine ? 9.5 : (y2 - y1) * 0.6));
          v.replace(/\r\n?/g, '\n').split('\n').forEach((ln, k) => {
            if (!ln.trim()) return;
            items.push({ x: x1 + 2, y: PH - y2 + fs * 1.15 * (k + 1), w: ln.length * fs * 0.5, h: fs, str: ln, font: '_field', brk: true });
          });
          stats.fields++;
        });
      } catch (e) { /* annotations are optional */ }

      items.forEach(it => { delete it.pdfY; });
      pages.push({ num: p, width: vp.width, height: PH, items, rules: shapes.rules.map(r => ({ x: r.x, y1: PH - r.y2, y2: PH - r.y1 })) });
      try { page.cleanup(); } catch (e) {}
    }
    try { doc.destroy(); } catch (e) {}
    stats.pages = pages.length;
    return { pages, stats };
  }

  return { readPdf, symbolMark, ON, OFF };
});
