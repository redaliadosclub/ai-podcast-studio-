import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { GuidedStepperBanner } from './components/GuidedStepperBanner';
import { TeleprompterView } from './components/TeleprompterView';
import { SamplesManagerView } from './components/SamplesManagerView';
import { ElevenLabsGuideView } from './components/ElevenLabsGuideView';
import { PodcastScriptEditorView } from './components/PodcastScriptEditorView';
import { ProductionStudioView } from './components/ProductionStudioView';
import { RecordedSample, StudioStepId } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<StudioStepId>('teleprompter');

  // Guided Mode vs Free Mode
  const [isGuidedMode, setIsGuidedMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('voicelab_guided_mode');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Step milestones persistence
  const [step2Confirmed, setStep2Confirmed] = useState<boolean>(() => {
    return localStorage.getItem('voicelab_step2_confirmed') === 'true';
  });

  const [step3Confirmed, setStep3Confirmed] = useState<boolean>(() => {
    return localStorage.getItem('voicelab_step3_confirmed') === 'true';
  });

  // Samples stored in state
  const [samples, setSamples] = useState<RecordedSample[]>([]);

  // Current active script text
  const [currentScriptText, setCurrentScriptText] = useState<string>(
    `¡Hola a todos y bienvenidos a un nuevo episodio!

Hoy quiero compartir con ustedes algo que me ha cambiado por completo la perspectiva sobre cómo creamos contenido con inteligencia artificial...

Durante mucho tiempo pensé que una voz clonada siempre sonaría fría o robótica. [Pausa reflexiva 1s] Pero descubrí que el verdadero secreto no está en la máquina, sino en cómo grabas tus muestras iniciales y cómo puntúas cada frase.

Si hablas con entusiasmo genuino, gesticulas y dejas que tus respiraciones fluyan de forma natural <breath>, la IA es capaz de capturar tu timbre con una fidelidad asombrosa.

Quédate conmigo, porque hoy vamos a desgranar paso a paso cómo lograrlo sin complicaciones.`
  );

  const [scriptTitle, setScriptTitle] = useState<string>('El Secreto de la Voz Natural');

  // Compute maximum unlocked step (1 to 5)
  const hasAtLeastOneSample = samples.length >= 1;
  const hasValidScript = currentScriptText.trim().length >= 40;

  const [unlockedStepMax, setUnlockedStepMax] = useState<number>(() => {
    const saved = localStorage.getItem('voicelab_unlocked_max');
    return saved ? parseInt(saved, 10) : 1;
  });

  useEffect(() => {
    localStorage.setItem('voicelab_guided_mode', JSON.stringify(isGuidedMode));
  }, [isGuidedMode]);

  useEffect(() => {
    localStorage.setItem('voicelab_step2_confirmed', String(step2Confirmed));
  }, [step2Confirmed]);

  useEffect(() => {
    localStorage.setItem('voicelab_step3_confirmed', String(step3Confirmed));
  }, [step3Confirmed]);

  // Recalculate minimum unlock level whenever milestones change
  useEffect(() => {
    let max = 1;
    if (hasAtLeastOneSample) max = Math.max(max, 2);
    if (step2Confirmed) max = Math.max(max, 3);
    if (step3Confirmed) max = Math.max(max, 4);
    if (unlockedStepMax >= 5) max = 5;

    setUnlockedStepMax((prev) => {
      const finalMax = Math.max(prev, max);
      localStorage.setItem('voicelab_unlocked_max', String(finalMax));
      return finalMax;
    });
  }, [hasAtLeastOneSample, step2Confirmed, step3Confirmed, unlockedStepMax]);

  const handleSaveSample = (newSample: RecordedSample) => {
    setSamples((prev) => {
      const filtered = prev.filter((s) => s.scriptId !== newSample.scriptId);
      return [...filtered, newSample];
    });
    // Unlocks step 2 immediately
    setUnlockedStepMax((prev) => Math.max(prev, 2));
  };

  const handleDeleteSample = (id: string) => {
    setSamples((prev) => prev.filter((s) => s.id !== id));
  };

  // Milestone transitions
  const handleProceedToStep2 = () => {
    setUnlockedStepMax((prev) => Math.max(prev, 2));
    setActiveTab('samples');
  };

  const handleConfirmStep2 = () => {
    setStep2Confirmed(true);
    setUnlockedStepMax((prev) => Math.max(prev, 3));
    setActiveTab('guide');
  };

  const handleConfirmStep3 = () => {
    setStep3Confirmed(true);
    setUnlockedStepMax((prev) => Math.max(prev, 4));
    setActiveTab('editor');
  };

  const handleSendToProduction = (text: string, title: string) => {
    setCurrentScriptText(text);
    if (title) setScriptTitle(title);
    setUnlockedStepMax(5);
    setActiveTab('production');
  };

  const savedSampleIds = samples.map((s) => s.scriptId);

  return (
    <div className="min-h-screen bg-[#0b0f17] text-neutral-100 flex flex-col font-sans selection:bg-indigo-900 selection:text-white">
      {/* 3-Zone Top Bar Contract with Milestone Indicators */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        samplesCount={samples.length}
        unlockedStepMax={unlockedStepMax}
        isGuidedMode={isGuidedMode}
      />

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* Interactive Milestone Stepper Banner */}
        <GuidedStepperBanner
          currentStep={activeTab}
          onSelectStep={setActiveTab}
          unlockedStepMax={unlockedStepMax}
          isGuidedMode={isGuidedMode}
          setIsGuidedMode={setIsGuidedMode}
          hasAtLeastOneSample={hasAtLeastOneSample}
          step2Confirmed={step2Confirmed}
          step3Confirmed={step3Confirmed}
          hasValidScript={hasValidScript}
          hasGeneratedAudio={false}
        />

        {activeTab === 'teleprompter' && (
          <TeleprompterView
            onSaveSample={handleSaveSample}
            savedSampleIds={savedSampleIds}
            onProceedToStep2={handleProceedToStep2}
          />
        )}

        {activeTab === 'samples' && (
          <SamplesManagerView
            samples={samples}
            onDeleteSample={handleDeleteSample}
            onGoToTeleprompter={() => setActiveTab('teleprompter')}
            onGoToGuide={handleConfirmStep2}
          />
        )}

        {activeTab === 'guide' && (
          <ElevenLabsGuideView
            onGoToTeleprompter={() => setActiveTab('teleprompter')}
            onGoToEditor={handleConfirmStep3}
          />
        )}

        {activeTab === 'editor' && (
          <PodcastScriptEditorView
            currentScriptText={currentScriptText}
            setCurrentScriptText={setCurrentScriptText}
            onSendToProduction={handleSendToProduction}
          />
        )}

        {activeTab === 'production' && (
          <ProductionStudioView
            scriptText={currentScriptText}
            scriptTitle={scriptTitle}
            onGoToEditor={() => setActiveTab('editor')}
          />
        )}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950 py-6 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-300">VoiceLab Coach</span>
            <span aria-hidden="true">·</span>
            <span>Recorrido Guiado Paso a Paso para Podcasts con Voz Clonada</span>
          </div>
          <div className="flex items-center gap-4 text-neutral-400">
            <button
              onClick={() => setActiveTab('teleprompter')}
              className="hover:text-white transition-colors"
            >
              Paso 1: Grabación
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => isGuidedMode ? (unlockedStepMax >= 5 && setActiveTab('production')) : setActiveTab('production')}
              className="hover:text-white transition-colors"
            >
              Paso 5: Master Final
            </button>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">5 Pasos Guiados</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
