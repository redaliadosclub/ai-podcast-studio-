import React from 'react';
import { StudioStepId, StudioStepInfo } from '../types';
import { Check, Lock, ArrowRight, Sparkles, Compass } from 'lucide-react';

export const STUDIO_STEPS: StudioStepInfo[] = [
  {
    id: 'teleprompter',
    stepNumber: 1,
    label: 'Grabación Vocal',
    shortTitle: 'Teleprómter',
    description: 'Graba al menos una muestra dirigida o sube un archivo de audio para capturar tu timbre.',
    requirementToUnlockNext: 'Graba o sube al menos 1 muestra de voz.',
  },
  {
    id: 'samples',
    stepNumber: 2,
    label: 'Gestor de Muestras',
    shortTitle: 'Muestras WAV',
    description: 'Verifica la calidad acústica y confirma tus archivos WAV listos.',
    requirementToUnlockNext: 'Revisa y confirma tus muestras acústicas.',
  },
  {
    id: 'guide',
    stepNumber: 3,
    label: 'Motor & Parámetros',
    shortTitle: 'Calibración',
    description: 'Elige tu motor (ElevenLabs, F5-TTS libre o Gemini) y comprende los sliders de entonación.',
    requirementToUnlockNext: 'Confirma tu motor y parámetros de estabilidad.',
  },
  {
    id: 'editor',
    stepNumber: 4,
    label: 'Guion con IA',
    shortTitle: 'Editor Prosodia',
    description: 'Redacta o genera con IA un guion enriquecido con pausas y respiraciones naturales.',
    requirementToUnlockNext: 'Escribe o genera un guion de podcast con marcas de voz.',
  },
  {
    id: 'production',
    stepNumber: 5,
    label: 'Master y Producción',
    shortTitle: 'Audio Final',
    description: 'Sintetiza el audio de tu podcast con tu voz clonada y descarga el archivo master.',
    requirementToUnlockNext: 'Genera y descarga tu episodio completo.',
  },
];

interface GuidedStepperBannerProps {
  currentStep: StudioStepId;
  onSelectStep: (step: StudioStepId) => void;
  unlockedStepMax: number; // 1 to 5
  isGuidedMode: boolean;
  setIsGuidedMode: (guided: boolean) => void;
  // Specific milestone indicators
  hasAtLeastOneSample: boolean;
  step2Confirmed: boolean;
  step3Confirmed: boolean;
  hasValidScript: boolean;
  hasGeneratedAudio: boolean;
}

export const GuidedStepperBanner: React.FC<GuidedStepperBannerProps> = ({
  currentStep,
  onSelectStep,
  unlockedStepMax,
  isGuidedMode,
  setIsGuidedMode,
  hasAtLeastOneSample,
  step2Confirmed,
  step3Confirmed,
  hasValidScript,
  hasGeneratedAudio,
}) => {
  const currentStepObj =
    currentStep === 'cloning'
      ? {
          id: 'cloning' as StudioStepId,
          stepNumber: 3,
          label: 'Clonación F5-TTS In-App (Opción C)',
          shortTitle: 'F5-TTS',
          description: 'Flujo de clonación directa por Flow Matching sin salir de la app ni registros externos.',
          requirementToUnlockNext: 'Genera tu audio clonado y continúa al guion.',
        }
      : STUDIO_STEPS.find((s) => s.id === currentStep) || STUDIO_STEPS[0];
  const progressPercent = Math.round(((Math.min(unlockedStepMax, 5) - 1) / 4) * 100);

  // Determine if a specific step is completed
  const isStepDone = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return hasAtLeastOneSample;
      case 2:
        return step2Confirmed;
      case 3:
        return step3Confirmed;
      case 4:
        return hasValidScript;
      case 5:
        return hasGeneratedAudio;
      default:
        return false;
    }
  };

  return (
    <div className="border border-neutral-800 bg-neutral-900/90 rounded-2xl p-5 mb-8 space-y-5 shadow-lg backdrop-blur-md">
      {/* Top Header: Stepper title, Mode switch and Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
            {currentStepObj.stepNumber}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                Recorrido Guiado Paso a Paso
              </span>
              <span className="text-neutral-500">·</span>
              <span className="text-xs text-neutral-400 font-mono tabular-nums">
                Paso {currentStepObj.stepNumber} de 5
              </span>
            </div>
            <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
              {currentStepObj.label}: <span className="font-normal text-neutral-300 text-sm">{currentStepObj.description}</span>
            </h2>
          </div>
        </div>

        {/* Guided vs Free Mode Switch */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsGuidedMode(!isGuidedMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              isGuidedMode
                ? 'border-indigo-500/50 bg-indigo-950/40 text-indigo-300'
                : 'border-neutral-700 bg-neutral-950 text-neutral-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{isGuidedMode ? 'Modo Guiado Activo' : 'Modo Libre'}</span>
          </button>

          <div className="text-right pl-2 hidden lg:block">
            <span className="text-[11px] text-neutral-500 block">Progreso Global</span>
            <span className="text-xs font-mono font-bold text-white tabular-nums">
              {progressPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* 5-Step Visual Stepper Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
        {STUDIO_STEPS.map((step) => {
          const isCurrent = step.id === currentStep || (step.id === 'guide' && currentStep === 'cloning');
          const isDone = isStepDone(step.stepNumber);
          const isUnlocked = !isGuidedMode || step.stepNumber <= unlockedStepMax;

          return (
            <button
              key={step.id}
              onClick={() => {
                if (isUnlocked) {
                  onSelectStep(step.id);
                }
              }}
              disabled={!isUnlocked}
              className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between min-h-[72px] ${
                isCurrent
                  ? 'border-indigo-500 bg-indigo-950/30 shadow-md ring-1 ring-indigo-500/30'
                  : isUnlocked
                  ? 'border-neutral-800 bg-neutral-950/40 hover:border-neutral-700 hover:bg-neutral-900/60'
                  : 'border-neutral-800/40 bg-neutral-950/20 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[11px] font-mono text-neutral-500 tabular-nums">
                  0{step.stepNumber}
                </span>

                {isDone ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-600/60 text-emerald-400 flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  </span>
                ) : !isUnlocked ? (
                  <span className="w-5 h-5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-500 flex items-center justify-center">
                    <Lock className="w-2.5 h-2.5" />
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                )}
              </div>

              <div>
                <div className={`text-xs font-semibold truncate ${
                  isCurrent ? 'text-white' : isUnlocked ? 'text-neutral-300' : 'text-neutral-500'
                }`}>
                  {step.shortTitle}
                </div>
                <div className="text-[10px] text-neutral-500 truncate mt-0.5">
                  {isDone ? 'Completado' : isCurrent ? 'En curso' : !isUnlocked ? 'Bloqueado' : 'Disponible'}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
