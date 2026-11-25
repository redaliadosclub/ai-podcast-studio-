import React, { useState, useEffect } from 'react';
import { OrderSummary } from '../types';
import { buildWhatsappUrl } from '../utils/whatsapp';
import { ArrowLeft, Camera, CheckCircle2, Loader2, Search } from 'lucide-react';

interface PaymentSuccessViewProps {
  initialOrderCode: string;
  defaultSupportWhatsapp: string;
  onBackHome: () => void;
}

export const PaymentSuccessView: React.FC<PaymentSuccessViewProps> = ({
  initialOrderCode,
  defaultSupportWhatsapp,
  onBackHome,
}) => {
  const [orderCodeInput, setOrderCodeInput] = useState(
    initialOrderCode || sessionStorage.getItem('voicelab_last_order_code') || ''
  );
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [supportWhatsapp, setSupportWhatsapp] = useState(defaultSupportWhatsapp);
  const [operationNumber, setOperationNumber] = useState('');
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [savingOp, setSavingOp] = useState(false);
  const [opSavedNotice, setOpSavedNotice] = useState(false);
  const [lookupError, setLookupError] = useState('');

  const fetchOrderDetails = async (codeToFetch: string) => {
    const normalized = codeToFetch.trim().toUpperCase();
    if (!normalized) return;
    setLoadingOrder(true);
    setLookupError('');
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(normalized)}`);
      const data = await res.json();
      if (!res.ok) {
        setOrder(null);
        setLookupError(data.error || 'No se encontró ese código de pedido.');
        return;
      }
      setOrder(data.order);
      setOperationNumber(data.order.operationNumber || '');
      if (data.supportWhatsapp) {
        setSupportWhatsapp(data.supportWhatsapp);
      }
      sessionStorage.setItem('voicelab_last_order_code', data.order.code);
    } catch {
      setLookupError('Error al consultar el pedido.');
    } finally {
      setLoadingOrder(false);
    }
  };

  useEffect(() => {
    const startCode = initialOrderCode || sessionStorage.getItem('voicelab_last_order_code') || '';
    if (startCode) {
      setOrderCodeInput(startCode);
      fetchOrderDetails(startCode);
    }
  }, [initialOrderCode]);

  const handleSaveOperationNumber = async () => {
    const code = (order?.code || orderCodeInput).trim().toUpperCase();
    if (!/^VLC-[A-Z0-9]{4}$/.test(code)) return;

    setSavingOp(true);
    setOpSavedNotice(false);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(code)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationNumber: operationNumber.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
        setOpSavedNotice(true);
        setTimeout(() => setOpSavedNotice(false), 2500);
      }
    } catch {
      // ignore non-blocking save error
    } finally {
      setSavingOp(false);
    }
  };

  const effectiveCode = (order?.code || orderCodeInput || 'VLC-XXXX').trim().toUpperCase();
  const whatsappMessage = [
    '¡Hola! Acabo de realizar el pago de mi suscripción.',
    `• Código de Pedido: ${effectiveCode}`,
    order?.customerName ? `• Nombre / Estudio: ${order.customerName}` : null,
    order?.planName ? `• Plan: ${order.planName} ($${order.priceUsd} USD)` : null,
    operationNumber.trim() ? `• N° de Operación: ${operationNumber.trim()}` : null,
    'Adjunto captura del comprobante de pago para recibir mi PIN de licencia.',
  ]
    .filter(Boolean)
    .join('\n');

  const whatsappHref = buildWhatsappUrl(supportWhatsapp, whatsappMessage);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <button
        onClick={onBackHome}
        className="inline-flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver al estudio</span>
      </button>

      <div className="border border-neutral-800 bg-neutral-900/90 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="space-y-2 pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Paso 2 de 2 · Confirmación de Pago</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            ¡Gracias por tu suscripción!
          </h1>
          <p className="text-sm text-neutral-300">
            Envía tu comprobante por WhatsApp con tu código de pedido para activar tu PIN de 4 dígitos de inmediato.
          </p>
        </div>

        {/* Highlighted Screenshot Reminder */}
        <div className="p-4 rounded-xl border border-amber-500/50 bg-amber-950/30 flex items-start gap-3">
          <Camera className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-sm font-bold text-amber-200">
              Importante: Guarda una captura del comprobante
            </div>
            <p className="text-xs text-amber-100/80 leading-relaxed">
              Toma una captura de pantalla de tu transferencia o recibo de Mercado Pago / PayPal / dLocal Go antes de cerrar la ventana de pago para adjuntarla en WhatsApp.
            </p>
          </div>
        </div>

        {/* Order Code Lookup / Display */}
        <div className="space-y-3 bg-neutral-950/70 border border-neutral-800 rounded-xl p-5">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-neutral-300">
              Código Único de Pedido (VLC-XXXX)
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={orderCodeInput}
                onChange={(e) => setOrderCodeInput(e.target.value.toUpperCase())}
                placeholder="Ej. VLC-4829"
                className="flex-1 px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-sm font-mono text-white tracking-wider focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => fetchOrderDetails(orderCodeInput)}
                disabled={loadingOrder}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
              >
                {loadingOrder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Buscar</span>
              </button>
            </div>
          </label>

          {lookupError && <p className="text-xs text-red-300">{lookupError}</p>}

          {order && (
            <div className="pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-300">
              <span>
                <strong className="text-white">{order.customerName}</strong> · {order.planName} ($
                {order.priceUsd} USD)
              </span>
              <span className="font-mono text-amber-300">
                {order.status === 'activated' ? 'Licencia Activada' : 'Pendiente de activación'}
              </span>
            </div>
          )}
        </div>

        {/* Optional Operation Number */}
        <div className="space-y-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-neutral-300">
              N° de Operación / Referencia (opcional)
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={operationNumber}
                onChange={(e) => setOperationNumber(e.target.value)}
                onBlur={handleSaveOperationNumber}
                placeholder="Ej. MP-987654321 o ID de transacción"
                className="flex-1 px-4 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleSaveOperationNumber}
                disabled={savingOp}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 rounded-xl transition-colors shrink-0"
              >
                {savingOp ? 'Guardando...' : opSavedNotice ? 'Guardado' : 'Guardar N°'}
              </button>
            </div>
          </label>
        </div>

        {/* Green WhatsApp Button */}
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleSaveOperationNumber}
          className="w-full py-4 px-5 bg-emerald-600 hover:bg-emerald-500 text-white text-base font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg"
        >
          <span>📲 Enviar Comprobante por WhatsApp</span>
        </a>

        <p className="text-[11px] text-center text-neutral-500">
          El mensaje incluye automáticamente tu código <span className="font-mono text-neutral-300">{effectiveCode}</span>. Recibirás tu PIN de 4 dígitos por ese mismo chat.
        </p>
      </div>
    </div>
  );
};
