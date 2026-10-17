"""Generate fictional IEPs that reproduce real-world PDF quirks, for testing.
All people and details are invented.

  messy-checkbox.pdf  State template: every option listed with a checkbox, only some checked,
                      fake-bold headings (text drawn 2-3 times), rotated margin text,
                      running header with the student's name, table headers repeated per page.
  messy-fillable.pdf  Fillable form: answers live in form fields, not in the page text.
  messy-word.pdf      Word-style export: one text item per word, numbered headings with
                      unfamiliar names, mixed narrative sections, ligatures.
Each file has a matching *.expect.json used by node/eval.js.
"""
import json, os, sys
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit

OUT = sys.argv[1] if len(sys.argv) > 1 else 'samples'
W, H = letter
LM, RM = 54, W - 54


class Doc:
    def __init__(self, fn, header=None, fake_bold=True, per_word=False, margin_note=None):
        self.c = canvas.Canvas(os.path.join(OUT, fn), pagesize=letter)
        self.header, self.fake_bold, self.per_word, self.margin_note = header, fake_bold, per_word, margin_note
        self.page = 1
        self.start_page()

    def start_page(self):
        c = self.c
        self.y = H - 50
        if self.header:
            c.setFont('Helvetica', 8); c.drawString(LM, H - 30, self.header)
            c.drawRightString(RM, H - 30, f'Page {self.page}')
            self.y = H - 62
        if self.margin_note:
            c.saveState(); c.translate(24, 200); c.rotate(90); c.setFont('Helvetica', 7)
            c.drawString(0, 0, self.margin_note); c.restoreState()
        c.setFont('Helvetica', 7); c.drawString(LM, 28, 'FICTIONAL SAMPLE FOR TESTING')

    def need(self, h):
        if self.y - h < 50:
            self.c.showPage(); self.page += 1; self.start_page()

    def text(self, x, y, s, font='Helvetica', size=9.5):
        c = self.c; c.setFont(font, size)
        if not self.per_word:
            c.drawString(x, y, s); return
        cx = x
        for wd in s.split(' '):
            c.drawString(cx, y, wd); cx += c.stringWidth(wd + ' ', font, size)

    def bold(self, x, y, s, size=11):
        # fake bold: same string drawn several times with tiny offsets (very common in form PDFs)
        if self.fake_bold:
            for dx in (0, 0.35, 0.7):
                self.text(x + dx, y, s, 'Helvetica', size)
        else:
            self.text(x, y, s, 'Helvetica-Bold', size)

    def heading(self, s, size=11.5):
        self.need(40); self.y -= 8
        self.bold(LM, self.y, s, size); self.y -= size + 6

    def para(self, s, size=9.5, indent=0, font='Helvetica'):
        lines = simpleSplit(s, font, size, RM - LM - indent)
        for ln in lines:
            self.need(size + 4); self.text(LM + indent, self.y, ln, font, size); self.y -= size + 3.2
        self.y -= 3

    def box(self, x, y, checked, style='zapf'):
        c = self.c
        if style == 'zapf':
            c.setFont('ZapfDingbats', 9); c.drawString(x, y, '\u25a0' if checked else '\u274f')  # filled square / shadowed empty square
        elif style == 'rectx':
            c.rect(x, y - 1, 8, 8, stroke=1, fill=0)
            if checked:
                c.setFont('Helvetica', 8); c.drawString(x + 1.6, y + 0.2, 'X')
        elif style == 'unicode':
            c.setFont('DejaVu', 9); c.drawString(x, y, '☒' if checked else '☐')

    def checks(self, options, style='zapf', cols=1):
        colw = (RM - LM) / cols
        for i in range(0, len(options), cols):
            self.need(14)
            for j, (label, on) in enumerate(options[i:i + cols]):
                x = LM + j * colw
                self.box(x, self.y, on, style)
                lines = simpleSplit(label, 'Helvetica', 9, colw - 20)
                self.text(x + 14, self.y, lines[0], 'Helvetica', 9)
                for k, ln in enumerate(lines[1:]):
                    self.text(x + 14, self.y - 11 * (k + 1), ln, 'Helvetica', 9)
            self.y -= 13 + 11 * max(len(simpleSplit(l, 'Helvetica', 9, colw - 20)) - 1 for l, _ in options[i:i + cols])

    def table(self, head, rows, widths, size=8.5):
        def draw_row(cells, bold=False):
            wrapped = [simpleSplit(c, 'Helvetica', size, w - 6) for c, w in zip(cells, widths)]
            hgt = max(len(w) for w in wrapped) * (size + 2.5) + 6
            self.need(hgt + (0 if bold else 30))
            if not bold and self._fresh:
                draw_row(head, True)
            x = LM
            for lines, w in zip(wrapped, widths):
                self.c.rect(x, self.y - hgt + size + 2, w, hgt, stroke=1, fill=0)
                for k, ln in enumerate(lines):
                    if bold: self.bold(x + 3, self.y - k * (size + 2.5), ln, size)
                    else: self.text(x + 3, self.y - k * (size + 2.5), ln, 'Helvetica', size)
                x += w
            self.y -= hgt
            self._fresh = False
        self._fresh = False
        draw_row(head, True)
        p0 = self.page
        for r in rows:
            before = self.page
            self.need(40)
            if self.page != before: self._fresh = True  # repeat header on new page
            draw_row(r)
        self.y -= 8

    def save(self):
        self.c.save()


def checkbox_template():
    d = Doc('messy-checkbox.pdf', header='IEP for: Jordan A. Ellis    DOB: 11/02/2013', margin_note='Form IEP-7 (Rev. 2024) - Page layout may vary')
    d.bold(LM, d.y, 'INDIVIDUALIZED EDUCATION PROGRAM', 14); d.y -= 22
    d.heading('I. STUDENT PROFILE')
    d.table(['Field', 'Information'], [
        ['Student Name', 'Jordan A. Ellis'], ['Date of Birth', '11/02/2013'], ['Student ID', '7731045'],
        ['Grade', '7'], ['School', 'Ridgeway Middle School'], ['Parent/Guardian', 'Carla Ellis'],
        ['IEP Meeting Date', '09/22/2026'], ['Anticipated Date of Annual Review', '09/21/2027']], [170, 334])
    d.para('Strengths: Jordan is curious and asks thoughtful questions in science. He is a strong visual learner and enjoys helping classmates with technology.')
    d.heading('II. SPECIAL CONSIDERATIONS')
    d.para('The IEP team must consider the following factors. Check all that apply.', 8.5)
    d.checks([('Does the student exhibit behaviors that impede his/her learning or that of others? Yes', True),
              ('Is the student blind or visually impaired?', False),
              ('Does the student need assistive technology devices and/or services?', True),
              ('Is the student deaf or hard of hearing?', False)], 'rectx')
    d.heading('III. PRESENT LEVELS OF ACADEMIC ACHIEVEMENT AND FUNCTIONAL PERFORMANCE')
    d.para('Jordan reads at a fifth grade level based on the fall reading inventory. He understands texts read aloud at grade level. In math he scored at the 32nd percentile on the district benchmark. Teachers report that Jordan starts tasks slowly and needs reminders to stay on task during independent work.')
    d.heading('IV. PROGRAM MODIFICATIONS AND SPECIALLY DESIGNED INSTRUCTION (SDI)')
    d.para('Check the supports the student will receive. Unchecked items do not apply.', 8.5)
    d.checks([('Extended time on assignments (time and a half)', True),
              ('Extended time on tests', True),
              ('Preferential seating', False),
              ('Text-to-speech for content-area reading', True),
              ('Copy of teacher notes or guided notes', True),
              ('Reduced number of problems on assignments', False),
              ('Frequent breaks', False),
              ('Chunking of long assignments into smaller parts', True),
              ('Use of a calculator for multi-step problems', True),
              ('Modified grading', False),
              ('Visual schedule', False),
              ('Check for understanding after directions are given', True)], 'zapf', cols=2)
    d.para('Other: Jordan may use noise-reducing headphones during independent work.')
    d.heading('V. STATE AND DISTRICT ASSESSMENTS')
    d.checks([('Participates in the general assessment without accommodations', False),
              ('Participates in the general assessment with accommodations', True),
              ('Participates in the alternate assessment', False)], 'rectx')
    d.table(['Testing Accommodation', 'Assessments', 'Conditions'], [
        ['Read aloud (text-to-speech)', 'Math and science tests', 'Not for reading comprehension'],
        ['Small group testing', 'All state and district tests', 'Groups of no more than 8'],
        ['Extended time', 'All timed tests', 'Time and a half']], [190, 160, 154])
    d.heading('VI. MEASURABLE ANNUAL GOALS')
    d.table(['Annual Goal', 'Baseline', 'How Measured'], [
        ['Reading Comprehension: Given a seventh grade passage, Jordan will identify the main idea and two supporting details in 4 of 5 trials.', '2 of 5 trials', 'Teacher-made probes, biweekly'],
        ['Math: Jordan will solve two-step equations with 80% accuracy.', '45% accuracy', 'Curriculum-based measures, monthly'],
        ['Task Completion: Jordan will begin independent work within 2 minutes of the direction in 4 of 5 observations.', 'Average of 7 minutes', 'Teacher observation checklist, weekly'],
        ['Self-Advocacy: Jordan will ask for help or a clarification when he does not understand a direction in 3 of 4 opportunities.', 'Rarely asks', 'Teacher and para data sheet, weekly']], [260, 104, 140])
    d.heading('VII. BEHAVIOR SUPPORT PLAN')
    d.para('Behavior of concern: Putting his head down and refusing to start work during independent assignments, about 4 times a week.')
    d.para('Function: To avoid tasks that seem too long or too hard.')
    d.para('Prevention strategies: Give the first step of the task in writing. Check in within the first two minutes of independent work. Offer a choice of which problem to start with.')
    d.para('Replacement behavior: Jordan will use a help card or ask for a short break.')
    d.para('Response: Quietly prompt Jordan to use his help card. Do not argue or repeat the demand in front of peers.')
    d.heading('VIII. SPECIAL EDUCATION AND RELATED SERVICES')
    d.table(['Service', 'Frequency', 'Location', 'Provider'], [
        ['Specialized academic instruction in math', '5 x weekly, 45 min', 'Special education classroom', 'Special education teacher'],
        ['Co-taught English language arts', 'Daily, 50 min', 'General education classroom', 'General and special education teachers'],
        ['Counseling', '2 x monthly, 30 min', 'Counseling office', 'School counselor'],
        ['Speech-language services', '1 x weekly, 30 min', 'Speech room', 'Speech-language pathologist']], [170, 104, 120, 110])
    d.heading('IX. HEALTH INFORMATION')
    d.para('Jordan has asthma. He carries an inhaler in his backpack and may need to use it after physical activity. Notify the nurse if he has trouble breathing.')
    d.heading('X. SIGNATURES')
    d.para('Parent/Guardian: Carla Ellis ____________   Case Manager: ____________   Date: 09/22/2026')
    d.save()
    return {
        'file': 'messy-checkbox.pdf',
        'must': {
            'accom': ['Extended time on assignments', 'Text-to-speech', 'guided notes', 'Chunking', 'calculator', 'Check for understanding', 'headphones'],
            'testing': ['Read aloud', 'Small group', 'Extended time'],
            'goals': ['main idea', 'two-step equations', 'begin independent work', 'ask for help'],
            'behavior': ['head down', 'avoid tasks', 'first step', 'help card'],
            'services': ['math', 'English language arts', 'Counseling', 'Speech'],
            'health': ['asthma'],
            'strengths': ['curious'],
        },
        'must_not': ['Preferential seating', 'Reduced number of problems', 'Frequent breaks', 'Modified grading', 'Visual schedule',
                     'blind or visually impaired', 'alternate assessment', 'Check all that apply', 'Unchecked items'],
        'ids': ['Jordan', 'Ellis', '11/02/2013', '7731045', 'Carla'],
    }


def fillable_form():
    fn = 'messy-fillable.pdf'
    c = canvas.Canvas(os.path.join(OUT, fn), pagesize=letter)
    f = c.acroForm
    y = H - 60
    c.setFont('Helvetica-Bold', 14); c.drawString(LM, y, 'IEP at a Glance - Fillable District Form'); y -= 28
    c.setFont('Helvetica', 7); c.drawString(LM, 28, 'FICTIONAL SAMPLE FOR TESTING')

    def label_field(label, name, value, x, yy, w, h=16, multiline=False):
        c.setFont('Helvetica-Bold', 9); c.drawString(x, yy + h + 3, label)
        f.textfield(name=name, value=value, x=x, y=yy, width=w, height=h, fontSize=9, borderWidth=0.5,
                    fieldFlags='multiline' if multiline else '', forceBorder=True)

    label_field('Student Name:', 'name', 'Priya N. Raman', LM, y - 18, 220)
    label_field('Date of Birth:', 'dob', '05/19/2015', LM + 240, y - 18, 110)
    label_field('Grade:', 'grade', '5', LM + 370, y - 18, 40)
    y -= 52
    label_field('Parent/Guardian:', 'parent', 'Lakshmi Raman', LM, y - 18, 220)
    label_field('IEP End Date:', 'end', '10/03/2027', LM + 240, y - 18, 110)
    y -= 52
    c.setFont('Helvetica-Bold', 11); c.drawString(LM, y, 'Accommodations'); y -= 70
    f.textfield(name='accom', value='Preferential seating near the teacher\nExtended time (1.5x) on tests and assignments\nDirections read aloud and repeated\nWord bank for vocabulary tests',
                x=LM, y=y, width=RM - LM, height=62, fontSize=9, fieldFlags='multiline', borderWidth=0.5)
    y -= 26
    c.setFont('Helvetica-Bold', 11); c.drawString(LM, y, 'Behavior'); y -= 18
    c.setFont('Helvetica', 9); c.drawString(LM + 16, y, 'Behavior plan in place?')
    f.checkbox(name='bip_yes', x=LM + 140, y=y - 2, size=10, checked=True, buttonStyle='cross')
    c.drawString(LM + 154, y, 'Yes')
    f.checkbox(name='bip_no', x=LM + 184, y=y - 2, size=10, checked=False, buttonStyle='cross')
    c.drawString(LM + 198, y, 'No')
    y -= 62
    f.textfield(name='beh', value='Target behavior: Calling out answers and talking to peers during whole-class lessons.\nPrevent it: Seat near the teacher and give her a role during lessons.\nWhen it happens: Use the agreed hand signal; do not engage in discussion.',
                x=LM, y=y, width=RM - LM, height=54, fontSize=8.5, fieldFlags='multiline', borderWidth=0.5)
    y -= 26
    c.setFont('Helvetica-Bold', 11); c.drawString(LM, y, 'Health / Medical'); y -= 44
    f.textfield(name='health', value='Type 1 diabetes. Priya checks her blood sugar before lunch with the nurse. Allow snacks and water in class at any time.',
                x=LM, y=y, width=RM - LM, height=36, fontSize=9, fieldFlags='multiline', borderWidth=0.5)
    y -= 26
    c.setFont('Helvetica-Bold', 11); c.drawString(LM, y, 'Services'); y -= 44
    f.textfield(name='svc', value='Resource room reading instruction, 4 times a week for 40 minutes\nOccupational therapy, 1 time a week for 30 minutes',
                x=LM, y=y, width=RM - LM, height=36, fontSize=9, fieldFlags='multiline', borderWidth=0.5)
    y -= 26
    c.setFont('Helvetica-Bold', 11); c.drawString(LM, y, 'Annual Goals'); y -= 58
    f.textfield(name='goals', value='Reading Fluency: Priya will read a fifth grade passage at 110 words per minute with 95% accuracy.\nHandwriting: Priya will write legibly on lined paper in 4 of 5 samples.',
                x=LM, y=y, width=RM - LM, height=50, fontSize=9, fieldFlags='multiline', borderWidth=0.5)
    c.save()
    return {
        'file': fn,
        'must': {
            'accom': ['Preferential seating', 'Extended time', 'read aloud', 'Word bank'],
            'behavior': ['Calling out', 'role during lessons', 'hand signal'],
            'health': ['diabetes'],
            'services': ['reading instruction', 'Occupational therapy'],
            'goals': ['110 words per minute', 'legibly'],
        },
        'must_not': [],
        'ids': ['Priya', 'Raman', '05/19/2015', 'Lakshmi'],
    }


def word_export():
    d = Doc('messy-word.pdf', header='CONFIDENTIAL STUDENT RECORD', fake_bold=False, per_word=True)
    d.bold(LM, d.y, 'Individualized Education Program', 15); d.y -= 24
    d.para('Student: Marcus T. Lee      Grade: 2      School: Brookside Elementary')
    d.para('Date of Birth: 01/30/2019      Student Number: S-4410937')
    d.para('Parents: Diane and Robert Lee      IEP Dates: 10/01/2026 to 09/30/2027')
    d.heading('1. Student Profile and Interests')
    d.para('Marcus loves dinosaurs and building with blocks. He is kind to classmates and follows routines well when they are predictable.')
    d.heading('2. Learning Needs')
    d.para('Marcus is learning letter sounds and reads about 20 words correctly per minute. He has difficulty with fine motor tasks such as cutting and writing letters. Background noise makes it hard for him to focus.')
    d.heading('3. Classroom Supports')
    d.para('- Seat Marcus away from the door and the pencil sharpener.')
    d.para('- Provide a slant board and pencil grip for writing tasks.')
    d.para('- Give one direction at a time and ask Marcus to repeat it back.')
    d.para('- Use a visual timer for transitions.')
    d.para('- Allow Marcus to answer orally instead of writing when writing is not the skill being assessed.')
    d.heading('4. Instructional Program')
    d.para('Marcus will receive specialized reading instruction in a small group outside the classroom, 5 times a week for 30 minutes. He will receive occupational therapy twice a week for 30 minutes. The special education teacher will consult with the classroom teacher monthly for 20 minutes.')
    d.heading('5. What We Are Working On')
    d.para('Goal 1 (Reading): By the end of the IEP, Marcus will read 40 words correctly per minute in a second grade passage, as measured by weekly fluency checks.')
    d.para('Goal 2 (Fine Motor): Marcus will write all lowercase letters legibly in 4 of 5 trials, as measured by work samples.')
    d.para('Goal 3 (Attention): During small group lessons, Marcus will stay with the group for 10 minutes with no more than one reminder in 4 of 5 sessions.')
    d.heading('6. Additional Information')
    d.para('Marcus has a mild hearing loss in his left ear. Speak to him from his right side and face him when giving directions. He does not need a behavior plan.')
    d.para('The district will provide progress reports to parents three times a year with report cards.')
    d.save()
    return {
        'file': 'messy-word.pdf',
        'must': {
            'accom': ['away from the door', 'slant board', 'one direction at a time', 'visual timer', 'answer orally'],
            'services': ['reading instruction', 'occupational therapy', 'consult'],
            'goals': ['40 words correctly', 'lowercase letters', 'stay with the group'],
            'health': ['hearing loss'],
            'strengths': ['dinosaurs'],
        },
        'must_not': ['progress reports'],
        'ids': ['Marcus', 'Lee', '01/30/2019', 'S-4410937', 'Diane', 'Robert'],
    }


if __name__ == '__main__':
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    os.makedirs(OUT, exist_ok=True)
    exp = [checkbox_template(), fillable_form(), word_export()]
    for e in exp:
        with open(os.path.join(OUT, e['file'].replace('.pdf', '.expect.json')), 'w') as fh:
            json.dump(e, fh, indent=1)
    print('wrote', [e['file'] for e in exp])
