"""Labeled training lines for the IEP line classifier.

Every line is written for this project and describes no real student. Phrases cover the
wording used in many state and district IEP forms; templates vary subjects, conditions,
numbers and list formatting so the model learns the vocabulary of each section rather
than one exact sentence.

Classes:
  accom      classroom accommodations and supports
  mods       modifications to curriculum, grading or expectations
  at         assistive technology
  testing    testing accommodations and assessment participation
  services   special education and related services (who, how often, how long, where)
  goals      measurable annual goals and objectives
  behavior   behavior plan content: target behavior, function, triggers, prevention, response
  health     health and medical information staff must know
  strengths  student strengths and interests
  personnel  supports and training for school staff
  present    present levels: test results, current performance, needs, impact of disability
  other      administrative text, form instructions, legal language, signatures, dates
"""
import random

R = random.Random(7)
SUBJ = ['the student', 'Student', 'J.E.', 'M.T.', 'A.R.', 'K.L.', 'D.S.', 'he', 'she', 'they', '[student]', 'The student', 'S.P.']
PRON = {'he': 'his', 'she': 'her', 'they': 'their'}


def subj():
    return R.choice(SUBJ)


def cap(s):
    return s[:1].upper() + s[1:]


# ---------------------------------------------------------------- accommodations
ACCOM = [
    'Preferential seating', 'Preferential seating near the point of instruction', 'Seat near the teacher', 'Seat away from doors and windows',
    'Seating away from distractions', 'Seat near a positive peer model', 'Seat at the front of the room', 'Reduced distractions during independent work',
    'Extended time on assignments', 'Extended time on classwork and homework', 'Extra time to complete assignments', 'Time and a half on assignments',
    'Additional time for written work', 'Directions repeated', 'Directions repeated and clarified', 'Directions given in small steps',
    'Directions provided orally and in writing', 'Check for understanding after directions', 'Frequent checks for understanding',
    'Refocusing and redirection', 'Verbal and nonverbal cues to stay on task', 'Prompts to begin work', 'Visual cues and reminders',
    'Copy of class notes', 'Guided notes', 'Teacher-provided notes', 'Access to a copy of the teacher\'s notes or slides',
    'Graphic organizers for writing', 'Graphic organizers', 'Sentence starters', 'Word bank', 'Word bank for tests and quizzes',
    'Visual schedule', 'Visual checklist for multi-step tasks', 'Visual supports', 'Visual timer', 'Step-by-step task checklist',
    'Chunking of assignments', 'Break long assignments into smaller parts', 'Assignments broken into shorter tasks',
    'Breaks as needed', 'Frequent breaks', 'Movement breaks', 'Scheduled sensory breaks', 'Short break after 20 minutes of work',
    'Use of a calculator', 'Multiplication chart', 'Number line', 'Math reference sheet', 'Formula sheet',
    'Use of noise-reducing headphones', 'Headphones during independent work', 'Quiet workspace when requested',
    'Fidget tool', 'Wiggle cushion', 'Flexible seating', 'Standing desk option',
    'Oral responses accepted', 'Answer questions orally', 'Scribe for written responses', 'Use of a scribe for extended writing',
    'Large print materials', 'Enlarged worksheets', 'Highlighted text', 'Reading guides',
    'Wait time before responding', 'Extra processing time', 'Advance notice of transitions', 'Warning before changes in routine',
    'Peer buddy', 'Peer helper for transitions', 'Assigned partner for group work', 'Model or example of completed work',
    'Agenda or planner checked daily', 'Assignment notebook checked by teacher', 'Daily communication log', 'Home-school communication folder',
    'Positive reinforcement', 'Specific praise', 'Check-in check-out with a staff member', 'Organizational support for materials',
    'Extra set of textbooks for home', 'Access to audiobooks', 'Read aloud of content-area text', 'Read directions aloud',
    'Spell check allowed', 'Do not penalize for spelling errors', 'Use of lined or graph paper', 'Highlighters to mark key information',
    'First-then board', 'Token board', 'Choice of seating during independent work', 'Preview of new vocabulary',
    'Pre-teaching of key concepts', 'Review of directions one-on-one', 'Small group instruction when available', 'Repeated practice',
    'Hands-on materials and manipulatives', 'Allow use of a study carrel', 'Provide a quiet area to calm down', 'Copy of the rubric in advance',
    'Due dates written on the board', 'Reminders of due dates', 'Allow extra time to move between classes', 'Elevator pass',
    'Pass to see the counselor when upset', 'Cool-down pass', 'Copy of the daily schedule', 'Consistent routine',
]
ACCOM_COND = ['', '', '', ' (all classes)', ' in all academic classes', ' - all classes', ' during independent work', ' daily', ' as needed',
              ' - math and science', ' in core subjects', ' when writing is required', ' for assignments longer than one page',
              ' throughout the school day', ' in ELA and social studies', ' (core classes)', '; all settings', ' during whole-group instruction']
ACCOM_SENT = [
    '{S} will be seated near the teacher.', '{S} will receive directions in small steps.', 'Provide {S} with a copy of class notes.',
    'Allow {S} to take breaks when frustrated.', 'Give {S} extra time to finish written assignments.', 'Check in with {S} before independent work begins.',
    '{S} may use a calculator for multi-step problems.', 'Teachers will repeat and clarify directions for {S}.',
    'Allow {S} to respond orally when writing is not being assessed.', 'Provide a graphic organizer before writing tasks.',
    '{S} benefits from visual supports and checklists.', 'Give {S} a warning before transitions.', 'Seat {S} away from high-traffic areas.',
    'Provide a word bank on vocabulary assessments.', '{S} may leave class a few minutes early to avoid crowded hallways.',
    'Allow {S} to use headphones during independent work.', 'Break long assignments into smaller sections for {S}.',
]

# ---------------------------------------------------------------- modifications
MODS = [
    'Modified grading', 'Grading based on IEP goals', 'Modified curriculum', 'Alternate curriculum', 'Reduced number of problems',
    'Reduced assignments', 'Shortened assignments', 'Fewer test items', 'Reduced homework', 'Fewer answer choices',
    'Modified tests', 'Modified assignments', 'Alternate assignments', 'Simplified vocabulary', 'Reading material at instructional level',
    'Reduced length of written assignments', 'Modified spelling list', 'Pass/fail grading', 'Grades based on effort and participation',
    'Alternate grading scale', 'Modified content standards', 'Exempt from foreign language requirement', 'Reduced reading load',
    'Alternate format for projects', 'Shortened tests', 'Two answer choices on multiple choice', 'Simplified directions and text',
    'Assignments adjusted to instructional level', 'Modified expectations in general education math', 'Alternate assessment of mastery',
]
MODS_SENT = [
    '{S} will complete a reduced number of problems on math assignments.', 'Assignments will be modified to {S}\'s instructional level.',
    '{S} will be graded on IEP goals rather than grade-level standards.', 'Tests will be shortened to cover essential content only.',
    'Writing assignments will be reduced in length.', 'Spelling lists will be modified to 10 words.',
]

# ---------------------------------------------------------------- assistive technology
AT = [
    'Speech-to-text software', 'Text-to-speech software', 'Word prediction software', 'Communication device', 'AAC device',
    'Augmentative and alternative communication device', 'Tablet with communication app', 'Picture exchange communication system',
    'FM system', 'Hearing assistance technology', 'Personal amplification system', 'Audiobooks', 'Audio recordings of texts',
    'Chromebook with read-aloud extension', 'Laptop for written assignments', 'Portable keyboard', 'Adapted keyboard', 'Slant board',
    'Pencil grip', 'Adapted scissors', 'Raised-line paper', 'Magnification device', 'Screen reader', 'Braille materials',
    'Digital graphic organizer software', 'Smart pen', 'Talking calculator', 'Switch access', 'Visual timer app', 'Noise-canceling headphones',
    'Electronic spell checker', 'Dictation software on school device', 'Voice output device', 'Eye-gaze system', 'Built-in accessibility tools on Chromebook',
]
AT_SENT = [
    '{S} will use speech-to-text software for written assignments.', '{S} uses a communication device to make requests and answer questions.',
    'The device must be charged and available in every class.', '{S} will have access to text-to-speech for content-area reading.',
    'Staff will be trained on {S}\'s communication device.', '{S} uses an FM system; teachers wear the microphone during instruction.',
]

# ---------------------------------------------------------------- testing
TEST = [
    'Extended time on tests', 'Time and a half on tests', 'Double time', 'Extended time (1.5x) on state assessments', 'Tests administered over multiple days',
    'Separate location for testing', 'Small group testing', 'Testing in a separate room', 'Individual administration of tests',
    'Tests read aloud', 'Test questions read aloud', 'Read aloud of test items except reading comprehension', 'Text-to-speech on assessments',
    'Directions read aloud on tests', 'Breaks during testing', 'Frequent breaks during tests', 'Scheduled breaks during state testing',
    'Use of calculator on tests', 'Answers recorded in test booklet', 'Scribe for test responses', 'Speech-to-text for constructed responses',
    'Large print test booklet', 'Braille test', 'Revised test directions', 'Test administered in the morning', 'Flexible scheduling of tests',
    'Use of a word-to-word dictionary on tests', 'Amplification device during testing', 'Masking on computer-based tests', 'Line reader on tests',
    'Designated supports: separate setting', 'Designated supports: text-to-speech for math', 'Embedded accommodations on the state test',
    'Non-embedded accommodations on the state test', 'Unlimited time on the state assessment',
]
TEST_SENT = [
    '{S} will participate in the state assessment with accommodations.', '{S} will take district benchmark assessments with accommodations.',
    '{S} will take the general state assessment with the following accommodations.', '{S} will participate in the alternate assessment.',
    'Tests longer than 30 minutes will include a break.', 'Testing accommodations apply to classroom tests and state assessments.',
    '{S} will take tests in a room with no more than 10 students.', 'Questions may be read aloud on math and science tests only.',
    'Participation in statewide assessments: general assessment with accommodations.',
]
TEST_COND = ['', '', ' (all tests)', ' on classroom and state tests', ' - state and district assessments', ' (math and science)', ' for all timed tests',
             ' except for reading comprehension', '; all assessments', ' on unit tests and quizzes']

# ---------------------------------------------------------------- services
SERV_NAMES = ['Specialized academic instruction', 'Speech-language therapy', 'Speech and language services', 'Occupational therapy', 'Physical therapy',
              'Counseling', 'Counseling services', 'Social work services', 'Resource room', 'Resource room program', 'Integrated co-teaching',
              'Co-taught English language arts', 'Co-taught math', 'Special class', 'Reading intervention', 'Specialized reading instruction',
              'Specialized math instruction', 'Consultant teacher services', 'Behavior support services', 'Psychological services', 'Adapted physical education',
              'Vision services', 'Orientation and mobility', 'Deaf and hard of hearing services', 'Assistive technology services', 'Paraprofessional support',
              'Individual aide', 'Shared aide', 'Transportation', 'Social skills group', 'Language and speech', 'Applied behavior analysis services',
              'School nurse services', 'Audiology services', 'Parent counseling and training', 'Extended school year services', 'Transition services']
FREQS = ['5 times a week', '3 x weekly', '2x/week', '1 time per week', 'once a week', 'twice weekly', 'daily', '4 times weekly', '2 times a month',
         'monthly', '1x monthly', '30 minutes per week', '60 min/week', '120 minutes weekly', '240 minutes per week', 'every day', '3 sessions per week']
DURS = ['30 minutes', '45 min', '20 minutes', '60 minutes', '40 min', '25 minutes', '50 minutes', '15 minutes', '90 minutes']
LOCS = ['general education classroom', 'special education classroom', 'resource room', 'speech room', 'therapy room', 'counseling office',
        'separate location', 'regular classroom', 'in class', 'pull-out', 'push-in', 'school setting', 'small group room', 'gen ed setting']
GROUPS = ['individual', 'group', 'small group', 'group of 3', 'group (5:1)', '1:1', 'individual and group']


def services_lines():
    out = []
    for _ in range(900):
        n, f, d, l, g = R.choice(SERV_NAMES), R.choice(FREQS), R.choice(DURS), R.choice(LOCS), R.choice(GROUPS)
        s = subj()
        form = R.randint(0, 9)
        if form == 0: out.append(f'{n} {f} {d} {l}')
        elif form == 1: out.append(f'{n}: {f}, {d}, {l}')
        elif form == 2: out.append(f'{cap(s)} will receive {n.lower()} {f} for {d} in the {l}.')
        elif form == 3: out.append(f'{n} - {g} - {f} - {d} - {l}')
        elif form == 4: out.append(f'{n}, {g}, {d}, {f}')
        elif form == 5: out.append(f'{n} will be provided {f} for {d} sessions.')
        elif form == 6: out.append(f'{cap(s)} receives {n.lower()} {f} ({d}, {g}).')
        elif form == 7: out.append(f'{n} | {f} | {d} | {l}')
        elif form == 8: out.append(f'{d} {f} of {n.lower()} in a {g} setting')
        else: out.append(f'{n} provided by the related service provider {f}, {d} each session')
    out += ['Consultation between the special education teacher and general education teachers, 30 minutes monthly',
            'The special education teacher will consult with the classroom teacher twice a month.',
            'Service minutes: 300 minutes per week of specialized academic instruction',
            'Push-in support during math block, daily for 45 minutes',
            'Pull-out reading support in a small group 4 days per week',
            'Total minutes of special education services per week: 450']
    return out


# ---------------------------------------------------------------- goals
G_AREAS = ['Reading', 'Reading Comprehension', 'Reading Fluency', 'Decoding', 'Written Expression', 'Writing', 'Math Calculation', 'Math Problem Solving',
           'Math', 'Social/Emotional', 'Behavior', 'Communication', 'Expressive Language', 'Receptive Language', 'Articulation', 'Fine Motor',
           'Gross Motor', 'Self-Help', 'Adaptive', 'Organization', 'Executive Functioning', 'Self-Advocacy', 'Task Completion', 'Attention',
           'Social Skills', 'Coping Skills', 'Transition', 'Independent Living', 'Vocational', 'Pragmatic Language', 'Spelling', 'Handwriting']
G_SKILLS = ['read grade-level passages at {n} words correct per minute', 'answer literal and inferential questions about a passage',
            'identify the main idea and two supporting details', 'decode multisyllabic words', 'write a five-sentence paragraph with a topic sentence',
            'use correct capitalization and punctuation in written work', 'solve two-step word problems', 'add and subtract fractions with unlike denominators',
            'solve multiplication facts through 10', 'use a coping strategy when frustrated', 'initiate tasks within 2 minutes of the direction',
            'request a break using a break card', 'remain in the assigned area during instruction', 'take turns in conversation with peers',
            'produce the /r/ sound in words and sentences', 'follow two-step directions', 'use complete sentences to describe a picture',
            'write lowercase letters legibly', 'cut along a line within 1/4 inch', 'tie shoes independently', 'organize materials using a checklist',
            'record assignments in a planner', 'ask for help when needed', 'complete independent work with no more than one prompt',
            'greet peers and staff', 'identify feelings using a feelings chart', 'compare and contrast two texts', 'edit writing using a checklist',
            'count money to $5.00', 'tell time to the nearest five minutes', 'answer wh- questions about a story', 'maintain attention for 10 minutes',
            'transition between activities without verbal protest', 'use a visual schedule to complete the morning routine', 'summarize a text in three sentences']
G_CRIT = ['in 4 out of 5 trials', 'with 80% accuracy', 'in 4 of 5 opportunities', 'with 90% accuracy over 3 consecutive probes',
          'on 3 consecutive data collection days', 'in 8 of 10 trials', 'with no more than 2 prompts', 'across 3 consecutive weeks', 'with 75% accuracy',
          'in 3 of 4 opportunities', 'as measured by teacher-charted data', 'as measured by curriculum-based measures', 'as measured by work samples',
          'as measured by a rubric score of 3 out of 4', 'as measured by observation and data collection']
G_LEAD = ['By the end of the IEP period, ', 'By June 2027, ', 'Given a grade-level text, ', 'Given visual supports, ', 'Within one year, ',
          'When given a written assignment, ', 'During small group instruction, ', 'When frustrated, ', 'Given a graphic organizer, ', '',
          '', 'In 36 instructional weeks, ', 'Given a verbal prompt, ', 'During unstructured times, ']


def goal_lines():
    out = []
    for _ in range(1000):
        s = subj(); area = R.choice(G_AREAS)
        skill = R.choice(G_SKILLS).replace('{n}', str(R.choice([60, 80, 95, 110, 120])))
        form = R.randint(0, 6)
        core = f'{R.choice(G_LEAD)}{s} will {skill} {R.choice(G_CRIT)}.'
        core = cap(core)
        if form == 0: out.append(f'{area}: {core}')
        elif form == 1: out.append(core)
        elif form == 2: out.append(f'Goal {R.randint(1, 6)}: {core}')
        elif form == 3: out.append(f'Annual Goal: {core}')
        elif form == 4: out.append(f'Objective {R.randint(1, 3)}: {cap(s)} will {skill} {R.choice(G_CRIT)}.')
        elif form == 5: out.append(f'Short-term objective: {cap(s)} will {skill} with {R.choice([50, 60, 70])}% accuracy by the second marking period.')
        else: out.append(f'{core} | {R.choice(G_CRIT)} | {R.choice(["Weekly", "Monthly", "Every 2 weeks", "Quarterly"])}')
    out += ['Criteria: 4 of 5 trials', 'Method: teacher observation and data sheets', 'Evaluation method: running records',
            'Schedule: every two weeks', 'Measured by: curriculum-based measurement', 'Person responsible: special education teacher',
            'Baseline: currently reads 45 words correct per minute', 'Mastery criteria: 80% accuracy on three consecutive probes']
    return out


# ---------------------------------------------------------------- behavior
BEH = [
    'Target behavior: leaving the assigned area without permission', 'Target behavior: calling out during instruction', 'Behavior of concern: work refusal',
    'Problem behavior: physical aggression toward peers, such as hitting or pushing', 'Target behavior: tearing up work when frustrated',
    'The behavior impeding learning is verbal outbursts during transitions', 'Elopement from the classroom', 'Putting head down and refusing to work',
    'Throwing objects when asked to stop a preferred activity', 'Function: escape from difficult tasks', 'Function: to gain adult attention',
    'Function: access to preferred items or activities', 'Hypothesis: when given a non-preferred writing task, the student tears the paper to escape the task',
    'Likely function: avoidance of demands', 'The behavior is maintained by peer attention', 'Antecedents: transitions and unstructured time',
    'Triggers: loud noises, changes in routine, and being told no', 'Setting events: poor sleep or skipped breakfast', 'Triggers include long writing tasks',
    'Prevention strategies: give a 2-minute warning before transitions', 'Proactive strategies: provide choices within tasks',
    'Use a visual schedule to preview the day', 'Pre-correct expectations before unstructured times', 'Offer a break before tasks longer than 15 minutes',
    'Replacement behavior: request a break using a break card', 'Replacement behavior: raise hand to get attention',
    'Teach the student to ask for help using a help card', 'Reinforcement: earn points toward a preferred activity', 'Reinforcers: computer time, art, praise',
    'Response: calmly redirect without discussion', 'When the behavior occurs, use planned ignoring and praise the next appropriate behavior',
    'Reactive strategies: prompt the student to use the calm-down area', 'Do not engage in power struggles; restate the expectation once',
    'Crisis plan: if the student leaves the building, notify the office immediately', 'Safety plan: clear the area of other students and call for support',
    'Data will be collected on frequency of outbursts using an ABC chart', 'The behavior occurs about 3 times per day during math',
    'Consequences: loss of the next scheduled privilege', 'Escape-maintained behavior during independent work', 'Behavior intervention plan',
    'Positive behavior supports', 'Check-in with the counselor after an incident', 'Allow the student to calm down before discussing the incident',
    'Ignore minor attention-seeking behavior and praise peers who are on task', 'Use a calm voice and limited words when the student is escalated',
]
BEH_SENT = [
    'When {S} is frustrated, {S} may yell or leave the area.', '{S} will use the calm-down corner when upset.',
    'Staff will give {S} a choice of two tasks before independent work.', 'If {S} refuses to work, prompt once and then give space.',
    '{S}\'s behavior occurs most often during unstructured times such as lunch and recess.', 'Praise {S} for using the break card appropriately.',
    'Avoid reprimanding {S} in front of peers.', 'When {S} becomes aggressive, staff will follow the safety plan.',
]

# ---------------------------------------------------------------- health
HEALTH = [
    '{S} has a severe peanut allergy.', 'EpiPen is kept in the nurse\'s office.', '{S} has asthma and carries an inhaler.',
    '{S} has type 1 diabetes and checks blood sugar before lunch.', '{S} has a seizure disorder; follow the seizure action plan.',
    'Seizure action plan on file with the nurse.', 'Allow water and snacks in class at all times.', 'Allow unlimited access to the restroom.',
    '{S} takes medication at lunch in the nurse\'s office.', 'Emergency health care plan on file.', 'Allergic to bee stings; carry the EpiPen on field trips.',
    '{S} wears glasses and should wear them in class.', '{S} has a mild hearing loss in the left ear.', '{S} has limited stamina and may tire easily.',
    'Notify the nurse if {S} complains of headache or dizziness.', '{S} has a feeding tube; feeding is done by the nurse.',
    '{S} uses a wheelchair; ensure clear pathways in the classroom.', 'Medical diagnosis: ADHD, managed with medication.',
    '{S} should not participate in strenuous activity on hot days.', 'Food allergy: tree nuts and shellfish.', 'Individualized health plan attached.',
    '{S} has a heart condition; limit physical exertion per doctor\'s orders.', 'Health alert: severe allergy to latex.',
    '{S} may need to use the inhaler after physical activity.', 'Vision: wears corrective lenses.', '{S} has a gluten intolerance.',
    'Staff on field trips must carry {S}\'s medication.', '{S} becomes overheated easily; allow breaks and water.',
]

# ---------------------------------------------------------------- strengths
STRENGTHS = [
    '{S} is kind and helpful to classmates.', '{S} enjoys drawing and art.', '{S} has a strong vocabulary.', '{S} is a creative storyteller.',
    '{S} loves dinosaurs and building with blocks.', '{S} works well with a partner.', '{S} responds well to praise.', '{S} is curious and asks good questions.',
    '{S} has a great sense of humor.', '{S} is a strong visual learner.', '{S} enjoys science experiments.', '{S} is persistent when interested in a topic.',
    '{S} enjoys helping classmates with technology.', 'Strengths: math computation, memory for facts, and drawing.', '{S} is well liked by peers.',
    '{S} follows routines well.', '{S} enjoys music and sings in the choir.', '{S} is an enthusiastic participant in PE.', 'Interests: soccer, video games, and animals.',
    '{S} enjoys reading graphic novels.', '{S} shows leadership in group activities.', '{S} is polite and respectful with adults.', '{S} has strong decoding skills.',
    'Student strengths include a positive attitude and a willingness to try.', '{S} likes being given classroom jobs.', '{S} is very creative and imaginative.',
    'Parent reports that {S} is caring and loves animals.', '{S} has a good memory for details.', '{S} enjoys working with his hands.',
]

# ---------------------------------------------------------------- supports for school personnel
PERSONNEL = [
    'Training for staff on the student\'s communication device', 'Consultation with the behavior specialist monthly', 'Staff training on the seizure action plan',
    'Classroom teachers will receive a copy of the IEP accommodations', 'Consultation between the speech-language pathologist and classroom teachers',
    'Training on the behavior intervention plan for all staff working with the student', 'Collaboration time between the general and special education teachers',
    'The occupational therapist will consult with the teacher about sensory strategies', 'Paraprofessional training on prompting and data collection',
    'Staff will be trained in de-escalation strategies', 'Consultation from the teacher of the visually impaired', 'Monthly team meeting to review data',
    'Professional development on assistive technology for classroom staff', 'Nurse will train staff on emergency medication administration',
    'Support for school personnel: consultation with the autism specialist', 'Teachers will be informed of their responsibilities under this IEP',
]

# ---------------------------------------------------------------- present levels
PRESENT = [
    '{S} reads at a second grade instructional level.', 'On the WIAT-III, {S} scored in the below average range in reading comprehension.',
    '{S} scored at the 25th percentile on the district math benchmark.', 'According to the fall reading inventory, {S} reads 45 words correct per minute.',
    'Teacher reports indicate that {S} struggles to complete independent work.', '{S} has difficulty with multi-step math problems.',
    '{S}\'s disability affects progress in the general education curriculum in reading and writing.', 'Parent reports that homework takes over two hours each night.',
    '{S} currently writes two to three sentences independently.', 'Results of the speech-language evaluation indicate a moderate expressive language delay.',
    '{S} is able to add and subtract within 20 but has difficulty with regrouping.', 'Classroom observation showed {S} was on task 45% of intervals.',
    'Cognitive testing places {S} in the average range.', '{S}\'s needs in attention impact the ability to complete tasks.',
    'Current performance: {S} answers literal questions accurately but struggles with inferential questions.', 'Academic achievement: below grade level in math.',
    '{S} passed the vision and hearing screening.', 'Functional performance: {S} needs reminders to stay organized.', 'Area of need: written expression.',
    'Effect of disability on involvement in general education: {S} needs support to access grade-level texts.', '{S} has made progress on last year\'s reading goal.',
    'Fine motor skills are below age expectations.', 'On the BASC-3, teacher ratings were in the at-risk range for attention.',
    '{S} is eligible for special education under the category of specific learning disability.', 'Social development: {S} has a few close friends.',
    'Physical development: no concerns noted.', '{S} needs explicit instruction in phonics.', 'Data from the last quarter show {S} completed 60% of assignments.',
    'Progress on prior goals: goal 1 met, goal 2 partially met.', '{S} demonstrates difficulty initiating tasks.',
]

# ---------------------------------------------------------------- other: administrative, instructions, legal
OTHER = [
    'Student Name: [student]', 'Date of Birth: [date of birth]', 'Grade: 4', 'School: Lincoln Elementary', 'Case Manager: Ms. Rivera', 'IEP Meeting Date: 10/02/2026',
    'Annual Review Date: 10/01/2027', 'Primary Disability: Specific Learning Disability', 'Disability Classification: Autism', 'Eligibility category: Other Health Impairment',
    'Meeting participants: parent, special education teacher, general education teacher, administrator', 'Parent/Guardian: [parent]', 'Phone: [phone]',
    'Signature of parent', 'Signature', 'Date', 'Parent signature ______________ Date ______', 'Page 3 of 12', 'Check all that apply.', 'Check one.',
    'Describe the supports the student will receive.', 'List the accommodations below.', 'If yes, describe.', 'If no, explain why.', 'N/A', 'None',
    'Not applicable', 'See attached.', 'The IEP team considered the following special factors.', 'The parent was given a copy of the procedural safeguards.',
    'The student does not require special transportation.', 'The student is not eligible for extended school year services.',
    'Progress reports will be provided to parents quarterly.', 'Progress toward goals will be reported with report cards.',
    'This IEP was developed in accordance with IDEA.', '34 CFR 300.320', 'Prior written notice', 'Consent for initial placement',
    'Placement: general education classroom with resource support', 'Percentage of time in general education: 80% or more',
    'Least restrictive environment justification', 'The student will participate in the same physical education program as peers.',
    'Frequency Duration Location', 'Service Start Date End Date', 'Projected beginning date', 'Annual Goal Criteria Method Schedule',
    'Will the student participate in state assessments?', 'Is the student blind or visually impaired?', 'Does the student have limited English proficiency?',
    'Team members present', 'Reason for meeting: annual review', 'Next three-year reevaluation: 05/2028', 'Local education agency representative',
    'Confidential student record', 'Form IEP-3 Rev. 2024', 'Continued on next page', 'Notes:', 'Comments:', 'Additional comments', 'Meeting notes',
    'The district proposes the following.', 'Options considered and rejected', 'Parent concerns for enhancing the education of the student',
    'Transportation: none required', 'Extended school year: not eligible', 'Initial', 'Amendment', 'Annual', 'Reevaluation', 'Yes', 'No',
    'Unchecked items do not apply.', 'Complete for students age 14 and older.', 'Section 4', 'Part B', 'Attachment A', 'District: Lakeview USD',
]

HEADINGS = {
    'accom': ['Accommodations', 'Classroom Accommodations', 'Instructional Accommodations', 'Supplementary Aids and Services', 'Classroom Supports',
              'Supports for the Student', 'Program Accommodations', 'Accommodations and Supports', 'Instructional Supports', 'Daily Supports',
              'Supplementary Aids, Services, and Program Modifications', 'Specially Designed Instruction', 'SDI', 'Learning Supports', 'Strategies That Help'],
    'mods': ['Modifications', 'Program Modifications', 'Curriculum Modifications', 'Modified Grading'],
    'at': ['Assistive Technology', 'Assistive Technology Devices and Services', 'AT Devices', 'Technology Supports'],
    'testing': ['Testing Accommodations', 'State and District Assessments', 'Participation in State Assessments', 'Assessment Accommodations',
                'Statewide Assessment', 'District-wide Assessments', 'Designated Supports', 'Test Accommodations'],
    'services': ['Special Education Services', 'Related Services', 'Services', 'Schedule of Services', 'Instructional Program', 'Service Delivery',
                 'Special Education and Related Services', 'Offer of FAPE - Services', 'Programs and Services', 'Service Minutes'],
    'goals': ['Annual Goals', 'Measurable Annual Goals', 'Goals and Objectives', 'Goals', 'What We Are Working On', 'Annual Goals and Benchmarks', 'IEP Goals'],
    'behavior': ['Behavior Intervention Plan', 'Behavior Support Plan', 'Positive Behavior Support Plan', 'BIP', 'Behavior Plan', 'Behavioral Supports'],
    'health': ['Health Information', 'Medical Information', 'Health Plan', 'Health and Safety', 'Medical Alerts', 'Health Concerns'],
    'strengths': ['Strengths', 'Student Strengths', 'Student Profile and Interests', 'Strengths and Interests', 'About Me', 'Student Profile'],
    'personnel': ['Supports for School Personnel', 'Staff Supports', 'Supports for Staff', 'Program Supports for School Personnel'],
    'present': ['Present Levels of Performance', 'Present Levels of Academic Achievement and Functional Performance', 'PLAAFP', 'Learning Needs',
                'Areas of Need', 'Evaluation Results', 'Academic Performance', 'Functional Performance', 'Current Performance'],
    'other': ['Signatures', 'Identifying Information', 'Student Information', 'Meeting Information', 'Transition Plan', 'Placement', 'Special Factors',
              'Least Restrictive Environment', 'Extended School Year', 'Transportation', 'Prior Written Notice', 'Parent Concerns', 'Additional Information',
              'Consent', 'Team Members', 'Eligibility', 'Notes'],
}


def fill(t):
    s = subj()
    out = t.replace('{S}\'s', (PRON.get(s, s + "'s") if s in PRON else s + "'s"))
    out = out.replace('{S}', s)
    return cap(out)


BULLETS = ['', '', '', '- ', '• ', '1. ', 'a) ', '* ']


def variants(base, conds=None, n=3):
    out = []
    for b in base:
        for _ in range(n):
            t = fill(b)
            if conds and not t.endswith('.'):
                t += R.choice(conds)
            t = R.choice(BULLETS) + t
            if R.random() < 0.08: t = t.upper()
            elif R.random() < 0.15: t = t.lower()
            out.append(t)
    return out


def build():
    data = []
    data += [(t, 'accom') for t in variants(ACCOM, ACCOM_COND, 6) + variants(ACCOM_SENT, None, 6)]
    data += [(t, 'mods') for t in variants(MODS, ACCOM_COND, 8) + variants(MODS_SENT, None, 8)]
    data += [(t, 'at') for t in variants(AT, ACCOM_COND, 7) + variants(AT_SENT, None, 8)]
    data += [(t, 'testing') for t in variants(TEST, TEST_COND, 7) + variants(TEST_SENT, None, 8)]
    data += [(t, 'services') for t in services_lines()]
    data += [(t, 'goals') for t in goal_lines()]
    data += [(t, 'behavior') for t in variants(BEH, None, 6) + variants(BEH_SENT, None, 8)]
    data += [(t, 'health') for t in variants(HEALTH, None, 10)]
    data += [(t, 'strengths') for t in variants(STRENGTHS, None, 10)]
    data += [(t, 'personnel') for t in variants(PERSONNEL, None, 12)]
    data += [(t, 'present') for t in variants(PRESENT, None, 10)]
    data += [(t, 'other') for t in variants(OTHER, None, 5)]
    for cat, hs in HEADINGS.items():
        for h in hs:
            for _ in range(4):
                v = R.choice([h, h.upper(), h.lower(), f'{R.choice(["1", "4", "IV", "VII", "B", "Section 3"])}. {h}', f'{h}:'])
                data.append((v, cat))
    R.shuffle(data)
    return data



# ---------------------------------------------------------------- broader phrasing (second pass)
# More varied wording per class, so the model learns topic vocabulary rather than template shapes.
MORE = {
    'accom': [
        'Provide a printed copy of what is written on the board', 'Reduce copying from the board', 'Post the daily schedule where {S} can see it',
        'Give one page at a time', 'Cover parts of the page not being worked on', 'Use colored overlays for reading', 'Teacher initials the planner daily',
        'Check the planner at the end of the day', 'Allow typing for longer written work', 'Allow a keyboard instead of handwriting',
        'Give {S} a job during transitions', 'Let {S} line up first or last to avoid crowding', 'Signal privately when {S} is off task',
        'Use a nonverbal signal agreed on with {S}', 'Offer a choice of how to show learning', 'Provide sentence frames for discussions',
        'Provide models of finished work', 'Review the schedule each morning', 'Preview changes to the routine', 'Allow {S} to stand while working',
        'Provide a copy of the reading in advance', 'Give a list of steps for long-term projects', 'Set interim due dates for long projects',
        'Allow {S} to record answers in the test booklet or on the worksheet', 'Accept typed or dictated work', 'Reduce visual clutter on worksheets',
        'Give {S} extra time to answer when called on', 'Ask {S} to repeat directions back', 'Use hand signals with spoken directions',
        'Pair spoken directions with written or picture directions', 'Allow use of a hallway or quiet space for reading', 'Allow audio versions of class novels',
        'Provide math manipulatives', 'Allow use of a hundreds chart', 'Underline or highlight key words in directions', 'Give {S} a seat at the end of a row',
        'Have a peer share notes', 'Provide extra time between classes', 'Allow {S} to leave class early for the next class', 'Use timers to show work and break time',
        'Give praise privately rather than in front of the class', 'Provide a study guide before tests', 'Remind {S} of upcoming assignments',
        'Shortened copying tasks', 'Directions in simple language', 'Present information visually and verbally', 'Allow use of a reading guide strip',
    ],
    'mods': [
        'Grade work on individual goals', 'Half the number of math problems', 'Below grade level reading materials', 'Reduced vocabulary list',
        'Adapted projects with fewer requirements', 'Three answer choices on tests', 'Focus on essential skills only', 'Modified rubric for writing assignments',
        'Alternate assignments in science and social studies', 'Grades reflect modified expectations', 'Reduced number of concepts covered per unit',
    ],
    'at': [
        'Tablet with a text reader app', 'Portable word processor', 'Speech generating device', 'Sound field amplification system', 'Talking dictionary',
        'Voice typing on the Chromebook', 'Weighted pencil', 'Adaptive grips', 'Reading pen', 'Digital recorder for lectures', 'Electronic copy of textbooks',
        'Accessible PDF versions of materials', 'Text reader software for tests and classwork', 'Communication board with picture symbols',
        'Head pointer or switch for computer access', 'Use of a computer with spelling and grammar check', 'Screen magnification software',
        'Closed captioning for videos', 'Personal FM receiver', 'Low-tech communication book', 'iPad with augmentative communication app',
    ],
    'testing': [
        'Small group of no more than 6 for tests', 'Calculator on the math section of the state test', 'State tests given across two sessions',
        'Test items read aloud except on reading tests', 'Statewide test with designated supports', '50% additional time on unit tests',
        'Dictate answers to a scribe on tests', 'Breaks every 15 minutes during standardized tests', 'Tests given in a familiar location',
        'Test given by a familiar adult', 'Answer choices read aloud on assessments', 'Extended time for state, district and classroom tests',
        'Use of scratch paper on the computer-based test', 'Simplified test directions', 'Paper-based version of the state test',
    ],
    'behavior': [
        'Hitting or kicking staff when given a demand', 'Seeks access to a preferred item such as the tablet', 'When asked to put away a preferred item',
        'Teach {S} to say "I need a minute" instead of shouting', 'Show a timer for the time left before the activity ends', 'Follow at a safe distance if {S} leaves the room',
        'Give stickers for on-task behavior every 10 minutes', 'Remove the audience during an outburst', 'Reduce talking during an outburst',
        'Prompt deep breathing at the first signs of frustration', 'Refusal means saying no and not starting work after a direction',
        'Escalation is most likely after lunch and during writing', 'Signs of escalation include pacing, clenched fists and raised voice',
        'Once calm, help {S} return to the activity', 'Debrief with {S} after the incident', 'Behavior data are collected daily by the classroom staff',
        'Token economy: earn tokens for following directions', 'Self-monitoring checklist for on-task behavior', 'Restate the expectation calmly once',
        'Offer a break before the behavior escalates', 'Interrupt the behavior and redirect to the replacement skill', 'Daily behavior chart sent home',
        'The behavior happens when {S} is asked to write', 'Avoid physical contact unless there is an immediate safety concern',
        'If property is damaged, follow the school discipline procedure', 'Reinforce asking for help with praise and a point',
    ],
    'health': [
        'Tree nut allergy; epinephrine auto-injector in backpack', 'Wears hearing aids in both ears; check that they are working each morning',
        'Watch for signs of low blood sugar such as shakiness or confusion', 'Epilepsy; seizures usually last under two minutes',
        'Seizures: time the seizure and call the nurse', 'Must carry a water bottle due to a medical condition', 'Needs help with toileting',
        'Diapering or changing done by the assigned aide in private', 'Medication given by the nurse at 11:30', 'Cochlear implant on the right side',
        'Has a shunt; report headaches or vomiting to the nurse right away', 'Uses a walker; allow extra time in halls', 'Has a G-tube',
        'Severe asthma triggered by cold air and exercise', 'Migraines; may need to rest in the nurse\'s office', 'Takes ADHD medication before school',
        'Low muscle tone and tires easily', 'Visual impairment: sees best with materials close and high contrast', 'Allergy to dairy',
        'Celiac disease; no food rewards without checking with the nurse', 'May need to check blood glucose in class', 'Glasses must be worn for reading',
        'Do not give any food without parent permission', 'Wears orthotics; may need breaks during long walks', 'Sensitive to bright lights due to a medical condition',
    ],
    'strengths': [
        'Enthusiastic about drawing comics', 'Remembers many facts about animals', 'Likes to take care of the class pets', 'Works hard on hands-on tasks',
        'Talented athlete and good teammate', 'Proud of finished work and likes to share it', 'Family describes {S} as funny, loving and determined',
        'Has many friends', 'Excellent memory for routines', 'Loves to read about space', 'Strong in math facts', 'Good listener during read-alouds',
        'Shows empathy toward classmates', 'Likes to build with LEGO', 'Is motivated by earning responsibility', 'Is a good problem solver with puzzles',
        'Is respectful and follows adult directions', 'Excels in art and music', 'Enjoys being a leader in small groups', 'Has a positive attitude toward school',
    ],
    'present': [
        'Oral reading fluency is 38 words correct per minute, below the benchmark', 'Broad math skills are in the low average range',
        '{S} can count to 50 but cannot yet identify coins', 'The teacher reports {S} is often off task during whole-group lessons',
        '{S}\'s speech is understood by unfamiliar listeners about half of the time', 'Needs: decoding, comprehension, written expression',
        'Without support, {S} cannot access grade-level text', 'Written language skills are in the very low range', 'Gross motor skills are age appropriate',
        '{S} met two of three goals from last year', 'During observation, {S} finished about half of the independent work', 'Spelling is at a first grade level',
        '{S} can identify all letters and most sounds', 'Writing samples show run-on sentences and limited punctuation', 'Attention difficulties affect task completion',
        'Standard scores ranged from 72 to 85', 'Report card grades: C in math, D in ELA', '{S} reads independently at level H', 'Benchmark: well below grade level',
        '{S} needs repeated practice to retain new skills', 'Adaptive behavior scores were in the low range', '{S} completes about 50% of homework',
        'Evaluation results show weaknesses in working memory and processing speed', '{S} is working on skills from the second grade standards',
    ],
    'other': [
        'Signature of parent or guardian', 'Date of meeting', 'Case manager name', 'Meeting type: annual', 'Complete this section for all students',
        'If the team determines the student needs services, complete the next section', 'Explain why the student will not participate', 'Parent agrees with the IEP',
        'A copy of the IEP was given to the parent', 'Next eligibility review', 'Attendance rate', 'Write the name of the person responsible',
        'The team reviewed evaluation results', 'Home language', 'Regular class 80% or more of the day', 'Transition planning begins at age 14',
        'The student does not need a behavior plan', 'No behavior plan is needed at this time', 'Behavior does not impede learning',
        'The student does not have health concerns', 'No health concerns noted', 'Parent declined to attend', 'Interpreter present',
        'Dates of service', 'Start date', 'End date', 'Provider title', 'Type of service', 'Amount of time', 'Location of service',
        'The team considered the strengths of the child', 'The team considered the concerns of the parent', 'The district offers the following placement',
        'Students with disabilities will be educated with nondisabled peers to the maximum extent appropriate', 'Rights transfer at age 18',
        'Graduation pathway: standard diploma', 'Course of study', 'Copy sent home', 'Received by', 'Mailing address', 'Emergency contact',
        'IEP Team decision', 'Parent input was obtained by phone', 'Was the student invited to the meeting?', 'Student ID number', 'English learner: no',
    ],
}


def build_more():
    out = []
    for cat, base in MORE.items():
        out += [(t, cat) for t in variants(base, ACCOM_COND if cat in ('accom', 'mods', 'at') else (TEST_COND if cat == 'testing' else None), 6)]
    return out


_build1 = build


def build():  # noqa: F811  (extends the first pass)
    d = _build1() + build_more()
    R.shuffle(d)
    return d


if __name__ == '__main__':
    d = build()
    from collections import Counter
    print(len(d), Counter(c for _, c in d))
