import React from 'react';
import { StudioStepId } from '../types';
import { useLowPower } from '../contexts/LowPowerContext';
import { Lock, KeyRound } from 'lucide-react';

interface HeaderProps {
  activeTab: StudioStepId;
  setActiveTab: (tab: StudioStepId) => void;
  samplesCount: number;
  unlockedStepMax: number;
  isGuidedMode: boolean;
  hasActiveLicense: boolean;
  whiteLabel?: boolean;
  onOpenGuide?: () => void;
  onOpenPinModal?: () => void;
  onLogoClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  samplesCount,
  unlockedStepMax,
  isGuidedMode,
  hasActiveLicense,
  whiteLabel = false,
  onOpenGuide,
  onOpenPinModal,
  onLogoClick,
}) => {
  const { manualLowPower, toggleManualLowPower } = useLowPower();

  const isGuidedUnlocked = (stepNum: number) => {
    if (stepNum <= 2) return true; // Pasos 1 y 2 siempre gratis y accesibles
    if (!hasActiveLicense) return false;
    if (!isGuidedMode) return true;
    return stepNum <= unlockedStepMax;
  };

  return (
    <header className="border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Zone 1: Clean Brand Wordmark (hidden/neutralized if White Label is active) */}
        <button
          type="button"
          onClick={() => {
            if (onLogoClick) onLogoClick();
            else setActiveTab('teleprompter');
          }}
          className="cursor-pointer text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-indigo-400 transition-colors text-left"
        >
          {whiteLabel ? 'Estudio Vocal' : 'VoiceLab Coach'}
        </button>

        {/* Zone 2: Single-line Navigation Links */}
        <nav className="hidden lg:flex items-center gap-4 xl:gap-5 text-sm font-medium">
          {/* Step 1: Free */}
          <button
            onClick={() => setActiveTab('teleprompter')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1.5 ${
              activeTab === 'teleprompter'
                ? 'text-white border-b-2 border-indigo-500'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>01. Grabación</span>
          </button>

          {/* Step 2: Free */}
          <button
            onClick={() => setActiveTab('samples')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1.5 ${
              activeTab === 'samples'
                ? 'text-white border-b-2 border-indigo-500'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>02. Muestras</span>
            {samplesCount > 0 && (
              <span className="text-xs text-neutral-400 font-mono tabular-nums">
                ({samplesCount})
              </span>
            )}
          </button>

          {/* Step 3: Requires License PIN */}
          <button
            onClick={() => {
              if (!hasActiveLicense || isGuidedUnlocked(3)) {
                setActiveTab('guide');
              }
            }}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'text-white border-b-2 border-indigo-500'
                : !hasActiveLicense || isGuidedUnlocked(3)
                ? 'text-neutral-400 hover:text-neutral-200'
                : 'text-neutral-600 cursor-not-allowed'
            }`}
          >
            <span>03. Calibración</span>
            {!hasActiveLicense && <Lock className="w-3 h-3 text-amber-400/80" />}
          </button>

          {/* Coqui XTTS v2 Cloning: Requires License PIN */}
          <button
            onClick={() => {
              if (!hasActiveLicense || isGuidedUnlocked(3)) {
                setActiveTab('cloning');
              }
            }}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1.5 ${
              activeTab === 'cloning'
                ? 'text-white border-b-2 border-indigo-500'
                : !hasActiveLicense || isGuidedUnlocked(3)
                ? 'text-neutral-400 hover:text-neutral-200'
                : 'text-neutral-600 cursor-not-allowed'
            }`}
          >
            <span className="text-indigo-400 font-semibold">XTTS v2 Clonador</span>
            {!hasActiveLicense && <Lock className="w-3 h-3 text-amber-400/80" />}
          </button>

          {/* Step 4: Requires License PIN */}
          <button
            onClick={() => {
              if (!hasActiveLicense || isGuidedUnlocked(4)) {
                setActiveTab('editor');
              }
            }}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1.5 ${
              activeTab === 'editor'
                ? 'text-white border-b-2 border-indigo-500'
                : !hasActiveLicense || isGuidedUnlocked(4)
                ? 'text-neutral-400 hover:text-neutral-200'
                : 'text-neutral-600 cursor-not-allowed'
            }`}
          >
            <span>04. Guion IA</span>
            {!hasActiveLicense && <Lock className="w-3 h-3 text-amber-400/80" />}
          </button>

          {/* Step 5: Requires License PIN */}
          <button
            onClick={() => {
              if (!hasActiveLicense || isGuidedUnlocked(5)) {
                setActiveTab('production');
              }
            }}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1.5 ${
              activeTab === 'production'
                ? 'text-white border-b-2 border-indigo-500'
                : !hasActiveLicense || isGuidedUnlocked(5)
                ? 'text-neutral-400 hover:text-neutral-200'
                : 'text-neutral-600 cursor-not-allowed'
            }`}
          >
            <span>05. Master Final</span>
            {!hasActiveLicense && <Lock className="w-3 h-3 text-amber-400/80" />}
          </button>
        </nav>

        {/* Zone 3: Primary Action & Low-Power Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleManualLowPower}
            aria-pressed={manualLowPower}
            title="Pausa animaciones pesadas en reposo y espacia consultas secundarias sin detener audio, síntesis ni descargas"
            className={`px-2.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              manualLowPower
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/80 hover:bg-emerald-900/60'
                : 'bg-neutral-900 text-neutral-300 border-neutral-700/80 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <span className="hidden md:inline">🔋 Modo Ahorro CPU/Batería</span>
            <span className="md:hidden">🔋 Ahorro</span>
          </button>

          {!hasActiveLicense && onOpenPinModal && (
            <button
              onClick={onOpenPinModal}
              className="px-3.5 py-2 text-xs font-semibold text-neutral-100 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ingresar PIN</span>
            </button>
          )}

          {hasActiveLicense && onOpenGuide && (
            <button
              onClick={onOpenGuide}
              className="px-3 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Manual
            </button>
          )}

          <button
            onClick={() => {
              if (activeTab === 'teleprompter') {
                setActiveTab('samples');
              } else if (activeTab === 'samples') {
                setActiveTab('guide');
              } else if ((activeTab === 'guide' || activeTab === 'cloning') && isGuidedUnlocked(4)) {
                setActiveTab('editor');
              } else if (activeTab === 'editor' && isGuidedUnlocked(5)) {
                setActiveTab('production');
              } else {
                setActiveTab('teleprompter');
              }
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors whitespace-nowrap shrink-0 shadow-sm"
          >
            {activeTab === 'production' ? 'Nuevo Episodio' : 'Siguiente Paso'}
          </button>
        </div>
      </div>
    </header>
  );
};
