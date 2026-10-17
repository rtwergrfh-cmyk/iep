"""Fictional Section 504 plans and a Spanish-language IEP, for testing.
All people and details are invented.

  sample-504-tx.pdf   Texas-style "Section 504 Accommodation Plan": eligibility box, accommodation table,
                      state assessment accommodations, a health note, committee signatures.
  sample-504-ca.pdf   California district "Student Accommodation Plan" written in short paragraphs, with a
                      diabetes care section.
  sample-iep-es.pdf   An IEP written in Spanish (as many districts give families), standard sections.
"""
import json, os, sys
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

OUT = sys.argv[1] if len(sys.argv) > 1 else 'samples'
# a font with accented letters
for name, f in [('DV', 'DejaVuSans.ttf'), ('DVB', 'DejaVuSans-Bold.ttf')]:
    for d in ['/usr/share/fonts/truetype/dejavu/', '/usr/share/fonts/dejavu/']:
        if os.path.exists(d + f): pdfmetrics.registerFont(TTFont(name, d + f)); break
ss = getSampleStyleSheet()
B = ParagraphStyle('B', parent=ss['BodyText'], fontName='DV', fontSize=9.5, leading=12.5)
H = ParagraphStyle('H', parent=B, fontName='DVB', fontSize=11, leading=14, spaceBefore=8, spaceAfter=3)
T = ParagraphStyle('T', parent=B, fontName='DVB', fontSize=13.5, leading=17, alignment=1, spaceAfter=6)
P = lambda t, s=B: Paragraph(t, s)


def tbl(rows, widths):
    rows = [[P(c, H if i == 0 and False else B) if isinstance(c, str) else c for c in r] for i, r in enumerate(rows)]
    t = Table(rows, colWidths=widths)
    t.setStyle(TableStyle([('GRID', (0, 0), (-1, -1), 0.5, colors.grey), ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#eeeeee')), ('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    return t


def build(fn, story):
    SimpleDocTemplate(os.path.join(OUT, fn), pagesize=letter, leftMargin=54, rightMargin=54, topMargin=54, bottomMargin=54, title='Fictional sample').build(story)


def expect(fn, d):
    d['file'] = fn
    json.dump(d, open(os.path.join(OUT, fn.replace('.pdf', '.expect.json')), 'w'), indent=1, ensure_ascii=False)


# ---------------- Texas-style 504 ----------------
build('sample-504-tx.pdf', [
    P('Section 504 Accommodation Plan', T),
    P('STUDENT INFORMATION', H),
    tbl([['Student Name', 'Date of Birth', 'Student ID', 'Grade'], ['Noah Delgado', '03/12/2012', '8840215', '8']], [170, 110, 110, 80]),
    P('Campus: Pecan Grove Middle School &nbsp;&nbsp; Parent/Guardian: Teresa Delgado &nbsp;&nbsp; Phone: (512) 555-0144'),
    P('Meeting Date: 10/01/2026 &nbsp;&nbsp; Annual Review Date: 10/01/2027'),
    P('SECTION 504 ELIGIBILITY', H),
    P('Physical or mental impairment: Attention-deficit/hyperactivity disorder (ADHD)'),
    P('Major life activities substantially limited: learning, concentrating'),
    P('The committee determined the student is eligible under Section 504 and requires the accommodations below.'),
    P('CLASSROOM ACCOMMODATIONS', H),
    tbl([['Accommodation', 'Classes', 'Frequency'],
         ['Preferential seating near the point of instruction', 'All classes', 'Daily'],
         ['Extended time (time and a half) on assignments and tests', 'All classes', 'As needed'],
         ['Break of up to 5 minutes when requested, up to 3 per day', 'All classes', 'As needed'],
         ['Copy of class notes or guided notes', 'Core classes', 'Daily'],
         ['Check for understanding before independent work', 'All classes', 'Daily'],
         ['Reminders to turn in assignments (planner check at end of day)', 'Advisory', 'Daily']], [260, 100, 100]),
    P('STATE ASSESSMENT ACCOMMODATIONS (STAAR)', H),
    P('&bull; Small group administration'),
    P('&bull; Individualized structured reminders'),
    P('HEALTH', H),
    P('Noah takes medication for ADHD at home in the morning. No medication is given at school.'),
    P('COMMITTEE MEMBERS', H),
    tbl([['Name', 'Position', 'Signature'], ['Patricia Gomez', '504 Coordinator', ''], ['Daniel Fry', 'General Education Teacher', ''], ['Teresa Delgado', 'Parent', '']], [160, 160, 140]),
])
expect('sample-504-tx.pdf', {'plan': '504', 'must': {
    'accom': ['Preferential seating', 'time and a half', '5 minutes', 'class notes', 'Check for understanding', 'planner'],
    'testing': ['Small group administration', 'structured reminders']},
    'must_not': ['Major life activities', 'committee determined', '504 Coordinator'],
    'off_by_default': ['ADHD'],
    'ids': ['Noah', 'Delgado', 'Teresa', '03/12/2012', '8840215', '555-0144', 'Gomez', 'Daniel Fry']})

# ---------------- California-style 504 (prose) ----------------
build('sample-504-ca.pdf', [
    P('Student Accommodation Plan (Section 504)', T),
    P('Student: Lily Tran &nbsp;&nbsp; Birthdate: 08/19/2015 &nbsp;&nbsp; Grade: 5 &nbsp;&nbsp; School: Rosewood Elementary'),
    P('Parent/Guardian: Kevin Tran &nbsp;&nbsp; Plan date: 09/08/2026 &nbsp;&nbsp; Next review: 09/08/2027'),
    P('Description of the disability and how it affects learning', H),
    P('Lily has Type 1 diabetes. Low or high blood sugar can affect her attention, energy and ability to take tests.'),
    P('Accommodations in the classroom', H),
    P('Lily may check her blood glucose and eat a snack in class at any time. She may keep water and her glucose meter at her desk. '
      'She may use the restroom and visit the nurse without waiting for permission.'),
    P('If Lily misses instruction because of a health visit, the teacher will provide the notes and extra time to make up the work.'),
    P('Accommodations on tests', H),
    P('Lily may stop a test to treat a low and finish it later the same day without penalty. She may take state tests in a small group near the health office.'),
    P('Health plan', H),
    P('Signs of low blood sugar: shaky, sweaty, pale, confused. If she shows these signs, give her 15 grams of fast-acting sugar from her kit and walk her to the nurse. '
      'Never send her to the nurse alone. If she is unconscious, call 911 and the nurse; the nurse will give glucagon.'),
    P('Who is responsible', H),
    P('Classroom teachers implement the accommodations; the school nurse trains staff on the diabetes care plan each August.'),
])
expect('sample-504-ca.pdf', {'plan': '504', 'must': {
    'accom': ['eat a snack', 'water and her glucose meter', 'restroom', 'make up the work'],
    'testing': ['treat a low', 'small group'],
    'health': ['15 grams', '911', 'Never send her to the nurse alone']},
    'must_not': [],
    'ids': ['Lily', 'Tran', 'Kevin', '08/19/2015']})

# ---------------- Spanish IEP ----------------
build('sample-iep-es.pdf', [
    P('Programa de Educación Individualizado (IEP)', T),
    P('INFORMACIÓN DEL ESTUDIANTE', H),
    P('Nombre del estudiante: Mateo Hernández &nbsp;&nbsp; Fecha de nacimiento: 05/02/2016 &nbsp;&nbsp; Grado: 4'),
    P('Padre/Madre/Tutor: Lucía Hernández &nbsp;&nbsp; Teléfono: (559) 555-0187'),
    P('Fecha de la reunión: 09/22/2026 &nbsp;&nbsp; Fecha de la próxima revisión anual: 09/21/2027'),
    P('NIVELES ACTUALES DE RENDIMIENTO ACADÉMICO Y FUNCIONAL', H),
    P('Mateo lee a nivel de segundo grado. Comprende bien cuando le leen en voz alta. Le cuesta escribir párrafos sin apoyo.'),
    P('FORTALEZAS', H),
    P('Mateo es amable y le encanta el fútbol y dibujar. Trabaja mejor en grupos pequeños.'),
    P('SALUD', H),
    P('Mateo tiene asma. Su inhalador está en la oficina de la enfermera. Si tiene dificultad para respirar, llévelo a la enfermera de inmediato.'),
    P('ACOMODACIONES', H),
    P('&bull; Tiempo adicional (1.5 veces) en tareas y pruebas'),
    P('&bull; Asiento preferencial cerca del maestro'),
    P('&bull; Instrucciones leídas en voz alta'),
    P('&bull; Organizadores gráficos para la escritura'),
    P('&bull; Descansos cortos cuando los necesite'),
    P('MODIFICACIONES', H),
    P('&bull; Tareas de escritura más cortas (un párrafo en lugar de tres)'),
    P('TECNOLOGÍA DE ASISTENCIA', H),
    P('Mateo usa un programa de dictado por voz para escribir.'),
    P('ACOMODACIONES PARA EXÁMENES ESTATALES', H),
    P('&bull; Lectura en voz alta de las preguntas (excepto en la prueba de lectura)'),
    P('&bull; Grupo pequeño'),
    P('PLAN DE INTERVENCIÓN DE CONDUCTA', H),
    P('Conducta objetivo: Sale del salón sin permiso cuando se frustra.'),
    P('Desencadenantes: Tareas largas de escritura.'),
    P('Estrategias de prevención: Dividir las tareas en partes y ofrecer un descanso antes de que se frustre.'),
    P('Respuesta: Si sale del salón, un adulto lo sigue a distancia y avisa a la oficina.'),
    P('METAS ANUALES', H),
    P('Meta 1 (Lectura): Para septiembre de 2027, Mateo leerá un texto de tercer grado con 90% de precisión, medido por registros de lectura mensuales.'),
    P('Meta 2 (Escritura): Para septiembre de 2027, Mateo escribirá un párrafo de cinco oraciones usando un organizador gráfico en 4 de 5 intentos.'),
    P('SERVICIOS DE EDUCACIÓN ESPECIAL Y SERVICIOS RELACIONADOS', H),
    tbl([['Servicio', 'Frecuencia', 'Lugar'],
         ['Instrucción académica especializada (lectura y escritura)', '45 minutos diarios', 'Salón de recursos'],
         ['Terapia del habla y lenguaje', '30 minutos, 2 veces por semana', 'Salón de terapia']], [230, 130, 110]),
])
expect('sample-iep-es.pdf', {'lang': 'es', 'must': {
    'strengths': ['fútbol'],
    'health': ['inhalador'],
    'accom': ['Tiempo adicional', 'Asiento preferencial', 'voz alta', 'Organizadores gráficos', 'Descansos'],
    'mods': ['más cortas'],
    'at': ['dictado por voz'],
    'testing': ['excepto en la prueba de lectura', 'Grupo pequeño'],
    'behavior': ['Sale del salón', 'Tareas largas', 'Dividir las tareas', 'lo sigue a distancia'],
    'goals': ['90% de precisión', 'cinco oraciones'],
    'services': ['Instrucción académica especializada', 'habla y lenguaje']},
    'must_not': [],
    'ids': ['Mateo', 'Hernández', 'Lucía', '05/02/2016', '555-0187']})
print('ok')
