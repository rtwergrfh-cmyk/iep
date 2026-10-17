"""Rebuild the public Fresno Unified sample IEP (an image-only scan) as a text PDF: the same wording,
sections, checkboxes and tables, with invented names and IDs where the public copy is blacked out.
Tests the tool on a real California IEP's wording and layout. Student name: Liam Ortiz (invented).
The original goal pages are incomplete (only goal #2 is included), so this file has one goal."""
import json, os, sys
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

OUT = sys.argv[1] if len(sys.argv) > 1 else 'samples'
pdfmetrics.registerFont(TTFont('DV', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DVB', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DVI', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf'))
ss = getSampleStyleSheet()
T = ParagraphStyle('T', parent=ss['Heading2'], fontName='DVB', fontSize=10.5, alignment=1, leading=13, spaceAfter=6)
B = ParagraphStyle('B', parent=ss['BodyText'], fontName='DV', fontSize=8.8, leading=11)
BB = ParagraphStyle('BB', parent=B, fontName='DVB')
I = ParagraphStyle('I', parent=B, fontName='DVI')
H = ParagraphStyle('H', parent=B, fontName='DVB', fontSize=10.5, leading=13, spaceBefore=6)
N, NAME = 'Liam', 'Liam Ortiz'
ON, OFF = '☑', '☐'


def P(t, s=B): return Paragraph(t, s)
def cb(on, label): return f'{ON if on else OFF} {label}'


def grid(rows, widths, head=True, size=8.2):
    st = ParagraphStyle('g', parent=B, fontSize=size, leading=size + 2)
    t = Table([[P(c, st) for c in r] for r in rows], colWidths=[w * inch for w in widths])
    s = [('GRID', (0, 0), (-1, -1), 0.5, colors.black), ('VALIGN', (0, 0), (-1, -1), 'TOP')]
    if head: s.append(('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#DDDDDD')))
    t.setStyle(TableStyle(s)); return t


def title(name):
    return [P('FRESNO UNIFIED SCHOOL DISTRICT<br/>' + name, T),
            grid([[f'<b>Student Name:</b> {NAME}', '<b>Birthdate:</b> 04/22/2013', '<b>IEP Date:</b> 12/11/2018']], [2.6, 2.2, 2.2], head=False), Spacer(1, 6)]


def foot(c, d):
    c.saveState(); c.setFont('DV', 7.5); c.drawString(0.75 * inch, 0.5 * inch, 'Fictional rebuild of a public sample IEP for testing'); c.drawRightString(7.75 * inch, 0.5 * inch, f'Page {d.page}'); c.restoreState()


s = []
s += [P('FRESNO UNIFIED SCHOOL DISTRICT<br/>INDIVIDUALIZED EDUCATION PROGRAM', T)]
s.append(grid([[f'<b>Student Legal Name:</b> {NAME}', '<b>Date of Birth:</b> 04/22/2013', '<b>IEP Date:</b> 12/11/2018'],
               ['<b>Original SpEd Entry Date:</b> 09/06/2016', '<b>Next Annual IEP:</b> 9/5/2019', ''],
               ['<b>Last Eval:</b> 9/13/2016', '<b>Next Eval:</b> 9/12/2019', '']], [2.6, 2.2, 2.2], head=False))
s.append(P('<b>MEETING TYPE:</b> ' + ' '.join([cb(False, 'Initial'), cb(False, 'Annual'), cb(False, 'Triennial')])))
s.append(P('<b>Additional Purpose of Meeting (If Needed):</b> ' + ' '.join([cb(False, 'Transition'), cb(False, 'Pre-Expulsion'), cb(False, 'Interim'), cb(True, 'Other')]) + ' BIP, parent concerns'))
s.append(grid([['<b>Age:</b> 5', '<b>Gender:</b> Male', ''], ['<b>Grade:</b> K', '<b>Migrant:</b> ' + cb(False, 'Yes') + ' ' + cb(True, 'No'), '<b>Native Language:</b> 00 English'],
               ['<b>EL:</b> ' + cb(False, 'Yes') + ' ' + cb(True, 'No'), '<b>Redesignated:</b> ' + cb(False, 'Yes') + ' ' + cb(True, 'No'), '<b>Interpreter?</b> ' + cb(False, 'Yes') + ' ' + cb(True, 'No')],
               ['<b>Student ID:</b> 3018847', '<b>SSID#:</b> 6609123481', '']], [2.3, 2.5, 2.2], head=False))
s.append(P('<b>PRIMARY RESIDENCE:</b>'))
s.append(grid([['<b>Parent/Guardian:</b> Rosa Ortiz', '<b>Home Phone:</b> (559) 555-0148'], ['<b>Home Address:</b> 1840 E. Shields Ave', '<b>Cell Phone:</b> (559) 555-0193'],
               ['<b>City:</b> Fresno', '<b>Email:</b>'], ['<b>State/Zip:</b> CA, 93722-4128', '']], [3.5, 3.5], head=False))
s.append(P('<b>District of Special Education Accountability:</b> Fresno Unified &nbsp;&nbsp; <b>Residence School:</b> Ventura Elementary'))
s.append(P('<b>Primary:</b> Autism &nbsp;&nbsp; <b>Secondary:</b> Speech or Language Impairment'))
s.append(P("<b>Describe how student's disability affects involvement and progress in general curriculum</b> Due to Dx, student requires a classroom that has a low student to teacher ratio, and is language enriched."))
s.append(PageBreak())

s += title('PRESENT LEVELS OF ACADEMIC ACHIEVEMENT AND FUNCTIONAL PERFORMANCE')
s.append(P('Strengths/Preferences/Interests', BB))
s.append(P(f'{N} enjoys videos involving soft music and soothing images. He will sit for an extended amount of time while these videos are playing. He increasingly enjoys our smartboard activities and will sit for short periods if it is something that interests him. {N} enjoys technology-driven activities as opposed to paper/pencil ones.', I))
s.append(P('Concerns of parent relevant to educational progress', BB))
s.append(P(f"Parent wants to meet to go over the Behavior Plan to make sure that {N}'s behavior needs are being met.", I))
s.append(P('Smarter Balanced Assessment Consortium (SBAC)', H)); s.append(P(cb(False, 'Not Applicable')))
s.append(P('Math', H)); s.append(P(cb(False, 'Not Applicable')))
s.append(P('California Alternate Assessments (CAA)', H)); s.append(P(cb(False, 'Not Applicable')))
s.append(P('<b>Physical Education Testing</b> (grades 5, 7 &amp; 9): N/A - Out of testing range.'))
s.append(P('Other Assessment Data (e.g., curriculum assessment, other district assessment, etc.)', BB))
s.append(P('<b>Hearing Date:</b> 11/14/2017 ' + cb(False, 'Pass') + ' ' + cb(False, 'Fail') + ' ' + cb(True, 'Other') + ' Unable to test at school. Hearing eval at CHCC within normal limits.'))
s.append(P('<b>Vision Date:</b> 11/14/2017 ' + cb(False, 'Pass') + ' ' + cb(False, 'Fail') + ' ' + cb(True, 'Other') + ' Unable to test vision at school. Mother reports vision eval at CHCC normal.'))
s.append(P('Preacademic/Academic/Functional Skills', BB))
s.append(P(f'Several informal teacher-made assessments, as well as several assessments taken from Unique Learning Systems (ULS) curriculum were administered to {N} over the course of several days. Sessions were generally less than 10 minutes. After that amount of time, {N} would lose interest and become slightly agitated.'))
s.append(P('ULS Assessments: Picture Match: 10/18 &nbsp; Letter Match: 8/18 &nbsp; Number Match: 11/18 &nbsp; Letter ID: 8/18 &nbsp; Emerging Math: 10/18'))
s.append(P(f'Verbal and some physical prompting occurred during these assessments. The scores shown were not accomplished independently by the student. What these scores do indicate is the progress {N} has made attending to activities. Last year, I attempted to give the same assessments, but {N} would not attend to them at all. This year, {N} not only attended to the assessments, but when I would point to the correct answer, he would focus on where I was pointing and touch that answer.'))
s.append(P(f'Other assessments given: {N} responds to his name when called. When asked to "come over", he will generally walk towards me. {N} is able to hold a pencil and make marks on paper. He is less resistant to hand-over-hand activities than previously reported. I presented 20 picture cards to {N}, he pointed to an object 15/20. He pointed to the correct object 5 times. I asked {N} to point to various body parts. He correctly pointed to his head and mouth. I asked {N} to point to specific colors (I showed two colors at a time). He correctly pointed to green and red.'))
s.append(P(f"Overall, {N}'s attention and on-task time has increased since last year's IEP. He will sit at the SmartBoard with the other students for longer periods of time. He will remain actively engaged in technology-driven activities for longer periods of time, as well."))
s.append(P('Communication Development', BB))
s.append(P(f"Teacher input- {N} is able to utilize several 'signs' in order to communicate some of his wants/needs. In the classroom, {N} has used the 'signs', \"more\", \"eat\", \"hungry\". Parent states that {N} has used more 'signs' at home. {N} also communicates by using various verbal sounds, by looking at a person he wants something from, and/or by taking hold of their hand and guiding them to what he wants. {N} will occasionally point to a picture of something he wants; although he rarely attends to the picture he is pointing to."))
s.append(P(f'AAC assessment 2018: At the time of this assessment it was felt that {N} would benefit from the IEP team considering the following Augmentative and Alternative Communication supports:'))
for t in ['• Trial of communication system with the following features:', 'o Dynamic display', 'o Speech generation', 'o Access to core words', 'o Options for masking during initial vocabulary acquisition',
          'o Symbol paired with print', 'o Touch screen for direct selection', '• Provide communication opportunities throughout the day']:
    s.append(P(t))
s.append(P('Gross/Fine Motor Development', BB))
s.append(P(f'Gross-motor: {N} is able to walk throughout the classroom. He usually moves out of the way if there is a desk or person in his way.'))
s.append(P('<b>For student to receive educational benefit, goals will be written to address the following areas of need:</b> Functional academics, Self-help, Communication, Fine motor'))
s.append(PageBreak())

s += title('SPECIAL FACTORS')
s.append(P('<b>Does the student require assistive technology devices and/or services?</b> ' + cb(True, 'Yes') + ' ' + cb(False, 'No')))
s.append(P('<b>Rationale:</b> Use of picture icons to communicate his needs.')); s.append(P('Visual Schedule'))
s.append(P('<b>Does the student require low incidence services, equipment and/or materials to meet educational goals?</b> ' + cb(False, 'Yes') + ' ' + cb(True, 'No')))
s.append(P('<b>Considerations if the student is blind or visually impaired:</b> n/a'))
s.append(P('<b>Considerations if the student is deaf or hard of hearing:</b> n/a'))
s.append(P("<b>Does student's behavior impede learning of self or others?</b> " + cb(True, 'Yes') + ' ' + cb(False, 'No') + ' (Describe)'))
s.append(P(f'{N} exhibits outbursts as shown by scratching and biting other students/staff.'))
s.append(P('<b>If yes, specify positive behavior interventions, strategies, and supports:</b>')); s.append(P('See Behavior Intervention Plan'))
s.append(P(cb(True, 'Behavior Goal is part of this IEP') + ' ' + cb(True, 'Behavior Intervention Plan (BIP) Attached')))
s.append(PageBreak())

s += title('Statewide Assessments')
s.append(P('Indicate student\'s participation in the California Assessment of Student Performance and Progress (CAASPP) below:'))
for subj in ['English Language Arts (Grades 3-8, &amp; 11)', 'Math (Grades 3-8, &amp; 11)']:
    s.append(P(subj, BB)); s.append(P('30 To participate in an alternate performance assessment', I))
    for lab, on in [('Alternate Assessment without Designated Supports or Accommodations', False), ('Alternate Assessment with Designated Supports Embedded', False),
                    ('Alternate Assessment with Designated Supports Non-Embedded', False), ('Alternate Assessment with Accommodations Embedded', True),
                    ('Alternate Assessment with Accommodations Non-Embedded', False), ('Alternate Assessment with Accessibility Support (requires CDE Approval)', False)]:
        s.append(P(cb(on, lab)))
s.append(P(cb(True, '<b>If student is taking Alternate Assessment the IEP team has reviewed the criteria for taking alternate assessments.</b>')))
s.append(P('The student will not participate in the SBAC because Alternate Assessment Participation in an Alternate Assessment is appropriate because of his significant cognitive disability.'))
s.append(P('<b>Physical Fitness Test</b> (Grades 5, 7 &amp; 9)'))
for lab, on in [('Out of testing range', False), ('Without Accommodations', False), ('With Accommodations', True), ('With Modifications (Check with PFT Office prior to use)', False)]:
    s.append(P(cb(on, lab)))
s.append(PageBreak())

s += title('ANNUAL GOALS AND OBJECTIVES')
s.append(grid([['Area of Need: Functional academics', f'Measurable Annual Goal# 2<br/><br/>Goal: By September 2019, given his name, along with two other names printed on name cards and placed in front of {N}, he will be able to correctly chose his name by reaching out and pointing or holding it in his hand with verbal and physical prompts; 4 out of five trials across three consecutive days as observed by the teacher/classroom assistants.'],
               [f'Baseline: {N} responds when his name is called.', cb(False, 'Enables student to be involved/progress in general curriculum/state standard') + '<br/>' + cb(False, 'Addresses other educational needs resulting from the disability') + '<br/>' + cb(False, 'Linguistically appropriate') + '<br/>Person(s) Responsible: Student, teacher/classroom assistants']], [1.8, 5.2], head=False))
for t in ['By January 2019, given his name (typed on hot pink paper) placed directly in front of him, along with two other names (printed on white paper) placed farther back on the desk, {N} will be able to correctly chose his name by reaching out and pointing or holding it in his hand with 3 verbal and 3 physical prompts; 4 out of five trials across three consecutive days as observed by the teacher/classroom assistants.',
          'By March 2019, given his name (typed on light pink paper) placed directly in front of him, along with two other names (printed on white paper) placed farther back on the desk, {N} will be able to correctly chose his name by reaching out and pointing or holding it in his hand with 2 verbal and 2 physical prompts; 4 out of five trials across three consecutive days as observed by the teacher/classroom assistants.']:
    s.append(P('<b>Short-Term Objective:</b> <i>' + t.replace('{N}', N) + '</i>'))
s.append(P('<b>Progress Report 1:</b><br/><b>Summary of Progress</b><br/><b>Comment</b>'))
s.append(P('<b>Annual Review</b> Date: ______ <b>Goal Met</b> ' + cb(False, 'Yes') + cb(False, 'No') + ' <b>Comments:</b>'))
s.append(PageBreak())

s += title('Offer of FAPE - SERVICE')
s.append(P('<b>The service options that were considered by the IEP team (List all):</b> Options considered: GenEd with support, SDC MM, MS, ALPS, SLP, APE. Chosen: ALPS'))
s.append(P('<b>In selecting LRE, describe the consideration given to any potential harmful effect on the child or on the quality of services that he or she needs:</b> Team discussed and considered potential harmful effects of missing general education curriculum which includes grade level standards. The team determined the benefit of a placement in a regional program or an intensive early intervention program outweigh the potential harm.'))
s.append(P('SUPPLEMENTARY AIDS &amp; SERVICES AND OTHER SUPPORTS FOR SCHOOL PERSONNEL, OR FOR STUDENT, OR ON BEHALF OF THE STUDENT', T))
s.append(P(cb(False, 'The IEP team discussed and determined program accommodations are not needed in general education classes or other education-related settings.')))
s.append(P(cb(True, 'The IEP team discussed and determined the following program accommodations are needed in general education classes or other education-related settings.')))
ACC = ['Assistive technology', 'Obtain students attention before speaking', 'Provide directions in a variety of modalities', 'Flexible seating to ensure auditory and visual access',
       'Instructions presented one at at time, and repeated/rephrased in a positive voice, tone, and level.', 'Visual Cues', 'Scribe', 'Use of manipulatives and images requires for success.',
       'Alternate Response Options (Reading, Writing, Listening)', 'Reduce distractions to the student', 'Extended time', 'Check for understanding']
s.append(grid([['Program Accommodations', 'Start Date', 'End Date', 'Location']] + [[a, '12/10/2018', '9/11/2019', 'Educational environment'] for a in ACC], [3.4, 1.1, 1.1, 1.4]))
s.append(P(cb(False, 'The IEP team discussed and determined program modifications are not needed in general education classes or other education-related settings.')))
s.append(P(cb(True, 'The IEP team discussed and determined the following program modifications are needed in general education classes or other education-related settings.')))
s.append(grid([['Program Modifications', 'Start Date', 'End Date', 'Frequency', 'Duration', 'Location'],
               ['Shorten assignments to focus on mastery of key concepts', '12/10/2018', '9/11/2019', 'Daily', '6 hours', 'Educational environment'],
               ['Errorless Learning', '12/10/2018', '9/11/2019', 'Daily', '6 hours', 'Educational environment']], [2.4, 0.9, 0.9, 0.8, 0.8, 1.2]))
s.append(P(cb(True, 'The IEP team discussed and determined other supports for school personnel, or for student, or on behalf of the student are not needed.')))
s.append(P(cb(False, 'The IEP team discussed and determined the following other supports for school personnel, or for student, or on behalf of the student are needed.')))
s.append(grid([['Other Supports for School Personnel, or for Student, or on Behalf of Student', 'To Support', 'Start Date', 'End Date', 'Frequency', 'Duration', 'Location'],
               [f'Extra support person designated to assist {N} with school-wide tasks.', cb(True, 'Student') + ' ' + cb(False, 'Personnel'), '9/5/2018', '9/5/2019', 'Daily', 'Throughout the day', 'School-wide. All activities during the day.'],
               ['Yoga ball for self regulation', cb(True, 'Student') + ' ' + cb(False, 'Personnel'), '12/10/2018', '9/11/2019', 'Daily', '6 hours', 'Educational environment']], [2.1, 0.9, 0.8, 0.8, 0.7, 0.8, 0.9]))
s.append(P('SPECIAL EDUCATION and RELATED SERVICES', T))
SV = [('Language and speech', 'Start Date: 9/5/2018', 'End Date: 9/5/2019', cb(True, 'Ind') + ' ' + cb(True, 'Grp'), 'Duration/Freq: 90 min served Monthly', 'Location: Separate classroom in public integrated facility', 'Comments: Language'),
      ('Specialized Academic Instruction', 'Start Date: 9/5/2018', 'End Date: 9/5/2019', cb(False, 'Ind') + ' ' + cb(True, 'Grp'), 'Duration/Freq: 310 min x 5 Totaling: 1550 min served Weekly', 'Location: Separate classroom in public integrated facility', 'Comments:'),
      ('Occupational therapy', 'Start Date: 9/11/2017', 'End Date:', cb(False, 'Ind') + ' ' + cb(False, 'Grp'), 'Duration/Freq: 15 min served Monthly', 'Location: Regular classroom/public day school', f"Comments: OT to consult with IEP team on {N}'s sensory needs"),
      ('Behavior intervention Services', 'Start Date: 12/11/2018', 'End Date:', cb(True, 'Ind') + ' ' + cb(False, 'Grp'), 'Duration/Freq: 10 min x 1 Totaling: 10 min served Daily', 'Location: Separate classroom in public integrated facility', 'Comments: Implementation of the BIP.')]
rows = []
for name, sd, ed, ig, df, loc, com in SV:
    rows += [[f'Service: {name}', f'{sd} &nbsp; {ed}'], ['Provider: District of Service', ig + ' ' + cb(False, 'Sec Transition')], [df, loc], [com, '']]
s.append(grid(rows, [3.8, 3.2], head=False))
s.append(P('Programs and services will be provided according to where student is in attendance and consistent with the district of service calendar and scheduled services, excluding holidays, vacations, and non-instructional days unless otherwise specified.'))
s.append(P('<b>Special Education Transportation</b> ' + cb(True, 'Yes') + ' ' + cb(False, 'No') + f' Currently parent transports {N} to and from school.'))
s.append(P('EXTENDED SCHOOL YEAR (ESY)', T)); s.append(P(cb(True, 'Yes') + ' ' + cb(False, 'No')))
s.append(P('<b>Rationale:</b> Student\'s academic progress will regress during the Summer months without ESY.'))
s.append(grid([['Service: Language and speech', 'Start Date: 6/11/2019 &nbsp; End Date: 7/11/2019'], ['Duration/Freq: 90 min served Monthly', 'Location: Separate classroom in public integrated facility'],
               ['Service: Specialized Academic Instruction', 'Start Date: 6/11/2019 &nbsp; End Date: 7/11/2019'], ['Duration/Freq: 235 min x 5 Totaling: 1175 min served Weekly', 'Location: Separate classroom in public integrated facility']], [3.8, 3.2], head=False))
s.append(PageBreak())

s += title('OFFER OF FAPE - EDUCATIONAL SETTING')
s.append(P('<b>Physical Education:</b> ' + cb(True, 'General') + ' ' + cb(False, 'Specially Designed') + ' ' + cb(False, 'Other')))
s.append(P('<b>District of Service:</b> Fresno Unified &nbsp; <b>School of Attendance:</b> Ventura Elementary School &nbsp; <b>School Type:</b> Public day school'))
s.append(P('<b>Program Setting:</b> Regular Classroom/Public Day School (Ages 6-22)'))
s.append(P('<b>85 % of time student is outside the regular class &amp; extracurricular &amp; non academic activities</b>'))
s.append(P('<b>Student will not participate in the regular class and/or extracurricular and/or non academic activities:</b> all his academic day because student is not currently able to access a GE classroom curriculum'))
s.append(P('<b>Parents will be informed of progress:</b> ' + cb(True, 'Quarterly') + ' ' + cb(False, 'Trimester') + ' ' + cb(False, 'Semester')))

doc = SimpleDocTemplate(os.path.join(OUT, 'real-ca-fresno-rebuilt.pdf'), pagesize=letter, leftMargin=0.75 * inch, rightMargin=0.75 * inch, topMargin=0.7 * inch, bottomMargin=0.8 * inch)
doc.build(s, onFirstPage=foot, onLaterPages=foot)
exp = {'file': 'real-ca-fresno-rebuilt.pdf', 'real': True,
       'must': {'strengths': ['soft music', 'smartboard activities', 'technology-driven'],
                'accom': ['attention before speaking', 'variety of modalities', 'Flexible seating', 'one at at time', 'Visual Cues', 'Scribe', 'manipulatives and images',
                          'Alternate Response Options', 'Reduce distractions', 'Extended time', 'Check for understanding', 'Yoga ball', 'Extra support person'],
                'mods': ['Shorten assignments', 'Errorless Learning'],
                'at': ['picture icons'],
                'behavior': ['scratching and biting'],
                'goals': ['correctly chose his name'],
                'services': ['Language and speech', 'Specialized Academic Instruction', 'Occupational therapy', 'Behavior intervention']},
       'must_not': ['Alternate Assessment without Designated', 'Non-Embedded', 'Out of testing range', 'Linguistically appropriate', '235 min', 'Rosa', 'GenEd with support', 'program accommodations are not needed'],
       'ids': ['Liam', 'Ortiz', 'Rosa', '04/22/2013', '3018847', '6609123481', '555-0148', 'Shields']}
json.dump(exp, open(os.path.join(OUT, 'real-ca-fresno-rebuilt.expect.json'), 'w'), indent=1)
print('ok')
