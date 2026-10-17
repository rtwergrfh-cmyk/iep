"""Rebuild Washington OSPI "Sample IEP E" as a text PDF: the same wording, sections and tables,
with invented names and IDs where the public copy is blacked out. Used to test the tool on a real
IEP's wording and layout without scan and redaction damage. Name: Marcus Webb (invented)."""
import json, os, sys
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch

OUT = sys.argv[1] if len(sys.argv) > 1 else 'samples'
ss = getSampleStyleSheet()
T = ParagraphStyle('T', parent=ss['Heading2'], fontName='Times-Bold', fontSize=12, alignment=1, spaceAfter=6)
B = ParagraphStyle('B', parent=ss['BodyText'], fontName='Helvetica', fontSize=9.5, leading=12)
TB = ParagraphStyle('TB', parent=B, fontName='Times-Roman', fontSize=9.5)
BOLD = ParagraphStyle('BO', parent=TB, fontName='Times-Bold')
SM = ParagraphStyle('SM', parent=B, fontSize=8.5, leading=10.5)
N = 'Marcus'


def P(t, s=B): return Paragraph(t, s)


def purpose(t):
    tb = Table([[P('<b>PURPOSE:</b>' + t, ParagraphStyle('pp', parent=TB, fontSize=8.8, leading=10.5))]], colWidths=[7 * inch])
    tb.setStyle(TableStyle([('BOX', (0, 0), (-1, -1), 0.6, colors.black)])); return tb


def grid(rows, widths, head=True, size=8.3):
    st = ParagraphStyle('g', parent=B, fontSize=size, leading=size + 2)
    t = Table([[P(c, st) for c in r] for r in rows], colWidths=[w * inch for w in widths], repeatRows=1 if head else 0)
    s = [('GRID', (0, 0), (-1, -1), 0.5, colors.black), ('VALIGN', (0, 0), (-1, -1), 'TOP')]
    if head: s.append(('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#DDDDDD')))
    t.setStyle(TableStyle(s)); return t


def header(c, d):
    c.saveState(); c.setFont('Times-Roman', 9)
    for i, ln in enumerate(['Student ID: 4471902', 'WA SSID: 8830215774', 'District Student ID: 4471902', 'Date of Birth: 03/02/1996']):
        c.drawString(0.8 * inch, 10.5 * inch - i * 11, ln)
    c.drawString(5.4 * inch, 10.5 * inch, 'Marcus Webb')
    c.drawString(0.8 * inch, 0.5 * inch, 'Fictional rebuild of a public sample IEP for testing'); c.drawRightString(7.7 * inch, 0.5 * inch, f'Page {d.page}')
    c.restoreState()


def box(on): return '[X]' if on else '[ ]'


s = []
s.append(P('Individualized Education Program (IEP) Cover Page', T))
s.append(grid([["Student's Name: Marcus Webb", 'IEP Date: 01/17/2012'], ['Grade: 09   Age: 15', 'Disability (if identified): Emotional Behavioral Disability'],
               ['Parent/Guardian/Adult Student: Denise Webb', 'Primary language at home: English'], ['Home Address: 2210 Alder Street, Tacoma, WA 98400', 'Phone # (H): (253) 555-0119'],
               ['Most recent evaluation date: 01/11/2012', 'Plan start date: 01/17/2012'], ['Next re-evaluation must occur before this date: 01/11/2015', 'Plan end date: 01/11/2013'],
               ['Date of Plan meeting: 01/17/2012', 'Primary Staff Contact: Mr. Hale, SC Structured Learning Teacher']], [3.5, 3.5], head=False))
s.append(Spacer(1, 8))
s.append(P('The list below indicates that the individual participated in the development of this Plan and the placement decision; it does not authorize consent.', TB))
s.append(grid([['Name of Participant', 'Title'], ['R. Ortiz', 'Family Therapist'], ['K. Lund', 'General Education Teacher'], ['Denise Webb', 'Parent'],
               ['T. Nakamura', 'Psychologist'], ['J. Hale', 'Special Education Teacher']], [3.5, 3.5]))
s.append(P('Projected Graduation/Exit Date: 06/20/2015', TB))
s.append(PageBreak())

s.append(P('Team Considerations', T))
s.append(P('Meeting Date: 01/17/2012', TB))
s.append(purpose('During the IEP meeting the following factors must be considered by the IEP team. Best practice suggests that the IEP team document that the factors were considered and any decision made relative to each.'))
for q, a in [('The strengths of the student and the concerns of the parents for enhancing the education of their child.',
              f'When motivated, {N} works hard and does quality work. {N} is creative and has a good sense of humor. Denise communicated she wants the school, home, and family therapist to have good communication to support {N} in school.'),
             ("The results of the student's performance on any general state or district-wide assessments.", f'{N} will be taking the HSPE exam his sophomore year.'),
             ('The communication needs of the student.', 'None at this time.'),
             ("The student's assistive technology devices and services needs.", 'None at this time.'),
             ('In the case of a student whose behavior impedes his or her learning or that of others, consider, when appropriate, strategies, including positive behavioral interventions, strategies, and supports to address that behavior.',
              'The Structured Learning team develops interventions to address behavioral deficits.'),
             ("In the case of a student with limited English proficiency, consider the language needs of the child as such needs relate to the child's IEP.", 'None at this time.'),
             ('In the case of a student who is blind or has a visual impairment, provide for instruction in Braille and the use of Braille unless the IEP team determines that instruction in Braille is not appropriate for the student.',
              f'{N} has a prescription for reading glasses. At this time, {N} does not wear reading glasses in school.')]:
    s.append(Spacer(1, 6)); s.append(P(box(True) + ' ' + q, TB)); s.append(P(a))
s.append(PageBreak())

s.append(P('Present Level of Educational Performance', T))
s.append(purpose("The Present Level of Educational Performance describes the effects of the student's disability upon the student's involvement and progress in the general curriculum and area(s) of need."))
s.append(P('<b>Social/Emotional</b>', B))
for t in [f'{N} continues to struggle with following staff requests or directions. {N} will almost always say "no" or shake his head to communicate that he does not want or will not do what staff is asking. After {N}\'s initial refusal to comply, he complies with staff 5/10 opportunities.',
          f'{N} has been doing a good job of handling frustration and conflict without aggression. {N} comes to staff and asks for help when he is having a conflict with a peer. On two occasions this school year, {N} has pushed a chair over in frustration. On both occasions, {N} eventually picked the chair up and apologized for his behavior. {N} is currently resolving conflict without aggression 9/10 opportunities.',
          f'{N} has been very reluctant to participate in group academic activities. He prefers working independently with staff support. At this time, {N} participates in group classroom activities 3/10 opportunities.']:
    s.append(P(t)); s.append(Spacer(1, 4))
s.append(P('<b>Academic</b>', B)); s.append(P('Math', B))
s.append(P(f'{N} is completing a 6.0 grade math curriculum this year. He has demonstrated he can use a calculator to solve 6.0 calculation problems accurately 8/10 opportunities. Fluency has not been an issue and the IEP team recommends dropping this measurable skill.'))
s.append(P(f'{N} has been independently completing 6.0 grade level word problems accurately 5/10 opportunities. {N} lacks some confidence and often asks for help when he could have solved problems independently. With minimal help, {N} is often able to ask questions to confirm his thinking, and then goes on to accurately solve the problem.'))
s.append(P('Reading', B))
s.append(P(f'{N} has been very reluctant to read silently or aloud this school year. For a time, {N} was reading 1:1 with staff in an alternative location. This intervention worked well for 2 months. Then, {N} demanded staff do most of the reading aloud while he listened. At this time, {N} takes part in whole group reading, but he refuses to read aloud and rarely follows along reading the book while others read aloud. {N} is currently reading 60 WCPM at the 6.0 grade level. {N} is able to answer comprehension questions at the 6.0 grade level 75% of the time.'))
s.append(P('Writing', B))
s.append(P(f'When completing daily reading logs, {N} is able to write sentences using correct punctuation and capitalization 80% of the time. When asked to write a paragraph response for his scrapbook or other English assignments, {N} most often refuses to complete the assignment. {N} does best with 1:1 support, but often tries to get the staff to do all the work. At this time, {N} writes correct sentences to complete a paragraph with proper content and pragmatics 50% of the time.'))
s.append(P('Work Habits/Study Skills', B))
s.append(P(f'{N} continues to struggle with completing assignments. When {N} is willing to complete an assignment, he always works hard and does a good job. The IEP team has observed {N} is very concerned about making mistakes on assignments. He may be refusing to complete some assignments because he is feeling anxious about making a mistake. At this time, {N} independently completes assignments 3/10 opportunities.'))
s.append(PageBreak())

s.append(P('Secondary Transition', T))
s.append(purpose("The purpose of transition planning is to develop a coordinated set of activities designed within a results-oriented process that is focused on improving the academic achievement and functional performance of the student."))
s.append(P('<b>I. Post Secondary Goals/Outcomes</b>', TB))
s.append(grid([['Content Area: Education/Training'], [f'{N} is interested in going to college to complete a degree that would help him achieve his career goal of working in law enforcement.']], [7]))
s.append(grid([['Content Area: Employment'], [f'{N} is interested in law enforcement and possibly working for the FBI.']], [7]))
s.append(P('<b>II. Course of study</b>', TB)); s.append(P(f'{N} is completing a comprehensive course of study to meet graduation requirements.'))
s.append(P('<b>III. Agency Linkage</b>', TB)); s.append(P('** Not appropriate at this time **', BOLD))
s.append(PageBreak())

s.append(P('Measurable Annual Goals', T))
s.append(purpose("IEPs must include a statement of measurable annual goals, including academic and functional goals, designed to meet each of the student's educational needs. In order to be measurable, the goal should include a baseline (\"from\"), a target (\"to\"), and a unit of measure."))
GOALS = [('Math', f'By 01/11/2013, when given 7.0 calculation problems, {N} will calculate problems using a calculator improving accuracy from 80% at the 6.0 grade level to 80% at the 7.0 grade level as measured by classroom assessments.'),
         ('Math', f'By 01/11/2013, when given 7.0 grade level word problems, {N} will independently solve the problem improving accuracy from 50% at the 6.0 grade level to 80% at the 7.0 grade level as measured by classroom assessments.'),
         ('Reading', f'By 01/11/2013, when given 6.0 grade level text, {N} will read aloud or silently improving fluency from 60 correct words per minute to 100 correct words per minute as measured by classroom assessments.'),
         ('Reading', f'By 01/11/2013, when given 7.0 grade level text, {N} will answer comprehension questions improving accuracy from 75% at the 6.0 grade level to 80% at the 7.0 grade level as measured by classroom assessments.'),
         ('Social/Emotional/Behavioral', f'By 01/11/2013, when given a direction from staff, {N} will comply improving success from 50% to 80% of the time as measured by classroom data.'),
         ('Social/Emotional/Behavioral', f'By 01/11/2013, when given a situation that is frustrating, {N} will resolve his feelings without aggression improving success from 90% to 100% of the time as measured by classroom data.'),
         ('Social/Emotional/Behavioral', f'By 01/11/2013, when given an opportunity to participate in group academic activities, {N} will appropriately work with staff and peers improving success from 30% to 80% of the time as measured by classroom data.'),
         ('Work Habits/Study Skills', f'By 01/11/2013, when given an academic assignment, {N} will complete the assignment improving success from 30% to 80% of the time as measured by classroom data.'),
         ('Writing', f'By 01/11/2013, when given a writing prompt, {N} will write a paragraph with sentences that have correct content and pragmatics improving accuracy from 50% to 90% of the time as measured by classroom assessments.'),
         ('Writing', f'By 01/11/2013, when given a daily reading log to complete, {N} will write sentences using correct punctuation and capitalization improving accuracy from 80% to 95% of the time as measured by classroom assessments.')]
for area, g in GOALS:
    bar = Table([[P('<b>Annual Goal:</b> ' + area, TB)]], colWidths=[7 * inch]); bar.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#CCCCCC'))]))
    s += [Spacer(1, 10), bar, P("<b>Supports the student's post secondary goals:</b> Yes [X] No [ ]", TB), P(g),
          P('How will progress toward this goal be reported? (check all that apply)  [ ] Written Progress Report', TB),
          P('How often will progress be reported? [ ] Monthly [X] Quarterly [ ] Trimester [ ] Semester [ ] Other:', TB)]
s.append(PageBreak())

s.append(P('Program Accommodations/ Modifications and Support for School Personnel', T))
s.append(purpose("The purpose of this page is to document the modifications and/or accommodations that the student requires, based on the student's assessed needs, in order to advance appropriately toward attaining the identified annual goals."))
s.append(P('This student will be provided access to the general education, special education, other school services and activities including non-academic activities and extracurricular activities, and education related settings:', TB))
s.append(P('[ ] with no accommodations/modifications', TB)); s.append(P('[X] with the following accommodations/modifications', TB))
ACC = ['Behaviorally Related:alternative schedule', 'Behaviorally Related:breaks available when frustration level escalates', 'Behaviorally Related:Alternative location to resolve anger/frustration',
       'Content Area:Alternative location to complete assignments/tests', 'Grading Modifications:alter weight of class/course tests/exams', 'Grading Modifications:modified assignments for length and/or content',
       'Grading Modifications:Extended time to complete assignments/tests/projects without penalty if working appropriately',
       'Testing Response:For Writing: Students may use a print or electronic dictionary or thesaurus, spell check and word prediction software with topic specific dictionaries disabled.',
       'Testing Response:Mathematics manipulatives and calculator']
s.append(grid([['Accommodation(s)/Modification(s)', 'Frequency', 'Location', 'Duration m/d/y to m/d/y']] + [[a, 'As needed', 'All settings', '01/17/2012 to 01/11/2013'] for a in ACC], [3.6, 1.1, 1.1, 1.2]))
s.append(Spacer(1, 10)); s.append(P('<b>Supports for School Personnel</b> ( training, professional, development etc):', TB))
s.append(PageBreak())

s.append(P('State or Districtwide Assessments of Student Achievement', T))
s.append(purpose('The IEP team makes the determination of what type of assessment the student will take and what administrative modification and individual accommodations are necessary.'))
W = 'For Writing: Students may use a print or electronic dictionary or thesaurus, spell check and word prediction software with topic specific dictionaries disabled.'
s.append(grid([['Assessment', 'Participation', 'Accommodations', 'If YES, List Accommodation(s) and/or Modification(s) by Assessment'],
               ['Math Prof. Lvl. 2', 'Yes', 'Yes', 'Mathematics manipulatives and calculator'], ['Math Prof. Lvl. 3', 'No', '', ''],
               ['Reading Prof. Lvl. 2', 'Yes', 'Yes', W], ['Reading Prof. Lvl. 3', 'No', '', ''],
               ['Science Prof. Lvl. 2', 'Yes', 'Yes', W + ', Mathematics manipulatives and calculator'], ['Science Prof. Lvl. 3', 'No', '', ''],
               ['Writing Prof. Lvl. 2', 'Yes', 'Yes', W], ['Writing Prof. Lvl. 3', 'No', '', ''],
               ['WAAS Portfolio: Math, Reading, Science, Writing', 'No', '', ''], ['Locally-Determined Assessment: Math, Reading, Writing', 'No', '', '']], [1.8, 1, 1.1, 3.1]))
s.append(PageBreak())

s.append(P('Special Education and Related Services', T))
s.append(purpose("The information on this page is a summary of the student's program/services, including when services will begin, where they will be provided, who will be responsible for providing them, and when they will end."))
s.append(P('<b>Services 01/17/2012 - 01/11/2013</b>', TB))
SV = [('Math', '40 Minutes / 1 Times Daily'), ('Reading', '40 Minutes / 1 Times Daily'), ('Writing', '40 Minutes / 1 Times Daily'),
      ('Social/Emotional/Behavioral', '15 Minutes / 3 Times Daily'), ('Study Skills', '5 Minutes / 3 Times Daily')]
s.append(grid([['Concurrent', 'Service(s)', 'Service Provider for Delivering Service', 'Monitor', 'Frequency', 'Location (setting)', 'Start Date', 'End Date']] +
              [['No', a, 'SLC Tchr/Paraeducator', 'Structured Learning Tchr', f, 'Special Education', '01/17/2012', '01/11/2013'] for a, f in SV], [0.7, 1.0, 1.0, 0.9, 1.1, 0.9, 0.7, 0.7]))
s.append(grid([['Total minutes per week student spends in school:', '1000 minutes per week'], ['Total minutes per week student is served in a special education setting:', '900 minutes per week'],
               ['Percent of time in general education setting:', '10% in General Education Setting']], [4.5, 2.5], head=False))
s.append(Spacer(1, 10)); s.append(P('<b>Least Restrictive Environment (LRE):</b>', TB))
for b in ['- To the maximum extent appropriate, the student is educated with children without disabilities.',
          '- The student\'s placement should be as close as possible to the child\'s home.']:
    s.append(P(b, TB))
s.append(P('The IEP team recommends placement in Structured Learning with integration into the general education setting.'))
s.append(P('<b>Other Considerations:</b> 1. Transportation: [X] Regular [ ] Special  2. Extended School Year: [ ] Yes [X] No  3. General PE: [X] Yes [ ] No', TB))
s.append(PageBreak())

s.append(P('Prior Written Notice', T))
s.append(P('Description of the proposed or refused action:', TB)); s.append(P('Review of the annual Individualized Education Plan.'))
s.append(P('The reason we are proposing or refusing to take action is:', TB)); s.append(P('Required by law.'))
s.append(P('Any other factors that are relevant to the action:', TB))
s.append(P(f'At this time {N} is on a half-day schedule. {N} has struggled behaviorally when trying to complete a full-day schedule. The IEP team will continue to assess {N}\'s ability to successfully complete a longer school day. The IEP team recommends a gradual increase in {N}\'s school day as he demonstrates he can be successful.'))

doc = SimpleDocTemplate(os.path.join(OUT, 'real-wa-rebuilt.pdf'), pagesize=letter, leftMargin=0.75 * inch, rightMargin=0.75 * inch, topMargin=1.35 * inch, bottomMargin=0.8 * inch)
doc.build(s, onFirstPage=header, onLaterPages=header)
exp = {'file': 'real-wa-rebuilt.pdf', 'real': True,
       'must': {'strengths': ['works hard and does quality work', 'sense of humor'],
                'health': ['reading glasses'],
                'accom': ['alternative schedule', 'breaks available', 'resolve anger', 'complete assignments/tests', 'Extended time to complete'],
                'mods': ['alter weight', 'modified assignments'],
                'testing': ['dictionary', 'manipulatives'],
                'goals': ['calculate problems using a calculator', 'independently solve the problem', 'improving fluency', 'answer comprehension questions',
                          'will comply', 'without aggression', 'work with staff and peers', 'complete the assignment', 'write a paragraph', 'punctuation and capitalization improving'],
                'services': ['Math', 'Reading', 'Writing', 'Social/Emotional', 'Study Skills']},
       'must_not': ['law enforcement', 'FBI', 'Required by law', 'half-day schedule', 'reluctant to read', 'refuses to read aloud', 'pushed a chair'],
       'ids': ['Marcus', 'Webb', 'Denise', '4471902', '8830215774', '03/02/1996', '555-0119', 'Alder Street']}
json.dump(exp, open(os.path.join(OUT, 'real-wa-rebuilt.expect.json'), 'w'), indent=1)
print('ok')
