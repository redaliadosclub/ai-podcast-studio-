import React from 'react';
import { RecordedSample } from '../types';
import { Download, Trash2, CheckCircle2, Play, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface SamplesManagerViewProps {
  samples: RecordedSample[];
  onDeleteSample: (id: string) => void;
  onGoToTeleprompter: () => void;
  onGoToGuide: () => void;
  onGoToCloning?: () => void;
}

export const SamplesManagerView: React.FC<SamplesManagerViewProps> = ({
  samples,
  onDeleteSample,
  onGoToTeleprompter,
  onGoToGuide,
  onGoToCloning,
}) => {
  const totalDuration = samples.reduce((acc, curr) => acc + curr.durationSec, 0);
  const minutes = Math.floor(totalDuration / 60);
  const seconds = Math.round(totalDuration % 60);

  const isReadinessGood = totalDuration >= 60; // At least 1 min for IVC

  const registerLabels: Record<string, string> = {
    narrative: 'Narrativo & Cálido',
    energy: 'Dinamismo & Pasión',
    explanatory: 'Explicativo & Preciso',
    intimate: 'Íntimo & Reflexivo',
    conversational: 'Espontáneo & Cierre',
  };

  return (
    <div className="space-y-8">
      {/* Readiness Summary Header */}
      <div className="border border-neutral-800 bg-neutral-900/60 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-2">
              FASE 2 · PAQUETE DE ENTRENAMIENTO PARA ELEVENLABS
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
              Gestor de Muestras Vocales
            </h1>
            <p className="text-sm text-neutral-400 max-w-2xl leading-relaxed">
              Descarga estos fragmentos en formato WAV puro (44.1kHz / 16-bit) para subirlos a tu cuenta
              en ElevenLabs VoiceLab. Cada archivo contiene una faceta emocional distinta de tu voz.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-neutral-950 border border-neutral-800 rounded-lg p-4 shrink-0">
            <div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider mb-0.5">
                Tiempo Acumulado
              </div>
              <div className="text-xl font-bold text-white font-mono tabular-nums">
                {minutes}m {seconds.toString().padStart(2, '0')}s
              </div>
              <div className="text-[11px] text-neutral-400 mt-1">
                {isReadinessGood ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Listo para Instant Voice Cloning
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Recomendado: &gt; 1 min
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Next step prompt */}
        <div className="mt-6 pt-5 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-neutral-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Tus muestras no contienen compresión destructiva; son idóneas para evitar artefactos metálicos.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onGoToTeleprompter}
              className="text-xs font-medium text-neutral-300 hover:text-white px-3 py-1.5 rounded-lg border border-neutral-800 hover:border-neutral-700 transition-colors"
            >
              + Grabar Otra Muestra
            </button>
            {onGoToCloning && (
              <button
                onClick={onGoToCloning}
                className="text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-700/60 px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span>⚡ Clonar con F5-TTS In-App</span>
              </button>
            )}
            <button
              onClick={onGoToGuide}
              className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
            >
              <span>Confirmar Muestras y Continuar al Paso 3</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Samples List */}
      {samples.length === 0 ? (
        <div className="border border-neutral-800/80 bg-neutral-900/30 rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
            <Play className="w-5 h-5 ml-0.5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">No tienes muestras guardadas aún</h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1 leading-relaxed">
              Ingresa al teleprómter dirigido, activa el micrófono y graba los fragmentos fonéticos
              para calibrar tu modelo de voz.
            </p>
          </div>
          <button
            onClick={onGoToTeleprompter}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Ir al Teleprómter de Grabación
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
            <span>Tomas Registradas ({samples.length})</span>
            <span>Formato: WAV 44.1kHz PCM</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {samples.map((sample, idx) => (
              <div
                key={sample.id}
                className="border border-neutral-800 bg-neutral-900/80 rounded-xl p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
                      <span className="font-mono text-neutral-500 tabular-nums">0{idx + 1}.</span>
                      <span className="text-indigo-400 font-medium">
                        {registerLabels[sample.register] || sample.register}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{sample.durationSec}s</span>
                    </div>
                    <h3 className="text-sm font-semibold text-white">{sample.title}</h3>
                  </div>

                  <button
                    onClick={() => onDeleteSample(sample.id)}
                    title="Eliminar toma"
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Audio Player */}
                <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800/80">
                  <audio controls src={sample.blobUrl} className="w-full h-8 block" />
                </div>

                {/* Metrics Details */}
                <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/60">
                  <div className="flex items-center gap-3">
                    <span>
                      Pico:{' '}
                      <strong className="text-neutral-200 font-mono">
                        {sample.qualityMetrics.peakDb} dB
                      </strong>
                    </span>
                    <span>
                      RMS:{' '}
                      <strong className="text-neutral-200 font-mono">
                        {sample.qualityMetrics.averageDb} dB
                      </strong>
                    </span>
                  </div>

                  <a
                    href={sample.blobUrl}
                    download={`elevenlabs_${sample.register}_sample.wav`}
                    className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar WAV</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
