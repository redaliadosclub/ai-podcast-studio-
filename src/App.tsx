import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { GuidedStepperBanner } from './components/GuidedStepperBanner';
import { TeleprompterView } from './components/TeleprompterView';
import { SamplesManagerView } from './components/SamplesManagerView';
import { ElevenLabsGuideView } from './components/ElevenLabsGuideView';
import { VoiceCloningOptionView } from './components/VoiceCloningOptionView';
import { PodcastScriptEditorView } from './components/PodcastScriptEditorView';
import { ProductionStudioView } from './components/ProductionStudioView';
import { UserGuideModal } from './components/UserGuideModal';
import { CommercialHeroAndPlans, FALLBACK_PLANS } from './components/CommercialHeroAndPlans';
import { LicenseGateView, LicensePinModal } from './components/LicenseGateView';
import { CheckoutView } from './components/CheckoutView';
import { PaymentSuccessView } from './components/PaymentSuccessView';
import { SuperadminView } from './components/SuperadminView';
import { buildWhatsappUrl } from './utils/whatsapp';
import {
  ActiveLicenseSession,
  PlanDefinition,
  PlanId,
  RecordedSample,
  StudioStepId,
} from './types';

function parsePlanFromQuery(search: string): PlanId {
  const params = new URLSearchParams(search);
  const p = params.get('plan');
  if (p === 'creator' || p === 'pro' || p === 'agency') return p;
  return 'pro';
}

function parseOrderCodeFromQuery(search: string): string {
  const params = new URLSearchParams(search);
  return (params.get('code') || '').trim().toUpperCase();
}

export default function App() {
  const [routePath, setRoutePath] = useState<string>(() => window.location.pathname || '/');
  const [routeSearch, setRouteSearch] = useState<string>(() => window.location.search || '');

  const navigateTo = (url: string) => {
    window.history.pushState({}, '', url);
    const parsed = new URL(url, window.location.origin);
    setRoutePath(parsed.pathname);
    setRouteSearch(parsed.search);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => {
      setRoutePath(window.location.pathname || '/');
      setRouteSearch(window.location.search || '');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Commercial state & license session
  const [plans, setPlans] = useState<PlanDefinition[]>(FALLBACK_PLANS);
  const [supportWhatsapp, setSupportWhatsapp] = useState<string>('');
  const [activeLicense, setActiveLicense] = useState<ActiveLicenseSession | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);

  const studioSectionRef = useRef<HTMLDivElement | null>(null);

  // Fetch public plans & support WhatsApp
  useEffect(() => {
    fetch('/api/commercial/public')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.plans) setPlans(data.plans);
        if (data?.supportWhatsapp) setSupportWhatsapp(data.supportWhatsapp);
      })
      .catch(() => {});
  }, []);

  // Re-verify persisted license PIN against server on mount
  useEffect(() => {
    const savedPin = localStorage.getItem('voicelab_license_pin');
    if (!savedPin) return;

    fetch('/api/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: savedPin }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (ok && data?.valid && data?.license) {
          setActiveLicense(data.license);
          if (data.supportWhatsapp) setSupportWhatsapp(data.supportWhatsapp);
        } else {
          localStorage.removeItem('voicelab_license_pin');
          setActiveLicense(null);
        }
      })
      .catch(() => {});
  }, []);

  // White Label: update document title dynamically when active license has whiteLabel=true
  useEffect(() => {
    if (activeLicense?.whiteLabel) {
      document.title = 'Estudio Vocal - Producción y Clonación de Voz IA';
    } else {
      document.title = 'VoiceLab Coach - Estudio de Clonación de Voz y Podcasts IA';
    }
  }, [activeLicense?.whiteLabel]);

  const handleLicenseUnlocked = (license: ActiveLicenseSession, wa?: string) => {
    localStorage.setItem('voicelab_license_pin', license.pin);
    setActiveLicense(license);
    if (wa) setSupportWhatsapp(wa);
  };

  const handleLogoutLicense = () => {
    localStorage.removeItem('voicelab_license_pin');
    setActiveLicense(null);
    setIsPinModalOpen(true);
  };

  // Studio State
  const [activeTab, setActiveTab] = useState<StudioStepId>('teleprompter');
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  const [isGuidedMode, setIsGuidedMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('voicelab_guided_mode');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [step2Confirmed, setStep2Confirmed] = useState<boolean>(() => {
    return localStorage.getItem('voicelab_step2_confirmed') === 'true';
  });

  const [step3Confirmed, setStep3Confirmed] = useState<boolean>(() => {
    return localStorage.getItem('voicelab_step3_confirmed') === 'true';
  });

  const [samples, setSamples] = useState<RecordedSample[]>([]);

  const [currentScriptText, setCurrentScriptText] = useState<string>(
    `¡Hola a todos y bienvenidos a un nuevo episodio!

Hoy quiero compartir con ustedes algo que me ha cambiado por completo la perspectiva sobre cómo creamos contenido con inteligencia artificial...

Durante mucho tiempo pensé que una voz clonada siempre sonaría fría o robótica. [Pausa reflexiva 1s] Pero descubrí que el verdadero secreto no está en la máquina, sino en cómo grabas tus muestras iniciales y cómo puntúas cada frase.

Si hablas con entusiasmo genuino, gesticulas y dejas que tus respiraciones fluyan de forma natural <breath>, la IA es capaz de capturar tu timbre con una fidelidad asombrosa.

Quédate conmigo, porque hoy vamos a desgranar paso a paso cómo lograrlo sin complicaciones.`
  );

  const [scriptTitle, setScriptTitle] = useState<string>('El Secreto de la Voz Natural');

  const hasAtLeastOneSample = samples.length >= 1;
  const hasValidScript = currentScriptText.trim().length >= 40;

  // Steps 1 & 2 always free (unlockedStepMax starts >= 2)
  const [unlockedStepMax, setUnlockedStepMax] = useState<number>(() => {
    const saved = localStorage.getItem('voicelab_unlocked_max');
    const parsed = saved ? parseInt(saved, 10) : 2;
    return Math.max(2, Number.isNaN(parsed) ? 2 : parsed);
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

  useEffect(() => {
    let max = 2;
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
    setUnlockedStepMax((prev) => Math.max(prev, 2));
  };

  const handleDeleteSample = (id: string) => {
    setSamples((prev) => prev.filter((s) => s.id !== id));
  };

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

  const scrollToStudio = () => {
    setActiveTab('teleprompter');
    studioSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToPlans = () => {
    if (routePath !== '/') {
      navigateTo('/');
      setTimeout(() => {
        document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }
    document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' });
  };

  const savedSampleIds = samples.map((s) => s.scriptId);
  const hasActiveLicense = Boolean(activeLicense && activeLicense.status === 'active');
  const isWhiteLabel = Boolean(activeLicense?.whiteLabel);
  const showProWhatsappSupport =
    hasActiveLicense &&
    (activeLicense?.planId === 'pro' || activeLicense?.planId === 'agency') &&
    Boolean(supportWhatsapp);

  const normalizedPath = routePath.replace(/\/+$/, '') || '/';

  // Dedicated Routes: /checkout, /pago-exitoso, /superadmin
  if (normalizedPath === '/checkout') {
    return (
      <div className="min-h-screen bg-[#0b0f17] text-neutral-100 flex flex-col">
        <CheckoutView
          initialPlanId={parsePlanFromQuery(routeSearch)}
          plans={plans}
          onBackHome={() => navigateTo('/')}
          onGoToPaymentSuccess={(code) => navigateTo(`/pago-exitoso?code=${encodeURIComponent(code)}`)}
        />
      </div>
    );
  }

  if (normalizedPath === '/pago-exitoso') {
    return (
      <div className="min-h-screen bg-[#0b0f17] text-neutral-100 flex flex-col">
        <PaymentSuccessView
          initialOrderCode={parseOrderCodeFromQuery(routeSearch)}
          defaultSupportWhatsapp={supportWhatsapp}
          onBackHome={() => navigateTo('/')}
        />
      </div>
    );
  }

  if (normalizedPath === '/superadmin') {
    return (
      <div className="min-h-screen bg-[#0b0f17] text-neutral-100 flex flex-col">
        <SuperadminView onBackHome={() => navigateTo('/')} />
      </div>
    );
  }

  const isProStep =
    activeTab === 'guide' ||
    activeTab === 'cloning' ||
    activeTab === 'editor' ||
    activeTab === 'production';

  const stepDisplayNames: Record<StudioStepId, string> = {
    teleprompter: 'Paso 1: Teleprómter',
    samples: 'Paso 2: Gestor WAV',
    guide: 'Paso 3: Calibración & Motores',
    cloning: 'Paso 3: Clonación F5-TTS',
    editor: 'Paso 4: Guion con IA',
    production: 'Paso 5: Master Final',
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-neutral-100 flex flex-col font-sans selection:bg-indigo-900 selection:text-white">
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          studioSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
        samplesCount={samples.length}
        unlockedStepMax={unlockedStepMax}
        isGuidedMode={isGuidedMode}
        hasActiveLicense={hasActiveLicense}
        whiteLabel={isWhiteLabel}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenPinModal={() => setIsPinModalOpen(true)}
        onLogoClick={() => navigateTo('/')}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* Commercial Showcase + 3 Subscription Plans + PIN Entry */}
        <CommercialHeroAndPlans
          plans={plans}
          activeLicense={activeLicense}
          onStartFreeStudio={scrollToStudio}
          onOpenPinModal={() => setIsPinModalOpen(true)}
          onSubscribePlan={(planId) => navigateTo(`/checkout?plan=${planId}`)}
          onLogoutLicense={handleLogoutLicense}
        />

        {/* Interactive Studio Workspace */}
        <div ref={studioSectionRef} className="scroll-mt-24">
          <GuidedStepperBanner
            currentStep={activeTab}
            onSelectStep={setActiveTab}
            unlockedStepMax={unlockedStepMax}
            isGuidedMode={isGuidedMode}
            setIsGuidedMode={setIsGuidedMode}
            hasActiveLicense={hasActiveLicense}
            hasAtLeastOneSample={hasAtLeastOneSample}
            step2Confirmed={step2Confirmed}
            step3Confirmed={step3Confirmed}
            hasValidScript={hasValidScript}
            hasGeneratedAudio={false}
          />

          {/* Free Steps 1 & 2 */}
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
              onGoToCloning={() => {
                setStep2Confirmed(true);
                setUnlockedStepMax((prev) => Math.max(prev, 3));
                setActiveTab('cloning');
              }}
            />
          )}

          {/* License Wall protecting Steps 3, 4 & 5 */}
          {isProStep && !hasActiveLicense && (
            <LicenseGateView
              stepName={stepDisplayNames[activeTab]}
              onUnlocked={handleLicenseUnlocked}
              onGoToPlans={scrollToPlans}
              onGoToCheckout={(planId) => navigateTo(`/checkout?plan=${planId}`)}
              onBackToFreeSteps={() => setActiveTab('teleprompter')}
            />
          )}

          {/* Licensed Steps 3, 4 & 5 */}
          {activeTab === 'guide' && hasActiveLicense && (
            <ElevenLabsGuideView
              onGoToTeleprompter={() => setActiveTab('teleprompter')}
              onGoToEditor={handleConfirmStep3}
              onGoToCloning={() => {
                setUnlockedStepMax((prev) => Math.max(prev, 3));
                setActiveTab('cloning');
              }}
            />
          )}

          {activeTab === 'cloning' && hasActiveLicense && (
            <VoiceCloningOptionView
              samples={samples}
              currentScriptText={currentScriptText}
              onSendToProduction={handleSendToProduction}
              onGoToTeleprompter={() => setActiveTab('teleprompter')}
              onGoToEditor={handleConfirmStep3}
            />
          )}

          {activeTab === 'editor' && hasActiveLicense && (
            <PodcastScriptEditorView
              currentScriptText={currentScriptText}
              setCurrentScriptText={setCurrentScriptText}
              onSendToProduction={handleSendToProduction}
            />
          )}

          {activeTab === 'production' && hasActiveLicense && (
            <ProductionStudioView
              scriptText={currentScriptText}
              scriptTitle={scriptTitle}
              samples={samples}
              onGoToEditor={() => setActiveTab('editor')}
            />
          )}
        </div>
      </main>

      {/* Discreet WhatsApp Support button for Plan Estudio Pro & Plan Agencia */}
      {showProWhatsappSupport && (
        <div className="fixed bottom-5 right-5 z-30">
          <a
            href={buildWhatsappUrl(
              supportWhatsapp,
              `Hola soporte, soy ${activeLicense?.customerName} (${activeLicense?.planName}, PIN ${activeLicense?.pin}) y necesito asistencia en el estudio.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-emerald-600/95 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg border border-emerald-400/30 transition-colors flex items-center gap-1.5"
          >
            <span>💬 Soporte WhatsApp</span>
          </a>
        </div>
      )}

      {/* Clean Footer (respects White Label) */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950 py-6 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-300">
              {isWhiteLabel ? 'Estudio Vocal' : 'VoiceLab Coach'}
            </span>
            <span aria-hidden="true">·</span>
            <span>Recorrido Guiado Paso a Paso para Podcasts con Voz Clonada</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-neutral-400">
            <button
              onClick={() => setActiveTab('teleprompter')}
              className="hover:text-white transition-colors"
            >
              Paso 1: Grabación
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setActiveTab('production')}
              className="hover:text-white transition-colors"
            >
              Paso 5: Master Final
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setIsGuideOpen(true)}
              className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              Manual & Tutorial
            </button>
            {!isWhiteLabel && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  onClick={() => navigateTo('/superadmin')}
                  className="text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  Admin
                </button>
              </>
            )}
          </div>
        </div>
      </footer>

      <UserGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onGoToStep={(step) => setActiveTab(step)}
      />

      <LicensePinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onUnlocked={handleLicenseUnlocked}
        onGoToPlans={scrollToPlans}
      />
    </div>
  );
}
