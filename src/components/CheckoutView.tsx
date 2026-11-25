import React, { useState, useEffect } from 'react';
import { OrderSummary, PlanDefinition, PlanId } from '../types';
import { FALLBACK_PLANS } from './CommercialHeroAndPlans';
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

interface CheckoutViewProps {
  initialPlanId: PlanId;
  plans: PlanDefinition[];
  onBackHome: () => void;
  onGoToPaymentSuccess: (orderCode: string) => void;
}

function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  initialPlanId,
  plans,
  onBackHome,
  onGoToPaymentSuccess,
}) => {
  const catalog = plans.length > 0 ? plans : FALLBACK_PLANS;
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>(initialPlanId);
  const [customerName, setCustomerName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [createdOrder, setCreatedOrder] = useState<OrderSummary | null>(null);
  const [paymentLinks, setPaymentLinks] = useState<{ mpUrl: string; globalUrl: string }>({
    mpUrl: '',
    globalUrl: '',
  });
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    setSelectedPlanId(initialPlanId);
  }, [initialPlanId]);

  const activePlan = catalog.find((p) => p.id === selectedPlanId) || catalog[1] || catalog[0];

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (customerName.trim().length < 2) {
      setErrorMsg('Ingresa tu Nombre o el de tu Estudio.');
      return;
    }
    if (whatsapp.replace(/\D/g, '').length < 7) {
      setErrorMsg('Ingresa un número de WhatsApp válido con código de país (ej. +54 9 11 ...).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          whatsapp: whatsapp.trim(),
          planId: selectedPlanId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'No se pudo generar tu código de pedido.');
        return;
      }

      setCreatedOrder(data.order);
      setPaymentLinks(data.paymentLinks || { mpUrl: '', globalUrl: '' });
      sessionStorage.setItem('voicelab_last_order_code', data.order.code);
    } catch {
      setErrorMsg('Error de conexión con el servidor. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCode = async () => {
    if (!createdOrder) return;
    try {
      await navigator.clipboard.writeText(createdOrder.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleTrackMethod = (method: 'mercadopago' | 'global') => {
    if (!createdOrder) return;
    fetch(`/api/orders/${encodeURIComponent(createdOrder.code)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: method }),
    }).catch(() => {});
  };

  const hasMp = isSafeExternalUrl(paymentLinks.mpUrl);
  const hasGlobal = isSafeExternalUrl(paymentLinks.globalUrl);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <button
        onClick={onBackHome}
        className="inline-flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver al estudio y planes</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Form or Payment Buttons */}
        <div className="lg:col-span-7 border border-neutral-800 bg-neutral-900/90 rounded-2xl p-6 sm:p-8 space-y-6">
          {!createdOrder ? (
            <>
              <div className="space-y-1.5 pb-4 border-b border-neutral-800">
                <div className="text-xs font-medium text-indigo-400">Paso 1 de 2 · Reserva de Licencia</div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Genera tu código de pedido
                </h1>
                <p className="text-xs text-neutral-400">
                  Completa tus datos para registrar tu pedido en estado pendiente y habilitar las pasarelas de pago.
                </p>
              </div>

              <form onSubmit={handleCreateOrder} className="space-y-5">
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-neutral-300">
                    Nombre del Creador / Estudio *
                  </span>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ej. Estudio Sonora / Martín Pérez"
                    className="w-full px-4 py-3 bg-neutral-950 border border-neutral-700 rounded-xl text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-neutral-300">
                    WhatsApp (para enviarte tu PIN de 4 dígitos) *
                  </span>
                  <input
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="Ej. +54 9 11 4567 8901"
                    className="w-full px-4 py-3 bg-neutral-950 border border-neutral-700 rounded-xl text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-neutral-300">Plan Seleccionado</span>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value as PlanId)}
                    className="w-full px-4 py-3 bg-neutral-950 border border-neutral-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    {catalog.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ${p.priceUsd} {p.billingLabel}
                      </option>
                    ))}
                  </select>
                </label>

                {errorMsg && (
                  <div className="p-3 rounded-xl border border-red-900/70 bg-red-950/40 text-xs text-red-200">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{submitting ? 'Generando pedido...' : 'Generar Código Único de Pedido'}</span>
                </button>
              </form>
            </>
          ) : (
            <div className="space-y-6">
              <div className="p-5 rounded-xl bg-neutral-950 border border-indigo-500/40 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-amber-400 font-semibold">
                    Estado: Pendiente de activación
                  </span>
                  <span className="text-xs text-neutral-400">{createdOrder.planName}</span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-neutral-400">Tu Código Único de Pedido</div>
                    <div className="text-3xl font-bold font-mono text-white tracking-wider tabular-nums mt-0.5">
                      {createdOrder.code}
                    </div>
                  </div>

                  <button
                    onClick={handleCopyCode}
                    className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg text-xs font-medium text-neutral-200 flex items-center gap-1.5 transition-colors"
                  >
                    {copiedCode ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedCode ? 'Copiado' : 'Copiar código'}</span>
                  </button>
                </div>

                <p className="text-xs text-neutral-400">
                  Guarda este código (<strong className="text-neutral-200">{createdOrder.code}</strong>). Lo usarás al finalizar tu pago para activar tu PIN al instante.
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-sm font-bold text-white">Elige tu método de pago:</h2>

                {/* Mercado Pago Button */}
                {hasMp ? (
                  <a
                    href={paymentLinks.mpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleTrackMethod('mercadopago')}
                    className="w-full py-3.5 px-5 bg-[#009EE3] hover:bg-[#008ed0] text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-between gap-3"
                  >
                    <span>🇦🇷 Pagar con Mercado Pago (Pesos)</span>
                    <ExternalLink className="w-4 h-4 shrink-0" />
                  </a>
                ) : (
                  <div className="w-full py-3 px-4 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      🇦🇷 Link de Mercado Pago aún no configurado por el administrador en <code className="text-neutral-300">/superadmin</code>.
                    </span>
                  </div>
                )}

                {/* PayPal / dLocal Go Button */}
                {hasGlobal ? (
                  <a
                    href={paymentLinks.globalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleTrackMethod('global')}
                    className="w-full py-3.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-between gap-3"
                  >
                    <span>🌎 Pagar con PayPal / dLocal Go (Dólares)</span>
                    <ExternalLink className="w-4 h-4 shrink-0" />
                  </a>
                ) : (
                  <div className="w-full py-3 px-4 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      🌎 Link de PayPal / dLocal Go aún no configurado por el administrador en <code className="text-neutral-300">/superadmin</code>.
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-neutral-800 space-y-3">
                <p className="text-xs text-neutral-400">
                  Si la pasarela no te redirige automáticamente al terminar el pago, haz clic aquí:
                </p>
                <button
                  onClick={() => onGoToPaymentSuccess(createdOrder.code)}
                  className="w-full py-3 px-4 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <span>Ya realicé el pago · Enviar comprobante</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Plan Summary */}
        <aside className="lg:col-span-5 border border-neutral-800 bg-neutral-900/70 rounded-2xl p-6 space-y-5">
          <div className="space-y-1 pb-4 border-b border-neutral-800">
            <div className="text-xs text-neutral-400">Resumen de Suscripción</div>
            <h2 className="text-xl font-bold text-white">{activePlan.name}</h2>
            <p className="text-xs text-neutral-400">{activePlan.audience}</p>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-white font-mono tabular-nums">
              ${activePlan.priceUsd}
            </span>
            <span className="text-xs text-neutral-400">{activePlan.billingLabel}</span>
          </div>

          <ul className="space-y-2.5 pt-2 border-t border-neutral-800">
            {activePlan.features.map((feat, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-neutral-300">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>

          <div className="pt-4 border-t border-neutral-800 flex items-start gap-2.5 text-xs text-neutral-400">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              Los Pasos 1 y 2 siguen disponibles gratis en todo momento. Al activarse tu pedido recibirás un PIN único de 4 dígitos.
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
};
