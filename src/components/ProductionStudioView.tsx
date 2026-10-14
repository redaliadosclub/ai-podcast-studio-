import React, { useState, useEffect } from 'react';
import { ElevenLabsSettings, GeneratedEpisodeAudio } from '../types';
import { Play, Pause, Download, Sliders, Key, Mic, RefreshCw, Sparkles, CheckCircle2, AlertCircle, FileDown, FastForward, Copy, ExternalLink, Code } from 'lucide-react';

interface ProductionStudioViewProps {
  scriptText: string;
  scriptTitle: string;
  onGoToEditor: () => void;
}

export const ProductionStudioView: React.FC<ProductionStudioViewProps> = ({
  scriptText,
  scriptTitle,
  onGoToEditor,
}) => {
  // Engine Selection: ElevenLabs vs Gemini TTS vs F5-TTS Open Source
  const [engine, setEngine] = useState<'elevenlabs' | 'gemini' | 'f5tts'>('elevenlabs');

  // ElevenLabs Configuration state
  const [settings, setSettings] = useState<ElevenLabsSettings>(() => {
    const saved = localStorage.getItem('voicelab_elevenlabs_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      apiKey: '',
      voiceId: '',
      voiceName: 'Mi Voz Clonada',
      stability: 0.42,
      similarityBoost: 0.82,
      style: 0.12,
      useSpeakerBoost: true,
      modelId: 'eleven_multilingual_v2',
    };
  });

  // Gemini TTS preview settings
  const [geminiVoice, setGeminiVoice] = useState<'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr'>('Puck');
  const [geminiStyle, setGeminiStyle] = useState('Conversational, warm podcast narrator');

  // Generation & Audio Playback State
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasCopiedScript, setHasCopiedScript] = useState<boolean>(false);

  // History of generated episodes
  const [episodes, setEpisodes] = useState<GeneratedEpisodeAudio[]>(() => {
    const saved = localStorage.getItem('voicelab_generated_episodes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('voicelab_elevenlabs_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('voicelab_generated_episodes', JSON.stringify(episodes));
  }, [episodes]);

  const handleVerifyElevenLabs = async () => {
    setErrorMessage(null);
    if (!settings.apiKey.trim()) {
      setErrorMessage('Ingresa tu API Key de ElevenLabs antes de verificar.');
      return;
    }

    try {
      setIsVerifying(true);
      setVerifyStatus(null);

      const res = await fetch('/api/elevenlabs/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: settings.apiKey,
          voiceId: settings.voiceId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Fallo de verificación.');
      }

      if (data.voice) {
        setVerifyStatus(`Voz verificada: "${data.voice.name}" (${data.voice.category || 'clonada'})`);
      } else if (data.subscription) {
        setVerifyStatus(
          `API Key válida · Caracteres: ${data.subscription.character_count} / ${data.subscription.character_limit}`
        );
      }
    } catch (err: any) {
      setErrorMessage('Error de verificación: ' + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSynthesize = async () => {
    setErrorMessage(null);
    if (!scriptText.trim()) {
      setErrorMessage('No hay texto en el guion. Ve a la pestaña Editor de Guiones para escribirlo o generarlo.');
      return;
    }

    try {
      setIsSynthesizing(true);

      if (engine === 'elevenlabs') {
        if (!settings.apiKey.trim()) {
          setErrorMessage('Por favor ingresa tu API Key de ElevenLabs para generar con este motor.');
          setIsSynthesizing(false);
          return;
        }
        if (!settings.voiceId.trim()) {
          setErrorMessage('Por favor ingresa el Voice ID de tu voz clonada en ElevenLabs.');
          setIsSynthesizing(false);
          return;
        }

        const res = await fetch('/api/elevenlabs/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: settings.apiKey,
            voiceId: settings.voiceId,
            text: scriptText,
            stability: settings.stability,
            similarityBoost: settings.similarityBoost,
            style: settings.style,
            useSpeakerBoost: settings.useSpeakerBoost,
            modelId: settings.modelId,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Error al sintetizar con ElevenLabs.');
        }

        const audioBlob = b64toBlob(data.audioBase64, data.mimeType || 'audio/mpeg');
        const audioUrl = URL.createObjectURL(audioBlob);
        setCurrentAudioUrl(audioUrl);

        const newEpisode: GeneratedEpisodeAudio = {
          id: `ep-${Date.now()}`,
          scriptTitle: scriptTitle || 'Episodio de Podcast',
          date: new Date().toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          }),
          durationSec: Math.round(scriptText.split(/\s+/).length / 2.2),
          audioUrl,
          engineUsed: 'ElevenLabs',
          modelOrVoice: settings.voiceName || settings.voiceId,
          settingsSnapshot: {
            stability: settings.stability,
            similarityBoost: settings.similarityBoost,
            style: settings.style,
          },
        };
        setEpisodes((prev) => [newEpisode, ...prev]);
      } else {
        // Gemini Audio Preview engine
        const res = await fetch('/api/tts/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: scriptText,
            voiceName: geminiVoice,
            style: geminiStyle,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Error en síntesis con Gemini Audio.');
        }

        const audioBlob = b64toBlob(data.audioBase64, 'audio/wav');
        const audioUrl = URL.createObjectURL(audioBlob);
        setCurrentAudioUrl(audioUrl);

        const newEpisode: GeneratedEpisodeAudio = {
          id: `ep-${Date.now()}`,
          scriptTitle: scriptTitle || 'Episodio de Prueba',
          date: new Date().toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          }),
          durationSec: Math.round(scriptText.split(/\s+/).length / 2.2),
          audioUrl,
          engineUsed: 'Gemini TTS',
          modelOrVoice: geminiVoice,
        };
        setEpisodes((prev) => [newEpisode, ...prev]);
      }
    } catch (err: any) {
      setErrorMessage('Error en la generación de audio: ' + err.message);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptText);
    setHasCopiedScript(true);
    setTimeout(() => setHasCopiedScript(false), 2500);
  };

  const handleDownloadColabNotebook = () => {
    const notebook = {
      nbformat: 4,
      nbformat_minor: 0,
      metadata: {
        colab: { provenance: [] },
        language_info: { name: 'python' },
        accelerator: 'GPU',
      },
      cells: [
        {
          cell_type: 'markdown',
          metadata: {},
          source: [
            '# Clonación de Voz 100% Gratuita con F5-TTS para Podcasts\n',
            'Este cuaderno utiliza una GPU T4 gratuita en Google Colab para clonar tu voz a partir de tu muestra de audio del teleprómter sin pagar suscripciones.',
          ],
        },
        {
          cell_type: 'code',
          metadata: {},
          execution_count: null,
          outputs: [],
          source: [
            '# 1. Instalar dependencias oficiales de F5-TTS\n',
            '!pip install -q f5-tts torchaudio gradio',
          ],
        },
        {
          cell_type: 'code',
          metadata: {},
          execution_count: null,
          outputs: [],
          source: [
            '# 2. Generar el podcast clonado con tu voz\n',
            'from f5_tts.api import F5TTS\n',
            'import IPython.display as ipd\n\n',
            'f5tts = F5TTS()\n\n',
            '# Sube tu muestra WAV (ej. muestra_narrativa.wav) al panel de archivos de Colab (icono carpeta a la izquierda)\n',
            'ref_audio = "muestra_narrativa.wav"\n',
            'ref_text = "Hay dias en los que crees tener el control absoluto de las cosas..."\n\n',
            `gen_text = """${scriptText.replace(/"/g, '\\"')}"""\n\n`,
            'print("Clonando podcast con F5-TTS...")\n',
            'wav, sr, _ = f5tts.infer(\n',
            '    ref_file=ref_audio,\n',
            '    ref_text=ref_text,\n',
            '    gen_text=gen_text,\n',
            '    file_wave_name="podcast_f5tts_master.wav"\n',
            ')\n\n',
            'print("¡Podcast generado exitosamente en podcast_f5tts_master.wav!")\n',
            'ipd.Audio("podcast_f5tts_master.wav")',
          ],
        },
      ],
    };

    const blob = new Blob([JSON.stringify(notebook, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `f5tts_clonador_${(scriptTitle || 'podcast').toLowerCase().replace(/\s+/g, '_')}.ipynb`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadScript = () => {
    const blob = new Blob(
      [
        `# ${scriptTitle || 'Episodio de Podcast'}\nFecha: ${new Date().toLocaleDateString()}\n\n${scriptText}`,
      ],
      { type: 'text/markdown;charset=utf-8' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(scriptTitle || 'episodio').toLowerCase().replace(/\s+/g, '_')}_guion.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border border-neutral-800 bg-neutral-900/60 rounded-xl p-6">
        <div className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-2">
          FASE 5 · PRODUCCIÓN Y GENERACIÓN DE AUDIO
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          Estudio de Síntesis y Masterización
        </h1>
        <p className="text-sm text-neutral-400 max-w-2xl leading-relaxed">
          Genera el episodio completo con tu voz clonada en ElevenLabs o prueba el ritmo y la cadencia
          con el motor nativo de preescucha antes de consumir caracteres.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-800/80 text-xs text-amber-200 flex items-center justify-between gap-3">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-amber-400 hover:text-amber-200 text-xs underline shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Engine Switcher */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-neutral-900 border border-neutral-800 rounded-lg w-fit">
        <button
          onClick={() => setEngine('elevenlabs')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors ${
            engine === 'elevenlabs'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          ElevenLabs (Tu Voz Clonada)
        </button>
        <button
          onClick={() => setEngine('gemini')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors ${
            engine === 'gemini'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Gemini TTS (Preescucha Gratis)
        </button>
        <button
          onClick={() => setEngine('f5tts')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors ${
            engine === 'f5tts'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          F5-TTS (Clonación 100% Gratis)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Engine Settings & Triggers (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {engine === 'elevenlabs' ? (
            <div className="border border-neutral-800 bg-neutral-900 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-sm font-semibold text-white">
                    Credenciales de ElevenLabs
                  </h2>
                </div>
                <button
                  onClick={handleVerifyElevenLabs}
                  disabled={isVerifying || !settings.apiKey}
                  className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                >
                  {isVerifying ? 'Verificando...' : 'Comprobar'}
                </button>
              </div>

              {verifyStatus && (
                <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800 text-xs text-emerald-400 flex items-center gap-2 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{verifyStatus}</span>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">
                    API Key de ElevenLabs:
                  </label>
                  <input
                    type="password"
                    value={settings.apiKey}
                    onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                    placeholder="sk_..."
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 placeholder-neutral-600 focus:border-indigo-500 focus:outline-none font-mono"
                  />
                  <span className="text-[10px] text-neutral-500 mt-0.5 block">
                    Obtenla en elevenlabs.io &gt; Profile &gt; API Keys. Se guarda en tu navegador.
                  </span>
                </div>

                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">
                    Voice ID (Voz Clonada):
                  </label>
                  <input
                    type="text"
                    value={settings.voiceId}
                    onChange={(e) => setSettings({ ...settings, voiceId: e.target.value })}
                    placeholder="Ej: 21m00Tcm4TlvDq8ikWAM"
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 placeholder-neutral-600 focus:border-indigo-500 focus:outline-none font-mono"
                  />
                  <span className="text-[10px] text-neutral-500 mt-0.5 block">
                    Copia el ID desde ElevenLabs VoiceLab tras subir tus muestras.
                  </span>
                </div>

                {/* Calibrated Sliders */}
                <div className="pt-2 border-t border-neutral-800 space-y-3">
                  <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Parámetros para Entonación Orgánica:
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-neutral-300 mb-1">
                      <span>Stability:</span>
                      <span className="font-mono tabular-nums text-indigo-400">
                        {Math.round(settings.stability * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="0.9"
                      step="0.02"
                      value={settings.stability}
                      onChange={(e) =>
                        setSettings({ ...settings, stability: parseFloat(e.target.value) })
                      }
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-neutral-300 mb-1">
                      <span>Clarity / Similarity:</span>
                      <span className="font-mono tabular-nums text-indigo-400">
                        {Math.round(settings.similarityBoost * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.4"
                      max="1.0"
                      step="0.02"
                      value={settings.similarityBoost}
                      onChange={(e) =>
                        setSettings({ ...settings, similarityBoost: parseFloat(e.target.value) })
                      }
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-neutral-300 mb-1">
                      <span>Style Exaggeration:</span>
                      <span className="font-mono tabular-nums text-indigo-400">
                        {Math.round(settings.style * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="0.4"
                      step="0.02"
                      value={settings.style}
                      onChange={(e) =>
                        setSettings({ ...settings, style: parseFloat(e.target.value) })
                      }
                      className="w-full accent-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : engine === 'gemini' ? (
            <div className="border border-neutral-800 bg-neutral-900 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-neutral-800">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-white">
                  Motor Nativo Gemini TTS
                </h2>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">
                    Voz Base de Preescucha:
                  </label>
                  <select
                    value={geminiVoice}
                    onChange={(e: any) => setGeminiVoice(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Puck">Puck (Masculina enérgica y jovial)</option>
                    <option value="Charon">Charon (Masculina profunda y reflexiva)</option>
                    <option value="Kore">Kore (Femenina cálida y clara)</option>
                    <option value="Fenrir">Fenrir (Masculina resonante)</option>
                    <option value="Zephyr">Zephyr (Femenina dinámica)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">
                    Estilo de Locución:
                  </label>
                  <input
                    type="text"
                    value={geminiStyle}
                    onChange={(e) => setGeminiStyle(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="p-3 bg-neutral-950 rounded border border-neutral-800/80 text-neutral-400 text-[11px] leading-relaxed">
                  Esta preescucha te permite evaluar la duración, las pausas y la naturalidad del texto
                  sin gastar tu cuota mensual de ElevenLabs.
                </div>
              </div>
            </div>
          ) : (
            /* F5-TTS Open Source Suite */
            <div className="border border-neutral-800 bg-neutral-900 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold text-white">
                    Clonación Libre F5-TTS (Cero Coste)
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                  Zero-Shot Free
                </span>
              </div>

              <div className="space-y-3 text-xs text-neutral-300 leading-relaxed">
                <p>
                  F5-TTS te permite clonar tu voz usando cualquier muestra WAV de 10 a 15 segundos
                  (de las que grabaste en el Teleprómter) sin pagar suscripción y sin límites mensuales.
                </p>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleDownloadColabNotebook}
                    className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Cuaderno Colab (1-Clic .ipynb)</span>
                  </button>

                  <a
                    href="https://huggingface.co/spaces/mrfakename/E2-F5-TTS"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-neutral-200 font-medium text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Abrir Clonador Web en Hugging Face</span>
                  </a>

                  <button
                    onClick={handleCopyScript}
                    className="w-full py-2 px-3 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white font-mono text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {hasCopiedScript ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">¡Guion Copiado al Portapapeles!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Guion para Pegarlo en Colab/HF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Synthesize Button */}
          <button
            onClick={handleSynthesize}
            disabled={isSynthesizing || !scriptText.trim()}
            className="w-full py-3.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md"
          >
            {isSynthesizing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generando Audio del Episodio...</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>
                  {engine === 'elevenlabs'
                    ? 'Generar Episodio con Mi Voz (ElevenLabs)'
                    : engine === 'gemini'
                    ? 'Generar Preescucha Inmediata (Gemini)'
                    : 'Probar Preescucha Rápida (Gemini Audio)'}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Audio Player & Export & History (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Master Audio Deck */}
          <div className="border border-neutral-800 bg-neutral-900 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <span className="text-xs font-semibold text-white uppercase tracking-wider">
                Reproductor Master del Episodio
              </span>
              <span className="text-xs text-neutral-400 truncate max-w-[200px]">
                {scriptTitle || 'Episodio Actual'}
              </span>
            </div>

            {currentAudioUrl ? (
              <div className="space-y-4">
                <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 space-y-3">
                  <audio
                    id="master-audio-player"
                    controls
                    src={currentAudioUrl}
                    className="w-full h-10 block"
                    onLoadedMetadata={(e: any) => setAudioDuration(e.target.duration)}
                  />

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500 text-[11px]">Velocidad:</span>
                      {[0.9, 1.0, 1.15, 1.25].map((spd) => (
                        <button
                          key={spd}
                          onClick={() => {
                            setPlaybackSpeed(spd);
                            const aud = document.getElementById(
                              'master-audio-player'
                            ) as HTMLAudioElement;
                            if (aud) aud.playbackRate = spd;
                          }}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono tabular-nums ${
                            playbackSpeed === spd
                              ? 'bg-indigo-600 text-white font-semibold'
                              : 'text-neutral-400 hover:text-white bg-neutral-900'
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>

                    <a
                      href={currentAudioUrl}
                      download={`${(scriptTitle || 'episodio').toLowerCase().replace(/\s+/g, '_')}_master.mp3`}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar Audio Master</span>
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-32 bg-neutral-950 rounded-lg border border-neutral-800 flex flex-col items-center justify-center text-center p-4">
                <Mic className="w-6 h-6 text-neutral-600 mb-2" />
                <div className="text-xs text-neutral-400">
                  Ningún audio generado en esta sesión aún
                </div>
                <div className="text-[11px] text-neutral-600 mt-0.5">
                  Haz clic en &quot;Generar Episodio&quot; para iniciar la síntesis.
                </div>
              </div>
            )}

            {/* Script Text Summary & Download */}
            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
              <span className="truncate max-w-[280px]">
                Guion activo: {scriptText.length} caracteres
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={onGoToEditor}
                  className="text-neutral-300 hover:text-white transition-colors"
                >
                  Editar Guion
                </button>
                <span aria-hidden="true">·</span>
                <button
                  onClick={handleDownloadScript}
                  className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Descargar Guion (.md)
                </button>
              </div>
            </div>
          </div>

          {/* Episode History */}
          {episodes.length > 0 && (
            <div className="border border-neutral-800 bg-neutral-900 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  Historial de Episodios Generados ({episodes.length})
                </span>
                <span className="text-[11px] text-neutral-500">Guardado en caché local</span>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {episodes.map((ep) => (
                  <div
                    key={ep.id}
                    className="p-3 rounded-lg bg-neutral-950 border border-neutral-800/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="text-neutral-200 font-semibold truncate">
                        {ep.scriptTitle}
                      </div>
                      <div className="text-[11px] text-neutral-500 flex items-center gap-2 mt-0.5">
                        <span>{ep.date}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-indigo-400">{ep.engineUsed}</span>
                        <span aria-hidden="true">·</span>
                        <span>{ep.modelOrVoice}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setCurrentAudioUrl(ep.audioUrl)}
                        className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
                        title="Cargar en reproductor"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={ep.audioUrl}
                        download={`${ep.scriptTitle.toLowerCase().replace(/\s+/g, '_')}.mp3`}
                        className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
                        title="Descargar"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function b64toBlob(b64Data: string, contentType = ''): Blob {
  const byteCharacters = atob(b64Data);
  const arrayBuffer = new ArrayBuffer(byteCharacters.length);
  const byteArray = new Uint8Array(arrayBuffer);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([arrayBuffer], { type: contentType });
}
