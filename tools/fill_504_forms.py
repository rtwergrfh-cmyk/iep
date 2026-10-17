"""Fill blank public 504 forms with invented students, the way a case manager types into a PDF,
to test IEP Glance on filled-in 504 plans. Every person and detail is invented.

Needs the blank forms in real-samples/ (not published) and PyMuPDF:  pip install pymupdf
Writes real-samples/filled-*.pdf plus *.expect.json test cases (written before the tool was run).

Two ways of typing are used, because both happen in practice:
  - text added to the page itself (what "print to PDF" or most PDF editors produce), and
  - Fill & Sign style text boxes (FreeText annotations), which aren't part of the page text.
"""
import json, os, sys
import pymupdf as fz

R = sys.argv[1] if len(sys.argv) > 1 else 'real-samples'
FONT = 'helv'


class Filler:
    def __init__(self, src, pages=None, annot=False):
        self.d = fz.open(os.path.join(R, src))
        if pages is not None: self.d.select(pages)
        self.annot = annot

    def at(self, pn, x, y, text, size=9):
        p = self.d[pn]
        if self.annot:
            w = fz.get_text_length(text, fontname=FONT, fontsize=size) + 4
            a = p.add_freetext_annot(fz.Rect(x - 1, y - size - 1, x + w, y + 3), text, fontsize=size, fontname='Helv', text_color=(0, 0, 0.6))
            a.update()
        else:
            p.insert_text((x, y), text, fontsize=size, fontname=FONT, color=(0, 0, 0.55))

    def after(self, pn, label, text, dx=4, dy=-3, size=9, occ=0):
        r = self.d[pn].search_for(label)[occ]
        self.at(pn, r.x1 + dx, r.y1 + dy, text, size)

    def box(self, pn, rect, text, size=8.5):
        p = self.d[pn]; rect = fz.Rect(*rect)
        if self.annot:
            a = p.add_freetext_annot(rect, text, fontsize=size, fontname='Helv', text_color=(0, 0, 0.6)); a.update()
        else:
            rc = p.insert_textbox(rect, text, fontsize=size, fontname=FONT, color=(0, 0, 0.55))
            assert rc >= 0, ('text did not fit', text[:40], rc)

    def mark(self, pn, label, dx=-11, dy=-3, occ=0, ch='X'):
        r = self.d[pn].search_for(label)[occ]
        self.at(pn, r.x0 + dx, r.y1 + dy, ch, 10)

    def save(self, name):
        self.d.save(os.path.join(R, name), garbage=3, deflate=True)


def expect(name, d):
    d['file'] = name
    json.dump(d, open(os.path.join(R, name.replace('.pdf', '.expect.json')), 'w'), indent=1, ensure_ascii=False)


# ---------------------------------------------------------------- 1. Understood.org template (pages 1-2)
f = Filler('504-understood-template.pdf', pages=[0, 1])
f.after(0, 'School name:', 'Lincoln Park Elementary School')
f.after(0, 'Student name:', 'Maya Okonkwo')
f.after(0, 'Date of birth:', '03/14/2016')
f.after(0, 'Grade:', '4')
f.after(0, 'Qualifying disability:', 'Generalized anxiety disorder')
f.after(0, 'Date plan written:', '09/10/2026')
f.after(0, 'Date plan goes into effect:', '09/14/2026')
f.after(0, 'Date plan to be reviewed:', '09/10/2027')
f.at(0, 62, 306, 'Psychological evaluation by Dr. Ruth Feld (06/02/2026); parent and teacher rating scales.')
for (y, name, contact, sig) in [(442, 'Ms. Dana Whitfield', 'dwhitfield@lpe.org', 'Dana Whitfield'), (465, 'Mr. Omar Haddad', 'ohaddad@lpe.org', 'Omar Haddad'),
                                (488, 'Mrs. Grace Okonkwo', 'gokonkwo@mail.com', 'Grace Okonkwo'), (511, 'Ms. Priya Nair', 'pnair@lpe.org', 'Priya Nair')]:
    f.at(0, 200, y, name, 8.5); f.at(0, 321, y, contact, 8.5); f.at(0, 453, y, sig, 8.5)
f.at(0, 80, 511, 'School counselor', 8.5)
for i, line in enumerate(['Ms. Nair will meet with Maya\'s teachers in September to review her calm-down plan and the',
                          'break card. Teachers should use the agreed signal (a card placed on her desk) when Maya needs a',
                          'break, and should not call on her to read aloud or answer in front of the class without warning.']):
    f.at(0, 52, 600 + i * 20.5, line)
rows = [('Anxiety during tests', 'Take tests and quizzes in a small group in the library.', 'Mr. Haddad, Ms. Nair', 'All unit tests and state tests'),
        ('Class participation', 'Tell Maya before calling on her; let her pass and come back to the question later.', 'All teachers', 'Daily'),
        ('Breaks', 'Use a break card to go to the counselor\'s office for up to 10 minutes.', 'Student, all teachers', 'Up to 2 times a day'),
        ('Organization', 'Check her planner with her at the end of the day.', 'Homeroom teacher', 'Daily')]
ys = [187, 284, 380, 484]
for (a, b, c, dd), y in zip(rows, ys):
    f.box(1, (40, y + 8, 164, y + 90), a); f.box(1, (172, y + 8, 302, y + 90), b); f.box(1, (310, y + 8, 441, y + 90), c); f.box(1, (449, y + 8, 572, y + 90), dd)
f.at(1, 78, 614, 'Review progress at the January parent conference.')
f.after(1, 'Plan approved by:', 'Dana Whitfield', dx=6)
f.after(1, 'Date approved:', '09/10/2026', dx=6)
f.save('filled-504-understood.pdf')
expect('filled-504-understood.pdf', {'plan': '504', 'must': {
    'accom': ['before calling on her', 'break card to go to the counselor', 'planner'],
    'testing': ['small group in the library'],
    'personnel': ['calm-down plan', 'agreed signal']},
    'must_not': ['Generalized anxiety disorder', 'Psychological evaluation', 'January parent conference', 'Plan approved by', 'Area of educational need'],
    'ids': ['Maya', 'Okonkwo', 'Grace', '03/14/2016', 'Dana', 'Whitfield', 'Omar', 'Haddad', 'Priya', 'Nair', 'dwhitfield@lpe.org']})

# the same plan typed with Fill & Sign style text boxes
f = Filler('504-understood-template.pdf', pages=[0, 1], annot=True)
f.after(0, 'Student name:', 'Maya Okonkwo'); f.after(0, 'Date of birth:', '03/14/2016'); f.after(0, 'Grade:', '4')
f.after(0, 'Date plan to be reviewed:', '09/10/2027')
for (y, name) in [(442, 'Ms. Dana Whitfield'), (465, 'Mr. Omar Haddad'), (488, 'Mrs. Grace Okonkwo')]: f.at(0, 200, y, name, 8.5)
for (a, b, c, dd), y in zip(rows, ys):
    f.box(1, (40, y + 8, 164, y + 90), a); f.box(1, (172, y + 8, 302, y + 90), b); f.box(1, (310, y + 8, 441, y + 90), c); f.box(1, (449, y + 8, 572, y + 90), dd)
f.save('filled-504-understood-annot.pdf')
expect('filled-504-understood-annot.pdf', {'plan': '504', 'must': {
    'accom': ['before calling on her', 'break card to go to the counselor', 'planner'],
    'testing': ['small group in the library']},
    'must_not': ['Area of educational need'],
    'ids': ['Maya', 'Okonkwo', 'Grace', '03/14/2016', 'Dana', 'Whitfield', 'Omar', 'Haddad']})
print('ok 1')

# ---------------------------------------------------------------- 2. Texas district Form 11 (checklist by class)
f = Filler('504-eval-accom-plan.pdf')
f.after(0, 'Date:', '10/05/2026', dx=6)
f.after(0, 'Student Name:', 'Diego Fuentes', dx=8); f.after(0, 'Student ID:', '4471902', dx=8); f.after(0, 'School:', 'Riverbend Middle School', dx=8)
f.after(0, 'Date of Birth:', '11/02/2013', dx=6); f.after(0, 'Phone:', '(512) 555-0129', dx=6); f.after(0, 'Grade:', '6', dx=6)
f.mark(0, 'Annual Review', dx=-20)
for lab, occ in [('Parent/Adult Student', 0), ('English/Language Arts teacher', 0), ('Math teacher', 0), ('Science teacher', 0), ('Counselor', 0)]:
    r = f.d[0].search_for(lab)[occ]; f.at(0, r.x0 - 44 if r.x0 < 300 else r.x0 - 46, r.y1 - 3, '10/06/26', 7.5)
f.after(0, 'Signature of 504 Coordinator or other person verifying delivery of plan:', 'Laura Pratt', dx=6)
needs = [('Difficulty starting and finishing written work', 'Extended time (50%); note-taking assistance'),
         ('Loses track of assignments', 'Assignment notebook checked at end of day'),
         ('Distracted by classmates', 'Preferential seating near the teacher'),
         ('Frustration leading to leaving class', 'Cooling-off period in counselor\'s office (5 min)')]
for i, (n, a) in enumerate(needs):
    y = 563 + i * 12.5
    f.at(0, 95, y, n, 8); f.at(0, 315, y, a, 8)
p = 1
f.after(p, 'Student Name:', 'Diego Fuentes', dx=8); f.after(p, 'Student ID:', '4471902', dx=8); f.after(p, 'Campus:', 'Riverbend Middle School', dx=8)
f.after(p, 'Grade:', '6', dx=8); f.after(p, 'Accommodation Plan Begins:', '10/06/2026', dx=8); f.after(p, 'Accommodation Plan Ends:', '10/05/2027', dx=8)
f.at(p, 72, 165, 'Laura Pratt', 8)
cols = [250, 290, 330, 371, 414, 455, 491, 527]
classes = ['ELA', 'Math', 'Science', 'Soc. St.', 'PE', 'Art']
for c, x in zip(classes, cols): f.at(p, x + 3, 268, c, 7.5)
def row(label, marks, text='X'):
    r = f.d[p].search_for(label)[0]
    for k in marks: f.at(p, cols[k] + 15 - (6 if len(text) > 1 else 0), r.y1 - 3, text, 9)
f.after(p, '2. Other Testing Accommodation', ': small group', dx=1, size=8)
row('2. Other Testing Accommodation', [0, 1, 2, 3])
row('6. Note-taking assistance', [0, 2, 3])
row('7. Extended Time (by %)', [0, 1, 2, 3], '50%')
row('12. Preferential seating', [0, 1, 2, 3, 4, 5])
row('13. Assignment notebook', [0, 1, 2, 3])
row('19. Cooling-off period', [0, 1, 2, 3, 4, 5])
r = f.d[p].search_for('21.')[0]; f.at(p, r.x1 + 4, r.y1 - 3, 'Movement break after 20 minutes of seated work', 7.5)
for k in [1, 2]: f.at(p, cols[k] + 15, r.y1 - 3, 'X', 9)
r = f.d[p].search_for('No ____')[0]; f.at(p, r.x0 + 17, r.y1 - 4, 'X', 9)
p = 2
f.after(p, 'Student Name:', 'Diego Fuentes', dx=8); f.after(p, 'Student ID:', '4471902', dx=8); f.after(p, 'School:', 'Riverbend Middle School', dx=8)
f.after(p, 'Date of Plan:', '10/05/2026', dx=8)
f.at(p, 88, 266, 'Leaves the classroom without permission when frustrated by written work.', 8.5)
for lab, x in [('Proximity seating', 412), ('Reinforce appropriate behavior', 243), ('Cooling off period', 412), ('Consistent routine', 86), ('Weekly tracking form', 86)]:
    r = f.d[p].search_for(lab)[0]; f.at(p, x, r.y1 - 3, 'X', 9)
rr = [('Leaves class without permission', 'Earns 5 minutes of computer time at the end of the day', 'Reflection sheet with the counselor at lunch', 'Ms. Pratt, homeroom teacher')]
for (a, b, c, d) in rr:
    f.box(p, (68, 539, 194, 600), a, 7.5); f.box(p, (198, 539, 310, 600), b, 7.5); f.box(p, (316, 539, 428, 600), c, 7.5); f.box(p, (432, 539, 556, 600), d, 7.5)
p = 3
for i, line in enumerate(['Extended time means 50% more time on tests and major assignments; daily work may be shortened instead.',
                          'Cooling-off period: Diego may go to the counselor\'s office for up to 5 minutes using the hall pass on his desk.']):
    f.at(p, 74, 264 + i * 13.2, line, 8)
f.save('filled-504-texas-form11.pdf')
expect('filled-504-texas-form11.pdf', {'plan': '504', 'must': {
    'accom': ['Preferential seating', 'Note-taking assistance', 'Extended Time', 'Assignment notebook', 'Cooling-off period', 'Movement break'],
    'testing': ['small group'],
    'behavior': ['without permission', 'Proximity seating', 'computer time']},
    'must_not': ['Oral Testing', 'Taped Texts', 'Highlighted Textbooks', 'Use of calculator', 'Team teaching', 'Clearly defined limits', 'Journal of daily behaviors',
                 'Initial Evaluation', 'Three Year Reevaluation', 'Matching of Need', 'THIS PLAN IS CONFIDENTIAL', 'Re-teach difficult concepts'],
    'ids': ['Diego', 'Fuentes', '4471902', '11/02/2013', '555-0129', 'Pratt', 'Laura']})
print('ok 2')

# ---------------------------------------------------------------- 3. ADA Safe at School model plan (2025)
f = Filler('504-sas25.pdf')
f.at(1, 222, 180, 'Camila Reyes'); f.at(1, 125, 219, 'Oak Hollow Elementary School')
f.after(1, 'School Year', '2026-2027', dx=8)
for lab, txt in [('Student’s Name', 'Camila Reyes'), ('Birth Date', '07/19/2017'), ('Grade', '3')]:
    r = f.d[1].search_for(lab)[0]; f.at(1, r.x0, r.y0 - 3, txt)
f.after(1, 'Type of Diabetes', '1', dx=12); f.after(1, 'Homeroom Teacher', 'Mr. Daniel Ortiz', dx=10); f.after(1, 'Bus Number', '14', dx=10)
for lab, txt in [('Parent’s/Guardian’s Name', 'Lucia Reyes'), ('Email', 'lreyes@mail.com'), ('Cell Phone', '(916) 555-0163')]:
    r = f.d[1].search_for(lab)[0]; f.at(1, r.x0, r.y0 - 3, txt)
f.after(1, 'Parent/Guardian Preferred Spoken Language', 'Spanish', dx=10)
r = f.d[2].search_for('type ___')[0]; f.at(2, r.x0 + 28, r.y1 - 4, '1')
r = f.d[2].search_for('At least')[0]; f.at(2, r.x1 + 14, r.y1 - 4, '3')
f.after(3, 'trained by', '08/20/2026', dx=8)
for lab in ['Understand diabetes basics', 'Recognize and treat high and low', 'Monitor blood glucose levels via', 'Administer glucagon']:
    r = f.d[3].search_for(lab)[0]; f.at(3, r.x0 - 17, r.y1 - 3, 'X', 10)
for i, t in enumerate(['Mr. Daniel Ortiz, homeroom teacher, x214', 'Ms. Helen Park, office manager, x201', 'Coach Ray Dunn, PE teacher, x230']):
    f.at(3, 76, 478 + i * 21, t)
r = f.d[4].search_for('3.3 Diabetes supplies')[0]; f.at(4, 130, r.y1 + 11, 'the nurse\'s office (backup kit in the classroom closet)')
for y, t in [(316, 'Lucia Reyes'), (413, 'Mateo Reyes')]: f.at(9, 76, y, t)
f.at(9, 247, 316, '(916) 555-0163'); f.at(9, 247, 413, '(916) 555-0177'); f.at(9, 76, 358, 'lreyes@mail.com')
f.at(10, 76, 154, 'Dr. Anita Sharma, pediatric endocrinology'); f.at(10, 369, 154, '(916) 555-0100')
f.at(10, 76, 334, 'Lucia Reyes'); f.at(10, 76, 375, '09/02/2026'); f.at(10, 76, 529, 'Karen Liu, Principal'); f.at(10, 76, 573, '09/02/2026')
f.save('filled-504-diabetes-2025.pdf')
expect('filled-504-diabetes-2025.pdf', {'plan': '504', 'must': {
    'health': ['glucagon', '911', 'carry diabetes supplies'],
    'accom': ['water bottle', 'bathroom without restriction', 'make up any classroom instruction', 'participate fully in physical education'],
    'testing': ['take the exam at another time', 'extra time to finish the test'],
    'personnel': ['Recognize and treat high and low blood glucose', 'Administer glucagon']},
    'must_not': ['Administer insulin', 'Check ketones', 'Calculate carbohydrates', 'This sample Section 504 Plan', 'Arlington', 'Their child receives', 'parent/guardian will supply', 'Spanish'],
    'ids': ['Camila', 'Reyes', 'Lucia', 'Mateo', '07/19/2017', 'Ortiz', 'Helen', 'Park', 'Dunn', 'Sharma', 'Anita', 'Karen', 'Liu', 'lreyes@mail.com', '555-0163']})
print('ok 3')

# ---------------------------------------------------------------- 4. Epilepsy Foundation model plan
f = Filler('504-sample-b.pdf')
f.at(0, 200, 318, 'Owen Petrakis'); f.after(0, 'Student I.D. Number', '30588412', dx=8)
f.at(0, 125, 387, 'Cedar Ridge Middle School'); f.at(0, 150, 414, '2026-2027')
r = f.d[0].search_for('Birth Date')[0]; f.at(0, r.x0, r.y0 - 3, '01/27/2014')
r = f.d[0].search_for('Grade')[0]; f.at(0, r.x0 - 6, r.y0 - 3, '7th')
f.after(0, 'Homeroom Teacher', 'Ms. Irene Vos', dx=8); f.after(0, 'Bus Number', '22', dx=8)
for i, t in enumerate(['Ms. Irene Vos (homeroom)', 'Mr. Sam Adeyemi (PE)', 'Ms. Joy Bauer, RN (school nurse)']):
    f.at(3, 112, 456 + i * 27.5, t)
for i, t in enumerate(['Reminder to go to the nurse at 12:15 for his midday AED', 'Nurse watches him take the dose and records it']):
    f.at(4, 128, 125 + i * 27.5, t)
for i, t in enumerate(['Time the seizure and stay with him', 'Turn him on his side; nothing in his mouth', 'Call the nurse; call 911 if it lasts over 5 minutes']):
    f.at(4, 131, 263 + i * 27.5, t)
f.at(4, 94, 401, 'Nurse\'s office (Diastat kit also in PE office)')
f.at(4, 112, 497, 'No rope climbing or swimming without a 1:1 adult.')
f.at(4, 112, 525, 'Water break every 20 minutes in hot weather.')
for y, t in [(359, 'Nadia Petrakis'), (414, 'George Petrakis')]: f.at(7, 76, y, t)
f.at(7, 210, 359, '(410) 555-0112'); f.at(7, 210, 414, '(410) 555-0158')
f.at(7, 76, 621, 'Dr. Leah Cho, neurology'); f.at(7, 240, 621, '(410) 555-0190')
f.save('filled-504-epilepsy.pdf')
expect('filled-504-epilepsy.pdf', {'plan': '504', 'must': {
    'accom': ['participate fully in physical education', 'make up any classroom instruction', 'extra time to complete', 'rope climbing'],
    'testing': ['take the test at another time'],
    'health': ['Diastat Acudial are available', 'prescribed doses of AEDs', '911 if it lasts over 5 minutes', 'on his side']},
    'must_not': ['8301 Professional Place', 'Absence seizures', 'NOTE: This Model', 'also referred to as a seizure disorder', 'Tonic seizures'],
    'ids': ['Owen', 'Petrakis', '30588412', '01/27/2014', 'Irene', 'Vos', 'Adeyemi', 'Joy Bauer', 'Nadia', 'George', 'Leah', 'Cho', '555-0112']})
print('ok 4')

# ---------------------------------------------------------------- 5. Older ADA/DREDF plan with the self-care chart
f = Filler('504-ada-older.pdf')
f.after(1, 'Section 504 Plan for:', 'Theo Lindqvist', dx=10); f.after(1, 'School:', 'Maple Street School', dx=10); f.after(1, 'School Year:', '2026-2027', dx=10)
for lab, txt in [('Student’s Name', 'Theo Lindqvist'), ('Birth Date', '05/08/2015'), ('Grade', '5'), ('Disability', 'Type 1 diabetes')]:
    r = f.d[1].search_for(lab)[0]; f.at(1, r.x0, r.y0 - 4, txt)
for lab, txt in [('Homeroom Teacher', 'Mrs. Ellen Shaw'), ('Bus Number', '7')]:
    r = f.d[1].search_for(lab)[0]; f.at(1, r.x0, r.y0 - 4, txt)
r = f.d[1].search_for('The student has type')[0]; f.at(1, r.x1 + 12, r.y1 - 3, '1')
YES, NO, NA = 422, 480, 536
for lab, col in [('Totally independent management', NO), ('Student tests blood glucose level independently', YES), ('Student needs verification of blood glucose number', NO),
                 ('Blood glucose testing to be done by DCP', NO), ('Student administers insulin independently', NO), ('Student self-injects insulin with verification', YES),
                 ('Insulin injections to be done by DCP', NO), ('Student self-treats mild hypoglycemia', YES), ('Student requires assistance to treat mild', NO),
                 ('Student monitors own snacks and meals', NO), ('Snacks and meals to be supervised by', YES), ('Student tests and interprets own urine ketones', NA),
                 ('Urine ketones to be tested by DCP', YES), ('Student implements universal precautions', YES)]:
    r = f.d[5].search_for(lab)[0]; f.at(5, col, r.y1 - 3, 'X', 10)
for y, t in [(78, 'Anna Lindqvist'), (114, 'Erik Lindqvist')]: f.at(10, 58, y, t, 8.5)
f.at(10, 258, 78, '(608) 555-0131', 8.5); f.at(10, 258, 114, '(608) 555-0146', 8.5)
f.at(10, 58, 275, 'Dr. Paul Mensah', 8.5); f.at(10, 374, 275, '(608) 555-0102', 8.5)
f.save('filled-504-diabetes-2004.pdf')
expect('filled-504-diabetes-2004.pdf', {'plan': '504', 'must': {
    'accom': ['water bottle', 'bathroom without restriction', 'make up any classroom time'],
    'testing': ['take the test at another time'],
    'health': ['glucagon', '911', 'tests blood glucose level independently', 'self-treats mild hypoglycemia']},
    'must_not': ['Totally independent management', 'Student administers insulin independently', 'Student monitors own snacks', 'Insulin, a hormone', 'will pack snacks'],
    'ids': ['Theo', 'Lindqvist', 'Anna', 'Erik', '05/08/2015', 'Ellen', 'Shaw', 'Mensah', '555-0131']})
print('ok 5')
