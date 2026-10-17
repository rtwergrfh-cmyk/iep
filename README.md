# IEP Glance

Turn an IEP into a one-page, plain-language sheet for each adult who works with the student: the classroom teacher, the paraprofessional, and the substitute or specials teacher.

It's built for **special education teachers and case managers**, who already hold the IEP and are responsible for making sure the team knows its part (IDEA, [34 CFR 300.323(d)](https://sites.ed.gov/idea/regs/b/d/300.323/d)).

**Everything runs in the browser.** There is no server, no account and nothing is sent to an AI service. The IEP is read on your own computer and forgotten when you close the tab.

## New: Class Glance (for general education teachers)

**[Open Class Glance](https://rtwergrfh-cmyk.github.io/iep/class.html)**: every IEP and 504 plan in a class, on one page.

A teacher adds each student (first name or initials), drops in the student's IEP, 504 plan or at-a-glance PDF (or pastes the text), checks what was found, and gets:

- **One class chart**: students down the side; seating, instruction, assignments, tests, breaks and behavior, tools, and health alerts across the top.
- **Filters**: "who gets extended time?", "who gets a test read aloud?", with the amount (1.5x, 2x) pulled from each plan.
- **A test-day list** and **a sub sheet** (health and safety first), both printable.
- **Export** to Google Sheets or Excel, and save/open files. Classes can be kept in the browser on that computer.
- **A sample class** of eight fictional students, so teachers can try it without real data.

It uses the same reader and name removal as IEP Glance (`src/pdfread.js`, `src/engine.js`) plus `src/class/sort.js`, which sorts each accommodation into chart columns and filters. Like IEP Glance, it runs entirely in the browser and its Content-Security-Policy blocks all network requests.

Build: `python3 tools/build_class.py` writes `dist/class.html` (copy it to `class.html` at the repo root to publish). Check the sorting on the sample plans with `node node/class_run.js samples/*.pdf`.

## How it works

1. **Open the IEP.** Choose a PDF exported from your IEP system, or paste the text.
2. **Remove identifying details.** The student's name becomes initials. Birth date, student ID, parent names, phone numbers, emails and addresses are removed before anything else happens. You can add anything that was missed.
3. **Check what was found.** Accommodations, modifications, assistive technology, testing accommodations, the behavior plan, goals, services, health alerts, strengths and supports for staff. Each item shows the IEP page it came from and the original wording. You can edit it, turn it off, choose which roles see it, or add any line from the IEP text.
4. **Print the sheets.** One per role, each with only what that person needs, plus your contact details and a confidentiality note.
5. **Print trackers** (optional). A weekly accommodation log (Mon–Fri boxes for each accommodation, a key, a signature line, as many weeks as you need) and a goal data sheet, both built from the items you approved.

**Section 504 plans and Spanish.** It recognizes Section 504 plans (eligibility boxes, "accommodations on tests", plan and review dates) and words the sheets as a 504 plan. It reads IEPs written in Spanish with Spanish headings, labels, behavior-plan labels, goals ("Meta 1") and service times (rules only; the classifier is English). Every sheet, the family summary and the trackers print in **English or Spanish**. There's no translation engine (that would mean sending the text somewhere, or adding a very large file), so: printed headings, labels, footers and the "in practice" tips are translated; about 150 common accommodations and services are translated from a built-in phrase list (`src/i18n.js`); anything else is listed under the sheet for the case manager to write in the other language, and prints marked "not translated" until they do. On the test files that's about a fifth of all items translated automatically, mostly short accommodations and services; goals, behavior plans and narrative need a person. The best route to a Spanish family sheet is to open the district's Spanish translation of the IEP.

**A family sheet.** A fourth sheet, written for parents: strengths, health, what staff do every day, tests, the behavior support plan, goals and services, without staff tips or the confidentiality wording meant for staff.

Extras on the sheets: a note for staff in your own words, an optional "I received this summary" signature line, and a student code you can change. **Save my work as a file** downloads the checked, de-identified items (never the PDF) as a `.iepglance` file; open it on the home page later to reprint logs or update the sheets. Nothing is saved anywhere else. If an IEP won't read well, **make a sheet by hand** starts with empty sections to type into.

How it reads an IEP:

- **The PDF reader** (`src/pdfread.js`) rebuilds lines and tables from text positions and table borders. It removes text that's printed two or three times to fake bold, ignores sideways margin text, reads fillable form fields, and works out which checkboxes are checked (drawn boxes, symbol-font boxes and Unicode boxes), so unchecked options are left out.
- **Rules** (`src/engine.js`) recognize common section headings and layouts (New York's state form, California SEIS-style documents, typical district narratives, behavior-plan labels, goal tables, service grids) and remove names and other identifiers.
- **A small trained classifier** (`src/classifier.js`, `src/model.js`) handles what the rules can't place: unfamiliar headings ("What we're working on"), sections with mixed content ("Additional information") and form instructions. It's a logistic regression over words and word pairs, about 260 KB, and runs in the page. Items it sorted are marked with how sure it was and which words decided it, and the less certain ones start switched off.
- **Duplicate merging** drops near-identical items (word-overlap similarity), noting the other page.

It never invents text: every item is a line from the IEP, and every item must be checked by the case manager.

## Try it

Open `index.html` in Chrome, Edge, Firefox or Safari. It works straight from your computer, with no internet connection. Sample IEPs with fictional students are built in, including two real public sample IEPs (Washington and California) rebuilt with invented names.

## Put it online for free (GitHub Pages)

1. Create a public GitHub repository, for example `iep-glance`.
2. Upload the contents of this folder.
3. In **Settings → Pages**, choose branch `main` and folder `/ (root)`. The site appears at `https://YOUR-NAME.github.io/iep-glance/`.

The page includes a "Download the offline copy" link so a district can run it with no website at all.

## Privacy and security

- One static HTML file. No server-side code, database, cookies, analytics or third-party requests.
- The page's Content Security Policy sets `connect-src 'none'`, so the browser itself blocks any attempt to send data. You can confirm this in the browser's network tab: the only request is for the page.
- pdf.js (Mozilla) and the Nunito font are bundled inside the file. Nothing is loaded from a CDN.
- Nothing is written to browser storage. "Start over" clears everything, and closing the tab does the same.
- No AI service or language model is involved. The classifier is a fixed table of word weights inside the page; it labels existing lines and can't write anything new.

See [docs/for-it-teams.md](docs/for-it-teams.md) for a one-page summary you can send to a district.

**This doesn't replace your district's rules.** Using any software with student records may still require approval. The printed sheets are student records: share them only with staff who work with the student.

## How well it works

**This is a beta.** It has been tested on six real public sample IEPs from four states. Every first run on a new layout went badly, and every one was fixed with general rules (not rules for that one file). So expect the first IEP from an untested system to need cleanup in step 3, and send a problem report (the link is under the review list) so it can be fixed.

"First run" is the honest number: the tool's result before it had seen that IEP. After a file is used to fix bugs, it becomes development data and its later score only shows the fixes worked.

| Real sample IEP | Layout | First run | After fixes |
| --- | --- | --- | --- |
| NYC DOE sample | New York state form | 7 correct items of 21 (rules only) | 53 correct of 68 items, 4 in the wrong section, 4 junk |
| Washington OSPI "Sample IEP E", rebuilt with its real text | Washington district form | 20 of 27 expected items, 3 that shouldn't appear, a parent's first name left in | 25 of 27, nothing that shouldn't appear, no names |
| New York BOCES sample | New York, different IEP program | about 25 of 35, 7 in the wrong section, about 90 junk items | 34 of 35, nothing that shouldn't appear, 47 items |
| Texas ARD/IEP example | Texas vendor ARD form | about 11 of 28, 9 of 11 things that shouldn't appear, 108 items; "Did Not Attend" and "Autism" treated as names | 28 of 28, 1 of 11, 79 items (still a lot of present-level detail); no wrong names |
| Fresno Unified sample, rebuilt with its real text | California SEIS-style form | 18 of 25, 3 in the wrong section, 2 of 8 things that shouldn't appear, 79 items | 25 of 25, none, 33 items |
| Texas TEA model IEP form, blank | Texas state model form | 41 items from an empty form | 7 items |
| Fresno Unified sample, original | Image-only scan | rejected with a message | same (scans aren't supported) |
| Fictional Section 504 plans (Texas-style form, California-style prose; written for this project) | 504 plans | 8 of 8 and 8 of 9 | 8 of 8 and 9 of 9 |
| Understood.org sample 504 plan for ADHD (real public sample, filled in) | 504 plan, accommodation table | 3 of 7; table headers printed as accommodations; the area column ("Organization") used as the item | 7 of 7, no names |
| Understood.org 504 plan template (blank form plus a filled example) | 504 plan, accommodation table | 3 of 6; "Contact information" taken as the student's name, so the student code was wrong and the word "information" was removed everywhere | 6 of 6, correct student code, every team member's name removed |
| American Diabetes Association model 504 plan (Safe at School, 2025; a model plan with blanks) | 504 plan, numbered paragraphs | 3 of 11; 34 items, mostly the introduction, page headers and form blanks | 9 of 11 (snack and privacy lines filed under health rather than accommodations), nothing that shouldn't appear |
| Epilepsy Foundation model 504 plan (a model plan with "(student's name)" blanks and a glossary) | 504 plan, numbered paragraphs | 3 of 6; the glossary of seizure types and the introduction printed as items | 6 of 6, "(student's name)" printed as "the student", no glossary |
| Older ADA / DREDF sample 504 plan (2004) | 504 plan, numbered paragraphs and a self-care checklist | 4 of 8; 65 items including background text, the unmarked self-care checklist and what parents will pack | 7 of 8 (snack line under health), 38 items |
| Texas district Section 504 Accommodation Plan, Form 11 (blank) | Blank checklist form | 22 items: every unmarked option in the accommodation and behavior checklists | 2 items |

**Filled-in 504 plans.** The blank forms above, filled in with invented students the way a case manager types into a PDF (`tools/fill_504_forms.py`; the expected results were written before the tool was run on them). Typed text, X marks over boxes and in table cells, answers typed over blank lines, and one copy typed with Acrobat "Fill & Sign"-style text boxes.

| Filled-in form | First try | After fixes |
| --- | --- | --- |
| Understood template, typed (anxiety; break card, small-group tests) | 4 of 6, small-group tests filed under accommodations only | 6 of 6, no names |
| Same plan typed with Fill & Sign text boxes | 0 of 4: text boxes weren't read at all | 4 of 4 |
| Texas Form 11, class-by-class checklist and behavior plan | 7 of 10; unmarked options ("Oral Testing", "Taped Texts", "Use of calculator") listed; the behavior plan's checked boxes ignored | 10 of 10, nothing unmarked listed; each accommodation shows the classes it was marked for |
| Diabetes model plan (2025), typed and boxes checked | 9 of 11 | 11 of 11, unchecked training topics left out |
| Epilepsy model plan, typed | 6 of 9; the typed seizure steps lost | 9 of 9 |
| Older diabetes plan with a Yes / No / N/A self-care chart | 6 of 8; **the student's name and birth date were left in** (typed above their labels) | 8 of 8, only the "Yes" lines kept, no names |

What changed: text boxes added with Fill & Sign, Preview or Edge are read; an X typed over an empty box checks it; underscores under a typed answer are ignored; names typed above their labels ("Theo Lindqvist" over "Student's Name") are found; a bare "Name" in a contact or doctor line is never taken as the student; titles with two names ("Mr. Daniel Ortiz") remove both; checklist grids keep only marked rows and say which classes; option lists keep only the marked options; Yes / No / N/A charts keep the Yes lines; "student need | accommodation" tables use the accommodation; behavior-plan tables put each column under its own label; typed answers in a plain font aren't headings; headings that wrap ("…SUPPLIES AND" / "EQUIPMENT") stay one heading; abbreviations like "Soc. St." don't end sentences.

Still not handled: handwriting and scans (no OCR); marks drawn as shapes rather than typed (a check drawn with a pen tool); on the Texas form, the "need → accommodation" table on page 1 repeats the checklist on page 2, so some accommodations appear twice.
| Fictional IEP in Spanish (written for this project) | Spanish | 0 of 19, the student's first name left in | 19 of 19, no names |

**A tester's three IEPs** (written by them: a clean layout, a tricky one with standard headings, and a prose IEP with headings like "What the team agreed to"). Their report: the prose IEP lost the read-aloud accommodation, the extra time, the seizure/911 instruction and the medication; other children's and a staff member's names were printed; pasted text was worse; and there were smaller bugs ("communication device device", behavior "Strategy:" lines under the wrong label, "does not require assistive technology" listed as AT, a rejected calculator, diagnosis labels on by default). Their files weren't shared, so `tools/make_reported.py` rewrites each reported problem into three new fictional IEPs (`samples/reported-*`). These are development data, written after the fact.

| Reproduction | Before | After |
| --- | --- | --- |
| Sam (clean) | 11 of 11, one wording bug | 11 of 11 |
| Amara (tricky) | 11 of 11, 6 of 7 things that shouldn't appear or are wrongly labeled, 2 classmates' names printed | 11 of 11, none, no names |
| Jules (prose PDF) | 7 of 11, 3 in the wrong section, 4 other people's names printed | 11 of 11, no names |
| Jules (pasted text) | 0 of 11 | 11 of 11, no names |

What changed for every IEP, not just these: plain-language headings ("What the team agreed to", "Keeping Jules safe", "Support he will receive", "What we're working toward") are recognized; short headings after a known section start a new section when the model is sure they belong elsewhere; pasted text keeps short standalone lines as headings and list items; a paragraph of supports becomes one item per sentence; a line about state tests is also listed under testing. Other people's names are found from titles ("Mr. Daniels") and context ("away from Devon and Kayla", "his little sister, Rosie", "friend Jayden"), and capitalized words that are neither common English words (a bundled 26,000-word list) nor used in lowercase are listed as possible names, checked by default. A **safety net** quotes any line mentioning seizures, allergies, EpiPens, 911, inhalers, medication or diabetes that didn't become an item, with a button to add it to Health; the "nothing found" banner now covers health and behavior. Supports mentioned in present levels are offered switched off, and diagnosis labels start switched off and off the substitute's sheet.

The 504 fixes, in general terms: a table's accommodation column is the item even when the first column is the area of need; table headers that wrap over several lines are skipped; team and participant tables never feed the student's name, and every name in them is removed; words like "information", "contact" and "as needed" are never names; dates of birth must contain a digit; repeated page headers a little lower on the page are removed; numbered paragraphs ("4.2 The student will…") are read as items; Word's Symbol-font empty boxes count as unchecked; form blanks ("_____"), the plan's own objectives, overview text and what parents will supply are skipped; lines about taking an exam are also listed under testing; 504 "date plan written / to be reviewed" are read. From the second batch: glossaries, background and references sections are skipped; options under "select all that apply" or a blank Yes / No / N/A header, and numbered checklists with empty numbers, count as unmarked; "(student's name)" placeholders print as "the student"; paragraphs with a first-line indent are joined; emergency medicine (glucagon, Diastat, EpiPen, insulin) and 911 lines go under health and safety wherever they appear, and are never dropped as form text.

What the earlier fixes were, in general terms: headings that wrap over several lines; topic subheadings inside present levels ("Communication Development", "Smarter Balanced Assessment") staying in present levels; answers typed in a different font (italic) not being mistaken for headings; goal objectives attached to their goals; "Area of Need: … | Goal: …" goal rows; services written as labeled lines ("Service:", "Provider:", "Duration/Freq:", "Location:") grouped into one service; tables headed "Program Modifications" filed as modifications; Special Factors questions answered Yes (assistive technology, behavior) read with the lines under them; "The IEP team discussed and determined…" and "N/A" answers skipped; summer (ESY) service tables skipped; checkbox options read correctly; legal citations, instructions and empty table labels never items; words like "Did Not Attend", "Autism" and "Skill" never treated as names.

The two rebuilt files (`samples/real-wa-rebuilt.pdf`, `samples/real-ca-fresno-rebuilt.pdf`) keep the original wording and layout with invented names, IDs and dates where the public copy had them. The other real samples aren't published with this project.

**Scans.** A scan with no text layer is rejected with a message asking for the IEP system's PDF export. Reading it would need in-browser OCR, which would add about 10 MB to the page and, judging by the Washington scan's own OCR layer, still come out jumbled.

**On fictional test files** (`node node/eval.js`): 152 of 155 expected items across 8 PDFs written for this project, no name leaks, no doubled text. They only show it works on those layouts.

**The classifier on hand-written test lines** (`tools/ml/test.tsv`, never trained on): 79% overall, 96% when it's at least 70% sure. On the Washington sample's lines, labeled before any changes: 53%. More invented training data didn't carry over to new real IEPs, which is why the fixes above are rules about layout, not more training text.

Real IEPs you're allowed to test with can go in `real-samples/` with a `*.expect.json` file; `node node/eval.js` includes them. That folder is not published.

**Problem reports.** Set `REPORT_TO` at the top of `src/app.js` to your email address before publishing, and the report box gets an "Email it" button. Either way people can copy the report (it holds the form's headings and item counts, never IEP text) and send it as a GitHub issue.

## Retraining the classifier

```
python3 tools/ml/train.py        # builds src/model.js and prints the evaluation
node tools/ml/check_parity.js    # checks the JavaScript and Python versions agree
```

Training lines are in `tools/ml/corpus.py` and `tools/ml/corpus2.py` (about 28,000 lines, all written for this project, no real student data). Held-out tests, never used for training: `tools/ml/test.tsv` (hand-written) and `tools/ml/real/` (labeled lines from real public sample IEPs). `node tools/ml/eval_real.js` scores the shipped model on them. When you add a real sample IEP, label its lines into `tools/ml/real/` before writing any new training data, so the test stays fair.

## Known limits

- It reads text-based PDFs. Scans with no text are rejected; scans with a machine-read (OCR) text layer are read but come out jumbled, and the tool warns about them. Export the IEP from the IEP system instead.
- IEP layouts vary a lot between states and vendors. It has been tested on New York, Washington, Texas and California layouts; on anything else, expect cleanup in step 3. Anything the rules miss can be added from the IEP text panel.
- Name detection relies on labels ("Student Name:", "Parent/Guardian:"), titles and context ("Mr. Daniels", "away from Devon and Kayla", "his sister, Rosie") and capitalized words that never appear in lowercase and aren't common English words. It isn't complete. Always check step 2 and the printed sheets, and add anything that was missed.
- The classifier was trained on fictional text written for this project. It will make mistakes on unfamiliar wording, which is why its items are marked and the less certain ones start switched off.
- Word (.docx) files aren't supported yet. Save as PDF or paste the text.
- The interface is in English. Sheets print in English or Spanish; IEPs written in Spanish are read with rules only.

## Project layout

```
index.html            The app. Built file; open this.
src/pdfread.js        PDF reading: text, table borders, checkboxes, form fields, duplicate removal
src/engine.js         Rows, headings, redaction, items, plain language, duplicate merging
src/classifier.js     On-device line classifier (features + prediction)
src/words.js          Common English words, used to tell capitalized words from names (tools/words/make_words.py)
src/model.js          Classifier weights (generated by tools/ml/train.py)
src/app.js            Interface
src/style.css         Styles
tools/build.py        Builds index.html from src/ and vendor/
tools/make_samples.py Generates the fictional sample IEPs
tools/make_messy.py   Generates messy test PDFs (fake bold, checkboxes, fillable fields, Word export)
tools/make_blind.py   Generates the blind test PDFs
tools/make_wa_clean.py, make_ca_clean.py  Rebuild the public Washington and Fresno sample IEPs with their real text
tools/make_reported.py  Fictional IEPs reproducing problems a tester reported
tools/make_504_es.py    Fictional Section 504 plans and a Spanish IEP
tools/fill_504_forms.py Fills public blank 504 forms with invented students, for testing (needs the blank forms and PyMuPDF)
src/i18n.js             Sheet wording in English and Spanish, and the phrase list for translating common items
tools/ml/             Training data, trainer, held-out test lines, parity check
samples/              Fictional sample IEPs used for testing and the demo
vendor/               pdf.js 3.11.174 and Nunito (with licenses)
node/run.js           Command-line test: node node/run.js samples/sample-ny-form.pdf
node/eval.js          End-to-end evaluation on every samples/*.expect.json
```

To rebuild after editing: `python3 tools/build.py`, which writes `dist/index.html`. Copy it to the top level for GitHub Pages.

## License

MIT for this project's code. pdf.js is Apache 2.0 (Mozilla). Nunito is SIL Open Font License 1.1. See `vendor/`.
