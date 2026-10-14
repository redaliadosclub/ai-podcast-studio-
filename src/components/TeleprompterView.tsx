import React, { useState, useRef, useEffect } from 'react';
import { TELEPROMPTER_SCRIPTS } from '../data/teleprompterScripts';
import { TeleprompterScriptItem, RecordedSample, AudioQualityMetrics } from '../types';
import { audioBufferToWav, analyzeAudioBuffer, formatDuration } from '../utils/audioUtils';
import { Mic, Square, Play, RotateCcw, Download, CheckCircle, AlertTriangle, Sparkles, Volume2, Info, Upload, ArrowRight } from 'lucide-react';

interface TeleprompterViewProps {
  onSaveSample: (sample: RecordedSample) => void;
  savedSampleIds: string[];
  onProceedToStep2?: () => void;
}

export const TeleprompterView: React.FC<TeleprompterViewProps> = ({
  onSaveSample,
  savedSampleIds,
  onProceedToStep2,
}) => {
  const [selectedScript, setSelectedScript] = useState<TeleprompterScriptItem>(TELEPROMPTER_SCRIPTS[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [currentDb, setCurrentDb] = useState(-60);
  const [peakDbObserved, setPeakDbObserved] = useState(-60);

  // Take review state
  const [lastTakeBuffer, setLastTakeBuffer] = useState<AudioBuffer | null>(null);
  const [lastTakeBlob, setLastTakeBlob] = useState<Blob | null>(null);
  const [lastTakeUrl, setLastTakeUrl] = useState<string | null>(null);
  const [lastTakeMetrics, setLastTakeMetrics] = useState<AudioQualityMetrics | null>(null);
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);

  // Audio Context & Recording Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecordingCleanup();
      if (lastTakeUrl) URL.revokeObjectURL(lastTakeUrl);
    };
  }, [lastTakeUrl]);

  const stopRecordingCleanup = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      setMicPermissionError(null);
      setIsSavedSuccessfully(false);
      setLastTakeBuffer(null);
      setLastTakeBlob(null);
      if (lastTakeUrl) URL.revokeObjectURL(lastTakeUrl);
      setLastTakeUrl(null);
      setLastTakeMetrics(null);
      recordedChunksRef.current = [];
      setRecordingSeconds(0);
      setPeakDbObserved(-60);
      setCurrentSentenceIndex(0);

      // Attempt microphone capture with resilient fallback
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
      } catch (firstErr) {
        // Fallback to standard audio constraint if specific flags are unsupported
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (permErr: any) {
          console.error('No se pudo acceder al micrófono:', permErr);
          const isDenied =
            permErr.name === 'NotAllowedError' ||
            permErr.message?.toLowerCase().includes('denied') ||
            permErr.message?.toLowerCase().includes('permission');
          setMicPermissionError(
            isDenied
              ? 'El acceso al micrófono fue denegado por el navegador o contenedor. Puedes habilitar el permiso de micrófono en la barra de direcciones o subir un archivo de audio directamente abajo.'
              : `No se pudo conectar al micrófono (${permErr.name || 'Error'}): ${permErr.message || 'Verifica que haya un micrófono conectado.'}`
          );
          return;
        }
      }

      mediaStreamRef.current = stream;
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const fullBlob = new Blob(recordedChunksRef.current, { type: recorder.mimeType });
        const arrayBuffer = await fullBlob.arrayBuffer();
        try {
          const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
          setLastTakeBuffer(decoded);

          const wavBlob = audioBufferToWav(decoded);
          setLastTakeBlob(wavBlob);
          const wavUrl = URL.createObjectURL(wavBlob);
          setLastTakeUrl(wavUrl);

          const metrics = analyzeAudioBuffer(decoded);
          setLastTakeMetrics(metrics);
        } catch (decodeErr) {
          console.error('Error decoding recorded audio:', decodeErr);
        }
      };

      recorder.start(100);
      setIsRecording(true);

      // Start Timer
      const startTime = performance.now();
      timerIntervalRef.current = setInterval(() => {
        const elapsed = (performance.now() - startTime) / 1000;
        setRecordingSeconds(elapsed);
      }, 50);

      // Start Visualizer
      drawWaveform();
    } catch (err: any) {
      console.error('Error general al iniciar grabación:', err);
      setMicPermissionError(err.message || 'Error inesperado al iniciar la grabación.');
    }
  };

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setMicPermissionError(null);
      setIsSavedSuccessfully(false);
      setLastTakeBuffer(null);
      setLastTakeBlob(null);
      if (lastTakeUrl) URL.revokeObjectURL(lastTakeUrl);
      setLastTakeUrl(null);
      setLastTakeMetrics(null);

      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const decoded = await audioCtx.decodeAudioData(arrayBuffer);
      setLastTakeBuffer(decoded);

      const wavBlob = audioBufferToWav(decoded);
      setLastTakeBlob(wavBlob);
      const wavUrl = URL.createObjectURL(wavBlob);
      setLastTakeUrl(wavUrl);

      const metrics = analyzeAudioBuffer(decoded);
      setLastTakeMetrics(metrics);
      setRecordingSeconds(decoded.duration);
    } catch (err: any) {
      console.error('Error al decodificar archivo de audio:', err);
      setMicPermissionError('No se pudo procesar el archivo de audio. Verifica que sea un formato válido (.wav, .mp3, .m4a, .ogg).');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  };

  // Canvas Waveform & VU Meter draw loop
  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      // Calculate instantaneous dB
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;
      const normalized = avg / 255;
      const db = normalized > 0 ? 20 * Math.log10(normalized) * 2 : -70;
      setCurrentDb(Math.max(-70, Math.min(0, Math.round(db))));
      setPeakDbObserved((prev) => Math.max(prev, Math.round(db)));

      // Draw bars
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        // Gradient from green to violet
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#10b981'); // emerald
        gradient.addColorStop(0.7, '#6366f1'); // indigo
        gradient.addColorStop(1, '#ec4899'); // pink peak

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    };

    render();
  };

  const handleSaveTake = () => {
    if (!lastTakeBlob || !lastTakeMetrics || !lastTakeUrl) return;

    const newSample: RecordedSample = {
      id: `sample-${Date.now()}`,
      scriptId: selectedScript.id,
      title: selectedScript.title,
      register: selectedScript.register,
      durationSec: Math.round(recordingSeconds * 10) / 10,
      timestamp: Date.now(),
      blobUrl: lastTakeUrl,
      audioBlob: lastTakeBlob,
      qualityMetrics: lastTakeMetrics,
    };

    onSaveSample(newSample);
    setIsSavedSuccessfully(true);
  };

  const isScriptCompleted = savedSampleIds.includes(selectedScript.id);

  return (
    <div className="space-y-8">
      {/* Overview & Instructions Header */}
      <div className="border border-neutral-800 bg-neutral-900/60 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 text-xs text-neutral-400 mb-2">
              <span className="font-semibold text-indigo-400">FASE 1 · ENTRENAMIENTO VOCAL</span>
              <span aria-hidden="true">·</span>
              <span>ElevenLabs VoiceLab Prep</span>
              <span aria-hidden="true">·</span>
              <span>WAV 44.1kHz Studio</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
              Teleprómter Guiado por el Director Vocal
            </h1>
            <p className="text-sm text-neutral-400 max-w-2xl leading-relaxed">
              Para que la IA no hable con tono de robot o GPS, graba estos 5 fragmentos con entonación
              auténtica. Sigue las directivas de voz indicadas en cada frase.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-neutral-950 border border-neutral-800 rounded-lg p-3 shrink-0">
            <div className="text-center px-2">
              <div className="text-xs text-neutral-500 uppercase tracking-wider mb-0.5">Progreso</div>
              <div className="text-lg font-bold text-white font-mono tabular-nums">
                {savedSampleIds.length} / {TELEPROMPTER_SCRIPTS.length}
              </div>
            </div>
            <div className="h-8 w-px bg-neutral-800" />
            <div className="text-center px-2">
              <div className="text-xs text-neutral-500 uppercase tracking-wider mb-0.5">Calidad Recomendada</div>
              <div className="text-xs text-emerald-400 font-medium">Instant Voice Cloning (IVC)</div>
            </div>
          </div>
        </div>

        {/* Script Selector Tabs */}
        <div className="mt-6 pt-6 border-t border-neutral-800/80">
          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
            Selecciona el registro a grabar:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {TELEPROMPTER_SCRIPTS.map((script, idx) => {
              const isSelected = selectedScript.id === script.id;
              const isDone = savedSampleIds.includes(script.id);
              return (
                <button
                  key={script.id}
                  onClick={() => {
                    if (isRecording) stopRecording();
                    setSelectedScript(script);
                    setCurrentSentenceIndex(0);
                    setIsSavedSuccessfully(false);
                    setLastTakeBuffer(null);
                  }}
                  className={`p-3 text-left rounded-lg border transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/30 text-white shadow-sm'
                      : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-xs font-mono text-neutral-500 tabular-nums">
                      0{idx + 1}.
                    </span>
                    {isDone && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Grabado
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-neutral-200 truncate">
                    {script.categoryName}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1 flex items-center justify-between">
                    <span>~{script.durationTargetSec}s</span>
                    <span>{script.sentences.length} frases</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Director Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Teleprompter & Coaching Prompts (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Director's Advice Box */}
          <div className="border border-indigo-900/40 bg-indigo-950/20 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">
                    Directiva Vocal: {selectedScript.emotionLabel}
                  </h3>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  {selectedScript.generalDirectorNote}
                </p>
                <div className="pt-2 text-[11px] text-neutral-400 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>{selectedScript.phoneticPurpose}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Teleprompter Display */}
          <div className="border border-neutral-800 bg-neutral-900/80 rounded-xl p-6 relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                Texto en Pantalla ({selectedScript.sentences.length} oraciones)
              </span>
              <span className="text-xs text-neutral-400">
                Lee con pausas naturales
              </span>
            </div>

            <div className="space-y-6">
              {selectedScript.sentences.map((sentence, sIdx) => {
                const isActive = isRecording && currentSentenceIndex === sIdx;
                return (
                  <div
                    key={sIdx}
                    onClick={() => setCurrentSentenceIndex(sIdx)}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      isActive
                        ? 'border-indigo-500/80 bg-indigo-950/40 shadow-md ring-1 ring-indigo-500/30'
                        : 'border-neutral-800/60 bg-neutral-950/40 hover:border-neutral-700'
                    }`}
                  >
                    {/* Vocal Cue Banner */}
                    <div className="flex items-center gap-2 text-xs font-medium text-indigo-400 mb-2">
                      <Volume2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{sentence.cue}</span>
                    </div>

                    {/* Sentence text */}
                    <p className="text-base sm:text-lg leading-relaxed text-neutral-100 font-medium">
                      {sentence.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Audio Deck, Waveform & Diagnostics (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Recording Console */}
          <div className="border border-neutral-800 bg-neutral-900 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    isRecording ? 'bg-red-500 animate-pulse' : 'bg-neutral-600'
                  }`}
                />
                <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  {isRecording ? 'Grabando Toma en Vivo' : 'Estación Lista'}
                </span>
              </div>
              <div className="text-lg font-mono font-bold text-white tabular-nums">
                {formatDuration(recordingSeconds)}
              </div>
            </div>

            {/* Waveform Canvas */}
            <div className="relative h-28 bg-neutral-950 rounded-lg border border-neutral-800 overflow-hidden flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={400}
                height={112}
                className="w-full h-full block"
              />
              {!isRecording && !lastTakeBuffer && (
                <div className="absolute text-xs text-neutral-500 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-neutral-600" />
                  Presiona &quot;Grabar&quot; y lee el teleprómter
                </div>
              )}
            </div>

            {/* VU Meter Bar */}
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-neutral-400">
                <span>Nivel de Señal (dB): {currentDb} dB</span>
                <span>Pico: {peakDbObserved} dB</span>
              </div>
              <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden border border-neutral-800 flex">
                <div
                  className="h-full transition-all duration-75"
                  style={{
                    width: `${Math.max(0, Math.min(100, ((currentDb + 60) / 60) * 100))}%`,
                    backgroundColor:
                      currentDb > -3
                        ? '#ef4444'
                        : currentDb > -12
                        ? '#10b981'
                        : '#6366f1',
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-neutral-600 font-mono">
                <span>-60 dB (Silencio)</span>
                <span className="text-emerald-500">-12 dB (Óptimo)</span>
                <span className="text-red-500">0 dB (Saturación)</span>
              </div>
            </div>

            {/* Permission / Recording Error Banner */}
            {micPermissionError && (
              <div className="mt-4 p-3.5 rounded-lg bg-red-950/40 border border-red-800/80 text-xs text-red-200 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{micPermissionError}</p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={startRecording}
                    className="px-2.5 py-1 rounded bg-red-900/60 hover:bg-red-800 text-white font-medium text-[11px] transition-colors"
                  >
                    Reintentar Permiso de Micrófono
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-[11px] transition-colors flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    Cargar Archivo de Audio
                  </button>
                </div>
              </div>
            )}

            {/* Hidden File Input for Audio Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.wav,.mp3,.m4a,.ogg"
              onChange={handleAudioFileUpload}
              className="hidden"
            />

            {/* Main Action Buttons */}
            <div className="mt-6 pt-5 border-t border-neutral-800 flex items-center gap-2">
              {!isRecording ? (
                <>
                  <button
                    onClick={startRecording}
                    className="flex-1 py-3 px-4 rounded-lg bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Grabar esta Toma</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Cargar audio pregrabado (.wav, .mp3, .m4a)"
                    className="py-3 px-3 rounded-lg border border-neutral-700 hover:border-neutral-600 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="hidden sm:inline">Subir Audio</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex-1 py-3 px-4 rounded-lg bg-neutral-100 hover:bg-white text-neutral-900 font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Finalizar Toma
                </button>
              )}

              {lastTakeBuffer && !isRecording && (
                <button
                  onClick={startRecording}
                  title="Grabar de nuevo"
                  className="p-3 rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-800 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Post-Take Audio Review & Diagnostics */}
          {lastTakeMetrics && lastTakeUrl && (
            <div className="border border-neutral-800 bg-neutral-900/90 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  Diagnóstico de la Toma
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1 ${
                    lastTakeMetrics.status === 'optimal'
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                      : lastTakeMetrics.status === 'clipped'
                      ? 'bg-red-950/60 text-red-400 border border-red-800/60'
                      : 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                  }`}
                >
                  {lastTakeMetrics.status === 'optimal' ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <AlertTriangle className="w-3 h-3" />
                  )}
                  {lastTakeMetrics.status === 'optimal'
                    ? 'Acústica Óptima'
                    : lastTakeMetrics.status === 'clipped'
                    ? 'Saturado (Clipping)'
                    : 'Revisar Ganancia'}
                </span>
              </div>

              {/* Feedback Advice */}
              <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                {lastTakeMetrics.feedback}
              </p>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-neutral-950 p-2 rounded border border-neutral-800">
                  <div className="text-neutral-500 text-[10px]">Pico Máximo</div>
                  <div className="text-white font-mono font-medium mt-0.5">
                    {lastTakeMetrics.peakDb} dB
                  </div>
                </div>
                <div className="bg-neutral-950 p-2 rounded border border-neutral-800">
                  <div className="text-neutral-500 text-[10px]">RMS Promedio</div>
                  <div className="text-white font-mono font-medium mt-0.5">
                    {lastTakeMetrics.averageDb} dB
                  </div>
                </div>
                <div className="bg-neutral-950 p-2 rounded border border-neutral-800">
                  <div className="text-neutral-500 text-[10px]">Duración</div>
                  <div className="text-white font-mono font-medium mt-0.5">
                    {Math.round(recordingSeconds)}s
                  </div>
                </div>
              </div>

              {/* Native Audio Player Preview */}
              <div className="pt-2">
                <audio
                  controls
                  src={lastTakeUrl}
                  className="w-full h-9 rounded bg-neutral-950"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleSaveTake}
                  disabled={isSavedSuccessfully}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                    isSavedSuccessfully
                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-600/40 cursor-default'
                      : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {isSavedSuccessfully
                    ? 'Muestra Guardada con Éxito'
                    : 'Guardar Muestra para ElevenLabs'}
                </button>

                <a
                  href={lastTakeUrl}
                  download={`elevenlabs_${selectedScript.register}_take.wav`}
                  className="p-2.5 rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
                  title="Descargar archivo WAV"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {/* Milestone Step 1 Unlocked Card */}
          {savedSampleIds.length > 0 && onProceedToStep2 && (
            <div className="border border-emerald-800/80 bg-emerald-950/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-900/60 border border-emerald-600/60 text-emerald-300 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">
                    ¡Hito 1 Completado! Muestra vocal guardada
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Has desbloqueado el Paso 2: Gestor y calibración de muestras WAV.
                  </div>
                </div>
              </div>
              <button
                onClick={onProceedToStep2}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm shrink-0"
              >
                <span>Continuar al Paso 2</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
