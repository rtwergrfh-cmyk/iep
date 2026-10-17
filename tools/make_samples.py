"""Generate fictional sample IEPs in three different layouts for testing. All people and details are invented."""
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
import sys, os
OUT=sys.argv[1]
ss=getSampleStyleSheet()
H=ParagraphStyle('H',parent=ss['Heading2'],fontName='Helvetica-Bold',fontSize=12,spaceBefore=10,spaceAfter=4)
H3=ParagraphStyle('H3',parent=ss['Heading3'],fontName='Helvetica-Bold',fontSize=10.5,spaceBefore=6,spaceAfter=2)
B=ParagraphStyle('B',parent=ss['BodyText'],fontName='Helvetica',fontSize=9.5,leading=12.5)
SM=ParagraphStyle('SM',parent=B,fontSize=8.5,leading=10.5)
def P(t,s=B): return Paragraph(t,s)
def tbl(rows,widths,head=True):
    data=[[P(c,SM) for c in r] for r in rows]
    t=Table(data,colWidths=[w*inch for w in widths],repeatRows=1 if head else 0)
    st=[('GRID',(0,0),(-1,-1),0.5,colors.grey),('VALIGN',(0,0),(-1,-1),'TOP')]
    if head: st.append(('BACKGROUND',(0,0),(-1,0),colors.HexColor('#EEEEEE')))
    t.setStyle(TableStyle(st)); return t
def footer(name):
    def f(c,d):
        c.saveState();c.setFont('Helvetica',7.5);c.drawString(0.75*inch,0.5*inch,f'{name}   Page {d.page}');c.drawRightString(7.75*inch,0.5*inch,'FICTIONAL SAMPLE FOR TESTING');c.restoreState()
    return f
def build(fn,story,foot):
    doc=SimpleDocTemplate(os.path.join(OUT,fn),pagesize=letter,leftMargin=0.75*inch,rightMargin=0.75*inch,topMargin=0.7*inch,bottomMargin=0.75*inch)
    doc.build(story,onFirstPage=footer(foot),onLaterPages=footer(foot))

# ---------- A: New York style form ----------
s=[]
s.append(P('Individualized Education Program (IEP)',ParagraphStyle('T',parent=H,fontSize=15)))
s.append(P('Lakeview Central School District &nbsp;&nbsp; Committee on Special Education',B))
s.append(P('Identifying Information',H))
s.append(tbl([['Student Name: Maya R. Thompson','Date of Birth: 03/14/2016','Student ID: 204517883'],
              ['Grade: 4','School: Hillcrest Elementary','Disability Classification: Learning Disability'],
              ['Parent/Guardian: Denise Thompson','Phone: (518) 555-0142','Email: dthompson.family@example.com'],
              ['Address: 41 Orchard Lane, Lakeview, NY 12000','Projected Date of Annual Review: 06/10/2027','IEP Implementation Date: 09/08/2026']],[2.4,2.3,2.3],head=False))
s.append(P('Present Levels of Performance and Individual Needs',H))
s.append(P('Academic Achievement, Functional Performance and Learning Characteristics',H3))
s.append(P('Maya reads at an early third grade level. She decodes most single-syllable words accurately but slows down on multisyllabic words, which affects her comprehension of fourth grade texts. In math she is at grade level for computation and benefits from visual models for word problems. Maya\'s writing is short and she avoids writing tasks; she can dictate detailed ideas orally.'))
s.append(P('<b>Strengths:</b> Maya is a creative storyteller with a strong oral vocabulary. She works well with a partner, responds well to praise, and enjoys science and drawing.'))
s.append(P('Social Development',H3))
s.append(P('Maya has close friendships and participates in group work. She becomes frustrated during long independent writing tasks and may leave her work area.'))
s.append(P('Management Needs',H3))
s.append(P('Maya needs frequent checks for understanding, refocusing and redirection, and a visual checklist for multi-step tasks.'))
s.append(P('Student Needs Relating to Special Factors',H))
s.append(P('Does the student need strategies, including positive behavioral interventions, supports and other strategies to address behaviors that impede the student\'s learning? <b>Yes.</b> A behavioral intervention plan is attached.'))
s.append(P('Does the student need assistive technology devices and/or services? <b>Yes.</b>'))
s.append(PageBreak())
s.append(P('Measurable Annual Goals',H))
s.append(tbl([['Annual Goal','Criteria','Method','Schedule'],
 ['Reading: Maya will read multisyllabic words in fourth grade passages with accuracy.','90% accuracy over 3 consecutive weeks','Running records','Every 2 weeks'],
 ['Reading: Given a fourth grade passage, Maya will answer literal and inferential comprehension questions.','4 of 5 questions correct in 4 of 5 trials','Teacher-made assessments','Monthly'],
 ['Writing: Using speech-to-text and a graphic organizer, Maya will write a paragraph with a topic sentence, three details and a closing sentence.','Rubric score of 3 out of 4 in 3 consecutive samples','Writing samples and rubric','Monthly'],
 ['Social/Emotional: When frustrated, Maya will use her break card or ask for help instead of leaving her work area.','4 of 5 opportunities over a 4-week period','Behavior data chart','Weekly']],[3.0,1.5,1.3,1.2]))
s.append(P('Reporting Progress to Parents',H))
s.append(P('Progress reports will be provided to parents quarterly, at the same time as report cards.'))
s.append(P('Recommended Special Education Programs and Services',H))
s.append(P('Special Education Program/Services',H3))
s.append(tbl([['Special Education Program/Services','Service Delivery Recommendations','Frequency','Duration','Location','Projected Beginning Date'],
 ['Integrated Co-Teaching Services - English Language Arts','Group','5 x weekly','45 minutes','General education classroom','09/08/2026'],
 ['Resource Room Program','Group (5:1)','3 x weekly','30 minutes','Resource room','09/08/2026']],[1.7,1.1,0.9,0.8,1.3,1.0]))
s.append(P('Related Services',H3))
s.append(tbl([['Related Services','Service Delivery Recommendations','Frequency','Duration','Location','Projected Beginning Date'],
 ['Speech/Language Therapy','Small group (5:1)','2 x weekly','30 minutes','Separate location','09/08/2026'],
 ['Counseling Services','Individual','1 x weekly','30 minutes','Separate location','09/08/2026']],[1.7,1.1,0.9,0.8,1.3,1.0]))
s.append(P('Supplementary Aids and Services/Program Modifications/Accommodations',H3))
s.append(tbl([['Supplementary Aids and Services/Program Modifications/Accommodations','Service Delivery Recommendations','Frequency','Duration','Location','Projected Beginning Date'],
 ['Preferential seating near the point of instruction','','Daily','Throughout the day','All classes','09/08/2026'],
 ['Refocusing and redirection','','Daily','As needed','All classes','09/08/2026'],
 ['Checks for understanding','','Daily','During independent work','All classes','09/08/2026'],
 ['Copy of class notes','','Daily','As needed','ELA, social studies, science','09/08/2026'],
 ['Directions repeated and clarified','','Daily','As needed','All classes','09/08/2026'],
 ['Visual checklist for multi-step tasks','','Daily','Throughout the day','All classes','09/08/2026']],[2.4,1.0,0.7,0.9,1.1,0.9]))
s.append(P('Assistive Technology Devices and/or Services',H3))
s.append(tbl([['Assistive Technology Devices and/or Services','Service Delivery Recommendations','Frequency','Duration','Location','Projected Beginning Date'],
 ['Speech-to-text software on school Chromebook','Individual','Daily','Writing assignments','All classes','09/08/2026']],[2.4,1.0,0.7,0.9,1.1,0.9]))
s.append(P('Supports for School Personnel on Behalf of the Student',H3))
s.append(tbl([['Supports for School Personnel on Behalf of the Student','Service Delivery Recommendations','Frequency','Duration','Location','Projected Beginning Date'],
 ['Consultation between the speech-language pathologist and classroom teachers','Group','1 x monthly','30 minutes','Classroom','09/08/2026']],[2.4,1.0,0.7,0.9,1.1,0.9]))
s.append(P('12-Month Service and/or Program',H))
s.append(P('Student is not eligible for 12-month special services and/or program.'))
s.append(PageBreak())
s.append(P('Testing Accommodations',H))
s.append(tbl([['Testing Accommodation','Conditions','Implementation Recommendations'],
 ['Extended time','All tests longer than 20 minutes','Time and a half (1.5x)'],
 ['Separate location','All tests','Room with no more than 12 students'],
 ['Tests read aloud','All tests except tests of reading comprehension','Directions and questions read aloud; may be repeated'],
 ['Breaks','Tests longer than 30 minutes','5-minute break after every 20 minutes of testing']],[2.0,2.5,2.5]))
s.append(P('Participation in State and District-Wide Assessments',H))
s.append(P('The student will participate in the same State and district-wide assessments administered to general education students, with the testing accommodations listed above.'))
s.append(P('Participation with Students Without Disabilities',H))
s.append(P('Maya will participate in all general education classes except during resource room and related services.'))
s.append(P('Special Transportation',H))
s.append(P('The student does not need special transportation.'))
s.append(P('Placement Recommendation',H))
s.append(P('General education classroom with integrated co-teaching services and resource room.'))
s.append(P('Behavioral Intervention Plan (BIP)',H))
s.append(P('<b>Target behavior:</b> Leaving the assigned work area during independent writing tasks, about 3 times per day.'))
s.append(P('<b>Likely function:</b> To escape writing tasks that feel too long or difficult.'))
s.append(P('<b>Prevention strategies:</b>'))
s.append(P('&bull; Break writing assignments into short steps using the visual checklist.'))
s.append(P('&bull; Offer a choice of speech-to-text or writing by hand before each writing task.'))
s.append(P('&bull; Give a 2-minute warning before transitions to writing.'))
s.append(P('<b>Replacement behavior:</b> Maya will request a 3-minute break using her break card.'))
s.append(P('<b>Responses when the behavior occurs:</b> Calmly prompt Maya to use her break card and return to her seat. Avoid public reprimands. Praise her when she returns to work.'))
s.append(P('Health Information',H))
s.append(P('Health alert: Maya has a severe peanut allergy. An EpiPen is kept in the nurse\'s office and in Maya\'s backpack. Staff on field trips must carry the EpiPen.'))
s.append(P('Signatures',H))
s.append(P('Committee on Special Education Chairperson: R. Alvarez &nbsp;&nbsp; Date: 06/12/2026'))
build('sample-ny-form.pdf',s,'Maya R. Thompson - IEP')

# ---------- B: California SEIS style ----------
s=[]
s.append(P('Individualized Education Program',ParagraphStyle('T',parent=H,fontSize=15)))
s.append(P('Bay Coast Unified School District &nbsp; Special Education Local Plan Area',B))
s.append(tbl([['Student: Ethan Nguyen','DOB: 08/22/2013','SSID: 1234567890'],['Grade: 7','School: Marina Middle School','Primary Disability: Other Health Impairment'],['Parent: Linh Nguyen','Home Phone: 510-555-0187','Address: 1250 Harbor Street, Apt 3, Bay Coast, CA 94000'],['Meeting Date: 09/18/2026','Next Annual IEP: 09/17/2027','Case Manager: T. Brooks, Education Specialist']],[2.3,2.3,2.4],head=False))
s.append(P('Present Levels of Academic Achievement and Functional Performance',H))
s.append(P('<b>Areas of strength:</b> Ethan is curious, asks thoughtful questions in science, and is a strong visual learner. He enjoys building and hands-on projects and responds well to clear routines.'))
s.append(P('<b>Areas of need:</b> Written expression, sustained attention during independent work, and organization of materials and assignments.'))
s.append(P('Ethan has a diagnosis of ADHD. He completes about 50% of independent writing assignments. When given a writing task without a model, he often refuses verbally or puts his head down.'))
s.append(P('Goals',H))
s.append(P('Goal #1 &nbsp;&nbsp; Area of Need: Written Expression',H3))
s.append(P('Baseline: Ethan writes 2 to 3 related sentences on a topic when given a sentence starter.'))
s.append(P('Annual Goal: By 09/2027, given a graphic organizer and a model, Ethan will write a five-paragraph essay with an introduction, three body paragraphs and a conclusion, scoring 3 out of 4 on the grade-level rubric in 3 of 4 trials, as measured by teacher rubric.'))
s.append(P('Person(s) Responsible: Education Specialist, General Education Teacher'))
s.append(P('Goal #2 &nbsp;&nbsp; Area of Need: Organization / Executive Functioning',H3))
s.append(P('Baseline: Ethan records assignments in his planner in about 1 of 5 classes.'))
s.append(P('Annual Goal: By 09/2027, Ethan will record assignments in his planner and check them with an adult at the end of the day in 4 of 5 school days, as measured by planner checks.'))
s.append(P('Person(s) Responsible: Education Specialist, Paraprofessional'))
s.append(P('Goal #3 &nbsp;&nbsp; Area of Need: Behavior / Work Completion',H3))
s.append(P('Baseline: Ethan stays on task for about 8 minutes during independent work.'))
s.append(P('Annual Goal: By 09/2027, during independent work, Ethan will stay on task for 20 minutes with no more than one prompt in 4 of 5 observations, as measured by interval data.'))
s.append(P('Person(s) Responsible: Education Specialist, General Education Teacher, Paraprofessional'))
s.append(PageBreak())
s.append(P('Accommodations/Modifications',H))
s.append(P('Instructional Accommodations',H3))
for x in ['Extended time on assignments (time and a half) - All academic classes','Use of a calculator - Math','Graphic organizers for writing tasks - English, Social Studies','Chunk long assignments into smaller parts with check-in points - All academic classes','Frequent check-ins (every 10 minutes during independent work) - All academic classes','Seat away from doors and windows - All classes','Provide a model or example of completed work - All academic classes']:
    s.append(P('&bull; '+x))
s.append(P('Modifications',H3))
s.append(P('&bull; Reduced homework: complete odd-numbered problems only - Math'))
s.append(P('Supports for School Personnel',H3))
s.append(P('&bull; Training on Ethan\'s behavior intervention plan for all 7th grade teachers and the paraprofessional, by 10/15/2026.'))
s.append(P('Statewide Assessments',H))
s.append(P('Ethan will take the CAASPP with the following designated supports and accommodations:'))
for x in ['Text-to-speech for math items','Separate setting','Breaks as needed','Noise buffers (headphones)']:
    s.append(P('&bull; '+x))
s.append(P('Special Factors',H))
s.append(P('Does the student\'s behavior impede learning of self or others? Yes. A behavior intervention plan has been developed.'))
s.append(P('Offer of FAPE - Services',H))
s.append(tbl([['Service','Start Date','End Date','Frequency','Location','Provider'],
 ['330 - Specialized Academic Instruction','09/18/2026','09/17/2027','250 min x Weekly','Regular Classroom/Public Day School','Education Specialist'],
 ['415 - Language and Speech','09/18/2026','09/17/2027','120 min x Monthly','Separate Classroom in Public Integrated Facility','Speech-Language Pathologist'],
 ['510 - Individual Counseling','09/18/2026','09/17/2027','30 min x Weekly','Separate Classroom in Public Integrated Facility','School Psychologist']],[1.8,0.8,0.8,1.0,1.6,1.0]))
s.append(P('Offer of FAPE - Educational Setting',H))
s.append(P('Percentage of time outside the regular class: 13%. Percentage of time inside the regular class: 87%.'))
s.append(P('Behavior Intervention Plan',H))
s.append(P('<b>The behavior impeding learning is:</b> Verbal refusal and putting his head down when given writing tasks.'))
s.append(P('<b>Antecedents / triggers:</b> Long writing assignments, especially without a model; being asked to write in front of peers.'))
s.append(P('<b>Environmental changes and supports:</b>'))
s.append(P('&bull; Provide a model paragraph and sentence starters at the start of writing tasks.'))
s.append(P('&bull; Break writing into 10-minute chunks with a check-in after each chunk.'))
s.append(P('<b>Replacement behavior:</b> Ethan will ask for help by saying "Can you help me start?" or by placing his help card on the desk.'))
s.append(P('<b>Reactive strategies:</b> Offer a choice between two ways to start. Do not argue or repeat demands. If Ethan puts his head down, wait 2 minutes, then quietly offer help.'))
s.append(P('Health',H))
s.append(P('No health concerns noted at this time.'))
s.append(P('Signatures',H))
s.append(P('Administrator/Designee: M. Ortiz &nbsp;&nbsp; Parent: Linh Nguyen'))
build('sample-ca-seis.pdf',s,'Nguyen, Ethan - IEP')

# ---------- C: narrative district format ----------
s=[]
s.append(P('PINE RIDGE SCHOOL DISTRICT',ParagraphStyle('T',parent=H,fontSize=14)))
s.append(P('INDIVIDUALIZED EDUCATION PROGRAM',H))
s.append(P('Student: Ava Patel &nbsp;&nbsp;&nbsp; DOB: 11/02/2018 &nbsp;&nbsp;&nbsp; ID#: 77310452'))
s.append(P('Grade: 2 &nbsp;&nbsp;&nbsp; School: Cedar Grove Elementary &nbsp;&nbsp;&nbsp; Eligibility: Specific Learning Disability; Other Health Impairment'))
s.append(P('Parents: Priya and Raj Patel &nbsp;&nbsp;&nbsp; Phone: 555-201-7734'))
s.append(P('IEP Dates: 10/01/2026 to 09/30/2027'))
s.append(P('STUDENT STRENGTHS',H))
s.append(P('Ava is kind and eager to help classmates. She loves music and learns songs quickly, which helps her remember information. She follows classroom routines well and tries hard on new tasks.'))
s.append(P('PRESENT LEVELS OF PERFORMANCE',H))
s.append(P('Ava is reading at a beginning first grade level. She knows most letter sounds but has difficulty blending sounds into words. Her handwriting is large and difficult to read, and she tires quickly when writing. Ava\'s math skills are at grade level.'))
s.append(P('ACCOMMODATIONS',H))
for x in ['- Read directions aloud to Ava and have her repeat them back before starting.',
          '- Provide a slant board and pencil grip for written work.',
          '- Allow Ava to answer questions orally instead of in writing when the goal is not writing.',
          '- Give shortened spelling lists (10 words instead of 20).',
          '- Use a visual schedule and give a warning before changes in routine.',
          '- Allow movement breaks after 15 minutes of seated work.']:
    s.append(P(x))
s.append(P('SPECIAL EDUCATION SERVICES',H))
s.append(P('Ava will receive specialized reading instruction for 30 minutes daily in the resource room with the special education teacher. Occupational therapy will be provided twice a month for 30 minutes in the OT room. The special education teacher will consult with the classroom teacher for 15 minutes weekly.'))
s.append(P('ANNUAL GOALS',H))
s.append(P('1. Reading: By September 2027, Ava will blend sounds to read consonant-vowel-consonant words with 90% accuracy on 3 consecutive probes.'))
s.append(P('2. Reading: By September 2027, Ava will read 40 words correct per minute on first grade passages.'))
s.append(P('3. Fine Motor: By September 2027, Ava will write a sentence of 5 or more words with letters of correct size and spacing in 4 of 5 trials.'))
s.append(P('BEHAVIOR',H))
s.append(P('Ava\'s behavior does not impede her learning or the learning of others. No behavior plan is needed.'))
s.append(P('HEALTH CONSIDERATIONS',H))
s.append(P('Ava has a seizure disorder. Follow the seizure action plan on file with the school nurse. If Ava has a seizure, time it, keep her safe, and call the office right away. She takes medication at home; no medication is given at school.'))
s.append(P('STATE AND DISTRICT TESTING',H))
s.append(P('Ava will take district reading assessments with directions read aloud and a small group setting.'))
s.append(P('PARENT CONCERNS',H))
s.append(P('Ava\'s parents want her to feel confident reading and to make friends in her class.'))
build('sample-narrative.pdf',s,'Ava Patel')
print('ok')
