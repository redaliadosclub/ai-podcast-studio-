import { TeleprompterScriptItem } from '../types';

export const TELEPROMPTER_SCRIPTS: TeleprompterScriptItem[] = [
  {
    id: 'script-narrative-01',
    title: 'Gancho Narrativo: La Historia Inesperada',
    register: 'narrative',
    categoryName: 'Storytelling y Calidez',
    durationTargetSec: 35,
    emotionLabel: 'Cálido, intrigante y pausado',
    phoneticPurpose: 'Captura el registro medio-grave, resonancia pectoral y pausas de suspenso.',
    generalDirectorNote: 'Imagina que estás en una sala a media luz contándole una anécdota fascinante a un viejo amigo. No te apresures; deja que cada palabra respire.',
    sentences: [
      {
        text: 'Hay días en los que crees tener el control absoluto de las cosas...',
        cue: 'Inicia con voz relajada, tono medio y una leve sonrisa interior.',
        emphasisWords: ['control absoluto'],
      },
      {
        text: 'Hasta que, de pronto, una llamada telefónica de tres minutos lo cambia absolutamente todo.',
        cue: 'Aumenta sutilmente la intensidad en "de pronto" y baja el tono en "todo".',
        emphasisWords: ['de pronto', 'absolutamente todo'],
      },
      {
        text: 'Me quedé en silencio mirando por la ventana... preguntándome qué demonios íbamos a hacer ahora.',
        cue: 'Haz una pausa de 1 segundo en los puntos suspensivos. Suelta un hilo de aire suave.',
        emphasisWords: ['silencio', 'qué demonios'],
      },
      {
        text: 'Y justo ahí, en medio de esa incertidumbre, fue donde nació la idea de este podcast.',
        cue: 'Vuelve a un tono más luminoso y cercano, conectando directamente con el oyente.',
        emphasisWords: ['nació la idea'],
      },
    ],
  },
  {
    id: 'script-energy-02',
    title: 'Energía y Entusiasmo: El Gran Salto',
    register: 'energy',
    categoryName: 'Dinamismo y Pasión',
    durationTargetSec: 30,
    emotionLabel: 'Entusiasta, inspirador y contundente',
    phoneticPurpose: 'Extrae los armónicos agudos de tu voz, modulación ascendente y velocidad conversacional alta.',
    generalDirectorNote: 'Gesticula con las manos abiertas. La emoción física se transfiere directamente al timbre vocal. Mantén el aire en el diafragma sin tensar el cuello.',
    sentences: [
      {
        text: '¡Bienvenidos de nuevo! Hoy tengo entre manos un tema que literalmente me ha quitado el sueño esta semana.',
        cue: 'Arranca con energía alta, sonrisa amplia y proyección hacia adelante.',
        emphasisWords: ['Bienvenidos', 'literalmente'],
      },
      {
        text: 'Porque lo que estamos presenciando no es un cambio menor: ¡es una transformación absoluta de las reglas del juego!',
        cue: 'Eleva el volumen un 15% en "transformación absoluta". Marca el ritmo con determinación.',
        emphasisWords: ['transformación absoluta', 'reglas del juego'],
      },
      {
        text: 'Si alguna vez pensaste que era imposible aprender esto en semanas, prepárate, porque hoy vamos a romper ese mito por completo.',
        cue: 'Tono desafiante pero cómplice. Termina con convicción rotunda.',
        emphasisWords: ['romper ese mito', 'por completo'],
      },
    ],
  },
  {
    id: 'script-explanatory-03',
    title: 'Análisis Conceptual: Explicación Didáctica',
    register: 'explanatory',
    categoryName: 'Claridad y Precisión',
    durationTargetSec: 40,
    emotionLabel: 'Articulado, seguro y reflexivo',
    phoneticPurpose: 'Equilibrio fonético de consonantes oclusivas (P, T, K, B, D, G) y sibilantes (S, Z) en español.',
    generalDirectorNote: 'Habla como un mentor que disfruta explicando la lógica detrás de algo fascinante. Dibuja los conceptos en el aire mientras hablas.',
    sentences: [
      {
        text: 'Vamos a descomponer esto en tres partes fundamentales para entenderlo sin rodeos.',
        cue: 'Ritmo estable, dicción muy limpia en cada consonante.',
        emphasisWords: ['tres partes fundamentales', 'sin rodeos'],
      },
      {
        text: 'Primero: la mayoría de la gente confunde la herramienta con el resultado real.',
        cue: 'Haz una pequeña pausa tras "Primero:". Mantén una entonación pedagógica.',
        emphasisWords: ['Primero', 'herramienta', 'resultado real'],
      },
      {
        text: 'Segundo: ¿por qué ocurre esto? Principalmente por la falta de un sistema predecible y medible.',
        cue: 'Entonación interrogativa clara en la pregunta; respuesta firme en "Principalmente".',
        emphasisWords: ['por qué ocurre', 'predecible y medible'],
      },
      {
        text: 'Y tercero... cuando logras alinear ambas piezas, el esfuerzo diario se reduce a la mitad.',
        cue: 'Pausa reflexiva antes de "cuando logras". Cierra con tono de certeza comprobada.',
        emphasisWords: ['ambas piezas', 'la mitad'],
      },
    ],
  },
  {
    id: 'script-intimate-04',
    title: 'Intimidad y Confidencia: La Verdad Incómoda',
    register: 'intimate',
    categoryName: 'Reflexión Profunda',
    durationTargetSec: 35,
    emotionLabel: 'Íntimo, pausado y vulnerable',
    phoneticPurpose: 'Captura el aire subglótico, pausas de respiración y proximidad acústica.',
    generalDirectorNote: 'Acércate dos centímetros más al micrófono. Baja el volumen a un susurro controlado. Imagina que es la 1:00 AM y estás compartiendo una verdad que pocos admiten.',
    sentences: [
      {
        text: 'Te soy completamente sincero... durante mucho tiempo sentí que estaba fingiendo.',
        cue: 'Voz suave, casi susurrada. Deja escapar una pequeña respiración al inicio.',
        emphasisWords: ['completamente sincero', 'fingiendo'],
      },
      {
        text: 'Veía a todo el mundo avanzar tan rápido en redes, mientras yo dudaba de cada paso que daba.',
        cue: 'Cadencia más lenta. Transmite honestidad sin dramatismo exagerado.',
        emphasisWords: ['avanzar tan rápido', 'dudaba'],
      },
      {
        text: 'Pero aprendí algo crucial: la seguridad no llega antes de actuar; se construye exactamente en el camino.',
        cue: 'Inflexión ascendente sutil de esperanza y sabiduría ganada.',
        emphasisWords: ['algo crucial', 'en el camino'],
      },
    ],
  },
  {
    id: 'script-conversational-05',
    title: 'Cierre y Conexión: Despedida de Podcast',
    register: 'conversational',
    categoryName: 'Cercanía y Despedida',
    durationTargetSec: 30,
    emotionLabel: 'Espontáneo, agradecido y simpático',
    phoneticPurpose: 'Modulación de despedida, inflexión melódica y cadencia natural de podcast.',
    generalDirectorNote: 'Despídete como si estuvieras tomándote un café con tus oyentes. Termina con un tono optimista que deje ganas de escuchar el próximo episodio.',
    sentences: [
      {
        text: 'Bueno, hasta aquí llegamos por hoy, ¡que no ha sido poco!',
        cue: 'Inicia con un tono ligero y distendido. Puedes dejar escapar una pequeña risa relajada.',
        emphasisWords: ['hasta aquí llegamos', 'no ha sido poco'],
      },
      {
        text: 'Si lo que escuchaste te ha hecho reflexionar o te ha servido de algo, compártelo con esa persona que sabes que lo necesita.',
        cue: 'Tono de agradecimiento genuino y recomendación amistosa.',
        emphasisWords: ['reflexionar', 'compártelo'],
      },
      {
        text: 'Cuídate mucho, disfruta de tu semana, y nos escuchamos muy pronto en el próximo episodio.',
        cue: 'Cierre melódico y cálido. Deja 2 segundos de silencio al final antes de cortar.',
        emphasisWords: ['Cuídate mucho', 'nos escuchamos muy pronto'],
      },
    ],
  },
];
