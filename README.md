# 🎙️ VoiceLab Coach
### *Estudio de Dirección Vocal, Clonación de Voz con IA y Generación de Podcasts Hipernaturales*

[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.x-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Google Gemini API](https://img.shields.io/badge/Gemini%20API-3.8%20Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![ElevenLabs](https://img.shields.io/badge/ElevenLabs-Voice%20Cloning-FF6B00)](https://elevenlabs.io/)
[![F5-TTS & XTTS](https://img.shields.io/badge/Open%20Source-F5--TTS%20%7C%20XTTS-10b981)](https://github.com/SWivid/F5-TTS)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📌 ¿Qué es VoiceLab Coach?

El 90% de las voces clonadas con Inteligencia Artificial suenan planas, robóticas o sin alma. **VoiceLab Coach** resuelve este problema actuando como tu **Director Vocal y Estudio de Producción asistido por IA**.

Diseñado para creadores de contenido, podcasters, agencias y educadores, VoiceLab Coach guía al usuario a través de un **recorrido interactivo en 5 fases** para:

1. **Calibrar y grabar muestras vocales limpias** con fonemas balanceados usando un teleprómter interactivo con medidor VU en tiempo real (dB) y analizador acústico.
2. **Gestionar y exportar muestras en WAV 44.1kHz** sin compresión destructiva, listas para entrenamiento instantáneo.
3. **Guiar la clonación vocal** paso a paso (ElevenLabs, F5-TTS / XTTS Open-Source y Gemini TTS).
4. **Escribir guiones profesionales con Gemini 3.8 Flash**, incorporando diagnóstico de prosodia y análisis de sentimientos en tiempo real que sugiere marcadores afectivos ([Emocionado], [Reflexivo], [Íntimo]).
5. **Sintetizar el episodio final**:
   - **Opción C (Integrada en la App):** Clonación Zero-Shot en español conectando directamente tu muestra grabada con alineación fonética en español.
   - **ElevenLabs API:** Síntesis comercial con tu voiceId y parámetros calibrados (Estabilidad 42%, Claridad 82%, Estilo 12%).
   - **Gemini TTS Express:** Preescucha gratuita con 5 timbres vocales para verificar ritmo y pausas sin gastar cuota.
   - **Exportación Multi-formato:** Descarga del podcast producido en audio WAV/MP3 y del guion técnico en .txt o .pdf maquetado para locución.

---

## 🚀 El Recorrido en 5 Pasos (Guided Pipeline)

Pipeline:
[01. Teleprómter Dirigido] -> [02. Gestor WAV] -> [03. Guía de Clonación] -> [04. Guion & Sentimientos] -> [05. Estudio de Síntesis]

- **Paso 1 — Teleprómter con Coaching Vocal:** 5 registros emocionales (narrativa, entusiasmo, explicación, intimidad y conversación). Las directivas de voz en pantalla indican cuándo sonreír, proyectar o susurrar. Medidor de decibelios y detector de saturación (clipping).
- **Paso 2 — Gestor de Muestras Acústicas:** Verificación de tiempo acumulado (>60 segundos para Instant Voice Cloning de alta calidad) y descarga de archivos WAV 44.1kHz / 16-bit PCM.
- **Paso 3 — Masterclass de Clonación:** Checklist interactivo para configurar modelos multilingües, evitar artefactos metálicos y calibrar sliders para habla humana.
- **Paso 4 — Editor de Guiones y Análisis de Sentimientos:**
  - Redactor de guiones con estructura de podcast (gancho, introducción, desarrollo, llamada a la acción).
  - Puntuación actoral con pausas (...), incisos (--) y respiraciones (<breath>).
  - **Análisis de Sentimientos con Gemini:** Diagnóstico afectivo que inyecta automáticamente etiquetas emocionales ([Reflexivo], [Emocionado], [Enérgico]) en las oraciones clave.
- **Paso 5 — Estudio de Síntesis y Masterización (Opción C):**
  - Selector directo de tus tomas de audio del Paso 1.
  - Sincronización del texto de referencia (ref_text) en español para garantizar pronunciación nativa.
  - Generación de audio en 1 clic y exportación de guion a .txt y .pdf.

---

## 🧠 ¿Por qué fallaba F5-TTS en Google Colab y cómo se soluciona?

Si probaste clonar tu voz con F5-TTS o el notebook Spanish-F5.ipynb y te devolvió el audio en inglés o arrojó advertencias de paquetes en Google Colab, aquí tienes la explicación técnica y la solución definitiva:

### 1. ¿Por qué el audio salía en inglés?
F5-TTS es un modelo de difusión zero-shot entrenado primariamente en inglés y chino (dataset Emilia). Para que sintetice en **español nativo**, es un requisito indispensable:
- **Audio de referencia:** Una muestra tuya limpia de 6 a 12 segundos hablando en español.
- **Texto de referencia (ref_text):** Debes escribir **exactamente** lo que dices en el audio en español. Si este campo se deja en blanco o con texto en inglés, el modelo forzará fonemas anglosajones.
- *VoiceLab Coach (Opción C) automatiza esto al sincronizar el texto del teleprómter con la muestra grabada.*

### 2. ¿Qué significa el conflicto de paquetes en Google Colab (numpy 1.26 vs numpy 2.x)?
Google Colab actualizó su entorno a numpy >= 2.0. Las librerías de IA generativa de audio (torch, diffusers, f5-tts) requieren numpy 1.26.4.
- Los mensajes rojos de ERROR: pip's dependency resolver... son advertencias de paquetes secundarios no utilizados (como geopandas o shap).
- **El paso obligatorio:** Cuando pip termina, verás:
  WARNING: You must restart the runtime in order to use newly installed versions.
  **Solución:** Ve al menú superior de Colab: **Entorno de ejecución > Reiniciar sesión** (Runtime > Restart session). Luego ejecuta la celda de síntesis sin reinstalar.
- *VoiceLab Coach incluye un botón para descargar el Cuaderno Colab 1-Clic ya reparado con la secuencia limpia y soporte para Coqui XTTS v2.*

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
| :--- | :--- |
| **Frontend** | React 19, TypeScript 5, Vite |
| **Estilos & UI** | Tailwind CSS 4, Lucide Icons |
| **Backend / API** | Node.js 20+, Express, tsx |
| **Modelos de IA** | gemini-3.8-flash (Guiones, prosodia y sentimientos), gemini-3.8-flash-tts (Audio express) |
| **Motores de Clonación** | ElevenLabs (eleven_multilingual_v2), F5-TTS Zero-Shot, Coqui XTTS v2 |
| **Generación Documental** | jsPDF para maquetación y descarga de guiones PDF en el navegador |

---

## 📂 Estructura del Proyecto

- .env.example: Plantilla de variables de entorno (sin secretos)
- .gitignore: Exclusión de node_modules, .env, dist, bun.lock
- index.html: Punto de entrada HTML con SEO y metadata
- metadata.json: Configuración y capacidades del proyecto
- package.json: Dependencias del proyecto
- server.ts: Servidor Express con endpoints de IA y proxy seguro
- tsconfig.json: Configuración de TypeScript
- vite.config.ts: Configuración de empaquetador Vite
- src/
  - App.tsx: Orquestador del flujo y estado global
  - main.tsx: Montaje React 19
  - index.css: Estilos Tailwind CSS globales
  - types/: Definiciones de tipos TypeScript
  - data/: Guiones fonéticos calibrados para el teleprómter
  - utils/: Procesamiento de audio Web Audio API y WAV encoder
  - components/:
    - Header.tsx: Barra superior con navegación y guía
    - GuidedStepperBanner.tsx: Barra de progreso y recorrido guiado
    - TeleprompterView.tsx: Teleprómter con grabación y VU meter
    - SamplesManagerView.tsx: Gestor de muestras WAV 44.1kHz
    - ElevenLabsGuideView.tsx: Guía interactiva de clonación
    - PodcastScriptEditorView.tsx: Editor con análisis de prosodia y sentimientos
    - ProductionStudioView.tsx: Estudio de síntesis (Opción C, ElevenLabs, Gemini)
    - UserGuideModal.tsx: Manual del creador y modelos de negocio

---

## ⚙️ Instalación y Configuración Local

1. Clonar el repositorio:
   git clone https://github.com/TU_USUARIO/voicelab-coach.git
   cd voicelab-coach

2. Instalar dependencias:
   npm install

3. Configurar variables de entorno:
   Copia la plantilla .env.example a .env:
   cp .env.example .env

   Configura tu clave de Gemini API:
   GEMINI_API_KEY="AIzaSy..."
   PORT=3000

4. Iniciar el servidor de desarrollo:
   npm run dev

Abre tu navegador en: http://localhost:3000

---

## 🚢 Despliegue en Cloudflare Pages

1. Conecta tu repositorio de GitHub en el panel de Cloudflare Pages.
2. Framework preset: Vite
3. Build command: npm run build
4. Build output directory: dist
5. En Environment Variables:
   - NODE_VERSION: 20
   - GEMINI_API_KEY: Tu clave de API de Gemini.
6. Haz clic en Save and Deploy.

---

## 📡 Endpoints de la API Backend

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| POST | /api/script/generate | Genera un guion estructurado con notas de dirección actoral. |
| POST | /api/script/analyze-prosody | Diagnostica cadencia, ritmo, pausas y parámetros de entonación. |
| POST | /api/script/analyze-sentiment | Detecta emociones e inyecta marcadores afectivos contextuales. |
| POST | /api/voice-clone/synthesize | Opción C: Síntesis de voz con muestra vocal y texto en español. |
| POST | /api/tts/preview | Genera preescucha instantánea con Gemini TTS. |
| POST | /api/elevenlabs/synthesize | Proxy seguro hacia ElevenLabs TTS con configuración calibrada. |
| POST | /api/elevenlabs/verify | Valida credenciales, cuota disponible y datos de voiceId. |

---

## 💡 Modelos de Negocio y Monetización

1. **Agencia de Podcasting Automatizado:** Producción de episodios semanales para fundadores y ejecutivos en su propia voz sin que deban pasar horas en el estudio.
2. **Audiolibros y Formación Corporativa:** Conversión masiva de artículos y manuales a narración conversacional personalizada.
3. **Servicio Premium de Calibración Vocal:** Auditoría y toma de muestras de alta fidelidad para creadores de contenido e influencers.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Siéntete libre de adaptarlo a tus necesidades comerciales o proyectos personales.
