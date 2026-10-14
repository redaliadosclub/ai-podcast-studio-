import React from 'react';
import { StudioStepId } from '../types';
import { Lock } from 'lucide-react';

interface HeaderProps {
  activeTab: StudioStepId;
  setActiveTab: (tab: StudioStepId) => void;
  samplesCount: number;
  unlockedStepMax: number;
  isGuidedMode: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  samplesCount,
  unlockedStepMax,
  isGuidedMode,
}) => {
  const isTabUnlocked = (stepNum: number) => {
    if (!isGuidedMode) return true;
    return stepNum <= unlockedStepMax;
  };

  return (
    <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
        {/* Zone 1: Clean Brand Wordmark */}
        <div
          onClick={() => setActiveTab('teleprompter')}
          className="cursor-pointer text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-indigo-400 transition-colors"
        >
          VoiceLab Coach
        </div>

        {/* Zone 2: 4-5 Single-line Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          {/* Tab 1: Teleprompter */}
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

          {/* Tab 2: Samples */}
          <button
            onClick={() => isTabUnlocked(2) && setActiveTab('samples')}
            disabled={!isTabUnlocked(2)}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1.5 ${
              activeTab === 'samples'
                ? 'text-white border-b-2 border-indigo-500'
                : isTabUnlocked(2)
                ? 'text-neutral-400 hover:text-neutral-200'
                : 'text-neutral-600 cursor-not-allowed'
            }`}
          >
            <span>02. Muestras</span>
            {samplesCount > 0 && isTabUnlocked(2) && (
              <span className="text-xs text-neutral-400 font-mono tabular-nums">
                ({samplesCount})
              </span>
            )}
            {!isTabUnlocked(2) && <Lock className="w-3 h-3 text-neutral-600" />}
          </button>

          {/* Tab 3: Guide & Engines */}
          <button
            onClick={() => isTabUnlocked(3) && setActiveTab('guide')}
            disabled={!isTabUnlocked(3)}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'text-white border-b-2 border-indigo-500'
                : isTabUnlocked(3)
                ? 'text-neutral-400 hover:text-neutral-200'
                : 'text-neutral-600 cursor-not-allowed'
            }`}
          >
            <span>03. Motor & Prosodia</span>
            {!isTabUnlocked(3) && <Lock className="w-3 h-3 text-neutral-600" />}
          </button>

          {/* Tab 4: Editor */}
          <button
            onClick={() => isTabUnlocked(4) && setActiveTab('editor')}
            disabled={!isTabUnlocked(4)}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1.5 ${
              activeTab === 'editor'
                ? 'text-white border-b-2 border-indigo-500'
                : isTabUnlocked(4)
                ? 'text-neutral-400 hover:text-neutral-200'
                : 'text-neutral-600 cursor-not-allowed'
            }`}
          >
            <span>04. Guion IA</span>
            {!isTabUnlocked(4) && <Lock className="w-3 h-3 text-neutral-600" />}
          </button>

          {/* Tab 5: Production */}
          <button
            onClick={() => isTabUnlocked(5) && setActiveTab('production')}
            disabled={!isTabUnlocked(5)}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1.5 ${
              activeTab === 'production'
                ? 'text-white border-b-2 border-indigo-500'
                : isTabUnlocked(5)
                ? 'text-neutral-400 hover:text-neutral-200'
                : 'text-neutral-600 cursor-not-allowed'
            }`}
          >
            <span>05. Master Final</span>
            {!isTabUnlocked(5) && <Lock className="w-3 h-3 text-neutral-600" />}
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              if (activeTab === 'teleprompter' && isTabUnlocked(2)) {
                setActiveTab('samples');
              } else if (activeTab === 'samples' && isTabUnlocked(3)) {
                setActiveTab('guide');
              } else if (activeTab === 'guide' && isTabUnlocked(4)) {
                setActiveTab('editor');
              } else if (activeTab === 'editor' && isTabUnlocked(5)) {
                setActiveTab('production');
              } else {
                setActiveTab('teleprompter');
              }
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 active:bg-indigo-700 transition-colors whitespace-nowrap shrink-0"
          >
            {activeTab === 'production' ? 'Nuevo Episodio' : 'Siguiente Paso'}
          </button>
        </div>
      </div>
    </header>
  );
};
