/* IEP Glance: words on the printed sheets in English and Spanish, and a phrase list for translating
   common accommodations. There is no translation engine: anything not in the list is left for the
   case manager to translate, and is marked until they do. */
(function (root) {
  'use strict';
  const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

  const T = {
    en: {
      doc: { iep: 'IEP', '504': '504 plan' },
      roleFor: { t: 'the classroom teacher', p: 'the paraprofessional', s: 'the substitute or specials teacher', f: 'the family' },
      glance: d => d + ' at a glance',
      familyTitle: d => d + ' summary for the family',
      sec: { health: 'Health and safety', strengths: 'Strengths and what works', accom: 'Every day in class', accomS: 'Every day', behavior: 'Behavior plan', testing: 'Tests and quizzes', goals: d => d + ' goals', goalsP: 'Goals you help with', services: 'Services and schedule', servicesO: 'Services and time out of class', personnel: 'Supports for staff' },
      fam: { strengths: 'Strengths', accom: 'What school staff do every day', testing: 'On tests', behavior: 'Behavior support plan', goals: 'Goals for this year', services: 'Services your child receives', health: 'Health and safety' },
      beh: { 'Watch for': 'Watch for', 'Often triggered by': 'Often triggered by', 'Why it happens': 'Why it happens', 'Prevent it': 'Prevent it', 'Teach and accept instead': 'Teach and accept instead', 'When it happens': 'When it happens', 'Reinforce': 'Reinforce', 'Safety plan': 'Safety plan', 'Also in the plan': 'Also in the plan' },
      grade: 'Grade', through: d => d + ' through', questions: 'Questions', from: 'From', cm: 'the case manager',
      signoff: 'I received this summary and know where to find the full DOC.',
      name: 'Name', signature: 'Signature', date: 'Date',
      conf: '<strong>Confidential student information.</strong> Share only with staff who work with this student. Don\'t leave it out where others can read it.',
      notReplace: d => 'This summary doesn\'t replace the ' + d + '. If anything here differs from the ' + d + ', follow the ' + d + '.',
      basedOn: (d, x) => ' Based on the ' + d + ' dated ' + x + '.',
      made: 'Made',
      famFoot: d => 'This is a short summary of your child\'s ' + d + '. The full ' + d + ' is the official plan. You can ask for a meeting to review it at any time.',
      empty: 'Nothing is selected for this sheet yet. Go back to step 3 and choose items for it.',
      notTranslated: 'not translated',
      log: 'Accommodation log', weekOf: 'Week of', teacherClass: 'Teacher / class', key: 'Mark each day: <b>✓</b> provided · <b>R</b> offered, student refused · <b>NA</b> not needed that day · <b>A</b> student absent',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], accCol: 'Accommodation or support', testsCol: 'On tests and quizzes', notes: 'Notes', week: 'week', teacherSig: 'Teacher signature',
      goalSheet: 'Goal data sheet', staff: 'Staff', goal: 'Goal', measuredBy: 'Measured by', result: 'Result (score, trials, %)', prompting: 'Prompting / support', initials: 'Initials',
      keep: '<strong>Confidential student information.</strong> Keep with the student\'s records.', madeWith: 'Made with IEP Glance', fromDoc: (d, x) => ' From the ' + d + ' dated ' + x + '.',
      noAccom: 'No accommodations are switched on. Go back to step 3 to add or turn them on.', noGoals: 'No goals are switched on. Go back to step 3 to add or turn on goals.',
      inPractice: 'In practice'
    },
    es: {
      doc: { iep: 'IEP', '504': 'plan 504' },
      roleFor: { t: 'el maestro de clase', p: 'el paraprofesional', s: 'el maestro suplente o de materias especiales', f: 'la familia' },
      glance: d => 'Resumen del ' + d,
      familyTitle: d => 'Resumen del ' + d + ' para la familia',
      sec: { health: 'Salud y seguridad', strengths: 'Fortalezas y lo que funciona', accom: 'Todos los días en clase', accomS: 'Todos los días', behavior: 'Plan de conducta', testing: 'Exámenes y pruebas', goals: d => 'Metas del ' + d, goalsP: 'Metas en las que usted ayuda', services: 'Servicios y horario', servicesO: 'Servicios y tiempo fuera del salón', personnel: 'Apoyos para el personal' },
      fam: { strengths: 'Fortalezas', accom: 'Lo que el personal hace cada día', testing: 'En los exámenes', behavior: 'Plan de apoyo de conducta', goals: 'Metas para este año', services: 'Servicios que recibe su hijo(a)', health: 'Salud y seguridad' },
      beh: { 'Watch for': 'Esté atento a', 'Often triggered by': 'Suele empezar por', 'Why it happens': 'Por qué ocurre', 'Prevent it': 'Cómo prevenirlo', 'Teach and accept instead': 'Qué enseñar y aceptar en su lugar', 'When it happens': 'Cuando ocurre', 'Reinforce': 'Reforzar', 'Safety plan': 'Plan de seguridad', 'Also in the plan': 'También en el plan' },
      grade: 'Grado', through: d => d.charAt(0).toUpperCase() + d.slice(1) + ' vigente hasta', questions: 'Preguntas', from: 'De', cm: 'la persona encargada del caso',
      signoff: 'Recibí este resumen y sé dónde encontrar el DOC completo.',
      name: 'Nombre', signature: 'Firma', date: 'Fecha',
      conf: '<strong>Información confidencial del estudiante.</strong> Compártala solo con el personal que trabaja con este estudiante. No la deje donde otros puedan leerla.',
      notReplace: d => 'Este resumen no reemplaza el ' + d + '. Si algo aquí es diferente del ' + d + ', siga el ' + d + '.',
      basedOn: (d, x) => ' Basado en el ' + d + ' del ' + x + '.',
      made: 'Hecho el',
      famFoot: d => 'Este es un resumen breve del ' + d + ' de su hijo(a). El ' + d + ' completo es el plan oficial. Puede pedir una reunión para revisarlo en cualquier momento.',
      empty: 'Todavía no hay nada seleccionado para esta hoja. Regrese al paso 3 y elija qué incluir.',
      notTranslated: 'sin traducir',
      log: 'Registro de acomodaciones', weekOf: 'Semana del', teacherClass: 'Maestro / clase', key: 'Marque cada día: <b>✓</b> se dio · <b>R</b> se ofreció, el estudiante no quiso · <b>NA</b> no hizo falta ese día · <b>A</b> estudiante ausente',
      days: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'], accCol: 'Acomodación o apoyo', testsCol: 'En exámenes y pruebas', notes: 'Notas', week: 'semana', teacherSig: 'Firma del maestro',
      goalSheet: 'Hoja de datos de metas', staff: 'Personal', goal: 'Meta', measuredBy: 'Se mide con', result: 'Resultado (puntaje, intentos, %)', prompting: 'Indicaciones / apoyo', initials: 'Iniciales',
      keep: '<strong>Información confidencial del estudiante.</strong> Guárdela con los registros del estudiante.', madeWith: 'Hecho con IEP Glance', fromDoc: (d, x) => ' Del ' + d + ' del ' + x + '.',
      noAccom: 'No hay acomodaciones activadas. Regrese al paso 3 para agregarlas o activarlas.', noGoals: 'No hay metas activadas. Regrese al paso 3 para agregarlas o activarlas.',
      inPractice: 'En la práctica'
    }
  };

  /* ---- phrase list: [English, Spanish] for whole items (case and accents ignored when matching) ---- */
  const PHRASES = [
    ['Preferential seating', 'Asiento preferencial'],
    ['Preferential seating near the teacher', 'Asiento preferencial cerca del maestro'],
    ['Preferential seating near the point of instruction', 'Asiento preferencial cerca de donde se da la clase'],
    ['Preferential seating away from distractions', 'Asiento preferencial lejos de distracciones'],
    ['Flexible seating', 'Asiento flexible'],
    ['Visual schedule', 'Horario visual'], ['Visual schedule on his desk', 'Horario visual en su pupitre'], ['Visual schedule on her desk', 'Horario visual en su pupitre'],
    ['Visual cues', 'Señales visuales'], ['Visual supports', 'Apoyos visuales'], ['Visual timer', 'Temporizador visual'],
    ['Check for understanding', 'Verificar que entendió'],
    ['Check for understanding before independent work', 'Verificar que entendió antes del trabajo independiente'],
    ['Copy of class notes', 'Copia de los apuntes de clase'], ['Copy of class notes or guided notes', 'Copia de los apuntes de clase o apuntes guiados'], ['Guided notes', 'Apuntes guiados'],
    ['Repeated directions', 'Instrucciones repetidas'], ['Directions repeated', 'Instrucciones repetidas'], ['Repeat directions', 'Repetir las instrucciones'],
    ['Directions read aloud', 'Instrucciones leídas en voz alta'], ['Instructions read aloud', 'Instrucciones leídas en voz alta'],
    ['Read aloud', 'Lectura en voz alta'], ['Oral administration', 'Lectura en voz alta de la prueba'], ['Test read aloud', 'Prueba leída en voz alta'], ['Questions read aloud', 'Preguntas leídas en voz alta'],
    ['Small group', 'Grupo pequeño'], ['Small group administration', 'Administración en grupo pequeño'], ['Small group testing', 'Pruebas en grupo pequeño'], ['Small-group setting', 'Grupo pequeño'],
    ['Separate setting', 'Lugar separado'], ['Separate location', 'Lugar separado'],
    ['Breaks', 'Descansos'], ['Frequent breaks', 'Descansos frecuentes'], ['Breaks as needed', 'Descansos cuando los necesite'], ['Movement breaks', 'Descansos con movimiento'],
    ['Graphic organizers', 'Organizadores gráficos'], ['Graphic organizer', 'Organizador gráfico'], ['Word bank', 'Banco de palabras'], ['Sentence starters', 'Iniciadores de oraciones'],
    ['Calculator', 'Calculadora'], ['Use of calculator', 'Uso de calculadora'], ['Multiplication chart', 'Tabla de multiplicar'],
    ['Spell check', 'Corrector ortográfico'], ['Spellcheck', 'Corrector ortográfico'],
    ['Speech-to-text', 'Dictado por voz (voz a texto)'], ['Text-to-speech', 'Lectura por computadora (texto a voz)'],
    ['Scribe', 'Escribiente (otra persona escribe lo que el estudiante dicta)'],
    ['Reduced assignments', 'Tareas reducidas'], ['Shortened assignments', 'Tareas más cortas'], ['Modified assignments', 'Tareas modificadas'], ['Alternate assignments', 'Tareas alternativas'], ['Modified grading', 'Calificación modificada'],
    ['Reduced number of answer choices', 'Menos opciones de respuesta'],
    ['Reduce distractions', 'Reducir las distracciones'], ['Reduce distractions to the student', 'Reducir las distracciones para el estudiante'], ['Reduced distractions', 'Menos distracciones'],
    ['Noise-canceling headphones', 'Audífonos con cancelación de ruido'], ['Headphones', 'Audífonos'],
    ['Fidget tool', 'Objeto antiestrés'], ['Fidgets', 'Objetos antiestrés'],
    ['Wait time', 'Tiempo de espera'], ['Extra wait time', 'Tiempo de espera adicional'],
    ['Chunk assignments', 'Dividir las tareas en partes'], ['Chunking', 'Dividir el trabajo en partes'],
    ['Large print', 'Letra grande'], ['Oral responses', 'Respuestas orales'], ['Answer orally', 'Responder oralmente'], ['Alternate response options', 'Otras formas de responder'],
    ['Assistive technology', 'Tecnología de asistencia'],
    ['Individualized structured reminders', 'Recordatorios estructurados individuales'], ['Structured reminders', 'Recordatorios estructurados'],
    ['Positive reinforcement', 'Refuerzo positivo'], ['Verbal praise', 'Elogios verbales'], ['Peer buddy', 'Compañero de apoyo'],
    ['Warning before transitions', 'Aviso antes de las transiciones'], ['Preview schedule changes', 'Avisar de antemano los cambios de horario'],
    ['First-then board', 'Tablero de "primero-después"'], ['Behavior chart', 'Tabla de conducta'], ['Daily check-in', 'Registro diario con un adulto'], ['Check-in/check-out', 'Entrada y salida con un adulto'],
    ['Access to water', 'Acceso a agua'], ['Restroom access', 'Permiso para ir al baño'], ['Restroom breaks as needed', 'Ir al baño cuando lo necesite'],
    ['Use of manipulatives', 'Uso de materiales manipulativos'], ['Manipulatives', 'Materiales manipulativos'],
    ['Communication device available at all times', 'Dispositivo de comunicación disponible en todo momento'],
    ['Checks for understanding', 'Verificar que entendió'], ['Checking for understanding of directions', 'Verificar que entendió las instrucciones'],
    ['Check for understanding after directions are given', 'Verificar que entendió después de dar las instrucciones'],
    ['Copy of teacher notes or guided notes', 'Copia de los apuntes del maestro o apuntes guiados'],
    ['Directions read aloud and repeated', 'Instrucciones leídas en voz alta y repetidas'], ['Directions repeated and clarified', 'Instrucciones repetidas y aclaradas'],
    ['Frequent feedback', 'Comentarios frecuentes'], ['Refocusing and redirection', 'Ayuda para volver a concentrarse'],
    ['Seat away from doors and windows', 'Sentar al estudiante lejos de puertas y ventanas'], ['Visual checklist for multi-step tasks', 'Lista visual para tareas de varios pasos'],
    ['Word bank for vocabulary tests', 'Banco de palabras para las pruebas de vocabulario'], ['Shortened instructions (1-2 steps)', 'Instrucciones cortas (1 o 2 pasos)'],
    ['Graphic organizers for writing', 'Organizadores gráficos para la escritura'], ['Graphic organizers for writing tasks', 'Organizadores gráficos para tareas de escritura'],
    ['Short breaks when needed', 'Descansos cortos cuando los necesite'], ['Text-to-speech for content-area reading', 'Texto a voz para la lectura en las materias'],
    ['Use of a calculator', 'Uso de calculadora'], ['Use a visual timer for transitions', 'Usar un temporizador visual en las transiciones'],
    ['Errorless learning', 'Aprendizaje sin errores'], ['Behavior management', 'Manejo de la conducta'], ['Social skills training', 'Entrenamiento en habilidades sociales'],
    ['Structured learning', 'Aprendizaje estructurado'], ['Training for implementation of the student\'s IEP', 'Capacitación para aplicar el IEP del estudiante'],
    ['Clearly defined/consistent limits', 'Límites claros y constantes'], ['Alternative curriculum', 'Currículo alternativo'],
    ['Shorter writing assignments', 'Tareas de escritura más cortas'], ['Speech-to-text dictation program for writing', 'Programa de dictado por voz para escribir'],
    ['Extended time', 'Tiempo adicional']
  ];
  // details printed in parentheses after an item, and the contexts in "Extended time on ..."
  const BITS = [
    ['as needed', 'según sea necesario'], ['daily', 'a diario'], ['all classes', 'todas las clases'], ['core classes', 'clases principales'], ['all settings', 'todos los lugares'],
    ['classroom', 'salón de clases'], ['educational environment', 'entorno escolar'], ['all assignments', 'todas las tareas'], ['all subjects', 'todas las materias'],
    ['classwork', 'el trabajo de clase'], ['assignments', 'las tareas'], ['tests', 'las pruebas'], ['quizzes', 'las pruebas cortas'], ['state tests', 'los exámenes estatales'],
    ['classwork and tests', 'el trabajo de clase y las pruebas'], ['classwork and quizzes', 'el trabajo de clase y las pruebas cortas'], ['assignments and tests', 'las tareas y las pruebas'],
    ['tests and quizzes', 'las pruebas y las pruebas cortas'], ['tests and assignments', 'las pruebas y las tareas'], ['homework', 'la tarea para la casa'],
    ['math', 'matemáticas'], ['reading and writing', 'lectura y escritura'], ['reading and math', 'lectura y matemáticas'], ['reading', 'lectura'], ['writing', 'escritura'], ['all academic classes', 'todas las clases académicas'],
    ['1.5 times', '1.5 veces'], ['time and a half', 'tiempo y medio'], ['2 times', 'el doble'], ['double', 'el doble'], ['double time', 'el doble de tiempo']
  ];
  const key = s => fold(s).toLowerCase().replace(/[.;:!]+$/, '').replace(/\s+/g, ' ').trim();
  const maps = { en: {}, es: {} }, bits = { en: {}, es: {} };
  PHRASES.forEach(([e, s]) => { maps.en[key(e)] = s; if (!maps.es[key(s)]) maps.es[key(s)] = e; });
  BITS.forEach(([e, s]) => { bits.en[key(e)] = s; [key(s), key(s).replace(/\b(el|la|los|las) /g, '')].forEach(k => { if (!bits.es[k]) bits.es[k] = e; }); });
  // a detail in parentheses, with numbers ("6 hours") handled
  function bit(p, from) {
    if (bits[from][p]) return bits[from][p];
    const m = p.match(/^(\d+(?:\.\d+)?) (hours?|minutes?|horas?|minutos?)$/); if (!m) return null;
    const u = { hour: 'hora', hours: 'horas', minute: 'minuto', minutes: 'minutos', hora: 'hour', horas: 'hours', minuto: 'minute', minutos: 'minutes' }[m[2]];
    return m[1] + ' ' + u;
  }

  // translate a whole item from one language to the other, or return null
  function phrase(text, from) {
    const k = key(text); if (!k) return null;
    if (maps[from][k]) return maps[from][k];
    // trailing details in parentheses: "Visual cues (educational environment)"
    let m = k.match(/^(.+?) \(([^()]+)\)$/);
    if (m && maps[from][m[1]]) { const parts = m[2].split(/; /).map(p => bit(p, from)); if (parts.every(Boolean)) return maps[from][m[1]] + ' (' + parts.join('; ') + ')'; }
    // "Extended time (1.5 times) on classwork and quizzes" / "Tiempo adicional (1.5 veces) en tareas y pruebas"
    m = from === 'en' ? k.match(/^extended time(?: \(([^()]+)\))?(?: (?:on|for) ([^()]+?))?(?: \(([^()]+)\))?$/) : k.match(/^tiempo adicional(?: \(([^()]+)\))?(?: (?:en|para) ([^()]+?))?(?: \(([^()]+)\))?$/);
    if (m) {
      const amt = m[1] && (bits[from][m[1]] || (from === 'es' ? bits.es[m[1]] : null)), ctx = m[2] && (bits[from][m[2]] || bits[from][m[2].replace(/^(el|la|los|las) /, '')]), det = m[3] && bits[from][m[3]];
      if ((m[1] && !amt) || (m[2] && !ctx) || (m[3] && !det)) return null;
      return from === 'en' ? 'Tiempo adicional' + (amt ? ' (' + amt + ')' : '') + (ctx ? ' en ' + ctx : '') + (det ? ' (' + det + ')' : '')
        : 'Extended time' + (amt ? ' (' + amt + ')' : '') + (ctx ? ' on ' + ctx.replace(/^(the) /, '') : '') + (det ? ' (' + det + ')' : '');
    }
    return null;
  }

  // services: built from the parsed name, frequency and place
  const SERVICES = [
    ['Speech-language therapy', 'Terapia del habla y lenguaje'], ['Speech and language therapy', 'Terapia del habla y lenguaje'], ['Speech therapy', 'Terapia del habla'],
    ['Language and speech', 'Habla y lenguaje'], ['Occupational therapy', 'Terapia ocupacional'], ['Physical therapy', 'Terapia física'], ['Counseling', 'Consejería'],
    ['Specialized academic instruction', 'Instrucción académica especializada'], ['Specialized reading instruction', 'Instrucción especializada en lectura'],
    ['Resource room', 'Salón de recursos'], ['Behavior intervention services', 'Servicios de intervención de conducta'], ['Special education teacher support services', 'Servicios de apoyo del maestro de educación especial']
  ];
  const svcMap = { en: {}, es: {} };
  SERVICES.forEach(([e, s]) => { svcMap.en[key(e)] = s; svcMap.es[key(s)] = e; });
  function service(svc, from, to) {
    if (!svc || !svc.name) return null;
    let name = key(svc.name), extra = '';
    const pm = name.match(/^(.+?) (\([^()]+\))$/); if (pm && svcMap[from][pm[1]]) { name = pm[1]; extra = ' ' + (bits[from][pm[2].slice(1, -1)] ? '(' + bits[from][pm[2].slice(1, -1)] + ')' : ''); if (extra === ' ') return null; }
    const nm = svcMap[from][name]; if (!nm) return null;
    // frequency and length in a neutral form
    let n = null, per = null, every = null, mins = null;
    const f = String(svc.freq || ''), d = String(svc.dur || '');
    let m;
    if ((m = f.match(/^(\d+)x\/(week|day|month)$/))) { n = m[1]; per = m[2]; }
    else if ((m = f.match(/^(\d+) times? a (week|day|month|year)$/))) { n = m[1]; per = m[2]; }
    else if (/^(daily|weekly|monthly)$/.test(f)) every = f;
    else if (/^a (week|day|month)$/.test(f)) every = { week: 'weekly', day: 'daily', month: 'monthly' }[f.slice(2)];
    if ((m = d.match(/^(\d+)/))) mins = m[1];
    const bitsOut = [];
    if (to === 'es') {
      if (n) bitsOut.push(n + (n === '1' ? ' vez ' : ' veces ') + { week: 'por semana', day: 'al día', month: 'al mes', year: 'al año' }[per]);
      else if (every) bitsOut.push({ daily: 'todos los días', weekly: 'cada semana', monthly: 'cada mes' }[every]);
      if (mins) bitsOut.push(mins + ' minutos' + (n ? ' cada vez' : ''));
      return nm + extra + (bitsOut.length ? ': ' + bitsOut.join(', ') : '') + (svc.inClass === true ? ' · en el salón de clases' : svc.inClass === false ? ' · fuera del salón' : '');
    }
    if (n) bitsOut.push(n + (n === '1' ? ' time a ' : ' times a ') + per);
    else if (every) bitsOut.push(every);
    if (mins) bitsOut.push(mins + ' minutes' + (n ? ' each' : ''));
    return nm + extra + (bitsOut.length ? ': ' + bitsOut.join(', ') : '') + (svc.inClass === true ? ' · in the general education classroom' : svc.inClass === false ? ' · outside the classroom' : '');
  }

  // the wording of an item on a sheet in language L: { text, ok }
  function itemText(it, L) {
    const from = it.lang || 'en';
    if (from === L) return { text: it.plain, ok: true };
    if (it.tr && it.tr[L] && it.tr[L].trim()) return { text: it.tr[L].trim(), ok: true };
    if (it.cat === 'services') { const s = service(it.svc, from, L); if (s) return { text: s, ok: true, auto: true }; }
    const p = phrase(it.plain, from) || (it.text !== it.plain ? phrase(it.text, from) : null);
    if (p) return { text: p, ok: true, auto: true };
    return { text: it.plain, ok: false };
  }

  const api = { T, itemText, phrase, fold };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.IEPLang = api;
})(typeof self !== 'undefined' ? self : this);
