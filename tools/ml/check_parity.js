// Checks that the JavaScript classifier computes the same features and probabilities as the Python trainer.
const C = require('../../src/classifier.js');
const fx = require('./parity.json');
let featBad = 0, probBad = 0, maxDiff = 0;
fx.forEach(o => {
  const f = C.features(o.t).sort();
  if (JSON.stringify(f) !== JSON.stringify(o.f)) { if (featBad++ < 3) console.log('feature mismatch:', o.t, '\n js:', f, '\n py:', o.f); }
  const p = C.predict(o.t); const js = C.classes.map(c => p.probs[c]);
  const d = Math.max(...js.map((v, i) => Math.abs(v - o.p[i]))); maxDiff = Math.max(maxDiff, d);
  if (d > 0.03) probBad++;
});
console.log(`${fx.length} lines: feature mismatches ${featBad}, probability gaps > 0.03: ${probBad}, largest gap ${maxDiff.toFixed(4)} (int8 weights)`);
process.exit(featBad || probBad ? 1 : 0);
