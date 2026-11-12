// Cloudflare Worker entry point for full-stack API and static asset delivery
export interface Env {
  GEMINI_API_KEY?: string;
  DB?: any;
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Global CORS preflight handler
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        },
      });
    }

    // Route: /api/voice-clone/synthesize
    if (url.pathname === '/api/voice-clone/synthesize') {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Método no permitido. Usa POST.' }), {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            Allow: 'POST, OPTIONS',
          },
        });
      }

      try {
        const body: any = await request.json();
        const text = body.text || '';
        const cleanScript = text.replace(/\[[^\]]+\]/g, '').trim();

        if (!cleanScript) {
          return new Response(JSON.stringify({ error: 'El texto es obligatorio.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }

        const apiKey = env.GEMINI_API_KEY || '';
        if (!apiKey) {
          return new Response(
            JSON.stringify({
              error: 'Configura la variable GEMINI_API_KEY en Cloudflare Dashboard (Workers > Settings > Variables and Secrets).',
            }),
            { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent?key=${apiKey}`;
        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: cleanScript }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Charon',
                  },
                },
              },
            },
          }),
        });

        if (!geminiRes.ok) {
          const errText = await geminiRes.text();
          return new Response(
            JSON.stringify({ error: `Error de Gemini (${geminiRes.status}): ${errText.slice(0, 150)}` }),
            { status: geminiRes.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }

        const data: any = await geminiRes.json();
        const base64Audio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!base64Audio) {
          return new Response(
            JSON.stringify({ error: 'No se recibió audio del sintetizador.' }),
            { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }

        return new Response(
          JSON.stringify({
            audioBase64: base64Audio,
            mimeType: 'audio/wav',
            source: 'cloudflare_worker_gemini_tts',
            message: 'Audio sintetizado con éxito vía Cloudflare Worker.',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: 'Error en el Worker: ' + (err?.message || 'Error desconocido') }),
          { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
    }

    // Default: Fallback to static assets compiled by Vite
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return new Response('No asset handler found', { status: 404 });
  },
};
