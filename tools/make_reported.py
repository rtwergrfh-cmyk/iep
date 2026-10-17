"""Fictional IEPs written to reproduce problems a tester reported (Oct 2026) with three IEPs of their own.
These are NOT the tester's files: they are new files written from the description of what went wrong,
so they are development data, not a fair test.

  reported-sam.pdf     Clean layout, standard headings: elopement plan, AAC device, 1.5x time,
                       4 breaks of 5 minutes, EpiPen, an "Autism" eligibility line.
  reported-amara.pdf   Standard headings, tricky content: seizure/911 protocol, "no hand-over-hand",
                       a rejected calculator, 1.5x classwork vs 2x state tests, other children's names,
                       behavior "Strategy:" lines, "follow the attached plan", "does not require AT",
                       diagnosis labels.
  reported-jules.pdf   Prose with unfamiliar headings ("What the team agreed to"), safety and
                       medication information, third-party names (a friend, a classmate, a staff
                       member, a sibling). Also written as samples/reported-jules.txt for the paste path.
All people and details are invented.
"""
import json, os, sys
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

OUT = sys.argv[1] if len(sys.argv) > 1 else 'samples'
ss = getSampleStyleSheet()
B = ParagraphStyle('B', parent=ss['BodyText'], fontName='Helvetica', fontSize=10, leading=13)
H = ParagraphStyle('H', parent=B, fontName='Helvetica-Bold', fontSize=11.5, leading=15, spaceBefore=8, spaceAfter=3)
H2 = ParagraphStyle('H2', parent=B, fontName='Helvetica-Bold', fontSize=10, leading=13, spaceBefore=4)
T = ParagraphStyle('T', parent=B, fontName='Helvetica-Bold', fontSize=14, leading=18, alignment=1, spaceAfter=8)


def build(fn, story):
    SimpleDocTemplate(os.path.join(OUT, fn), pagesize=letter, leftMargin=54, rightMargin=54, topMargin=54, bottomMargin=54,
                      title='Fictional IEP for testing').build(story)


def tbl(rows, widths):
    t = Table(rows, colWidths=widths)
    t.setStyle(TableStyle([('GRID', (0, 0), (-1, -1), 0.5, colors.grey), ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 9),
                           ('FONT', (0, 1), (-1, -1), 'Helvetica', 9), ('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    return t


P = lambda t, s=B: Paragraph(t, s)

# ---------------- Sam ----------------
sam = [P('Individualized Education Program', T),
       P('STUDENT INFORMATION', H),
       P('Student Name: Sam Rivera &nbsp;&nbsp; Date of Birth: 02/11/2017 &nbsp;&nbsp; Grade: 3'),
       P('Parent/Guardian: Lena Rivera &nbsp;&nbsp; Phone: (503) 555-0172'),
       P('Eligibility: Autism'),
       P('IEP Dates: 09/15/2026 to 09/14/2027'),
       P('PRESENT LEVELS OF ACADEMIC ACHIEVEMENT AND FUNCTIONAL PERFORMANCE', H),
       P('Sam reads at a second-grade level and is strongest in math facts. He communicates mostly with an AAC device '
         '(a tablet with a speech app) and some single words. He has left the classroom without permission four times this year, '
         'usually during loud transitions.'),
       P('STRENGTHS', H),
       P('Sam is a visual learner. He loves trains and puzzles and will work hard for time with them. He follows a picture schedule independently.'),
       P('HEALTH', H),
       P('Sam has a severe peanut allergy. An EpiPen is kept in the nurse\'s office and in his backpack. If he shows signs of a reaction, '
         'give the EpiPen and call 911.'),
       P('ACCOMMODATIONS', H),
       tbl([['Accommodation', 'When', 'Where'],
            ['Extended time (1.5x) on classwork and tests', 'All assignments', 'All classes'],
            ['4 breaks of 5 minutes per day in the calm corner', 'Daily', 'Classroom'],
            ['Visual schedule on his desk', 'Daily', 'All classes'],
            ['AAC device available at all times', 'Daily', 'All settings'],
            ['Warning before loud transitions (fire drills, assemblies)', 'As needed', 'All settings']], [250, 110, 110]),
       P('ASSISTIVE TECHNOLOGY', H),
       P('Sam uses an AAC device (tablet with a speech app). Staff should model words on the device during lessons.'),
       P('BEHAVIOR INTERVENTION PLAN', H),
       P('Target behavior: Elopement (leaving the classroom or building without permission).'),
       P('Triggers: Loud noises, crowded hallways, unexpected changes to the schedule.'),
       P('Prevention: Seat Sam near the door away from the hallway; preview schedule changes with the picture schedule.'),
       P('Response: If Sam leaves the room, one adult follows at a distance, keeps him in sight and radios the office. Do not chase him.'),
       P('ANNUAL GOALS', H),
       P('Goal 1 (Communication): By September 2027, Sam will use his AAC device to request a break or help in 4 of 5 opportunities, as measured by staff data.'),
       P('SPECIAL EDUCATION AND RELATED SERVICES', H),
       tbl([['Service', 'Frequency', 'Location'],
            ['Speech-language therapy', '30 minutes, 2 times a week', 'Speech room'],
            ['Specialized academic instruction', '60 minutes daily', 'Resource room']], [200, 150, 120])]
build('reported-sam.pdf', sam)
json.dump({'file': 'reported-sam.pdf', 'must': {
    'accom': ['1.5x', '4 breaks of 5 minutes', 'Visual schedule'],
    'at': ['tablet with a speech app'],
    'health': ['EpiPen', '911'],
    'behavior': ['Elopement', 'Do not chase'],
    'strengths': ['trains and puzzles'],
    'goals': ['request a break'],
    'services': ['Speech-language therapy']},
    'must_not': ['communication device device'],
    'off_by_default': ['Autism'],
    'ids': ['Sam', 'Rivera', 'Lena', '02/11/2017', '555-0172']}, open(os.path.join(OUT, 'reported-sam.expect.json'), 'w'), indent=1)

# ---------------- Amara ----------------
amara = [P('Individualized Education Program', T),
         P('STUDENT INFORMATION', H),
         P('Student Name: Amara Bello &nbsp;&nbsp; Date of Birth: 06/30/2014 &nbsp;&nbsp; Grade: 6'),
         P('Parent/Guardian: Grace Bello'),
         P('Primary Disability: Other Health Impairment (ADHD). Secondary Disability: Specific Learning Disability.'),
         P('PRESENT LEVELS OF ACADEMIC ACHIEVEMENT AND FUNCTIONAL PERFORMANCE', H),
         P('Amara reads at a fourth-grade level. She has a diagnosis of ADHD and epilepsy. She does best with short tasks and a quiet seat.'),
         P('HEALTH', H),
         P('Amara has epilepsy. If she has a seizure, time it, keep her safe on her side and do not restrain her. '
           'If a seizure lasts longer than 5 minutes, call 911 and the school nurse.'),
         P('ACCOMMODATIONS', H),
         P('&bull; Extended time (1.5x) on classwork and quizzes'),
         P('&bull; Seat A.B. away from Devon and Kayla during independent work'),
         P('&bull; No hand-over-hand assistance; use verbal and gestural prompts only'),
         P('&bull; Check in with her before independent work starts'),
         P('Options considered and rejected: calculator for math computation (rejected because computation is a goal area).'),
         P('STATE AND DISTRICT TESTING ACCOMMODATIONS', H),
         P('&bull; Extended time (2x) on state tests'),
         P('&bull; Small-group setting'),
         P('ASSISTIVE TECHNOLOGY', H),
         P('Amara does not require assistive technology at this time.'),
         P('BEHAVIOR INTERVENTION PLAN', H),
         P('Target behavior: Leaving her seat and wandering the room during independent work.'),
         P('Triggers: Long written tasks; work without a clear end point.'),
         P('Strategy: Break long tasks into short chunks with a checklist.'),
         P('Strategy: Give a 2-minute warning before transitions.'),
         P('Staff will follow the plan in the attached document.'),
         P('ANNUAL GOALS', H),
         P('Goal 1 (Math): By June 2027, Amara will solve two-step word problems with 80% accuracy, as measured by teacher probes.'),
         P('SPECIAL EDUCATION AND RELATED SERVICES', H),
         tbl([['Service', 'Frequency', 'Location'],
              ['Specialized academic instruction (math)', '45 minutes daily', 'Resource room']], [220, 140, 110])]
build('reported-amara.pdf', amara)
json.dump({'file': 'reported-amara.pdf', 'must': {
    'health': ['911', 'do not restrain'],
    'accom': ['1.5x', 'hand-over-hand', 'Check in with her'],
    'testing': ['2x'],
    'behavior': ['Leaving her seat', 'short chunks', '2-minute warning'],
    'goals': ['two-step word problems'],
    'services': ['Specialized academic instruction']},
    'must_not': ['calculator', 'does not require assistive technology', 'follow the plan in the attached document'],
    'sub': {'short chunks': 'Prevent it', '2-minute warning': 'Prevent it'},
    'off_by_default': ['Other Health Impairment', 'diagnosis of ADHD'],
    'ids': ['Amara', 'Bello', 'Grace', '06/30/2014', 'Devon', 'Kayla']}, open(os.path.join(OUT, 'reported-amara.expect.json'), 'w'), indent=1)

# ---------------- Jules ----------------
JULES = [
    ('h', 'Individualized Education Program for Jules Okafor'),
    ('p', 'Date of birth: 01/09/2015. Grade 5. Parent: Ngozi Okafor. IEP meeting date: 10/02/2026.'),
    ('h', 'About Jules'),
    ('p', 'Jules is a curious, funny fifth grader who loves building things and drawing comics. He works well with his friend Jayden, '
          'and he tends to get off task when seated near Marcus during group work. His little sister, Rosie, attends the same school. '
          'Jules reads at a second-grade level and decodes slowly; his listening comprehension is at grade level.'),
    ('h', 'What the team agreed to'),
    ('p', 'Teachers will read test questions and directions aloud to Jules. Jules gets double time (2x) on state tests and time and a half (1.5x) on classwork. '
          'Never ask him to read aloud in front of the class. He may give answers orally instead of in writing when the skill being checked is not writing.'),
    ('h', 'Keeping Jules safe'),
    ('p', 'Jules has a seizure disorder. If he has a seizure that lasts more than 3 minutes, call 911 and then the nurse. '
          'He takes levetiracetam at home every morning and evening, and the nurse keeps his rescue medication (a nasal spray) in the health office.'),
    ('h', 'Support he will receive'),
    ('p', 'Jules will receive specialized reading instruction for 30 minutes daily in the resource room with Mr. Daniels, his reading interventionist. '
          'The speech-language pathologist will consult with his teacher 30 minutes a month.'),
    ('h', 'What we are working toward'),
    ('p', 'By October 2027, Jules will read a grade 3 passage at 90 words correct per minute, as measured by monthly fluency checks.'),
]
build('reported-jules.pdf', [P(t, H if k == 'h' else B) for k, t in JULES])
open(os.path.join(OUT, 'reported-jules.txt'), 'w').write('\n\n'.join(t for _, t in JULES) + '\n')
exp = {'must': {
    'accom': ['read test questions and directions aloud', '1.5x', 'read aloud in front of the class', 'orally'],
    'testing': ['2x'],
    'health': ['911', 'levetiracetam', 'rescue medication'],
    'strengths': ['building things'],
    'services': ['specialized reading instruction'],
    'goals': ['90 words correct per minute']},
    'ids': ['Jules', 'Okafor', 'Ngozi', '01/09/2015', 'Jayden', 'Marcus', 'Daniels', 'Rosie']}
json.dump(dict(exp, file='reported-jules.pdf'), open(os.path.join(OUT, 'reported-jules.expect.json'), 'w'), indent=1)
json.dump(dict(exp, file='reported-jules.txt', paste=True), open(os.path.join(OUT, 'reported-jules-paste.expect.json'), 'w'), indent=1)
print('ok')
