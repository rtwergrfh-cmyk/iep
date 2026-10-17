"""Second, larger synthetic training set for the IEP line classifier.

Written to cover what the first set missed on real IEPs:
  - present-level narrative: test scores, skill levels, difficulties, observations, progress,
    parent concerns, effect-of-disability statements (label: present). This is the largest gap:
    real IEPs are mostly narrative about needs, and the old model called much of it "strengths".
  - hard negatives: sentences that use strength words but describe needs ("does not enjoy math"),
    and need statements that use support words ("requires redirection to stay on task")
  - supports written as narrative ("benefits from...", "it is helpful when...") and as short
    management-needs lists (label: accom)
  - goals as real goal tables produce them: long Common Core style goals, goals split across
    wrapped table cells, and the criteria/method/schedule fragments that sit beside them
  - service grids, testing tables, participation statements in several state styles
  - form text: instructions, empty prompts, checkbox questions, table headers split over lines,
    summary pages, signatures, placement, transportation, promotion criteria (label: other)

Everything here is invented for this project. No line is copied from a real IEP, and the
real-IEP test files in tools/ml/real/ are never used for training. Phrasing that I noticed while
labeling the NYC test IEP (its form prompts, dropdown terms and distinctive sentences) was
removed from this file so the test stays fair.
Writing voices vary on purpose: formal evaluator, classroom teacher, terse list, all caps.
"""
import random

R = random.Random(11)

NAMES = ['the student', 'Student', 'J.D.', 'A.R.', 'M.T.', 'K.W.', 'L.S.', 'R.B.', 'T.N.', 'E.P.', 'D.C.', 'S.G.', '[student]', 'This student']
PRON = [('he', 'his', 'him'), ('she', 'her', 'her'), ('they', 'their', 'them')]
SUBJECTS = ['reading', 'writing', 'math', 'mathematics', 'ELA', 'English language arts', 'science', 'social studies', 'history', 'spelling', 'phonics']
GRADES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', 'first', 'second', 'third', 'fourth', 'fifth', 'kindergarten']
ASSESS = ['the Fountas and Pinnell benchmark', 'the i-Ready diagnostic', 'NWEA MAP', 'the STAR Reading assessment', 'DIBELS', 'the district benchmark',
          'the WIAT-4', 'the Woodcock-Johnson IV', 'the KTEA-3', 'the state exam', 'the end-of-unit assessment', 'running records', 'Acadience',
          'the Qualitative Reading Inventory', 'the Brigance', 'curriculum-based measures', 'the TOWL-4']
SKILLS = {
    'reading': ['decoding multisyllabic words', 'reading fluently', 'making inferences', 'identifying the main idea', 'summarizing a text',
                'using context clues', 'answering inferential questions', 'citing textual evidence', 'comparing two texts', 'retelling a story in order',
                'identifying the author\'s purpose', 'understanding figurative language', 'reading grade-level vocabulary'],
    'writing': ['organizing a paragraph', 'writing complete sentences', 'using capitalization and punctuation', 'structuring an essay',
                'writing a constructed response', 'revising and editing', 'spelling high-frequency words', 'developing ideas with details',
                'using transition words', 'writing a topic sentence'],
    'math': ['regrouping in subtraction', 'multiplication facts', 'long division', 'solving word problems', 'fraction operations', 'decimals',
             'place value', 'telling time', 'counting money', 'solving multi-step equations', 'order of operations', 'finding the GCF and LCM',
             'graphing on a coordinate plane', 'ratios and proportions', 'integers'],
    'attention': ['staying on task', 'beginning work independently', 'completing tasks', 'attending to whole-group lessons', 'following multi-step directions',
                  'organizing materials', 'turning in homework', 'managing time'],
    'social': ['resolving conflicts with peers', 'taking turns', 'joining group activities', 'reading social cues', 'expressing frustration appropriately',
               'accepting feedback', 'working cooperatively'],
    'language': ['expressing ideas in complete sentences', 'answering wh- questions', 'following oral directions', 'using age-appropriate vocabulary',
                 'producing the /r/ sound', 'retelling events in sequence', 'understanding spoken language'],
    'motor': ['handwriting legibility', 'cutting with scissors', 'copying from the board', 'keyboarding', 'managing fasteners', 'navigating stairs'],
}


def S():
    return R.choice(NAMES)


def P():
    return R.choice(PRON)


def cap(s):
    return s[:1].upper() + s[1:]


def pick(d):
    k = R.choice(list(d)); return k, R.choice(d[k])


# ------------------------------------------------------------------ present levels (needs, data, observations)
def present_lines(n):
    out = []
    T = [
        lambda: f'In {R.choice(["reading", "ELA"])}, {S()} is reading on a {R.choice(GRADES)} grade level according to {R.choice(ASSESS)}.',
        lambda: f'{cap(S())} is currently reading at level {R.choice("DEFGHIJKLMNOPQR")}, which is below the grade-level expectation.',
        lambda: f'Based on {R.choice(ASSESS)}, {S()} scored at the {R.randint(2, 45)}th percentile in {R.choice(SUBJECTS)}.',
        lambda: f'{cap(S())} {R.choice(["struggles with", "has difficulty with", "demonstrates challenges with", "continues to need practice with", "has not yet mastered", "is inconsistent with"])} {pick(SKILLS)[1]}.',
        lambda: f'When {R.choice(["asked to", "required to", "given a task that requires", "expected to"])} {R.choice(["write independently", "solve multi-step problems", "read a grade-level text", "explain " + P()[1] + " thinking", "work with a group", "complete a long assignment"])}, {S()} {R.choice(["becomes frustrated", "shuts down", "makes frequent errors", "needs adult support to begin", "loses focus", "rushes through the work"])}.',
        lambda: f'{cap(S())} {R.choice(["is easily distracted", "is often off task", "has a short attention span", "is frequently distracted by peers", "has trouble staying seated"])} and {R.choice(["requires frequent redirection", "needs reminders to stay focused", "rarely completes classwork", "misses key instructions", "struggles to finish independent work"])}.',
        lambda: f'{cap(S())} has {R.choice(["emerging", "inconsistent", "limited"])} {R.choice(["decoding", "phonics", "computation", "handwriting", "keyboarding", "number sense"])} skills.',
        lambda: f'{cap(S())} was able to {R.choice(["identify the main idea", "write a simple sentence", "solve one-step equations", "retell a short story"])} but {R.choice(["made many errors", "needed prompting", "could not explain the steps", "was not able to generalize the skill", "required a model"])} when {R.choice(["the problems became more complex", "working independently", "the text was at grade level", "given multi-step directions"])}.',
        lambda: f'{cap(S())} {R.choice(["avoids", "dislikes", "becomes anxious during", "shows little interest in"])} {R.choice(SUBJECTS)}.',
        lambda: f'{cap(S())} {R.choice(["has shown progress", "has made some progress", "has made limited progress", "has shown growth"])} in {pick(SKILLS)[1]} {R.choice(["this year", "since the last IEP", "with support", "in small group settings", "but is still below grade level"])}.',
        lambda: f'{cap(R.choice(["The teacher", "The classroom teacher", "The special education teacher", "Teachers"]))} {R.choice(["reports", "notes", "has observed"])} that {S()} {R.choice(["often leaves assignments unfinished", "rarely participates in discussions", "has trouble copying notes", "needs extra time to process directions", "turns in homework inconsistently", "is frequently late to class"])}.',
        lambda: f'During {R.choice(["a classroom observation", "observations", "independent work time", "whole-group instruction"])}, {S()} was on task {R.randint(20, 70)}% of the observed intervals.',
        lambda: f'{cap(S())} {R.choice(["scored", "earned", "received"])} a {R.choice(["scale score of " + str(R.randint(280, 340)), "level " + str(R.randint(1, 3)), "standard score of " + str(R.randint(65, 89)), "RIT score of " + str(R.randint(180, 215)), "Lexile of " + str(R.randint(300, 900)) + "L"])} on {R.choice(ASSESS)}.',
        lambda: f'{cap(S())} {R.choice(["has trouble", "has difficulty", "struggles"])} {R.choice(["completing and turning in homework", "keeping track of materials", "transitioning between activities", "expressing ideas in writing", "retaining new vocabulary", "applying strategies independently"])}.',
        lambda: f'{cap(S())}\'s {R.choice(["needs in", "difficulties with", "deficits in"])} {R.choice(["reading comprehension", "written expression", "math calculation", "attention", "executive functioning", "expressive language", "fine motor skills"])} {R.choice(["affect", "impact", "limit"])} {P()[1] if False else "the student\'s"} {R.choice(["progress in the general education curriculum", "access to grade-level content", "ability to complete assignments", "participation in class"])}.',
        lambda: f'{R.choice(["Mom", "Dad", "The parent", "Parents", "Grandmother", "The guardian"])} {R.choice(["is concerned that", "reports that", "feels that", "shared that", "is worried that"])} {S()} {R.choice(["struggles with homework", "is falling behind in math", "has trouble making friends", "is not sleeping well", "gets frustrated at home", "needs more support in reading", "argues with siblings"])}.',
        lambda: f'{R.choice(["Mom", "The parent", "Parents", "Dad"])} would like {S()} to {R.choice(["receive more reading support", "be evaluated by a psychologist", "join an after-school program", "have a tutor", "stay with the same teachers"])}.',
        lambda: f'{cap(S())} {R.choice(["continues to need", "requires", "needs"])} {R.choice(["explicit instruction", "repeated practice", "re-teaching", "more time", "frequent monitoring", "adult support"])} to {R.choice(["master grade-level skills", "complete classroom tasks", "retain new concepts", "make progress toward standards", "stay organized"])}.',
        lambda: f'{cap(S())} is able to {R.choice(["read independently at the " + R.choice(GRADES) + " grade level", "add and subtract within 100", "write a complete sentence", "follow one-step directions", "solve simple equations", "identify most letter sounds"])}.',
        lambda: f'{R.choice(["Reading", "Math", "Writing", "ELA"])}: {R.choice(GRADES)} grade level',
        lambda: f'{R.choice(["Performance Level", "Lexile", "RIT Score", "Standard Score"])}{R.choice([": ", " "])}{R.choice([str(R.randint(1, 4)), str(R.randint(150, 350)), str(R.randint(20, 90)) + "%", str(round(R.uniform(1, 4), 2))])}',
        lambda: f'Results of the {R.choice(["psychoeducational", "speech-language", "occupational therapy", "academic", "functional behavior"])} evaluation {R.choice(["indicate", "show", "suggest"])} {R.choice(["weaknesses in processing speed", "below-average expressive language", "fine motor delays", "average cognitive ability", "significant attention difficulties", "a specific learning disability in reading"])}.',
        lambda: f'{cap(S())} {R.choice(["requires", "needs"])} {R.choice(["re-direction", "prompting", "adult support", "frequent reminders"])} to {R.choice(["stay on task", "begin assignments", "complete work", "follow classroom routines"])} {R.choice(["during independent work", "in large groups", "in most classes", "throughout the day"])}.',
        lambda: f'The effect of {R.choice(["the student\'s", "these"])} needs on progress in the general education curriculum is {R.choice(["significant", "moderate", "that the student requires specialized instruction", "that grade-level work must be supported"])}.',
    ]
    for _ in range(n):
        out.append(R.choice(T)())
    return out


# ------------------------------------------------------------------ strengths (with hard negatives elsewhere)
def strength_lines(n):
    T = [
        lambda: f'{cap(S())} enjoys {R.choice(["school", "art class", "music", "PE", "science experiments", "reading graphic novels", "building with LEGO", "helping the teacher", "drawing", "playing basketball", "dance", "soccer", "video games", "cooking", "animals"])}.',
        lambda: f'{cap(S())}\'s favorite {R.choice(["subjects are", "classes include", "activities are"])} {R.choice(["science and art", "math and PE", "music, art and lunch", "ELA and social studies", "computers and gym"])}.',
        lambda: f'{cap(S())} is {R.choice(["kind", "friendly", "respectful", "polite", "hardworking", "creative", "curious", "funny", "helpful", "social", "determined", "cheerful", "motivated", "well liked by peers"])} and {R.choice(["gets along well with peers", "works hard", "enjoys helping others", "has many friends", "is eager to learn", "follows class routines"])}.',
        lambda: f'{cap(S())} {R.choice(["participates in", "is a member of", "plays on", "performs with"])} the {R.choice(["school band", "chorus", "basketball team", "drama club", "robotics club", "orchestra", "chess club", "student council"])}.',
        lambda: f'{cap(S())} {R.choice(["has a strong", "shows a strong", "has an excellent"])} {R.choice(["vocabulary", "memory", "sense of humor", "work ethic", "interest in science", "understanding of math facts", "ability to solve puzzles"])}.',
        lambda: f'{cap(S())} {R.choice(["is a strong visual learner", "learns best with hands-on activities", "is a good listener", "shows leadership in groups", "takes pride in finished work", "is persistent when interested in a topic"])}.',
        lambda: f'{R.choice(["Interests", "Preferences", "Strengths", "Hobbies"])}: {", ".join(R.sample(["drawing", "soccer", "music", "dinosaurs", "computers", "cooking", "animals", "reading", "math", "dance", "Minecraft", "building", "swimming"], 3))}',
        lambda: f'{cap(S())} {R.choice(["arrives ready to learn", "completes classroom jobs responsibly", "follows adult directions", "is respectful to staff", "asks thoughtful questions"])}.',
        lambda: f'{cap(S())} {R.choice(["wants to do well in school", "is motivated by praise", "works well with a partner"])}.',
        lambda: f'{cap(S())} is a {R.choice(["talented artist", "good athlete", "strong reader for " + R.choice(["his", "her", "their"]) + " age", "creative storyteller", "natural leader"])}.',
    ]
    return [R.choice(T)() for _ in range(n)]


# ------------------------------------------------------------------ supports written as narrative or lists
SUPPORTS = ['graphic organizers', 'visual aids', 'small group instruction', 'one-on-one instruction', 'repeated directions', 'directions broken into steps',
            'chunked assignments', 'check-ins from the teacher', 'extended time', 'a word bank', 'sentence starters', 'models of completed work',
            'a copy of class notes', 'preferential seating', 'movement breaks', 'a visual schedule', 'scaffolded questions',
            'manipulatives', 'a calculator', 'a quiet workspace', 'advance notice of transitions', 'positive reinforcement', 'a daily planner check',
            'diagrams and pictures', 'audio versions of texts', 'reduced distractions', 'wait time', 'frequent feedback', 'a checklist of steps']


def support_lines(n):
    T = [
        lambda: f'{cap(S())} benefits from {R.choice(SUPPORTS)}{R.choice(["", " to stay focused", " when completing written work", " in all classes", " during independent work"])}.',
        lambda: f'{cap(R.choice(SUPPORTS))} {R.choice(["help", "helps"])} {S()} {R.choice(["stay on task", "organize ideas", "understand new material", "complete assignments", "remember steps"])}.',
        lambda: f'{cap(S())} {R.choice(["responds well to", "does best with", "needs", "should be given", "should have access to"])} {R.choice(SUPPORTS)}.',
        lambda: f'{R.choice(["Provide", "Offer", "Allow", "Give"])} {R.choice(SUPPORTS)}{R.choice(["", " in all academic classes", " during tests and classwork", " as needed", " before independent work begins"])}.',
        lambda: f'{R.choice(["In all classes", "Throughout the school day", "During instruction"])}, {S()} requires: {R.choice(SUPPORTS)}',
        lambda: f'{R.choice(["-", "•", "*", ""])}{R.choice(SUPPORTS)}',
        lambda: f'{cap(S())} {R.choice(["requires", "needs"])} {R.choice(["small group support", "a quiet place to work", "extra time to complete assignments", "help organizing materials"])}.',
    ]
    return [R.choice(T)() for _ in range(n)]


# ------------------------------------------------------------------ goals: long, wrapped, and fragments
GOAL_VERB = ['will be able to', 'will', 'will demonstrate the ability to', 'will improve ' + R.choice(['her', 'his', 'their']) + ' ability to']
GOAL_SKILL = ['describe how a character changes over a story', 'explain the steps used to solve a ratio problem', 'write a narrative with a clear sequence of events', 
              'write an argumentative essay with a claim and supporting evidence',
              
              'solve real-world problems involving the four operations', 'fluently multiply and divide within 100', 'solve two-step equations',
              
              'use a self-regulation strategy when frustrated', 'initiate and maintain a conversation with a peer', 'complete and turn in homework assignments',
              'follow a visual schedule to transition between activities', 'read grade-level text with accuracy and fluency', 'decode words with vowel teams',
              'write legibly using correct letter formation', 'use a planner to record assignments', 'request help using an appropriate phrase']
CRIT = ['70% accuracy', '80% accuracy', '4 out of 5 trials', '8 of 10 trials',
        '4 of 5 opportunities', '90% accuracy over 3 consecutive probes', 'with no more than 2 prompts']
METHOD = ['Teacher-made tests', 'Observation', 'Work samples', 'Curriculum-based measurement', 'Running records', 'Data collection sheet', 'Rubric', 'Student self-monitoring chart']
SCHED = ['Monthly', 'Weekly', 'Every 2 weeks', 'Quarterly', 'Each marking period', '3 times per year', 'Biweekly']
GLEAD = ['By the end of the IEP', 'By June', 'Within 36 instructional weeks', 'Using a graphic organizer',
         'In 36 weeks', 'By the annual review', 'When given a grade-level text', 'When presented with a word problem']
GAREA = ['Reading Comprehension:', 'Math Calculation:', 'Written Expression:', 'Reading', 'Math', 'Writing', 'Social/Emotional', 'Speech:', 'OT:', 'Behavior', 'Study Skills']


def goal_lines(n):
    out = []
    for _ in range(n):
        g = f'{R.choice(GLEAD)}, {S()} {R.choice(GOAL_VERB)} {R.choice(GOAL_SKILL)}.'
        if R.random() < 0.4: g += f' {cap(R.choice(["she", "he", "they"]))} will show mastery by {R.choice(["reading a grade-level text and answering questions", "completing a writing sample", "solving problems on a teacher-made assessment", "explaining " + R.choice(["her", "his"]) + " reasoning", "using a checklist"])}.'
        form = R.random()
        if form < 0.3: out.append((R.choice(GAREA) + ' ' if R.random() < 0.6 else '') + g)
        elif form < 0.55:
            out.append(' | '.join([g, R.choice(CRIT), R.choice(METHOD) + (' ' + R.choice(METHOD) if R.random() < .5 else ''), R.choice(SCHED)]))
        elif form < 0.85:
            # the way wrapped goal tables come out: pieces of the goal, sometimes with a column fragment attached
            words = g.split(); a = R.randint(3, max(4, len(words) - 3)); b = R.randint(a + 2, len(words))
            piece = ' '.join(words[R.choice([0, a]):b])
            if R.random() < 0.5: piece += ' | ' + R.choice(CRIT + METHOD + SCHED)
            out.append(piece)
        else:
            out.append(' | '.join(R.sample([R.choice(CRIT), R.choice(METHOD), R.choice(SCHED), R.choice(GAREA)], R.randint(2, 3))))
    return out


# ------------------------------------------------------------------ services (grids in several styles)
SVC = ['Integrated Co-Teaching Services', 'Special Class', 'Consultant Teacher Services', 'Resource Room',
       'Counseling Services', 'Speech-Language Therapy', 'Occupational Therapy', 'Physical Therapy', 'Specialized Academic Instruction', 'Language and Speech',
       'Behavior Intervention Services', 'Paraprofessional Services', 'Social Work Services', 'Adapted Physical Education', 'Vision Education Services',
       'Hearing Education Services', 'Orientation and Mobility', 'Psychological Services', 'Reading Intervention']
SUBJ_SVC = ['ELA', 'Math', 'Sciences', 'Social Studies', 'Reading', 'Writing', '']


def service_lines(n):
    out = []
    for _ in range(n):
        name = R.choice(SVC) + (' ' + R.choice(SUBJ_SVC) if R.random() < .5 else '')
        freq = R.choice(['5 times per week', '3 sessions weekly', '1x per week', '2 x weekly', 'daily', '4 times per month', '30 min/week', '120 minutes weekly'])
        dur = R.choice(['Period', '30 minutes', '45 minutes', '40 min', '1 period', '20 minutes'])
        loc = R.choice(['General Education Classroom', 'Special Education Classroom', 'Resource Room', 'Therapy Room', "Counselor's office", 'Gen Ed Setting'])
        grp = R.choice(['Individual', 'Small group', '12:1', '15:1', 'Group (3)'])
        form = R.random()
        if form < 0.35: out.append(' | '.join([name, grp, freq, dur, loc] + ([f'{R.randint(1, 12):02d}/{R.randint(1, 28):02d}/20{R.randint(15, 27)}'] if R.random() < .5 else [])))
        elif form < 0.55: out.append(f'{name}: {freq}, {dur}, {loc.lower()}')
        elif form < 0.75: out.append(f'{cap(S())} will receive {name.lower()} {freq} for {dur} in the {loc.lower()}.')
        elif form < 0.9: out.append(f'{name} {grp} {freq} {dur} {loc}')
        else: out.append(f'{name} - {R.choice(["push-in", "pull-out"])}')
    return out


# ------------------------------------------------------------------ testing (tables and statements)
TEST_ACC = ['Extended time', 'Scheduled breaks', 'Separate setting', 'Tests read aloud',
            'Questions read aloud', 'Use of calculator', 'Large type', 'Answers recorded in any manner', 'Small group administration', 'Time and a half',
            'Directions read and reread aloud', 'Use of a scribe', 'Spelling requirements waived', 'Text-to-speech', 'Masking', 'Flexible scheduling']
TEST_COND = ['For all tests', 'Classroom and state assessments', 'Except reading comprehension tests',
             'For tests longer than 30 minutes', 'All district-wide assessments', 'Math and science exams only']
TEST_IMPL = ['Time and a half', 'Room with fewer distractions',
             'Double time', '10-minute break every 30 minutes', 'Groups of no more than 8 students']


def testing_lines(n):
    out = []
    for _ in range(n):
        f = R.random()
        if f < 0.45: out.append(' | '.join([R.choice(TEST_ACC), R.choice(TEST_COND), R.choice(TEST_IMPL)][:R.randint(2, 3)]))
        elif f < 0.6: out.append(' '.join(R.sample(TEST_ACC, R.randint(3, 6))) + ' | ' + R.choice(TEST_COND))
        elif f < 0.8: out.append(R.choice([
            f'{cap(S())} will participate in state assessments with the testing accommodations listed.',
            f'{cap(S())} will take the alternate assessment.',
            'The student will participate in district-wide assessments with accommodations.',
            f'{cap(S())} will take the state test with {R.choice(TEST_ACC).lower()}.']))
        else: out.append(f'{R.choice(TEST_ACC)}: {R.choice(TEST_IMPL).lower()}')
    return out


# ------------------------------------------------------------------ other: form text, headers, admin
PROMPTS = [
    'Describe the student\'s current levels of performance, including strengths and needs.',
    'List each accommodation and the settings in which it will be provided.',
    'Indicate the frequency, duration and location for each service.',
    'If the student will not participate in general education, explain why.',
    'Complete this section only if the student is age 14 or older.',
    'Check the appropriate box.', 'Check all that apply.', 'If yes, describe.', 'If no, explain.', 'Attach additional pages as needed.',
    'Describe how progress toward the goals will be measured.', 'Indicate when periodic reports on progress will be provided to parents.',
    'Name of school or agency providing services:', 'Reason(s) the services are required:', 'Provide a justification for this decision.',
    'Describe the type of transportation required, if any.', 'Summarize the results of the most recent evaluations.',
    'Document the student\'s preferences and interests related to transition.', 'The team considered the following options and rejected them.',
    'Parent concerns were discussed with the team.',
]
QUESTIONS = ['Will the student take part in field trips?', 'Does the student need special transportation?', 'Is the student an English learner?',
             'Will the student participate in the alternate assessment?', 'Was the parent present?',
             'Has the parent received a copy of the evaluation?']
HEADERS = ['GOAL', 'BASELINE DATA', 'PROGRESS MONITORING', 'FREQUENCY', 'DURATION', 'LOCATION', 'SERVICE TYPE', 'ANTICIPATED START', 'ROLE', 'NAME', 'SIGNATURE', 'DATE', 'START DATE', 'END DATE', 'PROVIDER', 'MINUTES PER WEEK', 'SETTING', 'TARGET', 'EVALUATION METHOD', 'PERSON RESPONSIBLE', 'MINUTES', 'POSITION RESPONSIBLE']
ADMIN = ['Student Name: [student]', 'DOB: [date of birth]', 'ID: [student ID]', 'Grade: 6', 'Date of meeting: 05/14/2025', 'Primary disability: Autism',
         'Eligibility: Specific Learning Disability', 'Home language: English', 'Annual review due: 06/01/2026', 'Transportation: regular bus',
         'Team members present', 'Parent', 'Special education teacher', 'General education teacher', 'School psychologist', 'District representative',
         'None.', 'N/A', 'Not applicable', 'Progress reports will be sent home each trimester.', 'Quarterly progress reports', 'ESY: not eligible',
         'Postsecondary goals', 'Transition services', 'Least restrictive environment', 'Percentage of time in general education: 85%', 'Page 4 of 18',
         'Continued', 'Parent signature ____________ Date ______', 'Copy of IEP provided to parent', 'Procedural safeguards notice provided',
         'Prior written notice', 'Reevaluation due: 2027', 'Case manager: Ms. Lopez', 'Meeting type: Annual', 'Interpreter needed: No']


def other_lines(n):
    out = []
    for _ in range(n):
        f = R.random()
        if f < 0.25: out.append(R.choice(PROMPTS))
        elif f < 0.4: out.append(R.choice(QUESTIONS) + R.choice(['', ' | Yes | No', ' Yes No', ' | No | Yes', ' Yes No Not Applicable']))
        elif f < 0.65:
            # table headers, often broken across lines and joined with column separators
            hs = R.sample(HEADERS, R.randint(1, 4))
            parts = []
            for h in hs:
                w = h.split(); a = R.randint(0, max(0, len(w) - 1)); b = R.randint(a + 1, len(w))
                parts.append(' '.join(w[a:b]))
            t = ' | '.join(parts)
            out.append(t if R.random() < 0.7 else t.title())
        elif f < 0.9: out.append(R.choice(ADMIN))
        else:
            p = R.choice(PROMPTS).split(); a = R.randint(0, len(p) // 2)
            out.append(' '.join(p[a:a + R.randint(4, 12)]))
    return out


# ------------------------------------------------------------------ smaller classes, more variety
HEALTH = ['{S} takes medication for ADHD before school.',
          '{S} has asthma and uses an inhaler as needed.', '{S} has a peanut allergy; an EpiPen is in the nurse\'s office.', '{S} wears glasses for reading.',
          '{S} has seasonal allergies.', '{S} has a seizure disorder and a seizure action plan is on file.', '{S} has type 1 diabetes.',
          'Medical alert: severe food allergy.', '{S} has a hearing loss in one ear.', '{S} gets headaches and may need to see the nurse.',
          '{S} has an anxiety diagnosis.', '{S} was diagnosed with autism spectrum disorder.', '{S} has a heart condition that limits strenuous activity.',
          '{S} must have access to water throughout the day.', '{S} has a medical condition that affects attendance.']
BEHAV = ['{S} leaves the classroom without permission.', '{S} pushes peers in line.',
         'Target behavior: verbal outbursts when given corrective feedback.', 'Function: to escape demands.', 'Replacement behavior: ask for a break.',
         'When {S} becomes upset, staff will offer a calm-down space.', 'Antecedents: transitions and unstructured time.', '{S} refuses to start work when tasks look hard.',
         'Use a calm voice and limited words when {S} is escalated.', 'Praise {S} for using coping strategies.', '{S} has physical altercations with peers at recess.']
PERSON = ['The behavior specialist will consult with teachers monthly.', 'Staff will receive training on the student\'s communication device.',
          'The school psychologist will meet with the teaching team each quarter.', 'Teachers will receive a copy of the accommodations.',
          'The OT will train the paraprofessional on sensory strategies.', 'Supports for school personnel: consultation with the inclusion specialist.']
MODS = ['Grading based on modified standards', 'Reduced number of test items', 'Alternate assignments in social studies',
        'Shortened spelling list', 'Modified homework: half the problems', 'Instruction at the student\'s functional level', 'Modified curriculum in math']
AT = ['Text-to-speech software', 'Speech-to-text on the Chromebook', 'Communication device', 'FM system', 'Audiobooks', 'Word prediction software', 'Laptop for writing',
      'Talking calculator', 'Large-print materials', 'Magnifier']


def fill(t):
    s = S()
    return cap(t.replace('{S}\'s', s + "'s").replace('{S}', s))


def few(bank, n):
    return [fill(R.choice(bank)) for _ in range(n)]


def style(t):
    r = R.random()
    if r < 0.06: return t.upper()
    if r < 0.12: return t.lower()
    return t


def build():
    d = []
    d += [(style(t), 'present') for t in present_lines(5000)]
    d += [(style(t), 'strengths') for t in strength_lines(2200)]
    d += [(style(t), 'accom') for t in support_lines(2200)]
    d += [(t, 'goals') for t in goal_lines(2600)]
    d += [(t, 'services') for t in service_lines(1500)]
    d += [(t, 'testing') for t in testing_lines(1200)]
    d += [(t, 'other') for t in other_lines(4000)]
    d += [(style(t), 'health') for t in few(HEALTH, 900)]
    d += [(style(t), 'behavior') for t in few(BEHAV, 700)]
    d += [(t, 'personnel') for t in few(PERSON, 300)]
    d += [(t, 'mods') for t in few(MODS, 400)]
    d += [(t, 'at') for t in few(AT, 300)]
    R.shuffle(d)
    return d


if __name__ == '__main__':
    from collections import Counter
    d = build(); print(len(d), Counter(c for _, c in d))
    for t, c in d[:25]: print(f'{c:9} {t}')
