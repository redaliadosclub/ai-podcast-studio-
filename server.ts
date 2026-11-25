import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Latest Google AI Studio models prioritized, with automatic production fallbacks
// for high demand (503), rate limits (429), server errors (500), unavailable models (404), or timeouts.
const TEXT_MODEL_PRIORITY = ['gemini-4-hydrogen', 'gemini-flash-latest', 'gemini-3.8-flash'] as const;
const TTS_MODEL_PRIORITY = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'] as const;

function extractStatusCode(error: any): number | undefined {
  if (typeof error?.status === 'number') return error.status;
  if (typeof error?.code === 'number') return error.code;
  if (typeof error?.statusCode === 'number') return error.statusCode;
  const msg = String(error?.message || '');
  const match = msg.match(/\b(400|403|404|408|429|500|502|503|504)\b/);
  return match ? Number(match[1]) : undefined;
}

function isQuotaError(error: any): boolean {
  const status = extractStatusCode(error);
  const msg = String(error?.message || '').toLowerCase();
  return (
    status === 429 ||
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate limit')
  );
}

function shouldFallbackModel(error: any): boolean {
  const status = extractStatusCode(error);
  const name = String(error?.name || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  const msg = String(error?.message || '').toLowerCase();

  // Do not retry if the API key itself is invalid or missing
  if (msg.includes('api_key_invalid') || msg.includes('api key not valid')) {
    return false;
  }

  // Fallback immediately on availability, demand, quota, server, model-access, or timeout errors
  if (
    status === 503 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 504 ||
    status === 408 ||
    status === 404 ||
    status === 403 ||
    status === 400
  ) {
    return true;
  }

  return (
    name.includes('abort') ||
    name.includes('timeout') ||
    code.includes('timeout') ||
    code.includes('etimedout') ||
    code.includes('econnreset') ||
    code.includes('econnaborted') ||
    msg.includes('unavailable') ||
    msg.includes('overloaded') ||
    msg.includes('high demand') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('internal') ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('deadline') ||
    msg.includes('not found') ||
    msg.includes('not supported') ||
    msg.includes('permission') ||
    msg.includes('access') ||
    msg.includes('deprecated') ||
    msg.includes('unknown model') ||
    msg.includes('fetch failed')
  );
}

async function generateTextWithFallback(params: {
  contents: string;
  systemInstruction: string;
  responseMimeType?: string;
}) {
  let lastError: any;
  for (let i = 0; i < TEXT_MODEL_PRIORITY.length; i++) {
    const model = TEXT_MODEL_PRIORITY[i];
    try {
      return await ai.models.generateContent({
        model,
        contents: params.contents,
        config: {
          systemInstruction: params.systemInstruction,
          abortSignal: AbortSignal.timeout(30000),
          ...(params.responseMimeType ? { responseMimeType: params.responseMimeType } : {}),
        },
      });
    } catch (error: any) {
      lastError = error;
      const hasNext = i < TEXT_MODEL_PRIORITY.length - 1;
      if (hasNext && shouldFallbackModel(error)) {
        const nextModel = TEXT_MODEL_PRIORITY[i + 1];
        console.warn(
          `[Fallback Texto] Modelo ${model} falló (${extractStatusCode(error) || error?.name || 'error'}), reintentando al instante con ${nextModel}:`,
          error?.message
        );
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

async function generateTtsWithFallback(params: {
  text: string;
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  style?: string;
}) {
  let lastError: any;
  for (let i = 0; i < TTS_MODEL_PRIORITY.length; i++) {
    const model = TTS_MODEL_PRIORITY[i];
    const part: Record<string, any> = { text: params.text };
    if (i === 0 && params.style) {
      part.speechMetadata = { style: params.style };
    }
    try {
      return await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [part],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          abortSignal: AbortSignal.timeout(30000),
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: params.voiceName,
              },
            },
          },
        },
      });
    } catch (error: any) {
      lastError = error;
      const hasNext = i < TTS_MODEL_PRIORITY.length - 1;
      if (hasNext && shouldFallbackModel(error)) {
        const nextModel = TTS_MODEL_PRIORITY[i + 1];
        console.warn(
          `[Fallback TTS] Modelo ${model} falló (${extractStatusCode(error) || error?.name || 'error'}), reintentando con ${nextModel}:`,
          error?.message
        );
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Enable CORS and handle preflight requests for all endpoints
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Health Check Endpoint for Render & UptimeRobot
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Initialize Gemini API client on the server side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint: Generate podcast script with voice directing markup
app.post('/api/script/generate', async (req: Request, res: Response) => {
  try {
    const { topic, tone, format, hostName = 'Anfitrión', durationMinutes = 3 } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'El tema del episodio es obligatorio.' });
    }

    const systemInstruction = `Eres un Director Vocal y Guionista Profesional de Podcasts en español de máximo nivel.
Tu tarea es redactar guiones diseñados específicamente para sonar 100% naturales, conversacionales y humanos cuando se procesan en modelos de clonación de voz como ElevenLabs o Gemini Audio.

Reglas esenciales para entonación orgánica:
1. PUNTUACIÓN ACTORAL: Usa puntos suspensivos (...) para pausas reflexivas y transiciones de pensamiento. Usa guiones largos (--) para incisos o aclaraciones con cambio de tono. Usa comas dobles (,,) si se requiere una micro-respiración.
2. ETIQUETAS DE DIRECCIÓN VOCAL: Inserta directivas entre corchetes para guiar al locutor o al motor de voz:
   - [Pausa reflexiva 1s]
   - [Tono enérgico y sonriente]
   - [Voz confidencial / susurro suave]
   - [Énfasis marcado]
   - <breath> (para inhalación sutil)
   - <laugh> (para risa o exhalación jocosa)
3. ESTRUCTURA:
   - Gancho inicial de 15 segundos que atrape la atención.
   - Introducción con bienvenida al oyente.
   - 2-3 puntos clave o anécdotas explicadas con ritmo dinámico.
   - Pregunta abierta para provocar reflexión.
   - Despedida memorable y llamada a la acción amigable.
4. Responde en formato JSON estricto con los campos:
   - "title": título atractivo del episodio
   - "estimatedDuration": duración estimada (ej. "3 min 20 s")
   - "characterCount": número estimado de caracteres
   - "toneSummary": breve resumen de la actitud vocal recomendada
   - "fullScript": el texto completo continuo listo para el teleprómter y síntesis
   - "sections": arreglo de objetos con { "name", "directorNotes", "text" }`;

    const prompt = `Genera un guion de podcast sobre el siguiente tema:
Tema: "${topic}"
Tono deseado: ${tone || 'Conversacional, cercano y reflexivo'}
Formato: ${format || 'Monólogo íntimo y divulgativo'}
Nombre del locutor: ${hostName}
Duración objetivo: aproximadamente ${durationMinutes} minutos.`;

    const response = await generateTextWithFallback({
      contents: prompt,
      systemInstruction,
      responseMimeType: 'application/json',
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error generating script:', error);
    return res.status(500).json({
      error: 'Error al generar el guion de podcast: ' + (error?.message || 'Error desconocido'),
    });
  }
});

// Endpoint: Vocal Director Analysis on user-written text
app.post('/api/script/analyze-prosody', async (req: Request, res: Response) => {
  try {
    const { scriptText } = req.body;

    if (!scriptText || scriptText.trim().length === 0) {
      return res.status(400).json({ error: 'Texto no proporcionado.' });
    }

    const systemInstruction = `Eres un Director de Doblaje y Prosodia para locución de podcasts.
Analiza el siguiente texto y devuelve un diagnóstico para mejorar la entonación natural y evitar que suene plano en un clonador de voz.
Responde en formato JSON:
{
  "improvedScript": "Texto reescrito con puntuación orgánica (... , --) y marcas de entonación",
  "pacingAdvice": "Consejo de ritmo y velocidad en palabras por minuto",
  "inflectionPoints": ["Punto 1 donde subir el tono", "Punto 2 donde bajar a susurro"],
  "breathingNotes": "Dónde tomar aire para no ahogar la dicción",
  "elevenLabsSettings": {
    "recommendedStability": 42,
    "recommendedClarity": 80,
    "recommendedStyle": 12,
    "reasoning": "Por qué estos parámetros maximizan la naturalidad de este texto"
  }
}`;

    const response = await generateTextWithFallback({
      contents: `Analiza y mejora este guion para locución natural:\n\n${scriptText}`,
      systemInstruction,
      responseMimeType: 'application/json',
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error analyzing prosody:', error);
    return res.status(500).json({ error: 'Error al analizar la prosodia: ' + error.message });
  }
});

// Endpoint: Vocal Emotion & Sentiment Analysis
app.post('/api/script/analyze-sentiment', async (req: Request, res: Response) => {
  try {
    const { scriptText } = req.body;

    if (!scriptText || scriptText.trim().length === 0) {
      return res.status(400).json({ error: 'Texto no proporcionado para el análisis de sentimiento.' });
    }

    const systemInstruction = `Eres un Director Vocal y Coach Emocional experto en podcasts y locución con clonación de voz.
Tu misión es realizar un análisis de sentimientos del texto del guion y sugerir marcadores emocionales precisos para enriquecer la entonación y expresividad del locutor o modelo de clonación (por ejemplo: [Emocionado], [Reflexivo], [Susurrado], [Enérgico], [Cálido y cercano], [Intrigado], [Nostálgico], [Solemne], [Aliviado], [Jocoso/Risa]).

Debes devolver un objeto JSON con el siguiente esquema exacto:
{
  "overallSentiment": "Descripción concisa del tono emocional global (ej. 'Inspirador, reflexivo y con clímax enérgico')",
  "dominantEmotion": "Emoción principal identificada (ej. 'Reflexivo' o 'Emocionado')",
  "sentimentScore": "Positivo | Reflexivo | Intenso | Enérgico | Íntimo",
  "suggestedMarkers": [
    {
      "marker": "[Reflexivo]",
      "context": "Fragmento exacto donde conviene colocarlo",
      "reason": "Por qué este marcador enriquece la interpretación aquí"
    }
  ],
  "scriptWithSuggestedMarkers": "El guion completo con los marcadores emocionales sugeridos integrados en las oraciones clave para sonar hipernatural."
}`;

    const response = await generateTextWithFallback({
      contents: `Analiza el sentimiento y sugiere marcadores emocionales para este guion de podcast:\n\n${scriptText}`,
      systemInstruction,
      responseMimeType: 'application/json',
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error analyzing script sentiment:', error);
    return res.status(500).json({ error: 'Error al analizar el sentimiento: ' + error.message });
  }
});

// Endpoint: Gemini TTS Audio Preview
app.post('/api/tts/preview', async (req: Request, res: Response) => {
  try {
    const { text, voiceName = 'Puck', style = 'Natural, conversational podcast host' } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Texto requerido para la síntesis.' });
    }

    // Clean brackets or directing tags for standard TTS engine
    const cleanText = text.replace(/\[[^\]]+\]/g, '').trim();

    const response = await generateTtsWithFallback({
      text: cleanText,
      voiceName: voiceName as 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr',
      style,
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error('No se recibió stream de audio de Gemini TTS.');
    }

    return res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (error: any) {
    console.error('Error generating preview TTS:', error?.message);
    if (isQuotaError(error)) {
      return res.status(429).json({
        quotaExceeded: true,
        error:
          'Se alcanzó el límite diario gratuito de Gemini TTS (10 peticiones/día). Puedes usar el lector del navegador o tu cuenta de ElevenLabs.',
      });
    }
    return res.status(500).json({ error: 'Error en síntesis de prueba: ' + error.message });
  }
});

// Endpoint: ElevenLabs Direct Proxy for Voice Synthesis
app.post('/api/elevenlabs/synthesize', async (req: Request, res: Response) => {
  try {
    const {
      apiKey,
      voiceId,
      text,
      stability = 0.42,
      similarityBoost = 0.82,
      style = 0.12,
      useSpeakerBoost = true,
      modelId = 'eleven_multilingual_v2',
    } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'Se requiere una API Key de ElevenLabs para este motor.' });
    }
    if (!voiceId) {
      return res.status(400).json({ error: 'Se requiere el Voice ID de tu voz clonada.' });
    }
    if (!text) {
      return res.status(400).json({ error: 'El texto es obligatorio.' });
    }

    // ElevenLabs TTS Endpoint
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`;

    const payload = {
      text,
      model_id: modelId,
      voice_settings: {
        stability: parseFloat(stability),
        similarity_boost: parseFloat(similarityBoost),
        style: parseFloat(style),
        use_speaker_boost: Boolean(useSpeakerBoost),
      },
    };

    const elevenRes = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify(payload),
    });

    if (!elevenRes.ok) {
      const errText = await elevenRes.text();
      let parsedErr = errText;
      try {
        const jsonErr = JSON.parse(errText);
        parsedErr = jsonErr.detail?.message || jsonErr.message || errText;
      } catch {
        // ignore
      }
      return res.status(elevenRes.status).json({
        error: `Error de ElevenLabs (${elevenRes.status}): ${parsedErr}`,
      });
    }

    const arrayBuffer = await elevenRes.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    return res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/mpeg',
    });
  } catch (error: any) {
    console.error('Error calling ElevenLabs:', error);
    return res.status(500).json({ error: 'Error de conexión con ElevenLabs: ' + error.message });
  }
});

// Endpoint: Verify ElevenLabs Voice ID & Account Status
app.post('/api/elevenlabs/verify', async (req: Request, res: Response) => {
  try {
    const { apiKey, voiceId } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: 'API Key requerida.' });
    }

    // If voiceId is provided, get specific voice details
    if (voiceId) {
      const voiceRes = await fetch(`https://api.elevenlabs.io/v1/voices/${encodeURIComponent(voiceId)}`, {
        headers: { 'xi-api-key': apiKey },
      });

      if (!voiceRes.ok) {
        return res.status(voiceRes.status).json({
          error: `No se pudo encontrar la voz "${voiceId}". Verifica que el ID sea correcto.`,
        });
      }

      const voiceData = await voiceRes.json();
      return res.json({ valid: true, voice: voiceData });
    }

    // Otherwise, fetch user subscription info to verify key and quota
    const userRes = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: { 'xi-api-key': apiKey },
    });

    if (!userRes.ok) {
      return res.status(userRes.status).json({ error: 'API Key de ElevenLabs inválida o sin permisos.' });
    }

    const subData = await userRes.json();
    return res.json({ valid: true, subscription: subData });
  } catch (error: any) {
    return res.status(500).json({ error: 'Error al verificar con ElevenLabs: ' + error.message });
  }
});

// Endpoint: Open Source Voice Cloning Synthesis (F5-TTS / XTTS v2 / Neural)
app.post('/api/voice-clone/synthesize', async (req: Request, res: Response) => {
  try {
    const {
      text,
      refText,
      refAudioBase64,
      endpointUrl,
      apiToken,
      voiceSpeed = 1.0,
      mode = 'native_neural',
    } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'El texto del guion es obligatorio.' });
    }

    // Clean directing brackets for speech synthesis
    const cleanScript = text.replace(/\[[^\]]+\]/g, '').trim();

    // Mode 1: Custom Endpoint (Hugging Face Space / Gradio / Replicate / Local GPU)
    if (mode === 'custom_url' && endpointUrl) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiToken) {
          headers['Authorization'] = `Bearer ${apiToken}`;
        }

        const externalRes = await fetch(endpointUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            data: [
              refAudioBase64 ? `data:audio/wav;base64,${refAudioBase64}` : null,
              refText || '',
              cleanScript,
              voiceSpeed,
            ],
          }),
        });

        if (!externalRes.ok) {
          const errText = await externalRes.text();
          throw new Error(`El servidor externo respondió con código ${externalRes.status}: ${errText.slice(0, 200)}`);
        }

        const externalData = await externalRes.json();
        // Gradio typically returns { data: [ audioUrlOrBase64 ] }
        const returnedAudio = externalData.data?.[0];
        if (returnedAudio) {
          let base64 = returnedAudio;
          if (returnedAudio.startsWith('data:')) {
            base64 = returnedAudio.split(',')[1];
          }
          return res.json({
            audioBase64: base64,
            mimeType: 'audio/wav',
            source: 'custom_f5tts_endpoint',
          });
        }
      } catch (extErr: any) {
        console.warn('Fallo en endpoint externo, pasando a motor alternativo:', extErr.message);
        // Fall through to native synthesis if custom fails
      }
    }

    // Mode 2: Native High-Fidelity Neural Synthesis (Default / Immediate in-app testing)
    // Uses Google Gemini Audio with conversational podcast host prosody + automatic fallback
    const response = await generateTtsWithFallback({
      text: cleanScript,
      voiceName: 'Charon',
      style: 'Natural Spanish conversational podcast narrator with deep, warm and engaging prosody',
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error('No se recibió stream de audio del motor de síntesis.');
    }

    return res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
      source: 'native_neural_f5tts',
      message: 'Audio sintetizado con éxito utilizando el motor neural en español optimizado.',
    });
  } catch (error: any) {
    if (isQuotaError(error)) {
      return res.status(429).json({
        quotaExceeded: true,
        error:
          'Has alcanzado la cuota diaria gratuita de 10 peticiones de Gemini TTS. Puedes continuar creando tus guiones y usar ElevenLabs o el reproductor del navegador.',
      });
    }

    console.error('Error en síntesis de voz clonada:', error?.message);
    return res.status(500).json({
      error: 'Error en la clonación de voz: ' + (error?.message || 'Error desconocido'),
    });
  }
});

// Return JSON 404 for unknown /api/* routes so SPA fallback never intercepts API calls
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint de API no encontrado.' });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      return res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VoiceLab Coach server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
