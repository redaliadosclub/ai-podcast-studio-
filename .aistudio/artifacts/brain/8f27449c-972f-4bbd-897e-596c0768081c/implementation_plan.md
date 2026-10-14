# Estudio y Director Vocal de Clonación para Podcasts (VoiceLab Coach)

Una plataforma interactiva que actúa como **Director Experto de Clonación Vocal**, guiándote paso a paso en la grabación de fragmentos de audio estratégicamente diseñados para entrenar tu modelo de voz en ElevenLabs y lograr que la IA hable con tu entonación natural en tus podcasts.

## Decisiones Críticas y Preferencias Confirmadas

> [!IMPORTANT]
> **Rol y Enfoque Central**: Actuar como Director Vocal de IA. La aplicación no es solo una grabadora simple, sino un **estudio de entrenamiento y teleprómter dirigido** que te indica exactamente:
> 1. **Cómo hablar físicamente**: Distancia al micro, ángulo anti-popeo, respiración diafragmática, modulación y energía conversacional.
> 2. **Qué frases exactas decir**: Guiones clasificados por registros emocionales (narrativo, enérgico, reflexivo, explicativo y transicional) para capturar todo tu rango tímbrico y prosódico.
> 3. **Cómo configurar ElevenLabs**: Ajuste de `Stability` (35%-50%), `Clarity` (75%-85%) y técnicas de puntuación para podcasts.

---

## 1. Guía del Director Vocal: Metodología de Grabación

### A. Técnica Acústica y Corporal (Cómo Hablar)
- **Distancia y Ángulo**: 15 a 20 cm del micrófono, apuntando a la comisura de la boca (45°) para evitar que el aire directo de las letras "P" y "B" sature la cápsula.
- **Acústica de Habitación**: Evitar habitaciones vacías con eco. Grabar cerca de cortinas, un armario con ropa o una estantería de libros para absorber reflexiones.
- **Energía y Sonrisa Vocal**: Hablar proyectando hacia un oyente real a 1 metro de distancia. La IA clona la energía con la que grabas: si lees con voz plana o monótona, el podcast generado sonará robótico; si sonríes y gesticulas, la voz adquiere brillo natural.
- **Respiraciones Naturales**: No cortes tus respiraciones al hablar; déjalas fluir. Los modelos de clonación necesitan aprender tus patrones de pausa e inhalación.

### B. Los 5 Registros Fonéticos Esenciales (Qué Frases Decir)
El teleprómter guiado del estudio incluye 5 categorías de frases calibradas:
1. **Registro Narrativo / Storytelling**: Ritmo pausado, tono cálido y envolvente para introducciones y anécdotas.
2. **Registro de Entusiasmo y Energía**: Frases con énfasis marcado, volumen ascendente y afirmaciones contundentes.
3. **Registro Explicativo y Analítico**: Dicción clara, cadencia estructurada y preguntas retóricas para desglosar conceptos complejos.
4. **Registro Reflexivo e Íntimo**: Tono confidencial, velocidad más lenta y pausas deliberadas.
5. **Registro Conversacional y Transiciones**: Despedidas, llamadas a la acción, muletillas naturales y cierres de bloque.

---

## 2. Experiencia de Usuario y Diseño del Estudio

### Navegación y Estructura (SaaS Audio Studio)
- **Barra Superior (Top Bar Contract)**: Marca (`VoiceLab Coach`), navegación de 4 módulos (`Teleprómter Dirigido`, `Taller Acústico & Mic`, `Editor de Guiones & Prosodia`, `Generador de Podcasts ElevenLabs`) y botón de acción (`Iniciar Grabación`).
- **Paleta de Colores**: Interfaz oscura de consola de audio en Dark Slate (`#0b0f17`) y superficie `#111827`, con violeta/índigo (`#6366f1`) para directivas de voz y verde esmeralda (`#10b981`) para el estado de grabación activa.
- **Tipografía y Métricas**: `Plus Jakarta Sans` con datos mono (`font-mono tabular-nums`) para decibelios (VU Meter), duración de toma y conteo fonético.
- **Cero Pills Decorativas**: Metadatos limpios separados tipográficamente por `·`.

### Módulos Principales:
1. **Teleprómter de Grabación Guiada (Vocal Director)**:
   - Selector de registro de voz con guiones listos para leer en voz alta.
   - Indicador dinámico de dirección actoral sobre cada frase: *"(Sonríe aquí)", "(Baja el tono)", "(Haz una pausa de 1 segundo)", "(Sube la intensidad)"*.
   - Grabador en tiempo real con VU meter (medidor de volumen en dB) y visualizador de forma de onda.
   - Evaluación inmediata de la toma: nivel de ganancia, presencia de silencios y duración óptima (20 a 45 segundos por fragmento).
2. **Biblioteca de Muestras y Empaquetador para ElevenLabs**:
   - Lista de tomas grabadas con preescucha, retoma y eliminación.
   - Botón de descarga individual (WAV 44.1kHz) o empaquetador del lote de entrenamiento recomendado (3 a 5 tomas de alta calidad).
3. **Guía Interactiva de Calibración en ElevenLabs**:
   - Dónde subir las muestras en ElevenLabs VoiceLab (Instant Voice Cloning).
   - Simulador interactivo de sliders: `Stability` (por qué 40% suena humano y 75% suena a GPS), `Similarity Boost` (80%), `Style Exaggeration` (10%).
   - Secretos de puntuación en guiones: comas dobles para respiraciones, puntos suspensivos para dudas orgánicas.
4. **Editor de Guiones con Marcas de Entonación y Generador de Podcasts**:
   - Redactor de guiones asistido por IA (`gemini-3.8-flash`) para estructurar episodios temáticos.
   - Barra de herramientas de prosodia para insertar énfasis y silencios en el guion.
   - Consola de síntesis con ElevenLabs (mediante tu API Key y Voice ID) y preescucha nativa para afinar el texto.

---

## 3. Arquitectura Técnica y Estrategia de Datos

```
┌────────────────────────────────────────────────────────────────────────┐
│                     VoiceLab Coach Frontend                            │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ Teleprómter Guía  │ Gestor de Muestras│  Editor de Guiones & Prosodia  │
│ (Vocal Directing) │  (WAV Export)     │  (Marcas de Entonación)        │
└─────────┬─────────┴─────────┬─────────┴────────────────┬───────────────┘
          │                   │                          │
          ▼                   ▼                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│             Backend API Proxy (/api/script & /api/elevenlabs)          │
├────────────────────────────────────────────────────────────────────────┤
│ • /api/script/generate: Guiones de podcast con marcas de entonación    │
│ • /api/elevenlabs/synthesize: Generación de audio con voz clonada      │
│ • /api/tts/preview: Preescucha de prueba con Gemini TTS                │
└────────────────────────────────────────────────────────────────────────┘
```

- **Audio en Navegador**: `MediaRecorder` a 44.1kHz / 48kHz sin compresión agresiva, `AudioContext` con `AnalyserNode` para medidor VU y visualizador de onda.
- **Persistencia**: `localStorage` guarda tus tomas grabadas, preferencias de micrófono y borradores de episodios.

---

## 4. Plan de Ejecución Paso a Paso

1. **Configuración de Metadatos y Estructura**:
   - Ajustar `metadata.json` y sincronizar títulos y descripciones en `index.html`.
2. **Servidor Backend Express**:
   - Configurar `server.ts` con proxies seguros para generación de guiones (`gemini-3.8-flash`), preescucha (`gemini-3.8-flash-tts`) y ElevenLabs.
3. **Teleprómter de Dirección Vocal y Grabador Acústico**:
   - Crear el componente de teleprómter con guiones fonéticamente ricos organizados por registros (narrativo, enérgico, reflexivo, explicativo).
   - Integrar medidor de volumen VU, canvas de ondas y directivas actorales en pantalla.
4. **Gestor y Empaquetador de Muestras para ElevenLabs**:
   - Panel de tomas grabadas, reproductor integrado y descarga de archivos WAV limpios para subir a VoiceLab.
5. **Guía Interactiva de Parámetros de ElevenLabs**:
   - Simulador visual de Stability vs Clarity y guía de puntuación anti-robótica.
6. **Editor de Guiones de Podcast y Estudio de Síntesis**:
   - Editor de texto enriquecido con marcas de prosodia, generador de episodios con IA y conector para síntesis de audio.
7. **Verificación y Compilación**:
   - Ejecutar `compile_applet` y comprobar que todo funcione sin errores.
