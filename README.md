# 🎙️ VoiceLab Coach
### *Estudio de Dirección Vocal, Clonación de Voz con IA y Generación de Podcasts Hipernaturales*

[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.x-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Google Gemini API](https://img.shields.io/badge/Gemini%20API-3.8%20Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![ElevenLabs](https://img.shields.io/badge/ElevenLabs-Voice%20Cloning-FF6B00)](https://elevenlabs.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📌 ¿Qué es VoiceLab Coach?

La gran mayoría de las voces clonadas con Inteligencia Artificial suenan planas, robóticas o sin alma. **VoiceLab Coach** resuelve este problema actuando como tu **Director Vocal y Estudio de Producción asistido por IA**.

Diseñado para creadores de contenido, podcasters, agencias y locutores, VoiceLab Coach guía al usuario a través de un **recorrido paso a paso interactivo** para:
1. **Calibrar y grabar muestras vocales limpias** con fonemas ricos usando un teleprómter interactivo con medidor de decibelios.
2. **Guiar la clonación en ElevenLabs** con parámetros óptimos de estabilidad, claridad y similitud.
3. **Escribir y pulir guiones de podcast** con marcas de actuación teatral (`...`, `--`, `[Pausa reflexiva]`, `<breath>`, etc.).
4. **Analizar sentimientos y emociones en tiempo real** mediante la API de Gemini 3.8 Flash para sugerir marcadores afectivos (`[Emocionado]`, `[Reflexivo]`, `[Íntimo]`).
5. **Producir y sintetizar el audio final** con preescucha gratuita (Gemini TTS) o directamente con tu voz clonada en ElevenLabs, descargando tanto el audio como el guion formateado en **.txt** o **.pdf**.

---

## 🚀 Recorrido Guiado Paso a Paso (*Guided Stepper*)

La interfaz cuenta con un sistema de progresión secuencial que asegura la máxima calidad en cada etapa:

```text
[Paso 1: Grabación & Teleprómter] ──> [Paso 2: Clonación ElevenLabs] ──> [Paso 3: Guion & Sentimientos] ──> [Paso 4: Estudio de Producción]
```

- **Paso 1 — Teleprómter & Calibración Acústica:** Textos fonéticos balanceados, control de velocidad de lectura, espejo para cámara web, VU meter en tiempo real y descarga de muestras de audio (.wav/.webm).
- **Paso 2 — Masterclass de Clonación:** Guía detallada con checklist interactivo sobre requisitos de audio, cómo usar *Instant Voice Cloning* vs *Professional Voice Cloning* y qué configuraciones de estabilidad aplicar.
- **Paso 3 — Redacción y Dirección con Gemini IA:** Generador automático de guiones estructurados, diagnóstico de prosodia y detector de sentimientos que inserta etiquetas emocionales contextuales en un clic.
- **Paso 4 — Producción, Síntesis y Exportación:** Test gratuito sin gastar créditos con Gemini TTS o síntesis final con tu voz clonada en ElevenLabs. Exportación de guion profesional a `.txt` y `.pdf`.

---

## ✨ Características Principales

| Módulo | Descripción |
| :--- | :--- |
| **🎙️ Teleprómter Profesional** | Velocidad personalizable (15-90 wpm), tamaño de tipografía dinámico, modo espejo y atajos de teclado. |
| **🔊 Grabador en Vivo** | Captura directa desde el micrófono del navegador con analizador de frecuencia en tiempo real y descarga inmediata. |
| **🧠 Dirección de Prosodia (Gemini 3.8 Flash)** | Reescritura del texto con puntuación actoral y consejos de ritmo para evitar la monotonía sintética. |
| **🎭 Análisis de Sentimientos** | Diagnóstico emocional automático que sugiere dónde subir el tono, dónde susurrar o dónde generar misterio. |
| **⚡ Síntesis Híbrida** | **Modo Prototipo:** Gemini TTS gratuito (5 perfiles de voz). <br>**Modo Master:** Conexión vía API segura con ElevenLabs (multilingual v2). |
| **📄 Exportación Multi-formato** | Descarga del podcast producido en audio MP3 y del guion técnico en `.txt` o `.pdf`. |
| **🔒 Privacidad y Seguridad** | Las API keys se transmiten de forma segura a través de endpoints proxy en el servidor y nunca se exponen al cliente. |

---

## 🛠️ Stack Tecnológico

- **Frontend:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vite.dev/)
- **Estilos:** [Tailwind CSS 4](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/)
- **Backend / API:** [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/)
- **Modelos de IA:**
  - `gemini-3.8-flash`: Generación de guiones, análisis de prosodia y análisis de sentimientos.
  - `gemini-3.8-flash-tts`: Previsualización instantánea de voz.
  - `eleven_multilingual_v2`: Síntesis de ultra-alta fidelidad para voces clonadas.
- **Generación de Documentos:** `jspdf` para exportación a PDF profesional en el cliente.

---

## 📂 Estructura del Proyecto

```text
├── .env.example               # Plantilla de variables de entorno
├── index.html                 # Punto de entrada HTML con metadatos SEO
├── metadata.json              # Configuración y capacidades del proyecto
├── package.json               # Dependencias y scripts de construcción
├── server.ts                  # Servidor Express con endpoints de IA y proxy ElevenLabs
├── tsconfig.json              # Configuración TypeScript
├── vite.config.ts             # Configuración de empaquetado Vite
└── src/
    ├── App.tsx                # Componente principal y control de navegación
    ├── main.tsx               # Montaje de la aplicación React
    ├── index.css              # Estilos globales con Tailwind CSS
    ├── types/                 # Interfaces y contratos de datos TypeScript
    ├── data/                  # Guiones de calibración fonética predefinidos
    ├── utils/                 # Funciones auxiliares (exportadores PDF/TXT, etc.)
    └── components/
        ├── Header.tsx                 # Barra superior con navegación y guía
        ├── GuidedStepperBanner.tsx    # Barra de progreso y recorrido guiado
        ├── TeleprompterView.tsx       # Estudio de grabación y teleprómter
        ├── SamplesManagerView.tsx     # Gestión de audios grabados
        ├── ElevenLabsGuideView.tsx    # Guía interactiva de clonación
        ├── PodcastScriptEditorView.tsx# Editor con análisis de prosodia y sentimientos
        ├── ProductionStudioView.tsx   # Síntesis TTS y exportación final
        └── UserGuideModal.tsx         # Modal con guía completa y casos de negocio
```

---

## ⚙️ Instalación y Configuración Local

### 1. Clonar el repositorio
```bash
git clone https://github.com/TU_USUARIO/voicelab-coach.git
cd voicelab-coach
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crea un archivo `.env` basado en `.env.example`:

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales:
```env
# Clave de Google AI Studio / Gemini API (Requerida para guiones y análisis)
GEMINI_API_KEY="AIzaSy..."

# Puerto del servidor (Opcional, por defecto 3000)
PORT=3000
```

> 💡 *Nota:* Puedes obtener una clave de API gratuita de Gemini en [Google AI Studio](https://aistudio.google.com/).

### 4. Iniciar el entorno de desarrollo
```bash
npm run dev
```

Abre tu navegador en: [http://localhost:3000](http://localhost:3000)

---

## 🚢 Despliegue en Producción

### Opción A: Despliegue en Cloudflare Pages

1. Sube tu repositorio a GitHub.
2. En Cloudflare Dashboard ve a **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Selecciona tu repositorio y define los siguientes ajustes de compilación:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. En **Environment Variables**, añade:
   - `GEMINI_API_KEY`: Tu clave de Gemini API.
   - `NODE_VERSION`: `20` (o superior).
5. Haz clic en **Save and Deploy**.

*(Nota: Este repositorio ya cuenta con `package-lock.json` estándar de npm y omite bloqueos conflictivos de bun para garantizar compatibilidad total con los runners de Cloudflare).*

### Opción B: Despliegue Full-Stack (Render, Railway, Fly.io o VPS con Node.js)

1. Compila el frontend:
   ```bash
   npm run build
   ```
2. Inicia el servidor de producción (sirve la API y los estáticos de `dist/`):
   ```bash
   NODE_ENV=production npx tsx server.ts
   ```

---

## 📡 Endpoints de la API Backend

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/script/generate` | Genera un guion estructurado con notas de dirección actoral. |
| `POST` | `/api/script/analyze-prosody` | Diagnostica cadencia, ritmo, pausas y ajustes para clonadores de voz. |
| `POST` | `/api/script/analyze-sentiment` | Analiza el tono afectivo e inyecta marcadores emocionales contextuales. |
| `POST` | `/api/tts/preview` | Genera audio de prueba inmediato con Gemini TTS. |
| `POST` | `/api/elevenlabs/synthesize` | Proxy seguro hacia ElevenLabs TTS con configuración de voz clonada. |
| `POST` | `/api/elevenlabs/verify` | Valida credenciales, cuota disponible y datos del `voiceId`. |

---

## 💡 Oportunidades de Monetización y Casos de Uso

Este proyecto está diseñado tanto para creadores individuales como para modelos de negocio B2B:

1. **Agencia de Podcasting Automatizado:** Ofrece a clientes corporativos la creación de episodios semanales en su propia voz sin que tengan que pasar horas grabando en un estudio.
2. **Audiolibros y Formación Interna:** Convierte artículos, manuales o libros a narración humana personalizada a una fracción del costo tradicional.
3. **Clonación de Marca para Creadores:** Servicio premium de auditoría y captura de muestras vocales perfectas para influencers y educadores online.
4. **Localización y Doblaje:** Adaptación de contenidos a múltiples idiomas conservando el timbre característico del autor mediante los modelos multilingües de ElevenLabs.

---

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Si deseas añadir nuevas características:
1. Haz un Fork del proyecto (`fork`).
2. Crea una rama para tu feature (`git checkout -b feature/NuevaCaracteristica`).
3. Haz commit de tus cambios (`git commit -m 'feat: Añadir nueva característica'`).
4. Haz push a la rama (`git push origin feature/NuevaCaracteristica`).
5. Abre un **Pull Request**.

---

## 📄 Licencia

Este proyecto está bajo la Licencia [MIT](LICENSE). Siéntete libre de utilizarlo, modificarlo y adaptarlo a tus necesidades comerciales o personales.
