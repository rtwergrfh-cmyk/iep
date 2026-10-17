"""Train the IEP line classifier and export it as src/model.js.

Model: multinomial logistic regression on binary word and word-pair features
(L2-normalized), plus a few shape features (percentages, "4 of 5", frequencies, dates).
The feature function here must match features() in src/classifier.js exactly;
tools/ml/check_parity.js verifies that.

Usage: python3 tools/ml/train.py            (train, evaluate, export)
"""
import json, re, sys, os, math, base64
from collections import Counter
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix

sys.path.insert(0, os.path.dirname(__file__))
import corpus, corpus2

HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))


def stem(w):
    if len(w) > 5 and w.endswith('ing'): return w[:-3]
    if len(w) > 4 and w.endswith('ed'): return w[:-2]
    if len(w) > 4 and w.endswith('es'): return w[:-2]
    if len(w) > 3 and w.endswith('s') and not w.endswith('ss'): return w[:-1]
    return w


INIT = re.compile(r"\b[A-Z]\.(?:[A-Z]\.?)?(?=[\s,;:')]|$)")


def features(text):
    raw = text or ''
    t = INIT.sub(' zstud ', raw).replace('[student]', ' zstud ')
    t = t.lower()
    t = re.sub(r'\[[a-z ]+\]', ' zred ', t)
    t = re.sub(r'\d+(?:[.,/:]\d+)*', ' 0 ', t)
    toks = [stem(w) for w in re.findall(r'[a-z0]+', t)]
    f = set('w:' + w for w in toks)
    for a, b in zip(toks, toks[1:]):
        f.add('b:' + a + '_' + b)
    if '%' in raw or 'percent' in t: f.add('s:pct')
    if re.search(r'\d+\s*(?:of|out of)\s*\d+', raw, re.I): f.add('s:xofy')
    if re.search(r'\b\d+\s*(?:x|times?)\s*(?:a|per|/|each)?\s*(?:week|wk|month|day)|\bweekly\b|\bmonthly\b|\bdaily\b|\bmin(?:ute)?s?\b', raw, re.I): f.add('s:freq')
    if re.search(r'\d{1,2}/\d{1,2}/\d{2,4}', raw): f.add('s:date')
    if re.match(r'^[^:]{2,40}:', raw): f.add('s:colon')
    if '?' in raw: f.add('s:q')
    if '___' in raw: f.add('s:under')
    f.add('s:len' + str(min(3, len(toks) // 6)))
    letters = re.sub(r'[^A-Za-z]', '', raw)
    if len(letters) >= 4 and sum(1 for c in letters if c.isupper()) / len(letters) > 0.8: f.add('s:caps')
    if re.match(r'^\s*(?:[-*•]|\d{1,2}[.)]|[a-h][.)])\s', raw): f.add('s:bullet')
    if raw.strip().endswith('.'): f.add('s:period')
    return f


def vectorize(texts, vocab):
    X = np.zeros((len(texts), len(vocab)), dtype=np.float32)
    for i, t in enumerate(texts):
        idx = [vocab[f] for f in features(t) if f in vocab]
        if idx:
            X[i, idx] = 1.0 / math.sqrt(len(idx))
    return X


def load_heldout(name='test.tsv'):
    rows = []
    with open(os.path.join(HERE, name)) as fh:
        for ln in fh:
            ln = ln.rstrip('\n')
            if not ln.strip() or ln.startswith('#'): continue
            c, t = ln.split('\t', 1)
            rows.append((t, c))
    return rows


def main():
    data = corpus.build() + corpus2.build()
    texts = [t for t, _ in data]; labels = [c for _, c in data]
    classes = sorted(set(labels))
    tr_t, te_t, tr_y, te_y = train_test_split(texts, labels, test_size=0.2, random_state=1, stratify=labels)

    def fit(tt, yy, C):
        cnt = Counter(f for t in tt for f in features(t))
        vocab = {f: i for i, f in enumerate(sorted(f for f, n in cnt.items() if n >= 2))}
        clf = LogisticRegression(C=C, max_iter=3000, class_weight='balanced')
        clf.fit(vectorize(tt, vocab), yy)
        return clf, vocab

    held = load_heldout('test.tsv')
    dev = load_heldout('dev.tsv')
    print(f'corpus: {len(data)} lines, {len(classes)} classes; dev: {len(dev)} lines; test: {len(held)} lines (never used for training or tuning)')
    best = None
    for C in (1, 3, 8, 20):
        clf, vocab = fit(tr_t, tr_y, C)
        acc_split = accuracy_score(te_y, clf.predict(vectorize(te_t, vocab)))
        acc_dev = accuracy_score([c for _, c in dev], clf.predict(vectorize([t for t, _ in dev], vocab)))
        print(f'C={C:>4}: synthetic split {acc_split:.3f}   dev {acc_dev:.3f}   features {len(vocab)}')
        if best is None or acc_split > best[1] + 1e-9:
            best = (C, acc_split)
    C = best[0]
    print(f'chosen C={C} (by synthetic validation split only)')

    # final model on all synthetic data
    clf, vocab = fit(texts, labels, C)
    hy = [c for _, c in held]; hp = clf.predict(vectorize([t for t, _ in held], vocab))
    print('\nTEST REPORT (hand-written lines, written after the corpus, never used for training or tuning)')
    print(classification_report(hy, hp, digits=3, zero_division=0))
    print('confusion (rows=true, cols=pred):', clf.classes_.tolist())
    print(confusion_matrix(hy, hp, labels=clf.classes_))
    probs = clf.predict_proba(vectorize([t for t, _ in held], vocab))
    conf = probs.max(1)
    for th in (0.5, 0.6, 0.7, 0.8):
        m = conf >= th
        print(f'confidence >= {th}: covers {m.mean():.0%} of lines, accuracy {np.mean(np.array(hy)[m] == hp[m]):.3f}')
    # real IEP lines: reported only, never used for training or choosing settings
    real_dir = os.path.join(HERE, 'real')
    for fn in sorted(os.listdir(real_dir)):
        if not fn.endswith('.tsv'): continue
        rr = load_heldout(os.path.join('real', fn))
        ry = [c for _, c in rr]; rp = clf.predict(vectorize([t for t, _ in rr], vocab))
        print(f'\nREAL IEP ({fn}, {len(rr)} lines, never trained on): accuracy {accuracy_score(ry, rp):.3f}')
    print('\nmisclassified held-out lines:')
    for (t, c), p, pr in zip(held, hp, conf):
        if c != p: print(f'  true={c:<9} pred={p:<9} {pr:.2f}  {t[:90]}')

    # export: prune near-zero features, quantize to int8 per class
    W = clf.coef_.astype(np.float64); b = clf.intercept_.astype(np.float64)
    keep = np.where(np.abs(W).max(0) >= 0.02)[0]
    feats = sorted(vocab, key=vocab.get)
    feats = [feats[i] for i in keep]; W = W[:, keep]
    scale = np.abs(W).max(1) / 127.0
    Q = np.round(W / scale[:, None]).astype(np.int8)
    model = {
        'version': 1, 'classes': clf.classes_.tolist(), 'features': feats,
        'scale': [round(float(s), 8) for s in scale], 'bias': [round(float(x), 6) for x in b],
        'weights': base64.b64encode(Q.tobytes()).decode('ascii'),
        'trained': {'lines': len(data), 'C': C},
    }
    js = ('/* IEP Glance line classifier: logistic regression weights. Generated by tools/ml/train.py. Do not edit. */\n'
          '(function (root) { var M = ' + json.dumps(model, separators=(',', ':')) + ';\n'
          'if (typeof module === "object" && module.exports) module.exports = M; else root.IEPModel = M; })(typeof self !== "undefined" ? self : this);\n')
    with open(os.path.join(ROOT, 'src', 'model.js'), 'w') as fh:
        fh.write(js)
    # parity fixtures
    sample = [t for t, _ in held] + texts[:200]
    with open(os.path.join(HERE, 'parity.json'), 'w') as fh:
        json.dump([{'t': t, 'f': sorted(features(t)), 'p': [round(float(x), 4) for x in clf.predict_proba(vectorize([t], vocab))[0]]} for t in sample], fh)
    print(f'\nexported {len(feats)} features x {len(model["classes"])} classes, {len(js) // 1024} KB')


if __name__ == '__main__':
    main()
