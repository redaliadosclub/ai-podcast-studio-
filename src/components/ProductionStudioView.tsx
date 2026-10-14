import React, { useState, useEffect, useRef } from 'react';
import { ElevenLabsSettings, GeneratedEpisodeAudio, RecordedSample } from '../types';
import { TELEPROMPTER_SCRIPTS } from '../data/teleprompterScripts';
import { Play, Pause, Download, Sliders, Key, Mic, RefreshCw, Sparkles, CheckCircle2, AlertCircle, FileDown, FileText, FastForward, Copy, ExternalLink, Code, Upload, Volume2, Globe, Radio } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface ProductionStudioViewProps {
  scriptText: string;
  scriptTitle: string;
  samples?: RecordedSample[];
  onGoToEditor: () => void;
}

export const ProductionStudioView: React.FC<ProductionStudioViewProps> = ({
  scriptText,
  scriptTitle,
  samples = [],
  onGoToEditor,
}) => {
  // Engine Selection: ElevenLabs vs Gemini TTS vs F5-TTS / XTTS Open Source
  const [engine, setEngine] = useState<'elevenlabs' | 'gemini' | 'f5tts'>('f5tts');

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

  // F5-TTS / XTTS In-App Voice Cloning state
  const [selectedSampleId, setSelectedSampleId] = useState<string>(() => {
    return samples.length > 0 ? samples[0].id : 'preset';
  });
  const [f5RefText, setF5RefText] = useState<string>(
    'Hay días en los que crees tener el control absoluto de las cosas... Hasta que, de pronto, una llamada telefónica de tres minutos lo cambia absolutamente todo.'
  );
  const [f5Mode, setF5Mode] = useState<'app_direct' | 'custom_endpoint'>('app_direct');
  const [customEndpointUrl, setCustomEndpointUrl] = useState<string>('');
  const [customApiToken, setCustomApiToken] = useState<string>('');
  const [uploadedRefAudioBase64, setUploadedRefAudioBase64] = useState<string | null>(null);
  const [uploadedRefAudioName, setUploadedRefAudioName] = useState<string | null>(null);
  const fileUploadInputRef = useRef<HTMLInputElement | null>(null);

  // Generation & Audio Playback State
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
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

  // Sync ref text when selected sample changes
  useEffect(() => {
    if (selectedSampleId === 'preset' || selectedSampleId === 'upload') return;
    const sample = samples.find((s) => s.id === selectedSampleId);
    if (sample) {
      const matchedScript = TELEPROMPTER_SCRIPTS.find((ts) => ts.id === sample.scriptId);
      if (matchedScript) {
        const fullText = matchedScript.sentences.map((s) => s.text).join(' ');
        setF5RefText(fullText);
      }
    }
  }, [selectedSampleId, samples]);

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

  const handleUploadCustomAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const b64 = result.split(',')[1];
        setUploadedRefAudioBase64(b64);
        setUploadedRefAudioName(file.name);
        setSelectedSampleId('upload');
        setSuccessNotice(`Muestra cargada: ${file.name}`);
        setTimeout(() => setSuccessNotice(null), 3000);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setErrorMessage('No se pudo leer el archivo de audio subido.');
    }
  };

  const getActiveSampleBase64 = async (): Promise<string | null> => {
    if (selectedSampleId === 'upload') {
      return uploadedRefAudioBase64;
    }
    const sample = samples.find((s) => s.id === selectedSampleId);
    if (sample?.audioBlob) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          resolve(res.split(',')[1] || null);
        };
        reader.readAsDataURL(sample.audioBlob);
      });
    }
    return null;
  };

  const handleSynthesize = async () => {
    setErrorMessage(null);
    setSuccessNotice(null);
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
        setSuccessNotice('¡Episodio generado con éxito en ElevenLabs!');
      } else if (engine === 'f5tts') {
        // F5-TTS / XTTS Open-Source Voice Cloning Studio (Option C)
        const refAudioB64 = await getActiveSampleBase64();

        const res = await fetch('/api/voice-clone/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: scriptText,
            refText: f5RefText,
            refAudioBase64: refAudioB64,
            endpointUrl: f5Mode === 'custom_endpoint' ? customEndpointUrl : undefined,
            apiToken: f5Mode === 'custom_endpoint' ? customApiToken : undefined,
            mode: f5Mode === 'custom_endpoint' ? 'custom_url' : 'native_neural',
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Error en la clonación de voz.');
        }

        const audioBlob = b64toBlob(data.audioBase64, data.mimeType || 'audio/wav');
        const audioUrl = URL.createObjectURL(audioBlob);
        setCurrentAudioUrl(audioUrl);

        const newEpisode: GeneratedEpisodeAudio = {
          id: `ep-${Date.now()}`,
          scriptTitle: scriptTitle || 'Episodio Clonado en Español',
          date: new Date().toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          }),
          durationSec: Math.round(scriptText.split(/\s+/).length / 2.2),
          audioUrl,
          engineUsed: 'F5-TTS / XTTS',
          modelOrVoice:
            f5Mode === 'custom_endpoint'
              ? 'Endpoint GPU F5-TTS'
              : 'Studio Neural Español (Zero-Shot)',
        };
        setEpisodes((prev) => [newEpisode, ...prev]);
        setSuccessNotice('¡Podcast generado en español con tu muestra vocal!');
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
          scriptTitle: scriptTitle || 'Preescucha de Prueba',
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
        setSuccessNotice('¡Preescucha generada exitosamente!');
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
            '# 🎙️ Clonación de Voz 100% en ESPAÑOL con F5-TTS y XTTS v2\n',
            'Este cuaderno soluciona las dependencias de Google Colab (evitando conflictos de numpy) y garantiza que el audio se genere **100% en español** mediante la transcripción fonética correspondiente.\n\n',
            '### ⚠️ PASO CRÍTICO DE DEPENDENCIAS EN COLAB:\n',
            'Al instalar paquetes en Colab, es normal ver advertencias de `numpy`. Si ves el mensaje:\n',
            '> *WARNING: You must restart the runtime in order to use newly installed versions.*\n\n',
            'Simplemente ve al menú superior: **Entorno de ejecución > Reiniciar sesión** (*Runtime > Restart session*) y ejecuta la celda 2 sin volver a ejecutar la celda 1.',
          ],
        },
        {
          cell_type: 'code',
          metadata: {},
          execution_count: null,
          outputs: [],
          source: [
            '# Celda 1: Instalación limpia de dependencias para F5-TTS\n',
            '!pip install -q --upgrade pip\n',
            '!pip install -q f5-tts torchaudio soundfile gradio\n',
            'print("✅ Dependencias instaladas. Si Colab te pide reiniciar la sesión, dale a Entorno de ejecución > Reiniciar sesión.")',
          ],
        },
        {
          cell_type: 'code',
          metadata: {},
          execution_count: null,
          outputs: [],
          source: [
            '# Celda 2: Generación del Podcast en ESPAÑOL con tu voz\n',
            'from f5_tts.api import F5TTS\n',
            'import IPython.display as ipd\n\n',
            '# Inicializar motor\n',
            'f5tts = F5TTS()\n\n',
            '# Sube tu muestra WAV (ej. muestra_narrativa.wav) al panel izquierdo de Colab\n',
            'ref_audio = "muestra_narrativa.wav"\n\n',
            '# IMPORTANTE: El texto de referencia debe estar escrito EXACTAMENTE en español tal como lo dijiste en el audio:\n',
            `ref_text = "${f5RefText.replace(/"/g, '\\"')}"\n\n`,
            '# Tu guion de podcast a sintetizar:\n',
            `gen_text = """${scriptText.replace(/"/g, '\\"')}"""\n\n`,
            'print("⏳ Sintetizando audio en español con F5-TTS...")\n',
            'wav, sr, _ = f5tts.infer(\n',
            '    ref_file=ref_audio,\n',
            '    ref_text=ref_text,\n',
            '    gen_text=gen_text,\n',
            '    file_wave_name="podcast_espanol_master.wav"\n',
            ')\n\n',
            'print("✨ ¡Podcast en español generado con éxito en podcast_espanol_master.wav!")\n',
            'ipd.Audio("podcast_espanol_master.wav")',
          ],
        },
        {
          cell_type: 'markdown',
          metadata: {},
          source: [
            '## 🌟 Alternativa Nativa en Español: Coqui XTTS v2\n',
            'Si prefieres un modelo nativamente entrenado para español de España y Latinoamérica sin necesidad de alinear texto de referencia:',
          ],
        },
        {
          cell_type: 'code',
          metadata: {},
          execution_count: null,
          outputs: [],
          source: [
            '# Alternativa XTTS v2 (Nativo Español)\n',
            '# !pip install -q TTS\n',
            '# from TTS.api import TTS\n',
            '# tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cuda")\n',
            '# tts.tts_to_file(text=gen_text, speaker_wav=ref_audio, language="es", file_path="podcast_xtts_es.wav")\n',
            '# ipd.Audio("podcast_xtts_es.wav")',
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
    a.download = `clonador_espanol_${(scriptTitle || 'podcast').toLowerCase().replace(/\s+/g, '_')}.ipynb`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTxt = () => {
    if (!scriptText.trim()) {
      setErrorMessage('No hay texto en el guion para exportar.');
      return;
    }
    const cleanTitle = (scriptTitle || 'guion_podcast').trim();
    const divider = '==================================================';
    const content = `${divider}
VOICELAB COACH · GUION DE PODCAST PARA CLONACIÓN
${divider}
Título: ${cleanTitle}
Fecha: ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
Longitud: ${scriptText.length} caracteres
Duración estimada: ~${Math.round(scriptText.split(/\s+/).length / 2.2)} seg
${divider}

${scriptText}
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_guion.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    if (!scriptText.trim()) {
      setErrorMessage('No hay texto en el guion para exportar.');
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const title = scriptTitle || 'Guion de Podcast';
      const cleanTitle = title.trim();
      const dateStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
      const wordCount = scriptText.trim().split(/\s+/).filter(Boolean).length;
      const durationSec = Math.round(wordCount / 2.2);
      const estMin = Math.floor(durationSec / 60);
      const estSec = durationSec % 60;

      // Header Bar
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 24, 'F');

      // Studio label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(129, 140, 248); // indigo-400
      doc.text('VOICELAB COACH · GUION MAESTRO PARA LOCUCIÓN', 14, 9);

      // Title in header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text(cleanTitle.slice(0, 50), 14, 18);

      // Meta info banner
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(0, 24, 8, 8, 'F');
      doc.rect(0, 24, 210, 8, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text(
        `Fecha: ${dateStr}   |   ${wordCount} palabras   |   Duración estimada: ~${estMin}m ${estSec}s   |   Marcadores de prosodia incluidos`,
        14,
        29.5
      );

      // Script Text Body
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const maxWidth = pageWidth - margin * 2;

      const paragraphs = scriptText.split('\n');
      let y = 39;
      const lineHeight = 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      for (const para of paragraphs) {
        if (!para.trim()) {
          y += 3.5;
          continue;
        }

        const lines = doc.splitTextToSize(para, maxWidth);
        for (const line of lines) {
          if (y + lineHeight > pageHeight - 16) {
            doc.addPage();
            y = 18;
          }

          if (line.includes('[') && line.includes(']')) {
            doc.setTextColor(79, 70, 229); // indigo-600
            doc.setFont('helvetica', 'bold');
          } else {
            doc.setTextColor(30, 41, 59); // slate-800
            doc.setFont('helvetica', 'normal');
          }

          doc.text(line, margin, y);
          y += lineHeight;
        }
        y += 2;
      }

      // Footer page numbering
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Página ${i} de ${totalPages} · VoiceLab Coach`,
          pageWidth / 2,
          pageHeight - 7,
          { align: 'center' }
        );
      }

      doc.save(`${cleanTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_guion.pdf`);
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      setErrorMessage('Error al generar el PDF: ' + (err?.message || 'Error desconocido'));
    }
  };

  const handleDownloadMd = () => {
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

  const activeSample = samples.find((s) => s.id === selectedSampleId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border border-neutral-800 bg-neutral-900/60 rounded-xl p-6">
        <div className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-2">
          FASE 5 · PRODUCCIÓN Y SÍNTESIS DE AUDIO
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          Estudio de Síntesis y Masterización
        </h1>
        <p className="text-sm text-neutral-400 max-w-2xl leading-relaxed">
          Genera el episodio completo con clonación de voz (F5-TTS Open Source o ElevenLabs) o realiza una preescucha
          rápida para evaluar cadencia y ritmo sin gastar créditos.
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

      {successNotice && (
        <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-800/80 text-xs text-emerald-300 flex items-center justify-between gap-3 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{successNotice}</span>
          </div>
          <button
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs underline shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Engine Switcher */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-neutral-900 border border-neutral-800 rounded-lg w-fit">
        <button
          onClick={() => setEngine('f5tts')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
            engine === 'f5tts'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>F5-TTS / XTTS (Clonación Directa)</span>
          <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-700/60">
            Opción C
          </span>
        </button>

        <button
          onClick={() => setEngine('elevenlabs')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors ${
            engine === 'elevenlabs'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          ElevenLabs (Voz Comercial)
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Engine Settings & Triggers (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {engine === 'f5tts' ? (
            /* Enhanced F5-TTS & XTTS Voice Cloning Suite (Option C) */
            <div className="border border-neutral-800 bg-neutral-900 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold text-white">
                    Clonador Vocal en Español (Opción C)
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                  Zero-Shot Spanish
                </span>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* 1. Voice Reference Sample Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-semibold text-neutral-300">
                      1. Muestra Vocal de Referencia (Tu Voz):
                    </label>
                    <button
                      type="button"
                      onClick={() => fileUploadInputRef.current?.click()}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Subir archivo WAV</span>
                    </button>
                  </div>

                  <input
                    ref={fileUploadInputRef}
                    type="file"
                    accept="audio/*,.wav,.mp3"
                    onChange={handleUploadCustomAudio}
                    className="hidden"
                  />

                  <select
                    value={selectedSampleId}
                    onChange={(e) => setSelectedSampleId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:border-emerald-500 focus:outline-none"
                  >
                    {samples.length > 0 ? (
                      samples.map((s, idx) => (
                        <option key={s.id} value={s.id}>
                          Toma {idx + 1}: {s.title} ({s.durationSec}s)
                        </option>
                      ))
                    ) : (
                      <option value="preset">Muestra Preset Narrativa (Voz de Demostración)</option>
                    )}
                    {uploadedRefAudioName && (
                      <option value="upload">Archivo Subido: {uploadedRefAudioName}</option>
                    )}
                  </select>

                  {/* Audio preview of reference sample */}
                  {activeSample?.blobUrl && (
                    <div className="mt-2 p-2 bg-neutral-950 rounded border border-neutral-800/80">
                      <div className="text-[10px] text-neutral-500 mb-1 flex items-center justify-between">
                        <span>Preescucha de tu muestra de referencia:</span>
                        <span className="text-emerald-400 font-mono">{activeSample.durationSec}s</span>
                      </div>
                      <audio controls src={activeSample.blobUrl} className="w-full h-7 block" />
                    </div>
                  )}
                </div>

                {/* 2. Reference Text in Spanish (Crucial to prevent English glitch) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-neutral-300">
                      2. Transcripción de Referencia (Texto en Español):
                    </label>
                    <span className="text-[10px] text-emerald-400 font-medium">
                      ✓ Obligatorio en Español
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={f5RefText}
                    onChange={(e) => setF5RefText(e.target.value)}
                    placeholder="Escribe exactamente lo que se dice en el audio de referencia..."
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs focus:border-emerald-500 focus:outline-none leading-relaxed"
                  />
                  <div className="p-2 bg-neutral-950 rounded border border-neutral-800/70 text-[11px] text-neutral-400 leading-normal mt-1">
                    💡 <strong className="text-neutral-200">¿Por qué te salía en inglés antes?</strong> Porque el modelo F5-TTS necesita que este texto coincida palabra por palabra con lo que dices en el audio. Al estar en español, el sintetizador fuerza fonética hispanohablante.
                  </div>
                </div>

                {/* 3. Synthesis Mode Switcher */}
                <div className="pt-2 border-t border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-300">Modo de Inferencia:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setF5Mode('app_direct')}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                          f5Mode === 'app_direct'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-neutral-950 text-neutral-400 hover:text-white'
                        }`}
                      >
                        Inmediato en App
                      </button>
                      <button
                        type="button"
                        onClick={() => setF5Mode('custom_endpoint')}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                          f5Mode === 'custom_endpoint'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-neutral-950 text-neutral-400 hover:text-white'
                        }`}
                      >
                        Endpoint GPU Propio
                      </button>
                    </div>
                  </div>

                  {f5Mode === 'custom_endpoint' && (
                    <div className="space-y-2 pt-2 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                      <div>
                        <label className="text-[11px] text-neutral-400 block mb-0.5">
                          URL de Inferencia (Hugging Face Space / Gradio / FastAPI):
                        </label>
                        <input
                          type="url"
                          value={customEndpointUrl}
                          onChange={(e) => setCustomEndpointUrl(e.target.value)}
                          placeholder="https://tu-usuario-f5-tts.hf.space/api/predict"
                          className="w-full p-2 rounded bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-neutral-400 block mb-0.5">
                          Token API (Opcional si el espacio es privado):
                        </label>
                        <input
                          type="password"
                          value={customApiToken}
                          onChange={(e) => setCustomApiToken(e.target.value)}
                          placeholder="hf_..."
                          className="w-full p-2 rounded bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Notebook & External Tools Helper */}
                <div className="pt-2 border-t border-neutral-800 flex items-center gap-2">
                  <button
                    onClick={handleDownloadColabNotebook}
                    className="flex-1 py-2 px-2.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white font-medium text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                    title="Descargar cuaderno Google Colab con código corregido sin conflictos de numpy"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cuaderno Colab Reparado</span>
                  </button>

                  <button
                    onClick={handleCopyScript}
                    className="py-2 px-2.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white text-[11px] flex items-center justify-center gap-1 transition-colors"
                    title="Copiar texto del guion"
                  >
                    {hasCopiedScript ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{hasCopiedScript ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : engine === 'elevenlabs' ? (
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
          ) : (
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
          )}

          {/* Synthesize Button */}
          <button
            onClick={handleSynthesize}
            disabled={isSynthesizing || !scriptText.trim()}
            className={`w-full py-3.5 px-4 rounded-lg text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md ${
              engine === 'f5tts'
                ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700'
                : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700'
            }`}
          >
            {isSynthesizing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>
                  {engine === 'f5tts'
                    ? 'Clonando Audio en Español...'
                    : 'Generando Audio del Episodio...'}
                </span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>
                  {engine === 'f5tts'
                    ? 'Generar Podcast con Mi Voz (Opción C)'
                    : engine === 'elevenlabs'
                    ? 'Generar Episodio con Mi Voz (ElevenLabs)'
                    : 'Generar Preescucha Inmediata (Gemini)'}
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
                      download={`${(scriptTitle || 'episodio').toLowerCase().replace(/\s+/g, '_')}_master.wav`}
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
                  Haz clic en &quot;Generar Podcast con Mi Voz&quot; para iniciar la síntesis.
                </div>
              </div>
            )}

            {/* Script Text Summary & Export (.txt / .pdf) */}
            <div className="pt-3 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-400">
              <span className="truncate max-w-[220px]">
                Guion activo: {scriptText.length} caracteres
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onGoToEditor}
                  className="px-2.5 py-1 rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
                >
                  Editar Guion
                </button>

                <div className="flex items-center gap-1.5 pl-1.5 border-l border-neutral-800">
                  <span className="text-[11px] text-neutral-500 font-medium">Exportar guion:</span>
                  <button
                    type="button"
                    onClick={handleDownloadTxt}
                    className="px-2.5 py-1 rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-indigo-400 hover:text-indigo-300 font-semibold transition-colors flex items-center gap-1"
                    title="Descargar guion en texto plano (.txt)"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>.TXT</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-700/60 text-indigo-300 hover:text-white font-semibold transition-colors flex items-center gap-1 shadow-sm"
                    title="Descargar guion maquetado en formato PDF (.pdf)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>.PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadMd}
                    className="px-2 py-1 rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-200 text-[11px] transition-colors"
                    title="Descargar en formato Markdown (.md)"
                  >
                    .MD
                  </button>
                </div>
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
                        <span
                          className={`font-medium ${
                            ep.engineUsed === 'F5-TTS / XTTS'
                              ? 'text-emerald-400'
                              : 'text-indigo-400'
                          }`}
                        >
                          {ep.engineUsed}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{ep.modelOrVoice}</span>
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
                        download={`${ep.scriptTitle.toLowerCase().replace(/\s+/g, '_')}.wav`}
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
