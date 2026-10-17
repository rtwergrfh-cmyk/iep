/* IEP Glance line classifier (runs on the device).
   A logistic regression model trained on labeled IEP-style lines (tools/ml/). It reads one line
   and says which part of an IEP it most likely belongs to, with a probability and the words that
   drove the decision. It only sorts text that is already in the IEP; it never writes new text.
   features() must match features() in tools/ml/train.py (checked by tools/ml/check_parity.js). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./model.js'));
  else root.IEPClassifier = factory(root.IEPModel);
})(typeof self !== 'undefined' ? self : this, function (M) {
  'use strict';
  if (!M) return null;

  function stem(w) {
    if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
    if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
    if (w.length > 4 && w.endsWith('es')) return w.slice(0, -2);
    if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
    return w;
  }
  const INIT = /\b[A-Z]\.(?:[A-Z]\.?)?(?=[\s,;:')]|$)/g;

  function features(text) {
    const raw = String(text || '');
    let t = raw.replace(INIT, ' zstud ').split('[student]').join(' zstud ');
    t = t.toLowerCase();
    t = t.replace(/\[[a-z ]+\]/g, ' zred ');
    t = t.replace(/\d+(?:[.,/:]\d+)*/g, ' 0 ');
    const toks = (t.match(/[a-z0]+/g) || []).map(stem);
    const f = new Set();
    toks.forEach(w => f.add('w:' + w));
    for (let i = 0; i + 1 < toks.length; i++) f.add('b:' + toks[i] + '_' + toks[i + 1]);
    if (raw.includes('%') || t.includes('percent')) f.add('s:pct');
    if (/\d+\s*(?:of|out of)\s*\d+/i.test(raw)) f.add('s:xofy');
    if (/\b\d+\s*(?:x|times?)\s*(?:a|per|\/|each)?\s*(?:week|wk|month|day)|\bweekly\b|\bmonthly\b|\bdaily\b|\bmin(?:ute)?s?\b/i.test(raw)) f.add('s:freq');
    if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(raw)) f.add('s:date');
    if (/^[^:]{2,40}:/.test(raw)) f.add('s:colon');
    if (raw.includes('?')) f.add('s:q');
    if (raw.includes('___')) f.add('s:under');
    f.add('s:len' + Math.min(3, Math.floor(toks.length / 6)));
    const letters = raw.replace(/[^A-Za-z]/g, '');
    if (letters.length >= 4 && letters.replace(/[^A-Z]/g, '').length / letters.length > 0.8) f.add('s:caps');
    if (/^\s*(?:[-*•]|\d{1,2}[.)]|[a-h][.)])\s/.test(raw)) f.add('s:bullet');
    if (raw.trim().endsWith('.')) f.add('s:period');
    return [...f];
  }

  // decode weights once
  const index = new Map(M.features.map((f, i) => [f, i]));
  const K = M.classes.length, N = M.features.length;
  const bin = typeof atob === 'function' ? atob(M.weights) : Buffer.from(M.weights, 'base64').toString('binary');
  const W = new Int8Array(bin.length);
  for (let i = 0; i < bin.length; i++) W[i] = (bin.charCodeAt(i) << 24) >> 24;

  function predict(text) {
    const idx = features(text).map(f => index.get(f)).filter(i => i !== undefined);
    const x = idx.length ? 1 / Math.sqrt(idx.length) : 0;
    const z = M.bias.slice();
    for (let k = 0; k < K; k++) { let s = 0; const base = k * N; for (const i of idx) s += W[base + i]; z[k] += s * M.scale[k] * x; }
    const mx = Math.max(...z); const e = z.map(v => Math.exp(v - mx)); const sum = e.reduce((a, b) => a + b, 0);
    const probs = e.map(v => v / sum);
    let best = 0; for (let k = 1; k < K; k++) if (probs[k] > probs[best]) best = k;
    // the words that pushed hardest toward the chosen category
    const STOP = /^(a|an|the|has|have|is|are|be|will|and|or|of|to|in|on|for|with|by|at|as|he|she|they|his|her|their|it|zstud|0|thi|that|may|can)$/;
    const why = idx.filter(i => /^[wb]:/.test(M.features[i]) && !M.features[i].slice(2).split('_').every(w => STOP.test(w)))
      .map(i => ({ f: M.features[i], v: W[best * N + i] }))
      .filter(o => o.v > 0).sort((a, b) => b.v - a.v).slice(0, 3)
      .map(o => o.f.slice(2).replace('_', ' ').replace(/\bzstud\b/, 'student').replace(/\b0\b/, '#'));
    const out = { cat: M.classes[best], p: probs[best], why, probs: {} };
    M.classes.forEach((c, k) => { out.probs[c] = probs[k]; });
    return out;
  }

  // ordinary IEP vocabulary (the model's words); used to tell capitalized words from names
  let VOCAB = null;
  function known(word) {
    if (!VOCAB) { VOCAB = new Set(); M.features.forEach(f => { if (f.startsWith('w:')) VOCAB.add(f.slice(2)); }); }
    return VOCAB.has(stem(String(word).toLowerCase()));
  }
  return { predict, features, known, classes: M.classes, info: M.trained };
});
