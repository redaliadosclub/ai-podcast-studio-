import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  PLANS_CATALOG,
  checkDatabaseHealth,
  getCommercialConfig,
  saveCommercialConfig,
  getOrders,
  saveOrders,
  getLicenses,
  saveLicenses,
  generateOrderCode,
  generateLicensePin,
  isValidHttpUrl,
  sanitizeWhatsapp,
  formatWhatsappDigits,
} from './server/storage.ts';
import type {
  PlanId,
  CommercialConfig,
  SubscriptionOrder,
  LicenseRecord,
} from './server/storage.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Latest Google AI Studio models prioritized, with fast per-attempt timeouts
// so congested preview models fail over cleanly within the 60s frontend window.
const TEXT_MODEL_CHAIN = [
  { model: 'gemini-4-hydrogen', timeoutMs: 8000, thinkingLevel: ThinkingLevel.LOW },
  { model: 'gemini-3.8-flash', timeoutMs: 12000, thinkingLevel: ThinkingLevel.LOW },
  { model: 'gemini-flash-latest', timeoutMs: 10000, thinkingLevel: undefined },
  { model: 'gemini-3.1-flash-lite', timeoutMs: 25000, thinkingLevel: ThinkingLevel.MINIMAL },
] as const;

const TTS_MODEL_CHAIN = [
  { model: 'gemini-3.8-flash-tts', timeoutMs: 45000 },
  { model: 'gemini-3.8-flash-lite-tts', timeoutMs: 45000 },
] as const;

function isSafeExternalGpuUrl(rawUrl: string): boolean {
  if (!rawUrl || !isValidHttpUrl(rawUrl)) return false;
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '::1' ||
      host === '0.0.0.0' ||
      host.startsWith('127.') ||
      host.startsWith('10.') ||
      host.startsWith('169.254.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

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

  // Fallback immediately on availability, demand, quota, server, model-access, or timeout/abort errors
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
    msg.includes('aborted') ||
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
  responseSchema?: any;
}) {
  let lastError: any;
  for (let i = 0; i < TEXT_MODEL_CHAIN.length; i++) {
    const { model, timeoutMs, thinkingLevel } = TEXT_MODEL_CHAIN[i];
    try {
      return await ai.models.generateContent({
        model,
        contents: params.contents,
        config: {
          systemInstruction: params.systemInstruction,
          abortSignal: AbortSignal.timeout(timeoutMs),
          ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
          ...(params.responseMimeType ? { responseMimeType: params.responseMimeType } : {}),
          ...(params.responseSchema ? { responseSchema: params.responseSchema } : {}),
        },
      });
    } catch (error: any) {
      lastError = error;
      const hasNext = i < TEXT_MODEL_CHAIN.length - 1;
      if (hasNext && shouldFallbackModel(error)) {
        const nextModel = TEXT_MODEL_CHAIN[i + 1].model;
        console.warn(
          `[Fallback Texto] Modelo ${model} falló (${extractStatusCode(error) || error?.name || 'error'}, timeout ${timeoutMs}ms), reintentando al instante con ${nextModel}:`,
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
  for (let i = 0; i < TTS_MODEL_CHAIN.length; i++) {
    const { model, timeoutMs } = TTS_MODEL_CHAIN[i];
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
          abortSignal: AbortSignal.timeout(timeoutMs),
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
      const hasNext = i < TTS_MODEL_CHAIN.length - 1;
      if (hasNext && shouldFallbackModel(error)) {
        const nextModel = TTS_MODEL_CHAIN[i + 1].model;
        console.warn(
          `[Fallback TTS] Modelo ${model} falló (${extractStatusCode(error) || error?.name || 'error'}, timeout ${timeoutMs}ms), reintentando con ${nextModel}:`,
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

// Enable CORS for public AI endpoints only (never wildcard CORS on authenticated /api/superadmin endpoints)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (!req.path.startsWith('/api/superadmin')) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

const SESSION_SIGNING_SECRET =
  (process.env.SESSION_SECRET || '').trim() || crypto.randomBytes(32).toString('hex');

function getConfiguredAdminPin(): string {
  return (process.env.ADMIN_PIN || '1234').trim();
}

function timingSafePinMatch(candidate: string, expected: string): boolean {
  const hashA = crypto.createHash('sha256').update(candidate).digest();
  const hashB = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function issueAdminToken(): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + 12 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ role: 'superadmin', exp: expiresAt })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SIGNING_SECRET).update(payload).digest('base64url');
  return { token: `${payload}.${sig}`, expiresAt };
}

function verifyAdminToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SIGNING_SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return false;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    return decoded?.role === 'superadmin' && typeof decoded?.exp === 'number' && decoded.exp > Date.now();
  } catch {
    return false;
  }
}

function requireSuperadmin(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token || !verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Sesión de administrador requerida o expirada.' });
  }
  return next();
}

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
   - "fullScript": el texto completo continuo listo para el teleprómter y síntesis`;

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
      responseSchema: {
        type: Type.OBJECT,
        required: ['title', 'estimatedDuration', 'characterCount', 'toneSummary', 'fullScript'],
        properties: {
          title: { type: Type.STRING },
          estimatedDuration: { type: Type.STRING },
          characterCount: { type: Type.NUMBER },
          toneSummary: { type: Type.STRING },
          fullScript: { type: Type.STRING },
        },
      },
    });

    const rawText = (response.text || '{}').replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(rawText);
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error generating script:', error);
    const isAbortOrDemand =
      error?.name === 'AbortError' ||
      error?.name === 'TimeoutError' ||
      String(error?.message || '').toLowerCase().includes('aborted') ||
      extractStatusCode(error) === 503;

    if (isAbortOrDemand) {
      return res.status(503).json({
        error:
          'Los motores de IA están experimentando alta demanda temporal en este momento. Por favor intenta de nuevo en unos segundos.',
      });
    }
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

    const rawText = (response.text || '{}').replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(rawText);
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error analyzing prosody:', error);
    const isAbortOrDemand =
      error?.name === 'AbortError' ||
      error?.name === 'TimeoutError' ||
      String(error?.message || '').toLowerCase().includes('aborted') ||
      extractStatusCode(error) === 503;

    if (isAbortOrDemand) {
      return res.status(503).json({
        error:
          'Los motores de IA están experimentando alta demanda temporal en este momento. Por favor intenta de nuevo en unos segundos.',
      });
    }
    return res.status(500).json({ error: 'Error al analizar la prosodia: ' + (error?.message || 'Error desconocido') });
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

    const rawText = (response.text || '{}').replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(rawText);
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error analyzing script sentiment:', error);
    const isAbortOrDemand =
      error?.name === 'AbortError' ||
      error?.name === 'TimeoutError' ||
      String(error?.message || '').toLowerCase().includes('aborted') ||
      extractStatusCode(error) === 503;

    if (isAbortOrDemand) {
      return res.status(503).json({
        error:
          'Los motores de IA están experimentando alta demanda temporal en este momento. Por favor intenta de nuevo en unos segundos.',
      });
    }
    return res.status(500).json({ error: 'Error al analizar el sentimiento: ' + (error?.message || 'Error desconocido') });
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
    const isAbortOrDemand =
      error?.name === 'AbortError' ||
      error?.name === 'TimeoutError' ||
      String(error?.message || '').toLowerCase().includes('aborted') ||
      extractStatusCode(error) === 503;

    if (isAbortOrDemand) {
      return res.status(503).json({
        error:
          'La síntesis de audio superó los 45s o el motor TTS está con alta demanda. Prueba dividir el guion o reintentar en unos segundos.',
      });
    }
    return res.status(500).json({ error: 'Error en síntesis de prueba: ' + (error?.message || 'Error desconocido') });
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

// Endpoint: Open Source Voice Cloning Synthesis (F5-TTS / XTTS v2 Zero-Shot)
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

    const cleanScript = text.replace(/\[[^\]]+\]/g, '').trim();
    const serverGpuUrl = (process.env.F5_TTS_GPU_URL || '').trim();
    const targetGpuUrl =
      mode === 'custom_url' && endpointUrl
        ? String(endpointUrl).trim()
        : serverGpuUrl;

    if (!targetGpuUrl) {
      return res.status(400).json({
        gpuNotConfigured: true,
        error:
          'No hay una GPU externa configurada en el servidor para clonación Zero-Shot. Usa Google Colab (GPU Gratis 1-Clic) o conecta tu API Key de ElevenLabs.',
      });
    }

    if (!isSafeExternalGpuUrl(targetGpuUrl)) {
      return res.status(400).json({
        error: 'La URL del servidor GPU externo no es válida o apunta a una red privada no permitida.',
      });
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiToken) {
      headers['Authorization'] = `Bearer ${String(apiToken).trim()}`;
    }

    const externalRes = await fetch(targetGpuUrl, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(45000),
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
      throw new Error(
        `El endpoint GPU respondió con código ${externalRes.status}: ${errText.slice(0, 200)}`
      );
    }

    const externalData = await externalRes.json();
    const returnedAudio = externalData.data?.[0];
    if (!returnedAudio) {
      throw new Error('El servidor GPU no devolvió un archivo de audio válido.');
    }

    let base64 = returnedAudio;
    if (typeof returnedAudio === 'string' && returnedAudio.startsWith('data:')) {
      base64 = returnedAudio.split(',')[1];
    }

    return res.json({
      audioBase64: base64,
      mimeType: 'audio/wav',
      source: 'custom_f5tts_endpoint',
    });
  } catch (error: any) {
    console.error('Error en síntesis de voz clonada:', error?.message);
    return res.status(500).json({
      error: 'Error al conectar con la GPU externa de clonación: ' + (error?.message || 'Error desconocido'),
    });
  }
});

// ============================================================================
// COMMERCIAL SUBSCRIPTIONS, CHECKOUT, LICENSES & SUPERADMIN ROUTES
// ============================================================================

app.get('/api/commercial/public', async (_req: Request, res: Response) => {
  try {
    const config = await getCommercialConfig();
    return res.json({
      plans: Object.values(PLANS_CATALOG),
      supportWhatsapp: config.supportWhatsapp,
      hasExternalGpu: isSafeExternalGpuUrl((process.env.F5_TTS_GPU_URL || '').trim()),
      configuredLinks: {
        creator: {
          mp: isValidHttpUrl(config.paymentLinks.creator.mpUrl),
          global: isValidHttpUrl(config.paymentLinks.creator.globalUrl),
        },
        pro: {
          mp: isValidHttpUrl(config.paymentLinks.pro.mpUrl),
          global: isValidHttpUrl(config.paymentLinks.pro.globalUrl),
        },
        agency: {
          mp: isValidHttpUrl(config.paymentLinks.agency.mpUrl),
          global: isValidHttpUrl(config.paymentLinks.agency.globalUrl),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching public commercial config:', error);
    return res.status(500).json({ error: 'No se pudo cargar la configuración comercial.' });
  }
});

// Create pre-payment order VLC-XXXX
app.post('/api/orders', async (req: Request, res: Response) => {
  try {
    const customerName = String(req.body?.customerName || '').trim();
    const whatsapp = sanitizeWhatsapp(String(req.body?.whatsapp || ''));
    const planId = String(req.body?.planId || '') as PlanId;

    if (customerName.length < 2 || customerName.length > 100) {
      return res.status(400).json({ error: 'Ingresa tu Nombre o el de tu Estudio (mínimo 2 caracteres).' });
    }
    if (formatWhatsappDigits(whatsapp).length < 7) {
      return res.status(400).json({ error: 'Ingresa un número de WhatsApp válido con código de país.' });
    }
    if (!planId || !(planId in PLANS_CATALOG)) {
      return res.status(400).json({ error: 'Plan seleccionado no válido.' });
    }

    const plan = PLANS_CATALOG[planId];
    const [orders, config] = await Promise.all([getOrders(), getCommercialConfig()]);
    const code = generateOrderCode(orders);
    const now = new Date().toISOString();

    const order: SubscriptionOrder = {
      code,
      customerName,
      whatsapp,
      planId,
      planName: plan.name,
      priceUsd: plan.priceUsd,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    await saveOrders([order, ...orders]);

    return res.status(201).json({
      order: {
        code: order.code,
        customerName: order.customerName,
        planId: order.planId,
        planName: order.planName,
        priceUsd: order.priceUsd,
        status: order.status,
        createdAt: order.createdAt,
      },
      paymentLinks: {
        mpUrl: isValidHttpUrl(config.paymentLinks[planId].mpUrl) ? config.paymentLinks[planId].mpUrl : '',
        globalUrl: isValidHttpUrl(config.paymentLinks[planId].globalUrl) ? config.paymentLinks[planId].globalUrl : '',
      },
      supportWhatsapp: config.supportWhatsapp,
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return res.status(500).json({ error: 'No se pudo generar el pedido. Intenta nuevamente.' });
  }
});

// Get order status & configured payment links by VLC-XXXX
app.get('/api/orders/:code', async (req: Request, res: Response) => {
  try {
    const code = String(req.params.code || '').trim().toUpperCase();
    if (!/^VLC-[A-Z0-9]{4}$/.test(code)) {
      return res.status(400).json({ error: 'Formato de código de pedido inválido (ej. VLC-1234).' });
    }

    const [orders, config] = await Promise.all([getOrders(), getCommercialConfig()]);
    const order = orders.find((o) => o.code.toUpperCase() === code);
    if (!order) {
      return res.status(404).json({ error: `No encontramos ningún pedido con el código ${code}.` });
    }

    return res.json({
      order: {
        code: order.code,
        customerName: order.customerName,
        planId: order.planId,
        planName: order.planName,
        priceUsd: order.priceUsd,
        status: order.status,
        operationNumber: order.operationNumber || '',
        paymentMethod: order.paymentMethod || undefined,
      },
      paymentLinks: {
        mpUrl: isValidHttpUrl(config.paymentLinks[order.planId].mpUrl)
          ? config.paymentLinks[order.planId].mpUrl
          : '',
        globalUrl: isValidHttpUrl(config.paymentLinks[order.planId].globalUrl)
          ? config.paymentLinks[order.planId].globalUrl
          : '',
      },
      supportWhatsapp: config.supportWhatsapp,
    });
  } catch (error: any) {
    console.error('Error reading order:', error);
    return res.status(500).json({ error: 'Error al consultar el pedido.' });
  }
});

// Update operation number or payment method from /pago-exitoso or /checkout
app.patch('/api/orders/:code', async (req: Request, res: Response) => {
  try {
    const code = String(req.params.code || '').trim().toUpperCase();
    if (!/^VLC-[A-Z0-9]{4}$/.test(code)) {
      return res.status(400).json({ error: 'Código de pedido inválido.' });
    }

    const orders = await getOrders();
    const index = orders.findIndex((o) => o.code.toUpperCase() === code);
    if (index === -1) {
      return res.status(404).json({ error: `Pedido ${code} no encontrado.` });
    }

    const current = orders[index];
    const operationNumber =
      req.body?.operationNumber !== undefined
        ? String(req.body.operationNumber).trim().slice(0, 80)
        : current.operationNumber;
    const paymentMethod =
      req.body?.paymentMethod === 'mercadopago' || req.body?.paymentMethod === 'global'
        ? req.body.paymentMethod
        : current.paymentMethod;

    const updated: SubscriptionOrder = {
      ...current,
      operationNumber,
      paymentMethod,
      updatedAt: new Date().toISOString(),
    };

    const nextOrders = [...orders];
    nextOrders[index] = updated;
    await saveOrders(nextOrders);

    return res.json({
      order: {
        code: updated.code,
        customerName: updated.customerName,
        planId: updated.planId,
        planName: updated.planName,
        priceUsd: updated.priceUsd,
        status: updated.status,
        operationNumber: updated.operationNumber || '',
      },
    });
  } catch (error: any) {
    console.error('Error updating order:', error);
    return res.status(500).json({ error: 'No se pudo actualizar el número de operación.' });
  }
});

// Verify 4-digit License PIN against backend store
app.post('/api/licenses/verify', async (req: Request, res: Response) => {
  try {
    const pin = String(req.body?.pin || '').trim();
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'El PIN de licencia debe tener exactamente 4 dígitos numéricos.' });
    }

    const [licenses, config] = await Promise.all([getLicenses(), getCommercialConfig()]);
    const license = licenses.find((l) => l.pin === pin);

    if (!license) {
      return res.status(401).json({ error: 'PIN de licencia no encontrado. Verifica el código o adquiere un plan.' });
    }
    if (license.status !== 'active') {
      return res.status(403).json({
        paused: true,
        error: 'Tu licencia está pausada temporalmente. Contacta a soporte por WhatsApp para reactivarla.',
        supportWhatsapp: config.supportWhatsapp,
      });
    }

    const plan = PLANS_CATALOG[license.planId] || PLANS_CATALOG.creator;
    return res.json({
      valid: true,
      license: {
        id: license.id,
        pin: license.pin,
        customerName: license.customerName,
        planId: license.planId,
        planName: plan.name,
        status: license.status,
        whiteLabel: Boolean(license.whiteLabel),
      },
      supportWhatsapp: config.supportWhatsapp,
    });
  } catch (error: any) {
    console.error('Error verifying license PIN:', error);
    return res.status(500).json({ error: 'No se pudo validar la licencia en el servidor.' });
  }
});

// Superadmin login
app.post('/api/superadmin/login', (req: Request, res: Response) => {
  const pin = String(req.body?.pin || '').trim();
  const expectedPin = getConfiguredAdminPin();
  if (!pin || !timingSafePinMatch(pin, expectedPin)) {
    return res.status(401).json({ error: 'PIN de administrador incorrecto.' });
  }
  const { token, expiresAt } = issueAdminToken();
  return res.json({ token, expiresAt });
});

// Superadmin dashboard (DB status + config + orders + licenses)
app.get('/api/superadmin/dashboard', requireSuperadmin, async (_req: Request, res: Response) => {
  try {
    const [dbStatus, config, orders, licenses] = await Promise.all([
      checkDatabaseHealth(),
      getCommercialConfig(),
      getOrders(),
      getLicenses(),
    ]);
    return res.json({
      dbStatus,
      config,
      orders,
      licenses,
      plans: Object.values(PLANS_CATALOG),
    });
  } catch (error: any) {
    console.error('Error loading superadmin dashboard:', error);
    return res.status(500).json({ error: 'Error al cargar el panel de administración.' });
  }
});

// Superadmin payment links & support WhatsApp config
app.put('/api/superadmin/config', requireSuperadmin, async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const rawLinks = body.paymentLinks || {};
    const plans: PlanId[] = ['creator', 'pro', 'agency'];

    const cleanLinks = {} as CommercialConfig['paymentLinks'];
    for (const planId of plans) {
      const mpUrl = String(rawLinks?.[planId]?.mpUrl || '').trim();
      const globalUrl = String(rawLinks?.[planId]?.globalUrl || '').trim();

      if (mpUrl && !isValidHttpUrl(mpUrl)) {
        return res.status(400).json({
          error: `El link de Mercado Pago para ${PLANS_CATALOG[planId].name} debe comenzar con https:// o http://`,
        });
      }
      if (globalUrl && !isValidHttpUrl(globalUrl)) {
        return res.status(400).json({
          error: `El link de PayPal / dLocal Go para ${PLANS_CATALOG[planId].name} debe comenzar con https:// o http://`,
        });
      }

      cleanLinks[planId] = { mpUrl, globalUrl };
    }

    const supportWhatsapp = sanitizeWhatsapp(String(body.supportWhatsapp || ''));

    const saved = await saveCommercialConfig({
      paymentLinks: cleanLinks,
      supportWhatsapp,
      updatedAt: new Date().toISOString(),
    });

    return res.json({ config: saved });
  } catch (error: any) {
    console.error('Error saving commercial config:', error);
    return res.status(500).json({ error: 'No se pudo guardar la configuración en la base de datos.' });
  }
});

// Superadmin: activate pending order & generate 4-digit PIN license
app.post('/api/superadmin/orders/:code/activate', requireSuperadmin, async (req: Request, res: Response) => {
  try {
    const code = String(req.params.code || '').trim().toUpperCase();
    const [orders, licenses] = await Promise.all([getOrders(), getLicenses()]);
    const orderIdx = orders.findIndex((o) => o.code.toUpperCase() === code);
    if (orderIdx === -1) {
      return res.status(404).json({ error: `Solicitud ${code} no encontrada.` });
    }

    const order = orders[orderIdx];
    const existingLicense = order.licensePin
      ? licenses.find((l) => l.pin === order.licensePin)
      : licenses.find((l) => l.orderCode === order.code);

    const now = new Date().toISOString();
    let license: LicenseRecord;
    let nextLicenses = [...licenses];

    if (existingLicense) {
      license = { ...existingLicense, status: 'active', updatedAt: now };
      nextLicenses = nextLicenses.map((l) => (l.id === existingLicense.id ? license : l));
    } else {
      const pin = generateLicensePin(licenses);
      license = {
        id: crypto.randomUUID(),
        pin,
        customerName: order.customerName,
        whatsapp: order.whatsapp,
        planId: order.planId,
        status: 'active',
        whiteLabel: order.planId === 'agency',
        orderCode: order.code,
        createdAt: now,
        updatedAt: now,
      };
      nextLicenses = [license, ...licenses];
    }

    const updatedOrder: SubscriptionOrder = {
      ...order,
      status: 'activated',
      licensePin: license.pin,
      updatedAt: now,
    };

    const nextOrders = [...orders];
    nextOrders[orderIdx] = updatedOrder;

    await Promise.all([saveLicenses(nextLicenses), saveOrders(nextOrders)]);

    const whatsappMessage = `¡Hola ${license.customerName}! 🎉 Tu suscripción al ${order.planName} (${order.code}) ya está activa.\n\n🔑 Tu PIN de Licencia es: ${license.pin}\n\nIngresa a la plataforma, toca "🔑 Ingresar con mi PIN de Licencia" e introduce ${license.pin} para desbloquear todo el estudio de IA y clonación vocal.`;

    return res.json({
      order: updatedOrder,
      license,
      whatsappMessage,
    });
  } catch (error: any) {
    console.error('Error activating order:', error);
    return res.status(500).json({ error: error?.message || 'Error al activar el pedido.' });
  }
});

// Superadmin: delete order
app.delete('/api/superadmin/orders/:code', requireSuperadmin, async (req: Request, res: Response) => {
  try {
    const code = String(req.params.code || '').trim().toUpperCase();
    const orders = await getOrders();
    const nextOrders = orders.filter((o) => o.code.toUpperCase() !== code);
    await saveOrders(nextOrders);
    return res.json({ deleted: true, code });
  } catch (error: any) {
    console.error('Error deleting order:', error);
    return res.status(500).json({ error: 'No se pudo eliminar la solicitud.' });
  }
});

// Superadmin: create manual license
app.post('/api/superadmin/licenses', requireSuperadmin, async (req: Request, res: Response) => {
  try {
    const customerName = String(req.body?.customerName || '').trim();
    const whatsapp = sanitizeWhatsapp(String(req.body?.whatsapp || ''));
    const planId = String(req.body?.planId || 'creator') as PlanId;
    const requestedPin = String(req.body?.pin || '').trim();
    const whiteLabel = Boolean(req.body?.whiteLabel);

    if (customerName.length < 2) {
      return res.status(400).json({ error: 'Nombre del cliente obligatorio.' });
    }
    if (!(planId in PLANS_CATALOG)) {
      return res.status(400).json({ error: 'Plan inválido.' });
    }

    const licenses = await getLicenses();
    let pin = requestedPin;
    if (pin) {
      if (!/^\d{4}$/.test(pin)) {
        return res.status(400).json({ error: 'El PIN debe tener exactamente 4 dígitos.' });
      }
      if (licenses.some((l) => l.pin === pin)) {
        return res.status(409).json({ error: `El PIN ${pin} ya está asignado a otro cliente.` });
      }
    } else {
      pin = generateLicensePin(licenses);
    }

    const now = new Date().toISOString();
    const license: LicenseRecord = {
      id: crypto.randomUUID(),
      pin,
      customerName,
      whatsapp,
      planId,
      status: 'active',
      whiteLabel,
      createdAt: now,
      updatedAt: now,
    };

    await saveLicenses([license, ...licenses]);
    return res.status(201).json({ license });
  } catch (error: any) {
    console.error('Error creating license:', error);
    return res.status(500).json({ error: error?.message || 'Error al crear la licencia.' });
  }
});

// Superadmin: update license (edit, pause/activate, toggle whiteLabel)
app.patch('/api/superadmin/licenses/:id', requireSuperadmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id || '').trim();
    const licenses = await getLicenses();
    const idx = licenses.findIndex((l) => l.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Licencia no encontrada.' });
    }

    const current = licenses[idx];
    const body = req.body || {};

    let nextPin = current.pin;
    if (body.pin !== undefined) {
      const candidate = String(body.pin).trim();
      if (!/^\d{4}$/.test(candidate)) {
        return res.status(400).json({ error: 'El PIN debe tener exactamente 4 dígitos numéricos.' });
      }
      if (licenses.some((l) => l.id !== id && l.pin === candidate)) {
        return res.status(409).json({ error: `El PIN ${candidate} ya está en uso por otra licencia.` });
      }
      nextPin = candidate;
    }

    const nextPlanId: PlanId =
      body.planId && body.planId in PLANS_CATALOG ? (body.planId as PlanId) : current.planId;
    const nextStatus =
      body.status === 'active' || body.status === 'paused' ? body.status : current.status;

    const updated: LicenseRecord = {
      ...current,
      customerName:
        body.customerName !== undefined ? String(body.customerName).trim() || current.customerName : current.customerName,
      whatsapp: body.whatsapp !== undefined ? sanitizeWhatsapp(String(body.whatsapp)) : current.whatsapp,
      planId: nextPlanId,
      pin: nextPin,
      status: nextStatus,
      whiteLabel: body.whiteLabel !== undefined ? Boolean(body.whiteLabel) : current.whiteLabel,
      updatedAt: new Date().toISOString(),
    };

    const nextLicenses = [...licenses];
    nextLicenses[idx] = updated;
    await saveLicenses(nextLicenses);

    return res.json({ license: updated });
  } catch (error: any) {
    console.error('Error updating license:', error);
    return res.status(500).json({ error: 'No se pudo actualizar la licencia.' });
  }
});

// Superadmin: delete license
app.delete('/api/superadmin/licenses/:id', requireSuperadmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id || '').trim();
    const licenses = await getLicenses();
    const nextLicenses = licenses.filter((l) => l.id !== id);
    await saveLicenses(nextLicenses);
    return res.json({ deleted: true, id });
  } catch (error: any) {
    console.error('Error deleting license:', error);
    return res.status(500).json({ error: 'No se pudo eliminar la licencia.' });
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
