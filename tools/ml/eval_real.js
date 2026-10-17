// Scores the shipped classifier (src/model.js) on labeled line files.
// Usage: node tools/ml/eval_real.js [file.tsv ...]   (default: tools/ml/real/*.tsv and tools/ml/test.tsv)
// Reports plain accuracy and, more usefully, what would happen on a sheet:
//   sheet lines  = lines labeled with a sheet category (accom, goals, health, ...)
//   other lines  = present-level narrative and form/admin text, which should never reach a sheet
//   correct      = sheet lines placed in the right category with confidence >= threshold
//   junk         = other lines the model would put on a sheet (any sheet category, >= threshold)
const fs = require('fs'), path = require('path');
const C = require('../../src/classifier.js');
const SHEET = new Set(['accom', 'mods', 'at', 'testing', 'services', 'goals', 'behavior', 'health', 'strengths', 'personnel']);
let files = process.argv.slice(2);
if (!files.length) {
  const real = path.join(__dirname, 'real');
  files = fs.readdirSync(real).filter(f => f.endsWith('.tsv')).map(f => path.join(real, f)).concat(path.join(__dirname, 'test.tsv'));
}
for (const f of files) {
  const rows = fs.readFileSync(f, 'utf8').split('\n').filter(l => l.trim() && !l.startsWith('#')).map(l => { const i = l.indexOf('\t'); return { y: l.slice(0, i), t: l.slice(i + 1) }; });
  const preds = rows.map(r => C.predict(r.t));
  const acc = rows.filter((r, i) => preds[i].cat === r.y).length / rows.length;
  console.log(`\n${path.basename(f)}: ${rows.length} lines, accuracy ${(100 * acc).toFixed(0)}%`);
  const sheet = rows.map((r, i) => i).filter(i => SHEET.has(rows[i].y));
  const other = rows.map((r, i) => i).filter(i => !SHEET.has(rows[i].y));
  for (const th of [0.5, 0.7]) {
    const correct = sheet.filter(i => preds[i].cat === rows[i].y && preds[i].p >= th).length;
    const junk = other.filter(i => SHEET.has(preds[i].cat) && preds[i].p >= th).length;
    const wrongCat = sheet.filter(i => SHEET.has(preds[i].cat) && preds[i].cat !== rows[i].y && preds[i].p >= th).length;
    const placed = sheet.filter(i => SHEET.has(preds[i].cat) && preds[i].p >= th).length + junk;
    console.log(`  at >= ${th}: sheet lines found ${correct}/${sheet.length} (${(100 * correct / Math.max(1, sheet.length)).toFixed(0)}%), wrong category ${wrongCat}, junk ${junk}/${other.length} other lines (${(100 * junk / Math.max(1, other.length)).toFixed(0)}%), precision ${(100 * correct / Math.max(1, placed)).toFixed(0)}%`);
  }
  if (process.env.SHOW) rows.forEach((r, i) => { if (preds[i].cat !== r.y) console.log(`    ${r.y.padEnd(9)} -> ${preds[i].cat.padEnd(9)} ${preds[i].p.toFixed(2)}  ${r.t.slice(0, 90)}`); });
}
