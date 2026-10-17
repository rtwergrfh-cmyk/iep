/* Class Glance: turns one student's plan (rows from the IEP Glance reader) into chart-ready items.
   Shared by the browser app and the Node tests so both sort accommodations the same way.

   Each item gets:
   - cols: the chart columns it belongs in (an item can sit in two, e.g. extra time on classwork AND tests)
   - tags: short keys used for the class filters ("ext" = extended time, "small" = small group ...)
   Nothing here talks to the network; it only works on text already in memory. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ClassSort = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const COLS = [
    ['health', 'Health & safety'],
    ['seat', 'Seating & setting'],
    ['instr', 'Instruction'],
    ['work', 'Assignments & grading'],
    ['tests', 'Tests & quizzes'],
    ['beh', 'Breaks & behavior'],
    ['tools', 'Tools & tech'],
    ['other', 'Unsorted: please check']
  ];
  const COL_NAME = Object.fromEntries(COLS);

  const TAGS = [
    ['ext', 'Extended time'],
    ['small', 'Small group / separate room'],
    ['read', 'Read aloud / text-to-speech'],
    ['seatp', 'Preferential seating'],
    ['breaks', 'Breaks'],
    ['notes', 'Copy of notes'],
    ['check', 'Check-ins'],
    ['dirs', 'Directions repeated'],
    ['chunk', 'Chunked tasks'],
    ['reduced', 'Reduced work'],
    ['calc', 'Calculator'],
    ['scribe', 'Scribe / speech-to-text'],
    ['org', 'Organizers, models, word banks'],
    ['health', 'Health alert'],
    ['bip', 'Behavior plan']
  ];
  const TAG_NAME = Object.fromEntries(TAGS);

  const R = {
    med: /\b(blood (sugar|glucose)|glucose|insulin|diabet|nurse|inhaler|asthma|epi-?pen|seizure|allerg|anaphyla|snack|medication|medicine|glucagon|911)\b/i,
    test: /\b(tests?|quiz(zes)?|exams?|assessments?|testing|state test|staar|sbac|caaspp|regents)\b/i,
    seat: /\b(seat(s|ed|ing)?|proximity|\b(sit|seat)\w*\b.{0,25}\bfront\b|near the (teacher|board|door|point of instruction)|away from|quiet (area|space|place|room|seat)|environment|lighting|calm (corner|space|area)|alternate (setting|location)|separate (setting|room|location)|noise|headphones?|ear ?(plugs|muffs|buds)|noise buffers?)\b/i,
    tools: /\b(calculators?|text[- ]to[- ]speech|speech[- ]to[- ]text|audio ?books?|audio|computer|laptop|chromebook|tablet|device|keyboard|typing|spell ?check|word processor|dictat\w*|voice typing|multiplication (chart|table|grid)|number line|scribe|aac|pencil grip|slant board|fidget|highlighters?)\b/i,
    beh: /\b(breaks?|movement|move around|cool[- ]?down|calm|redirect\w*|prais\w*|reinforc\w*|token|reward|behavior|hand signal|signal|warning before|transitions?|restroom|bathroom|water|de-?escalat\w*|choices?|positive)\b/i,
    work: /\b(assignments?|homework|classwork|class work|reduced|shortened|fewer|shorter|due dates?|late work|late penalty|grad(e|ed|ing)|extended time|extra time|additional time|time and a half|make up the work|projects?)\b/i,
    instr: /\b(notes|directions|instructions|repeat\w*|rephras\w*|restat\w*|clarif\w*|check(s|ing)? for understanding|check[- ]?ins?|check in|model\w*|examples?|visuals?|graphic organizers?|sentence (starters|frames)|chunk\w*|steps?|prompts?|cues?|preview\w*|agenda|planner|reminders?|schedule|read aloud|read to|small[- ]group instruction|organiz\w*|word banks?|vocabulary|study guides?|outline|orally|oral (responses|answers))\b/i
  };
  const T = {
    ext: /\b(extended|extra|additional) time\b|time[- ]and[- ]a[- ]half|tiempo adicional|\bdouble time\b/i,
    extX: /\b(1\.5|2|1 1\/2)\s*(x|times)\b/i,
    small: /\bsmall[- ]group\b|\bseparate (setting|room|location)\b|\balternate (setting|location|room)\b|\breduced[- ]distraction|\bquiet (room|setting|location)\b|grupo peque/i,
    read: /\bread[- ]aloud\b|\bread to (him|her|them|the student)\b|\btext[- ]to[- ]speech\b|\boral(ly)? (administration|presentation|reading)\b|\baudio\b|\bread (the )?(questions|directions|test)\b|voz alta/i,
    seatp: /\bpreferential seating\b|\bseat(ed|ing)?\b.{0,20}\b(near|close to|front|by the|away from)\b|\b(sit|seat)\w*\b.{0,25}\bfront\b|\bproximity\b|asiento preferencial/i,
    breaks: /\bbreaks\b|\bbreak (card|pass|area|room|space|request|as needed|when|of|after|every)\b|\b(a|her|his|their|short|movement|sensory|\d+[- ]minute)\s+break\b|descansos?/i,
    notes: /\b(copy|copies) of (the )?(class |teacher )?notes\b|\bguided notes\b|\bnotes (provided|given)\b|\bprovide (the )?notes\b|\bteacher notes\b/i,
    check: /\bcheck(s|ing)? for understanding\b|\bcheck[- ]?ins?\b|\bcheck in with\b/i,
    dirs: /\b(directions|instructions)\b.{0,40}\b(repeat\w*|read|clarif\w*|rephras\w*|restat\w*|simplif\w*|written|chunk\w*|broken|one at a time|short)|\b(repeat\w*|clarif\w*|rephras\w*|restat\w*|simplif\w*)\b.{0,30}\b(directions|instructions)\b/i,
    chunk: /\bchunk\w*|\bsmaller (parts|steps|sections|tasks|chunks)\b|\bbroken (in)?to\b|\bbreak (long |larger )?(tasks|assignments|work|writing) into\b|\bshort tasks\b/i,
    reduced: /\b(reduced|shortened|fewer|shorter|modified) (assignments?|work|homework|problems|questions|tasks?|length)\b|\bodd[- ]numbered\b|\breduce(d)? (the )?(number|amount|length)\b|más cortas/i,
    calc: /\bcalculators?\b/i,
    scribe: /\bscribe\b|\bdictat\w*|\bspeech[- ]to[- ]text\b|\bvoice typing\b|dictado/i,
    org: /\bgraphic organizers?\b|\bsentence (starters|frames)\b|\bword banks?\b|\b(provide|give) (a )?(model|example)s?\b|\bmodel (paragraph|or example)\b|organizadores/i
  };
  const NOT_WEEKLY = /\b(a|per|each|every|times a|x a)\s*(week|day|month)\b|\bweekly\b|\bdaily\b/i;

  function tagsFor(text, cat) {
    const tags = [];
    const neg = /\b(never|do not|don't|avoid|no)\b/i;
    for (const k of Object.keys(T)) {
      if (k === 'extX') continue;
      const m = text.match(T[k]); if (!m) continue;
      // "Never ask him to read aloud in front of the class" is not a read-aloud accommodation
      if (neg.test(text.slice(Math.max(0, m.index - 40), m.index))) continue;
      tags.push(k);
    }
    if (!tags.includes('ext') && T.extX.test(text) && /\b(time|tests?|quiz|assignments?|classwork|work|exams?)\b/i.test(text) && !NOT_WEEKLY.test(text)) tags.push('ext');
    if (cat === 'health') tags.push('health');
    if (cat === 'behavior') tags.push('bip');
    return tags;
  }

  // which chart columns an item goes in
  function colsFor(text, cat) {
    if (cat === 'health') return ['health'];
    if (cat === 'behavior') return ['beh'];
    if (cat === 'testing') return ['tests'];
    if (cat === 'at') return R.med.test(text) ? ['health'] : ['tools'];
    const out = [];
    const isTest = R.test.test(text);
    if (R.med.test(text)) out.push('health');
    else if (T.breaks.test(text)) out.push('beh');
    else if (R.seat.test(text) && !/\b(seat (work|time))\b/i.test(text)) out.push('seat');
    else if (R.tools.test(text)) out.push('tools');
    else if (cat === 'mods' || R.work.test(text)) out.push('work');
    else if (R.beh.test(text)) out.push('beh');
    else if (R.instr.test(text)) out.push('instr');
    if (isTest && !out.includes('tests')) {
      // "extra time on assignments AND tests" belongs in both; "word bank for vocabulary tests" only in tests
      if (!out.length || (out[0] === 'work' && !/\b(assignments?|classwork|class work|homework|work)\b/i.test(text))) { out.length = 0; }
      out.push('tests');
    }
    if (!out.length) out.push(cat === 'mods' ? 'work' : 'other');
    return out;
  }

  // the bit of an extended-time line that says how much ("1.5x", "time and a half", "2x on state tests")
  function extDetail(text) {
    const m = text.match(/\b(1\.5|2|1 1\/2)\s*(x|times)\b|time[- ]and[- ]a[- ]half|double time|\b(50|100)\s*%/i);
    return m ? m[0].replace(/\s*times/i, 'x').replace(/\s+x/i, 'x').toLowerCase() : '';
  }

  const KEEP_BEH = /^(Watch for|Often triggered by|Prevent it|Teach and accept instead|When it happens|Reinforce|Safety plan|Also in the plan)$/;
  const SHOW_CATS = ['accom', 'mods', 'at', 'testing', 'health', 'behavior'];

  /* one plan -> a student.
     E = the IEP Glance engine; rows = E.rowsFromPages(...) or E.rowsFromText(...);
     label = what the teacher calls the student (first name or initials). Empty = initials from the plan. */
  function processRows(E, rows, label, opts) {
    opts = opts || {};
    const ids = E.findIdentifiers(rows);
    const code = (label || '').trim() || ids.code || 'Student';
    const list = ids.list.map(i => Object.assign({}, i, { on: !i.off }));
    // the teacher's own label must survive redaction even if it is the student's real first name
    const keep = list.filter(i => !(i.value && i.value.toLowerCase() === code.toLowerCase()));
    const red = E.makeRedactor(keep, code, []);
    const rrows = rows.map(r => Object.assign({}, r, { cells: r.cells.map(red), text: red(r.text) }));
    const res = E.analyze(rrows, opts);
    let n = 0;
    const items = [];
    res.items.forEach(it => {
      if (!SHOW_CATS.includes(it.cat)) return;
      if (it.off) return; // diagnosis labels and other items IEP Glance switches off
      if (it.suggested && (it.conf || 0) < 0.6) return;
      if (it.cat === 'behavior' && it.subName && !KEEP_BEH.test(it.subName)) return;
      let text = (it.plain || it.text || '').trim();
      if (!text) return;
      if (it.cat === 'behavior' && it.subName && it.subName !== 'Also in the plan') text = it.subName + ': ' + text;
      const cols = colsFor(it.text + ' ' + text, it.cat);
      items.push({ id: 'x' + (++n), text, src: it.src || it.text, page: it.page, cols, tags: tagsFor(it.text + ' ' + text, it.cat), on: true });
    });
    // the same line listed twice (e.g. once under accommodations, once under testing): one item, both columns
    for (let i = items.length - 1; i >= 0; i--) {
      const j = items.findIndex(o => o !== items[i] && o.text.toLowerCase() === items[i].text.toLowerCase());
      if (j >= 0 && j < i) { items[i].cols.forEach(c => { if (!items[j].cols.includes(c)) items[j].cols.push(c); }); items.splice(i, 1); }
    }
    // health and safety sentences found elsewhere in the plan, offered as suggestions
    const safety = (res.safety || []).map(s => ({ id: 'x' + (++n), text: s.text, src: s.text, page: s.page, cols: ['health'], tags: ['health'], on: false, suggested: true }));
    return { label: code, plan: res.meta && res.meta.plan === '504' ? '504' : 'IEP', lang: res.meta && res.meta.lang, items: items.concat(safety), found: items.length };
  }

  function retag(item) { item.tags = tagsFor(item.text, item.cols.includes('health') ? 'health' : (/^(Watch for|Often triggered by|Prevent it|When it happens|Teach and accept instead|Reinforce|Safety plan):/.test(item.text) ? 'behavior' : '')); return item; }

  return { COLS, COL_NAME, TAGS, TAG_NAME, colsFor, tagsFor, extDetail, processRows, retag, R };
});
