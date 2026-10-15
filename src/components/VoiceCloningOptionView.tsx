import React, { useState, useRef, useEffect } from 'react';
import { RecordedSample } from '../types';
import { TELEPROMPTER_SCRIPTS } from '../data/teleprompterScripts';
import {
  Mic,
  Square,
  Play,
  Pause,
  Download,
  Sparkles,
  Upload,
  Radio,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Sliders,
  Volume2,
  Terminal,
  ExternalLink,
  Copy,
  Check,
  FileText,
  HelpCircle,
  Cpu,
  Layers
} from 'lucide-react';

interface VoiceCloningOptionViewProps {
  samples: RecordedSample[];
  currentScriptText: string;
  onSendToProduction: (text: string, title: string) => void;
  onGoToTeleprompter: () => void;
  onGoToEditor: () => void;
}

export const VoiceCloningOptionView: React.FC<VoiceCloningOptionViewProps> = ({
  samples,
  currentScriptText,
  onSendToProduction,
  onGoToTeleprompter,
  onGoToEditor,
}) => {
  // Voice Reference Source: 'recorded' | 'in_app_mic' | 'upload'
  const [sourceType, setSourceType] = useState<'recorded' | 'in_app_mic' | 'upload'>(
    samples.length > 0 ? 'recorded' : 'in_app_mic'
  );

  // Selected sample from step 1
  const [selectedSampleId, setSelectedSampleId] = useState<string>(
    samples.length > 0 ? samples[0].id : ''
  );

  // In-app live recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micAudioBlob, setMicAudioBlob] = useState<Blob | null>(null);
  const [micAudioUrl, setMicAudioUrl] = useState<string | null>(null);
  const [micAudioBase64, setMicAudioBase64] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  // File upload state
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedBlobUrl, setUploadedBlobUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reference Text (Speech transcription of the 10-15s sample)
  const [refText, setRefText] = useState<string>(
    'Hay días en los que crees tener el control absoluto de las cosas... Hasta que, de pronto, una llamada telefónica de tres minutos lo cambia absolutamente todo.'
  );

  // Target Text to Synthesize
  const [targetText, setTargetText] = useState<string>(
    `¡Hola a todos! Bienvenidos a este nuevo episodio de prueba.
Estoy probando mi propia voz clonada directamente dentro de la aplicación.
La entonación fluye de forma orgánica, respetando mis pausas y mi cadencia natural.`
  );

  // Engine configuration: 'in_app' (direct neural) vs 'custom_endpoint' (Gradio/Colab/HF)
  const [cloneMode, setCloneMode] = useState<'in_app' | 'custom_endpoint'>('in_app');
  const [customEndpointUrl, setCustomEndpointUrl] = useState<string>('');
  const [customApiToken, setCustomApiToken] = useState<string>('');
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0);

  // Synthesis state
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [clonedAudioUrl, setClonedAudioUrl] = useState<string | null>(null);
  const [clonedAudioBlob, setClonedAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Audio Playback
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Accordion for Colab / F5-TTS dependency troubleshoot
  const [showColabGuide, setShowColabGuide] = useState<boolean>(false);
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);

  // Keep refText in sync when selecting a teleprompter sample
  useEffect(() => {
    if (sourceType === 'recorded' && selectedSampleId) {
      const s = samples.find((x) => x.id === selectedSampleId);
      if (s) {
        const matched = TELEPROMPTER_SCRIPTS.find((ts) => ts.id === s.scriptId);
        if (matched) {
          const joined = matched.sentences.map((sent) => sent.text).join(' ');
          setRefText(joined);
        }
      }
    }
  }, [sourceType, selectedSampleId, samples]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (micAudioUrl) URL.revokeObjectURL(micAudioUrl);
      if (clonedAudioUrl) URL.revokeObjectURL(clonedAudioUrl);
      if (uploadedBlobUrl) URL.revokeObjectURL(uploadedBlobUrl);
    };
  }, []);

  // Handle in-app recording
  const startRecording = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 44100,
          echoCancellation: false,
          noiseSuppression: false,
        },
      });

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setMicAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setMicAudioUrl(url);

        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          const base64 = res.split(',')[1];
          setMicAudioBase64(base64);
        };
        reader.readAsDataURL(blob);

        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setErrorMessage('No se pudo acceder al micrófono: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setErrorMessage('Por favor selecciona un archivo de audio válido (WAV o MP3).');
      return;
    }

    setUploadedFileName(file.name);
    const url = URL.createObjectURL(file);
    setUploadedBlobUrl(url);

    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      const base64 = res.split(',')[1];
      setUploadedBase64(base64);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  // Get active reference audio base64
  const getActiveRefBase64 = async (): Promise<string | null> => {
    if (sourceType === 'in_app_mic') {
      return micAudioBase64;
    }
    if (sourceType === 'upload') {
      return uploadedBase64;
    }
    if (sourceType === 'recorded') {
      const sample = samples.find((s) => s.id === selectedSampleId);
      if (sample && sample.audioBlob) {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(sample.audioBlob);
        });
      }
    }
    return null;
  };

  // Trigger voice cloning synthesis
  const handleTriggerCloning = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!targetText.trim()) {
      setErrorMessage('Ingresa o selecciona el texto que deseas que pronuncie tu voz clonada.');
      return;
    }

    if (!refText.trim()) {
      setErrorMessage('El texto de referencia (lo que se dice en la muestra de audio) es requerido por F5-TTS para alinear los fonemas.');
      return;
    }

    try {
      setIsSynthesizing(true);
      const refAudioBase64 = await getActiveRefBase64();

      const payload = {
        text: targetText,
        refText,
        refAudioBase64,
        voiceSpeed,
        mode: cloneMode === 'custom_endpoint' ? 'custom_url' : 'native_neural',
        endpointUrl: cloneMode === 'custom_endpoint' ? customEndpointUrl : undefined,
        apiToken: cloneMode === 'custom_endpoint' ? customApiToken : undefined,
      };

      const res = await fetch('/api/voice-clone/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ocurrió un error durante la síntesis.');
      }

      if (data.audioBase64) {
        const byteCharacters = atob(data.audioBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: data.mimeType || 'audio/wav' });

        if (clonedAudioUrl) URL.revokeObjectURL(clonedAudioUrl);
        const newUrl = URL.createObjectURL(blob);
        setClonedAudioUrl(newUrl);
        setClonedAudioBlob(blob);
        setSuccessMessage('¡Audio clonado generado con éxito! Escucha el resultado a continuación.');
      } else {
        throw new Error('No se recibió audio válido del motor de clonación.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al conectar con el motor de clonación.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleDownloadClonedAudio = () => {
    if (!clonedAudioUrl) return;
    const a = document.createElement('a');
    a.href = clonedAudioUrl;
    a.download = `voicelab_f5_cloned_${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSendScriptToProduction = () => {
    onSendToProduction(targetText, 'Episodio Clonado F5-TTS');
  };

  const copyColabFix = () => {
    const text = `# Solución limpia para F5-TTS en Google Colab sin conflictos de numpy
!pip install --upgrade pip
!pip install "numpy<2.0.0" "gradio-client==1.11.0"
!pip install f5-tts --no-deps
!pip install vocos einx encodec torchdiffeq ema-pytorch transformers==4.46.3

# Para síntesis en ESPAÑOL (evita que responda en inglés):
# Usa el checkpoint español:
# --model "f5-tts-spanish" o pasa el argumento --language "es"`;
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2500);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="border border-neutral-800 bg-neutral-900/60 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>OPCIÓN C · CLONACIÓN F5-TTS DIRECTA EN LA APP</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
              Laboratorio de Clonación In-App (F5-TTS)
            </h1>
            <p className="text-sm text-neutral-400 max-w-2xl leading-relaxed">
              Graba o selecciona una muestra de voz de 10 a 15 segundos y clónala directamente dentro de la plataforma sin necesidad de registrarte en servicios de pago externos.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowColabGuide(!showColabGuide)}
              className="px-3.5 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-950 border border-neutral-800 rounded-lg transition-colors flex items-center gap-2"
            >
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>Fix Colab / Notebook</span>
            </button>
          </div>
        </div>
      </div>

      {/* Accordion: Colab / F5-TTS Dependency Fix */}
      {showColabGuide && (
        <div className="border border-amber-900/50 bg-amber-950/20 rounded-xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-300">
                  ¿Por qué fallaba el Notebook `Spanish-F5.ipynb` o devolvía audio en inglés?
                </h3>
                <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                  Google Colab actualizó recientemente su entorno a <strong>numpy 2.x</strong>, mientras que <code>f5-tts</code> requiere <strong>numpy 1.26.4</strong>. Cuando pip intenta resolverlos, lanza advertencias de incompatibilidad y pide reiniciar el entorno (<em>&quot;You must restart the runtime&quot;</em>). Además, si no se especifica el modelo en español o el idioma <code>es</code>, F5-TTS usa por defecto los pesos en inglés/mandarín.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowColabGuide(false)}
              className="text-neutral-400 hover:text-white text-xs"
            >
              Cerrar
            </button>
          </div>

          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 text-xs font-mono space-y-2">
            <div className="flex items-center justify-between text-neutral-400 pb-2 border-b border-neutral-800">
              <span>Celda corregida para Colab (copiar y pegar al inicio del notebook):</span>
              <button
                onClick={copyColabFix}
                className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-sans font-medium"
              >
                {copiedSnippet ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar celda</span>
                  </>
                )}
              </button>
            </div>
            <pre className="text-neutral-300 whitespace-pre-wrap text-[11px] leading-relaxed">
{`# 1. Instalar dependencias limpias con numpy 1.x
!pip install -q "numpy<2.0.0" "gradio-client==1.11.0"
!pip install -q f5-tts --no-deps
!pip install -q vocos einx encodec torchdiffeq ema-pytorch transformers==4.46.3

# 2. Reiniciar entorno (Runtime > Restart session) y correr inferencia en español con el modelo:
# f5tts_infer-cli --model "f5-tts-spanish" --ref_audio "tu_muestra.wav" --ref_text "..." --gen_text "..."`}
            </pre>
          </div>
          <p className="text-xs text-neutral-400">
            <strong>¿La mejor parte?</strong> Con este componente integrado aquí en la app, <em>no necesitas lidiar con nada de eso</em>: puedes clonar tu voz directamente desde la interfaz.
          </p>
        </div>
      )}

      {/* Main Grid: Input Step 1 (Reference Audio) & Step 2 (Target Speech) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Reference Audio & Reference Text */}
        <div className="border border-neutral-800 bg-neutral-900 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-mono text-xs font-bold">
                1
              </div>
              <h2 className="text-sm font-semibold text-white">
                Muestra Vocal de Referencia (10-15s)
              </h2>
            </div>
            <span className="text-xs text-neutral-400">Requerido por F5-TTS</span>
          </div>

          {/* Source Tabs: Teleprompter Samples vs In-App Mic vs Upload */}
          <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs">
            <button
              onClick={() => setSourceType('recorded')}
              disabled={samples.length === 0}
              className={`py-2 px-3 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 ${
                sourceType === 'recorded'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : samples.length === 0
                  ? 'text-neutral-600 cursor-not-allowed'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Muestras ({samples.length})</span>
            </button>

            <button
              onClick={() => setSourceType('in_app_mic')}
              className={`py-2 px-3 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 ${
                sourceType === 'in_app_mic'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Mic className="w-3.5 h-3.5 text-indigo-400" />
              <span>Grabar Aquí</span>
            </button>

            <button
              onClick={() => setSourceType('upload')}
              className={`py-2 px-3 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 ${
                sourceType === 'upload'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Subir WAV/MP3</span>
            </button>
          </div>

          {/* Source 1: Teleprompter Samples */}
          {sourceType === 'recorded' && (
            <div className="space-y-3 bg-neutral-950 p-4 rounded-lg border border-neutral-800">
              <label className="text-xs font-semibold text-neutral-300 block">
                Selecciona la muestra grabada en el Teleprómter:
              </label>
              <select
                value={selectedSampleId}
                onChange={(e) => setSelectedSampleId(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {samples.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} · {s.durationSec.toFixed(1)}s ({s.register})
                  </option>
                ))}
              </select>

              {samples.find((s) => s.id === selectedSampleId) && (
                <div className="pt-2 flex items-center justify-between text-xs text-neutral-400">
                  <span>Muestra acústica lista para clonación</span>
                  <audio
                    src={samples.find((s) => s.id === selectedSampleId)?.blobUrl}
                    controls
                    className="h-7 max-w-[200px]"
                  />
                </div>
              )}
            </div>
          )}

          {/* Source 2: In-App Mic Recording */}
          {sourceType === 'in_app_mic' && (
            <div className="space-y-4 bg-neutral-950 p-4 rounded-lg border border-neutral-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">Grabación directa con micrófono</h4>
                  <p className="text-[11px] text-neutral-400">
                    Lee en voz alta el texto de referencia durante 10-15 segundos con voz natural.
                  </p>
                </div>
                <div className="text-sm font-mono font-bold text-indigo-400 tabular-nums">
                  {Math.floor(recordingSeconds / 60)}:
                  {(recordingSeconds % 60).toString().padStart(2, '0')}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="px-4 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Iniciar Grabación</span>
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="px-4 py-2.5 text-xs font-semibold text-white bg-neutral-800 hover:bg-neutral-700 border border-red-500/50 rounded-lg transition-colors flex items-center gap-2 animate-pulse"
                  >
                    <Square className="w-4 h-4 text-red-400" />
                    <span>Detener Grabación ({recordingSeconds}s)</span>
                  </button>
                )}

                {micAudioUrl && !isRecording && (
                  <div className="flex items-center gap-2 flex-1">
                    <audio src={micAudioUrl} controls className="h-8 w-full" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Source 3: File Upload */}
          {sourceType === 'upload' && (
            <div className="space-y-4 bg-neutral-950 p-4 rounded-lg border border-neutral-800">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-800 hover:border-indigo-500/50 rounded-lg text-center cursor-pointer transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-neutral-500 mb-2" />
                <span className="text-xs font-medium text-neutral-200">
                  {uploadedFileName ? uploadedFileName : 'Haz clic para seleccionar un archivo WAV o MP3'}
                </span>
                <span className="text-[11px] text-neutral-500 mt-1">
                  Recomendado: 10 a 30 segundos, audio limpio sin música de fondo
                </span>
              </div>

              {uploadedBlobUrl && (
                <div className="flex items-center gap-2 pt-2">
                  <audio src={uploadedBlobUrl} controls className="h-8 w-full" />
                </div>
              )}
            </div>
          )}

          {/* Reference Text (Crucial for F5-TTS) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <span>Texto Exacto Pronunciado en la Muestra (Ref Text)</span>
              </label>
              <span className="text-[11px] text-indigo-400 font-medium">
                Indispensable para Flow Matching
              </span>
            </div>
            <textarea
              rows={3}
              value={refText}
              onChange={(e) => setRefText(e.target.value)}
              placeholder="Escribe exactamente lo que dijiste en la grabación de audio..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
            />
            <p className="text-[11px] text-neutral-500">
              F5-TTS compara el audio con este texto para aprender tu timbre, ritmo y formantes vocales.
            </p>
          </div>
        </div>

        {/* Right Column: Target Text & Synthesis Settings */}
        <div className="border border-neutral-800 bg-neutral-900 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-mono text-xs font-bold">
                2
              </div>
              <h2 className="text-sm font-semibold text-white">
                Texto a Sintetizar con tu Voz Clonada
              </h2>
            </div>
            <button
              onClick={() => setTargetText(currentScriptText)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              title="Copiar guion activo del editor"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Cargar Guion de la App</span>
            </button>
          </div>

          {/* Presets */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px]">
            <span className="text-neutral-500 shrink-0">Plantillas rápidas:</span>
            <button
              onClick={() =>
                setTargetText(
                  '¡Hola a todos! Bienvenidos a este nuevo episodio de prueba. Estoy probando mi propia voz clonada directamente dentro de la aplicación con entonación natural.'
                )
              }
              className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded text-neutral-300 whitespace-nowrap"
            >
              Prueba Inicial (30s)
            </button>
            <button
              onClick={() =>
                setTargetText(
                  'Durante mucho tiempo pensé que una voz sintética siempre sonaría fría... Pero cuando escuchas tu propia cadencia y tus pausas, te das cuenta del salto cuántico que dimos.'
                )
              }
              className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded text-neutral-300 whitespace-nowrap"
            >
              Podcast Reflexivo
            </button>
          </div>

          <textarea
            rows={5}
            value={targetText}
            onChange={(e) => setTargetText(e.target.value)}
            placeholder="Escribe el texto que quieres que tu clon recite..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
          />

          {/* Execution Engine Selector */}
          <div className="space-y-4 pt-1 border-t border-neutral-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300">Modo de Ejecución F5-TTS</span>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300">
                  <input
                    type="radio"
                    name="f5Mode"
                    checked={cloneMode === 'in_app'}
                    onChange={() => setCloneMode('in_app')}
                    className="accent-indigo-500"
                  />
                  <span>In-App Directo</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300">
                  <input
                    type="radio"
                    name="f5Mode"
                    checked={cloneMode === 'custom_endpoint'}
                    onChange={() => setCloneMode('custom_endpoint')}
                    className="accent-indigo-500"
                  />
                  <span>Endpoint HuggingFace / Gradio</span>
                </label>
              </div>
            </div>

            {cloneMode === 'custom_endpoint' && (
              <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                    URL de la API Gradio o Space de Hugging Face:
                  </label>
                  <input
                    type="text"
                    value={customEndpointUrl}
                    onChange={(e) => setCustomEndpointUrl(e.target.value)}
                    placeholder="https://usuario-f5-tts-spanish.hf.space/api/predict"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                    Token Bearer HF (Opcional si el Space es privado):
                  </label>
                  <input
                    type="password"
                    value={customApiToken}
                    onChange={(e) => setCustomApiToken(e.target.value)}
                    placeholder="hf_..."
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>
            )}

            {/* Voice Speed */}
            <div className="flex items-center justify-between bg-neutral-950 px-4 py-2.5 rounded-lg border border-neutral-800">
              <span className="text-xs text-neutral-300">Velocidad de locución:</span>
              <div className="flex items-center gap-2">
                {[0.9, 1.0, 1.1, 1.25].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setVoiceSpeed(spd)}
                    className={`px-2 py-1 text-[11px] rounded font-mono ${
                      voiceSpeed === spd
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Error or Success feedback */}
            {errorMessage && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-xs text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Trigger Button */}
            <button
              onClick={handleTriggerCloning}
              disabled={isSynthesizing}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:cursor-not-allowed"
            >
              {isSynthesizing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Procesando clonación vocal con F5-TTS...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Activar Clonación Vocal y Generar Audio Ahora</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Result Player & Next Steps (When audio is generated) */}
      {clonedAudioUrl && (
        <div className="border border-emerald-900/40 bg-neutral-900 rounded-xl p-6 space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Audio Sintetizado con tu Voz Clonada</h3>
                <p className="text-xs text-neutral-400">
                  Generado mediante el flujo F5-TTS In-App con entonación conversacional.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleDownloadClonedAudio}
                className="px-3.5 py-2 text-xs font-semibold text-neutral-200 hover:text-white bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar WAV</span>
              </button>

              <button
                onClick={handleSendScriptToProduction}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
              >
                <span>Llevar a Master Final (Paso 5)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 flex items-center gap-4">
            <audio
              ref={audioPlayerRef}
              src={clonedAudioUrl}
              controls
              className="w-full h-10"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
        <button
          onClick={onGoToTeleprompter}
          className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white border border-neutral-800 rounded-lg hover:bg-neutral-900 transition-colors"
        >
          ← Volver a Grabación (Paso 1)
        </button>

        <button
          onClick={onGoToEditor}
          className="px-4 py-2 text-xs font-semibold text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-2"
        >
          <span>Ir a Redacción de Guion (Paso 4)</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
