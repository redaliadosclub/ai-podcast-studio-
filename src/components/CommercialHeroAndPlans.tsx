import React from 'react';
import { PlanDefinition, PlanId, ActiveLicenseSession } from '../types';
import { Check, KeyRound, ArrowRight, Mic, ShieldCheck, Layers } from 'lucide-react';
import heroStudioImg from '../assets/images/hero_vocal_studio_1795582168520.jpg';

export const FALLBACK_PLANS: PlanDefinition[] = [
  {
    id: 'creator',
    name: 'Plan Creador',
    priceUsd: 19,
    billingLabel: 'USD / mes',
    audience: 'Para podcasters y creadores independientes',
    features: [
      'Acceso completo a los 5 pasos del estudio',
      'Generación de guiones con IA y prosodia natural',
      'Clonación directa Coqui XTTS v2 y calibración ElevenLabs',
      'Exportación master de episodios en audio',
    ],
  },
  {
    id: 'pro',
    name: 'Plan Estudio Pro',
    priceUsd: 39,
    billingLabel: 'USD / mes',
    audience: 'Para productores, locutores y canales frecuentes',
    highlight: true,
    features: [
      'Todo lo incluido en el Plan Creador',
      'Análisis emocional y marcadores prosódicos avanzados',
      'Botón directo de Soporte WhatsApp en el estudio',
      'Prioridad en motores de síntesis neuronal',
    ],
  },
  {
    id: 'agency',
    name: 'Plan Agencia',
    priceUsd: 79,
    billingLabel: 'USD / mes',
    audience: 'Para agencias de audio y redes de podcasts',
    features: [
      'Todo lo incluido en Estudio Pro',
      'Modo Marca Blanca (oculta la marca VoiceLab Coach)',
      'Licencia comercial multi-proyecto para clientes',
      'Soporte VIP prioritario por WhatsApp',
    ],
  },
];

interface CommercialHeroAndPlansProps {
  plans: PlanDefinition[];
  activeLicense: ActiveLicenseSession | null;
  onStartFreeStudio: () => void;
  onOpenPinModal: () => void;
  onSubscribePlan: (planId: PlanId) => void;
  onLogoutLicense: () => void;
}

export const CommercialHeroAndPlans: React.FC<CommercialHeroAndPlansProps> = ({
  plans,
  activeLicense,
  onStartFreeStudio,
  onOpenPinModal,
  onSubscribePlan,
  onLogoutLicense,
}) => {
  const displayPlans = plans.length > 0 ? plans : FALLBACK_PLANS;
  const isWhiteLabel = Boolean(activeLicense?.whiteLabel);

  // When an active license is logged in, keep the top section compact and studio-focused
  if (activeLicense) {
    return (
      <section className="mb-8 border border-neutral-800 bg-neutral-900/70 rounded-2xl px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span className="text-emerald-400 font-medium">Licencia Activa</span>
            <span aria-hidden="true">·</span>
            <span>{activeLicense.planName}</span>
            {activeLicense.whiteLabel && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-300 font-medium">Marca Blanca Activa</span>
              </>
            )}
          </div>
          <p className="text-sm font-semibold text-white">
            Bienvenido, {activeLicense.customerName}{' '}
            <span className="font-mono text-xs text-neutral-400 tabular-nums ml-2">
              PIN {activeLicense.pin}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isWhiteLabel && (
            <a
              href="#planes"
              className="text-xs font-medium text-neutral-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Ver Planes
            </a>
          )}
          <button
            onClick={onLogoutLicense}
            className="px-3.5 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-950 border border-neutral-700/80 rounded-lg hover:border-neutral-600 transition-colors whitespace-nowrap shrink-0"
          >
            Cambiar PIN
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-12 mb-12">
      {/* Editorial Hero Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch border border-neutral-800 bg-neutral-900/60 rounded-2xl overflow-hidden">
        <div className="lg:col-span-7 p-8 lg:p-10 flex flex-col justify-between gap-8">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
              <span className="text-indigo-400 font-medium">VoiceLab Coach</span>
              <span aria-hidden="true">·</span>
              <span>Estudio de Clonación Vocal y Podcasts con IA</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400 font-medium">Pasos 1 y 2 Gratis sin PIN</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-white leading-[1.12] text-balance max-w-2xl">
              Graba muestras limpias gratis y produce episodios completos con tu voz clonada.
            </h1>

            <p className="text-base text-neutral-300 leading-relaxed max-w-xl">
              Entrena tu dicción en el teleprómter con coaching vocal y verifica tus archivos WAV sin registro. Desbloquea los Pasos 3, 4 y 5 con tu PIN de licencia para dirigir guiones con IA, calibrar motores y exportar tu audio master.
            </p>
          </div>

          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onStartFreeStudio}
                className="px-5 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 shadow-sm"
              >
                <Mic className="w-4 h-4" />
                <span>Probar Gratis (Pasos 1 y 2)</span>
              </button>

              <button
                onClick={onOpenPinModal}
                className="px-5 py-3 text-sm font-semibold text-neutral-100 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <span>🔑 Ingresar con mi PIN de Licencia</span>
              </button>

              <a
                href="#planes"
                className="px-4 py-3 text-sm font-medium text-neutral-300 hover:text-white transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <span>Ver Planes</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-neutral-800/80 text-xs text-neutral-400">
              <div className="flex items-start gap-2">
                <Mic className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-neutral-200 font-medium block">Pasos 1 y 2 Libres</strong>
                  Teleprómter y Gestor WAV sin costo
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Layers className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-neutral-200 font-medium block">Pasos 3, 4 y 5 Pro</strong>
                  Clonación Coqui XTTS v2, Guion IA y Master
                </span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-neutral-200 font-medium block">Activación Directa</strong>
                  Pesos (Mercado Pago) o USD global
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 relative min-h-[260px] bg-gradient-to-br from-neutral-900 via-indigo-950/30 to-neutral-950">
          <img
            src={heroStudioImg}
            alt="Estudio de grabación vocal para podcast y clonación de voz"
            referrerPolicy="no-referrer"
            className="w-full h-full lg:h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/20 to-transparent flex items-end p-6">
            <div className="text-xs text-neutral-300 space-y-1">
              <div className="font-semibold text-white">Flujo completo en 5 pasos</div>
              <div className="text-neutral-400">
                Coaching vocal en vivo · Control de clipping WAV · Guion prosódico IA
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription Plans Grid */}
      <section id="planes" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-indigo-400">Planes de Suscripción</div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Elige tu licencia para desbloquear todo el estudio
            </h2>
            <p className="text-sm text-neutral-400 max-w-2xl">
              Genera tu código de pedido al instante, abona con Mercado Pago en pesos o PayPal / dLocal Go en dólares y recibe tu PIN de 4 dígitos.
            </p>
          </div>

          <button
            onClick={onOpenPinModal}
            className="px-4 py-2 text-xs font-semibold text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
            <span>Ya tengo PIN</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayPlans.map((plan) => {
            const isHighlighted = Boolean(plan.highlight);
            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 flex flex-col justify-between gap-6 border transition-colors ${
                  isHighlighted
                    ? 'border-indigo-500/80 bg-neutral-900'
                    : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-700'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    {isHighlighted && (
                      <span className="text-xs font-semibold text-indigo-400">Más elegido</span>
                    )}
                  </div>

                  <p className="text-xs text-neutral-400">{plan.audience}</p>

                  <div className="flex items-baseline gap-2 pt-2 border-t border-neutral-800">
                    <span className="text-4xl font-extrabold text-white font-mono tabular-nums">
                      ${plan.priceUsd}
                    </span>
                    <span className="text-xs text-neutral-400 font-medium">{plan.billingLabel}</span>
                  </div>

                  <ul className="space-y-2.5 pt-2">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm text-neutral-300">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => onSubscribePlan(plan.id)}
                  className={`w-full py-3 px-4 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${
                    isHighlighted
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-neutral-950 hover:bg-neutral-800 text-white border border-neutral-700'
                  }`}
                >
                  <span>Suscribirme ahora</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
