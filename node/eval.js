// End-to-end evaluation on the fictional sample IEPs in samples/ that have a *.expect.json file.
// Usage: node node/eval.js [--baseline path/to/old/src] [--verbose]
// For each file it checks: expected items found in the right category, items placed in the wrong
// category, things that must NOT appear (unchecked options, instructions), identifier leaks,
// and rows with doubled text (the "repeated words" bug).
const fs = require('fs'), path = require('path');
const pdfjs = require('./pdfjs-dist/legacy/build/pdf.js');
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const bi = args.indexOf('--baseline');
const SAMPLES = path.join(__dirname, '..', 'samples');
// real IEPs you have permission to test with go in real-samples/ (not published); they're included when present
const REAL = path.join(__dirname, '..', 'real-samples');
const DIRS = [SAMPLES].concat(fs.existsSync(REAL) ? [REAL] : []);

async function oldPages(file) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), isEvalSupported: false, useSystemFonts: true, disableFontFace: true, verbosity: 0 }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p); const vp = page.getViewport({ scale: 1 }); const tc = await page.getTextContent();
    pages.push({ num: p, width: vp.width, height: vp.height, items: tc.items.filter(i => i.str !== undefined).map(i => ({ x: i.transform[4], y: vp.height - i.transform[5], w: i.width, h: Math.abs(i.transform[3]) || i.height, str: i.str, font: i.fontName })) });
  }
  return pages;
}

async function run(mode) {
  let E, readPages;
  if (mode === 'baseline') {
    E = require(path.resolve(args[bi + 1], 'engine.js'));
    readPages = oldPages;
  } else {
    E = require('../src/engine.js');
    const R = require('../src/pdfread.js');
    readPages = async f => (await R.readPdf(pdfjs, new Uint8Array(fs.readFileSync(f)))).pages;
  }
  const files = [].concat(...DIRS.map(d => fs.readdirSync(d).filter(f => f.endsWith('.expect.json')).sort().map(f => path.join(d, f))));
  const tot = { exp: 0, found: 0, misplaced: 0, missing: 0, forbidden: 0, forbiddenTotal: 0, leaks: 0, doubled: 0, items: 0 };
  const lines = [];
  for (const ef of files) {
    const exp = JSON.parse(fs.readFileSync(ef));
    const src = path.join(path.dirname(ef), exp.file);
    const rows = exp.paste ? E.rowsFromText(fs.readFileSync(src, 'utf8')) : E.rowsFromPages(await readPages(src));
    const ids = E.findIdentifiers(rows);
    const red = E.makeRedactor(ids.list.map(i => Object.assign({}, i, { on: !i.off })), ids.code);
    const rr = rows.map(r => Object.assign({}, r, { cells: r.cells.map(red), text: red(r.text) }));
    const res = mode === 'rules' ? E.analyze(rr, { ml: false }) : E.analyze(rr);
    const items = res.items;
    const hay = i => [i.text, i.plain, i.measure, i.detail, i.area].filter(Boolean).join(' ').toLowerCase();
    let found = 0, misplaced = 0, missing = 0, n = 0;
    const miss = [];
    Object.entries(exp.must).forEach(([cat, phrases]) => phrases.forEach(ph => {
      n++; const p = ph.toLowerCase();
      if (items.some(i => i.cat === cat && hay(i).includes(p))) found++;
      else if (items.some(i => hay(i).includes(p))) { misplaced++; miss.push(`${cat}: "${ph}" (in ${items.find(i => hay(i).includes(p)).cat})`); }
      else { missing++; miss.push(`${cat}: "${ph}" (missing)`); }
    }));
    // what prints: an item's own wording (a table header word inside an item's details doesn't count)
    const said = i => [i.text, i.plain].filter(Boolean).join(' ').toLowerCase();
    const forb = (exp.must_not || []).filter(ph => items.some(i => said(i).includes(ph.toLowerCase())))
      // things that may appear but must start switched off (diagnosis labels)
      .concat((exp.off_by_default || []).filter(ph => items.some(i => !i.off && hay(i).includes(ph.toLowerCase()))).map(ph => ph + ' (on by default)'))
      // behavior lines must land under the right sub-label
      .concat(Object.entries(exp.sub || {}).filter(([ph, sub]) => items.some(i => hay(i).includes(ph.toLowerCase()) && i.subName && i.subName !== sub)).map(([ph, sub]) => ph + ' (not under ' + sub + ')'));
    const nForb = (exp.must_not || []).length + (exp.off_by_default || []).length + Object.keys(exp.sub || {}).length;
    const blob = JSON.stringify(items);
    const leaks = (exp.ids || []).filter(id => new RegExp('\\b' + id.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '\\b').test(blob));
    const doubled = rows.filter(r => { const m = r.text.replace(/\s+/g, ' ').match(/(.{8,}?)\1/); return m && (m[1].match(/[A-Za-z]/g) || []).length >= 6; }).length;
    tot.exp += n; tot.found += found; tot.misplaced += misplaced; tot.missing += missing; tot.forbidden += forb.length; tot.forbiddenTotal += nForb; tot.leaks += leaks.length; tot.doubled += doubled; tot.items += items.length;
    const junk = items.filter(i => !Object.values(exp.must).flat().some(ph => hay(i).includes(ph.toLowerCase()))).length;
    lines.push(`  ${exp.file.padEnd(22)} found ${String(found).padStart(2)}/${n}  wrong section ${misplaced}  missing ${missing}  should-not-appear ${forb.length}/${nForb}  leaks ${leaks.length}  doubled rows ${doubled}  items ${items.length} (${junk} not matching any expected item)`);
    if (verbose) { miss.forEach(m => lines.push('      ' + m)); forb.forEach(f => lines.push('      appeared: ' + f)); leaks.forEach(l => lines.push('      LEAK: ' + l)); }
  }
  console.log(`\n${mode.toUpperCase()}`);
  lines.forEach(l => console.log(l));
  console.log(`  TOTAL: found ${tot.found}/${tot.exp} (${(100 * tot.found / Math.max(1, tot.exp)).toFixed(0)}%), wrong section ${tot.misplaced}, missing ${tot.missing}, should-not-appear ${tot.forbidden}/${tot.forbiddenTotal}, leaks ${tot.leaks}, doubled rows ${tot.doubled}`);
  return tot;
}

(async () => {
  if (bi >= 0) await run('baseline');
  await run('rules');
  await run('rules + classifier');
})();
