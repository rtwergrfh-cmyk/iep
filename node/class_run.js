// Runs plans through the Class Glance pipeline. Usage: node node/class_run.js file.pdf [file2.pdf ...]
// With --json OUT it writes a sample class file (used by the build for "Try a sample class").
const E = require('../src/engine.js');
const C = require('../src/class/sort.js');
const { pagesFromPdf } = require('./run.js');
const fs = require('fs');
(async () => {
  const args = process.argv.slice(2);
  const ji = args.indexOf('--json'); let out = null;
  if (ji >= 0) { out = args[ji + 1]; args.splice(ji, 2); }
  const students = [];
  for (const a of args) {
    const [file, label] = a.split('=');
    const rows = /\.txt$/.test(file) ? E.rowsFromText(fs.readFileSync(file, 'utf8')) : E.rowsFromPages(await pagesFromPdf(file));
    const st = C.processRows(E, rows, label || '');
    students.push(Object.assign({ id: 's' + students.length, src: file.split('/').pop() }, st));
    if (!out) {
      console.log('\n=== ' + file + ' -> ' + st.label + ' (' + st.plan + ', ' + st.found + ' items)');
      st.items.forEach(i => console.log((i.on ? '  ' : '  ?') + '[' + i.cols.join('+') + '] ' + i.text.slice(0, 120) + (i.tags.length ? '   #' + i.tags.join(' #') : '')));
    }
  }
  if (out) fs.writeFileSync(out, JSON.stringify(students));
})();
