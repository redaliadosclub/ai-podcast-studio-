import React, { useState } from 'react';
import { ActiveLicenseSession, PlanId } from '../types';
import { Lock, KeyRound, ArrowRight, Mic, Loader2, X, AlertCircle } from 'lucide-react';
import { formatWhatsappDigits } from '../utils/whatsapp';

interface LicenseGateViewProps {
  stepName: string;
  onUnlocked: (license: ActiveLicenseSession, supportWhatsapp?: string) => void;
  onGoToPlans: () => void;
  onGoToCheckout: (planId: PlanId) => void;
  onBackToFreeSteps: () => void;
}

export const LicenseGateView: React.FC<LicenseGateViewProps> = ({
  stepName,
  onUnlocked,
  onGoToPlans,
  onGoToCheckout,
  onBackToFreeSteps,
}) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pausedSupportWa, setPausedSupportWa] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = pin.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length !== 4) {
      setErrorMsg('Ingresa tu PIN de licencia de 4 dígitos.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setPausedSupportWa('');

    try {
      const res = await fetch('/api/licenses/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: cleaned }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        if (data.supportWhatsapp) {
          setPausedSupportWa(data.supportWhatsapp);
        }
        setErrorMsg(data.error || 'No se pudo validar el PIN de licencia.');
        return;
      }
      onUnlocked(data.license, data.supportWhatsapp);
    } catch {
      setErrorMsg('Error de red al validar la licencia. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto border border-neutral-800 bg-neutral-900/90 rounded-2xl p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-neutral-800">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
            <Lock className="w-3.5 h-3.5" />
            <span>Muro de Licencia · Pasos 3, 4 y 5</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Desbloquea {stepName} con tu PIN de Licencia
          </h2>
          <p className="text-sm text-neutral-300 leading-relaxed">
            Los Pasos 1 (Teleprómter con Coaching Vocal) y 2 (Gestor WAV) son 100% gratuitos. Para acceder a la calibración avanzada, clonación Coqui XTTS v2, generación de guiones IA y master final necesitas una suscripción activa.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* PIN Form */}
        <form onSubmit={handleSubmit} className="space-y-4 bg-neutral-950/60 border border-neutral-800 rounded-xl p-5">
          <label className="block space-y-2">
            <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
              <span>PIN de Licencia (4 dígitos)</span>
            </span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Ej. 4829"
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-xl text-white font-mono text-xl tracking-[0.35em] text-center focus:outline-none focus:border-indigo-500"
            />
          </label>

          {errorMsg && (
            <div className="p-3 rounded-lg border border-red-900/70 bg-red-950/40 text-xs text-red-200 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
              {pausedSupportWa && (
                <a
                  href={`https://wa.me/${formatWhatsappDigits(pausedSupportWa)}?text=${encodeURIComponent(
                    `Hola, mi PIN ${pin} figura pausado y necesito ayuda para reactivarlo.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-emerald-300 underline font-medium"
                >
                  Contactar a Soporte por WhatsApp
                </a>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            <span>{loading ? 'Validando PIN...' : 'Desbloquear Estudio Completo'}</span>
          </button>
        </form>

        {/* Direct Plan / Checkout Access */}
        <div className="space-y-4 bg-neutral-950/60 border border-neutral-800 rounded-xl p-5">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">¿Aún no tienes tu PIN?</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Suscríbete desde $19 USD/mes (o su equivalente en pesos vía Mercado Pago) y recibe tu PIN de acceso directo.
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => onGoToCheckout('pro')}
              className="w-full py-2.5 px-4 bg-white text-neutral-950 hover:bg-neutral-200 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <span>Suscribirme ahora (Estudio Pro)</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onGoToPlans}
              className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl transition-colors"
            >
              Comparar los 3 Planes ($19 · $39 · $79)
            </button>

            <button
              onClick={onBackToFreeSteps}
              className="w-full py-2.5 px-4 text-neutral-400 hover:text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Seguir gratis en Pasos 1 y 2</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface LicensePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlocked: (license: ActiveLicenseSession, supportWhatsapp?: string) => void;
  onGoToPlans: () => void;
}

export const LicensePinModal: React.FC<LicensePinModalProps> = ({
  isOpen,
  onClose,
  onUnlocked,
  onGoToPlans,
}) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = pin.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length !== 4) {
      setErrorMsg('Ingresa un PIN de 4 dígitos.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/licenses/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: cleaned }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setErrorMsg(data.error || 'PIN inválido o pausado.');
        return;
      }
      onUnlocked(data.license, data.supportWhatsapp);
      onClose();
    } catch {
      setErrorMsg('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md border border-neutral-800 bg-neutral-900 rounded-2xl p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <KeyRound className="w-5 h-5 text-indigo-400" />
            <span>Ingresar con PIN de Licencia</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-neutral-400 leading-relaxed">
          Introduce el código numérico de 4 dígitos enviado a tu WhatsApp para desbloquear los Pasos 3, 4 y 5.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="0000"
            className="w-full px-4 py-3.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono text-2xl tracking-[0.4em] text-center focus:outline-none focus:border-indigo-500"
          />

          {errorMsg && (
            <div className="p-3 rounded-lg border border-red-900/70 bg-red-950/40 text-xs text-red-200">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{loading ? 'Validando...' : 'Activar Sesión'}</span>
          </button>
        </form>

        <div className="pt-3 border-t border-neutral-800 text-center">
          <button
            onClick={() => {
              onClose();
              onGoToPlans();
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
          >
            ¿No tienes PIN? Ver planes desde $19 USD/mes
          </button>
        </div>
      </div>
    </div>
  );
};
