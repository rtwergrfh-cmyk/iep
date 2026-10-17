"""Blind test IEPs: written after the classifier was trained, with section names and wording that
appear nowhere in tools/ml/corpus.py. Used once to measure how the tool does on unfamiliar layouts.
All people and details are invented."""
import json, os, sys
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

OUT = sys.argv[1] if len(sys.argv) > 1 else 'samples'
pdfmetrics.registerFont(TTFont('DejaVu', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuB', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
W, H = letter


class P:
    def __init__(self, fn, body='DejaVu', bold='DejaVuB'):
        self.c = canvas.Canvas(os.path.join(OUT, fn), pagesize=letter); self.y = H - 56; self.body, self.boldf = body, bold; self.n = 1
        self.foot()

    def foot(self):
        self.c.setFont(self.body, 7); self.c.drawString(60, 30, f'Fictional sample for testing - p. {self.n}')

    def need(self, h):
        if self.y - h < 50: self.c.showPage(); self.n += 1; self.y = H - 56; self.foot()

    def h(self, s, size=12):
        self.need(30); self.y -= 6; self.c.setFont(self.boldf, size); self.c.drawString(60, self.y, s); self.y -= size + 6

    def p(self, s, x=60, size=9.5, w=W - 120):
        for ln in simpleSplit(s, self.body, size, w):
            self.need(14); self.c.setFont(self.body, size); self.c.drawString(x, self.y, ln); self.y -= size + 3.5
        self.y -= 3

    def box(self, label, on, x=60):
        self.need(14); self.c.setFont('DejaVu', 10); self.c.drawString(x, self.y, '☒' if on else '☐')
        self.c.setFont(self.body, 9.5); self.c.drawString(x + 16, self.y, label); self.y -= 14

    def grid(self, head, rows, widths, size=8.5):
        def row(cells, bold):
            wr = [simpleSplit(c, self.body, size, w - 8) for c, w in zip(cells, widths)]
            hh = max(len(x) for x in wr) * (size + 3) + 6
            self.need(hh + 4)
            x = 60
            for lines, w in zip(wr, widths):
                self.c.rect(x, self.y - hh + size + 3, w, hh)
                for k, ln in enumerate(lines):
                    self.c.setFont(self.boldf if bold else self.body, size); self.c.drawString(x + 4, self.y - k * (size + 3), ln)
                x += w
            self.y -= hh
        row(head, True)
        for r in rows: row(r, False)
        self.y -= 8

    def save(self): self.c.save()


def blind_a():
    d = P('blind-district-a.pdf')
    d.c.setFont('DejaVuB', 15); d.c.drawString(60, d.y, 'Learning Plan Summary'); d.y -= 26
    d.p('Learner: Sofia M. Ortega          Birthdate: 07/04/2014          ID: 5520918')
    d.p('Grade: 6          Building: Westfield Intermediate          Plan ends: 06/12/2027')
    d.p('Guardian: Elena Ortega')
    d.h('Interests and Gifts')
    d.p('Sofia is a gifted soccer player and an encouraging teammate. She lights up when she can teach younger kids a game.')
    d.h('Current Picture')
    d.p('Sofia reads at about a fourth grade level and avoids reading aloud. She can solve one-step equations but loses track in longer problems. Her focus drops after about ten minutes of seatwork.')
    d.h('Ways We Help in Class')
    d.box('Give Sofia a written list of the steps for any task longer than 10 minutes', True)
    d.box('Seat her near the board', False)
    d.box('Let her listen to recorded versions of class novels', True)
    d.box('Fewer items on homework', False)
    d.box('Use a quiet signal (tap on the desk) to bring her back to the task', True)
    d.box('Allow her to type written responses on a laptop', True)
    d.box('Daily check of her agenda before she leaves', False)
    d.h('Quizzes and State Tests')
    d.box('Time and a half', True)
    d.box('Questions read aloud (math and science only)', True)
    d.box('Alternate assessment', False)
    d.h('Targets for This Year')
    d.p('1. Sofia will read a sixth grade passage aloud at 115 words correct per minute on 3 of 4 monthly probes.')
    d.p('2. Sofia will show each step when solving multi-step equations, getting 4 of 5 correct.')
    d.p('3. Sofia will work on a task for 15 minutes with one reminder or fewer on 4 of 5 days.')
    d.h('Who Helps and How Often')
    d.grid(['Support', 'How often', 'Where'], [
        ['Reading intervention with the reading teacher', '4 days a week, 40 minutes', 'Reading room'],
        ['Speech and language', '2 times a month, 30 minutes', 'Speech office'],
        ['Check-in with the counselor', 'Weekly, 15 minutes', 'Counseling office']], [230, 140, 120])
    d.h('Things to Know')
    d.p('Sofia has a severe shellfish allergy and her epinephrine pen is in the nurse\'s office. She also wears glasses for distance and should have them on for board work.')
    d.p('The team will send progress updates home every nine weeks.')
    d.save()
    return {'file': 'blind-district-a.pdf', 'blind': True,
            'must': {'strengths': ['soccer'],
                     'accom': ['written list of the steps', 'recorded versions', 'quiet signal', 'type written responses'],
                     'testing': ['Time and a half', 'read aloud'],
                     'goals': ['115 words correct', 'multi-step equations', '15 minutes'],
                     'services': ['Reading intervention', 'Speech and language', 'counselor'],
                     'health': ['shellfish']},
            'must_not': ['Seat her near the board', 'Fewer items on homework', 'Daily check of her agenda', 'Alternate assessment', 'progress updates'],
            'ids': ['Sofia', 'Ortega', '07/04/2014', '5520918', 'Elena']}


def blind_b():
    d = P('blind-district-b.pdf', body='Helvetica', bold='Helvetica-Bold')
    d.c.setFont('Helvetica-Bold', 14); d.c.drawString(60, d.y, 'STUDENT SUPPORT PLAN (IEP)'); d.y -= 24
    d.grid(['Name', 'DOB', 'Grade', 'Teacher of record'], [['Tyrell J. Banks', '02/18/2016', '4', 'Ms. Holt']], [150, 100, 60, 180])
    d.h('A. WHAT TYRELL DOES WELL')
    d.p('- Tyrell is a talented artist and loves to draw superheroes.')
    d.p('- He is polite and helpful to adults.')
    d.h('B. SUPPORTS FOR TYRELL')
    d.p('- Preview new vocabulary with pictures before each science unit.')
    d.p('- Give Tyrell a two-minute warning before moving to a new activity.')
    d.p('- Provide a printed copy of slides for note-taking.')
    d.p('- Tyrell may use a wobble stool at his desk.')
    d.h('C. SHORTER OR DIFFERENT WORK')
    d.p('- Spelling tests include 8 words instead of 15.')
    d.p('- Math homework is limited to 10 problems.')
    d.h('D. WHEN THINGS GET HARD')
    d.p('What it looks like: Tyrell crumples his paper and hides under the table when writing is assigned, about twice a day.')
    d.p('Why we think it happens: To get out of writing tasks that feel too hard.')
    d.p('What helps beforehand: Start writing with a drawing or by talking through ideas with an adult.')
    d.p('What we teach instead: Tyrell will point to his "help" card to ask for support.')
    d.p('What adults do: Stay calm, give him space, and offer the help card. Praise him when he returns to work.')
    d.h('E. TEAM SUPPORT')
    d.p('The school psychologist will meet with Tyrell\'s teachers once a month to review the plan.')
    d.h('F. SERVICE TIME')
    d.p('Tyrell receives special education writing support 150 minutes per week in the resource room. He also receives occupational therapy for 30 minutes weekly.')
    d.h('G. HEALTH')
    d.p('No health concerns at this time.')
    d.h('H. PROGRESS GOALS')
    d.p('Writing - Tyrell will write a 4-sentence paragraph about a picture with a capital letter and period in each sentence, 3 of 4 samples.')
    d.p('Coping - When frustrated, Tyrell will use his help card instead of hiding in 4 of 5 opportunities.')
    d.save()
    return {'file': 'blind-district-b.pdf', 'blind': True,
            'must': {'strengths': ['talented artist', 'polite'],
                     'accom': ['Preview new vocabulary', 'two-minute warning', 'printed copy of slides', 'wobble stool'],
                     'mods': ['8 words', '10 problems'],
                     'behavior': ['crumples', 'get out of writing', 'drawing or by talking', 'help" card', 'Stay calm'],
                     'personnel': ['psychologist'],
                     'services': ['writing support', 'occupational therapy'],
                     'goals': ['4-sentence paragraph', 'instead of hiding']},
            'must_not': ['No health concerns'],
            'ids': ['Tyrell', 'Banks', '02/18/2016']}


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for e in (blind_a(), blind_b()):
        json.dump(e, open(os.path.join(OUT, e['file'].replace('.pdf', '.expect.json')), 'w'), indent=1)
    print('ok')
