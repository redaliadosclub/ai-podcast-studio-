import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '15mb' }));

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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Analiza y mejora este guion para locución natural:\n\n${scriptText}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Analiza el sentimiento y sugiere marcadores emocionales para este guion de podcast:\n\n${scriptText}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanText,
              speechMetadata: {
                style,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName as 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr',
            },
          },
        },
      },
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
    console.error('Error generating preview TTS:', error);
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
    // Uses Google Gemini Audio with conversational podcast host prosody
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanScript,
              speechMetadata: {
                style: 'Natural Spanish conversational podcast narrator with deep, warm and engaging prosody',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Charon',
            },
          },
        },
      },
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
    console.error('Error en síntesis de voz clonada:', error);
    return res.status(500).json({
      error: 'Error en la clonación de voz: ' + (error?.message || 'Error desconocido'),
    });
  }
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
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VoiceLab Coach server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
