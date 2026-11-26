import React, { useState } from 'react';
import {
  CommercialConfig,
  DbHealthStatus,
  PlanDefinition,
  PlanId,
  SuperadminLicense,
  SuperadminOrder,
} from '../types';
import { buildWhatsappUrl } from '../utils/whatsapp';
import { FALLBACK_PLANS } from './CommercialHeroAndPlans';
import {
  ArrowLeft,
  Check,
  Copy,
  Edit3,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from 'lucide-react';

interface SuperadminViewProps {
  onBackHome: () => void;
}

export const SuperadminView: React.FC<SuperadminViewProps> = ({ onBackHome }) => {
  const [adminToken, setAdminToken] = useState<string>('');
  const [pinInput, setPinInput] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [loadingDash, setLoadingDash] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbHealthStatus | null>(null);
  const [geminiPoolCount, setGeminiPoolCount] = useState<number | null>(null);
  const [config, setConfig] = useState<CommercialConfig>({
    paymentLinks: {
      creator: { mpUrl: '', globalUrl: '' },
      pro: { mpUrl: '', globalUrl: '' },
      agency: { mpUrl: '', globalUrl: '' },
    },
    supportWhatsapp: '',
    updatedAt: '',
  });
  const [orders, setOrders] = useState<SuperadminOrder[]>([]);
  const [licenses, setLicenses] = useState<SuperadminLicense[]>([]);
  const [plans, setPlans] = useState<PlanDefinition[]>(FALLBACK_PLANS);

  const [savingConfig, setSavingConfig] = useState(false);
  const [configNotice, setConfigNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [copiedReturnUrl, setCopiedReturnUrl] = useState(false);

  const [activatingCode, setActivatingCode] = useState<string | null>(null);
  const [activatedWhatsappModal, setActivatedWhatsappModal] = useState<{
    customerName: string;
    whatsapp: string;
    pin: string;
    message: string;
  } | null>(null);
  const [copiedWaMsg, setCopiedWaMsg] = useState(false);

  const [confirmDeleteOrderCode, setConfirmDeleteOrderCode] = useState<string | null>(null);
  const [confirmDeleteLicenseId, setConfirmDeleteLicenseId] = useState<string | null>(null);

  // Manual license creation
  const [showNewLicenseForm, setShowNewLicenseForm] = useState(false);
  const [newLicName, setNewLicName] = useState('');
  const [newLicWhatsapp, setNewLicWhatsapp] = useState('');
  const [newLicPlanId, setNewLicPlanId] = useState<PlanId>('creator');
  const [newLicPin, setNewLicPin] = useState('');
  const [newLicWhiteLabel, setNewLicWhiteLabel] = useState(false);
  const [creatingLicense, setCreatingLicense] = useState(false);
  const [licenseActionError, setLicenseActionError] = useState('');

  // Inline license editing
  const [editingLicenseId, setEditingLicenseId] = useState<string | null>(null);
  const [editLicForm, setEditLicForm] = useState<{
    customerName: string;
    whatsapp: string;
    planId: PlanId;
    pin: string;
    whiteLabel: boolean;
  }>({
    customerName: '',
    whatsapp: '',
    planId: 'creator',
    pin: '',
    whiteLabel: false,
  });

  const returnUrl = `${window.location.origin}/pago-exitoso`;

  const fetchDashboard = async (token: string) => {
    setLoadingDash(true);
    try {
      const res = await fetch('/api/superadmin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setAdminToken('');
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setDbStatus(data.dbStatus);
        setGeminiPoolCount(typeof data.geminiPoolCount === 'number' ? data.geminiPoolCount : 0);
        setConfig(data.config);
        setOrders(data.orders || []);
        setLicenses(data.licenses || []);
        if (Array.isArray(data.plans) && data.plans.length > 0) {
          setPlans(data.plans);
        }
      }
    } finally {
      setLoadingDash(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch('/api/superadmin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        setLoginError(data.error || 'PIN incorrecto.');
        return;
      }
      setAdminToken(data.token);
      setPinInput('');
      await fetchDashboard(data.token);
    } catch {
      setLoginError('Error de conexión con el servidor.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigNotice(null);
    try {
      const res = await fetch('/api/superadmin/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          paymentLinks: config.paymentLinks,
          supportWhatsapp: config.supportWhatsapp,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setConfigNotice({ type: 'err', text: data.error || 'Error al guardar la configuración.' });
        return;
      }
      setConfig(data.config);
      setConfigNotice({
        type: 'ok',
        text: 'Links de cobro y WhatsApp guardados correctamente.',
      });
    } catch {
      setConfigNotice({ type: 'err', text: 'Error de red al guardar.' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCopyReturnUrl = async () => {
    try {
      await navigator.clipboard.writeText(returnUrl);
      setCopiedReturnUrl(true);
      setTimeout(() => setCopiedReturnUrl(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleActivateOrder = async (code: string) => {
    setActivatingCode(code);
    setLicenseActionError('');
    try {
      const res = await fetch(`/api/superadmin/orders/${encodeURIComponent(code)}/activate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setLicenseActionError(data.error || 'Error al activar el pedido.');
        return;
      }
      setActivatedWhatsappModal({
        customerName: data.license.customerName,
        whatsapp: data.license.whatsapp,
        pin: data.license.pin,
        message: data.whatsappMessage,
      });
      await fetchDashboard(adminToken);
    } finally {
      setActivatingCode(null);
    }
  };

  const handleDeleteOrder = async (code: string) => {
    try {
      const res = await fetch(`/api/superadmin/orders/${encodeURIComponent(code)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.code !== code));
        setConfirmDeleteOrderCode(null);
      }
    } catch {
      // ignore
    }
  };

  const handleCreateManualLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setLicenseActionError('');
    setCreatingLicense(true);
    try {
      const res = await fetch('/api/superadmin/licenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          customerName: newLicName,
          whatsapp: newLicWhatsapp,
          planId: newLicPlanId,
          pin: newLicPin,
          whiteLabel: newLicWhiteLabel,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLicenseActionError(data.error || 'No se pudo crear la licencia.');
        return;
      }
      setNewLicName('');
      setNewLicWhatsapp('');
      setNewLicPin('');
      setNewLicWhiteLabel(false);
      setShowNewLicenseForm(false);
      await fetchDashboard(adminToken);
    } finally {
      setCreatingLicense(false);
    }
  };

  const handlePatchLicense = async (
    id: string,
    patch: Partial<{
      customerName: string;
      whatsapp: string;
      planId: PlanId;
      pin: string;
      status: 'active' | 'paused';
      whiteLabel: boolean;
    }>
  ) => {
    setLicenseActionError('');
    const res = await fetch(`/api/superadmin/licenses/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      setLicenseActionError(data.error || 'No se pudo actualizar la licencia.');
      return false;
    }
    setLicenses((prev) => prev.map((l) => (l.id === id ? data.license : l)));
    return true;
  };

  const handleDeleteLicense = async (id: string) => {
    const res = await fetch(`/api/superadmin/licenses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      setLicenses((prev) => prev.filter((l) => l.id !== id));
      setConfirmDeleteLicenseId(null);
    }
  };

  const startEditLicense = (lic: SuperadminLicense) => {
    setEditingLicenseId(lic.id);
    setEditLicForm({
      customerName: lic.customerName,
      whatsapp: lic.whatsapp,
      planId: lic.planId,
      pin: lic.pin,
      whiteLabel: lic.whiteLabel,
    });
  };

  const saveEditLicense = async (id: string) => {
    const ok = await handlePatchLicense(id, editLicForm);
    if (ok) {
      setEditingLicenseId(null);
    }
  };

  if (!adminToken) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 space-y-6">
        <button
          onClick={onBackHome}
          className="inline-flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al inicio</span>
        </button>

        <div className="border border-neutral-800 bg-neutral-900/90 rounded-2xl p-8 space-y-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-indigo-400 font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>Acceso Restringido · /superadmin</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Panel Superadmin</h1>
            <p className="text-xs text-neutral-400">
              Ingresa tu <code className="text-neutral-300">ADMIN_PIN</code> para gestionar suscripciones, pines y links de cobro.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              autoFocus
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="PIN de Administrador"
              className="w-full px-4 py-3 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono text-center text-lg tracking-widest focus:outline-none focus:border-indigo-500"
            />

            {loginError && (
              <div className="p-3 rounded-lg border border-red-900/70 bg-red-950/40 text-xs text-red-200">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loginLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Entrar al Panel</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 space-y-8">
      {/* Top Bar + Database Health Indicator */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-neutral-800">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackHome}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Ir al Estudio</span>
            </button>
            <span className="text-neutral-600">·</span>
            <span className="text-xs font-mono text-neutral-400">/superadmin</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Administración Comercial y Licencias
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Required DB Status Indicator */}
          <div className="px-4 py-2 rounded-xl border border-neutral-800 bg-neutral-900 text-xs font-medium text-neutral-200 flex items-center gap-2">
            <span>
              {dbStatus?.mode === 'supabase' && dbStatus.connected
                ? '🟢'
                : dbStatus?.mode === 'local'
                ? '🟡'
                : '🔴'}
            </span>
            <span>
              Base de datos: {dbStatus ? dbStatus.label : 'Verificando conexión...'}
            </span>
          </div>

          {/* Secure Gemini API Key Pool Count Indicator */}
          <div
            className={`px-4 py-2 rounded-xl border text-xs font-medium flex items-center gap-2 ${
              geminiPoolCount !== null && geminiPoolCount === 0
                ? 'border-amber-800/70 bg-amber-950/40 text-amber-200'
                : 'border-neutral-800 bg-neutral-900 text-neutral-200'
            }`}
          >
            <span>🔑</span>
            <span>
              Pool Gemini API:{' '}
              {geminiPoolCount === null
                ? 'Verificando...'
                : geminiPoolCount === 1
                ? '1 clave activa'
                : `${geminiPoolCount} claves activas`}
            </span>
          </div>

          <button
            onClick={() => fetchDashboard(adminToken)}
            disabled={loadingDash}
            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-xl text-xs font-medium text-neutral-200 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDash ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={() => setAdminToken('')}
            className="px-3.5 py-2 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-medium text-neutral-400 hover:text-white transition-colors"
          >
            Salir
          </button>
        </div>
      </div>

      {dbStatus?.detail && (
        <div className="p-4 rounded-xl border border-red-900/70 bg-red-950/30 text-xs text-red-200">
          Detalle Supabase: {dbStatus.detail}
        </div>
      )}

      {/* Ready-to-Send WhatsApp Modal after Order Activation */}
      {activatedWhatsappModal && (
        <div className="border border-emerald-500/60 bg-emerald-950/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-emerald-400">
                Licencia Activada Correctamente
              </div>
              <h2 className="text-lg font-bold text-white">
                PIN generado para {activatedWhatsappModal.customerName}:{' '}
                <span className="font-mono text-emerald-300 tracking-widest ml-1">
                  {activatedWhatsappModal.pin}
                </span>
              </h2>
            </div>
            <button
              onClick={() => setActivatedWhatsappModal(null)}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 whitespace-pre-wrap font-sans">
            {activatedWhatsappModal.message}
          </pre>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={buildWhatsappUrl(
                activatedWhatsappModal.whatsapp,
                activatedWhatsappModal.message
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              📲 Enviar PIN por WhatsApp ahora
            </a>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(activatedWhatsappModal.message);
                setCopiedWaMsg(true);
                setTimeout(() => setCopiedWaMsg(false), 2000);
              }}
              className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-medium rounded-xl flex items-center gap-1.5"
            >
              {copiedWaMsg ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedWaMsg ? 'Mensaje copiado' : 'Copiar mensaje'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 1. Payment Links & Return URL Configuration */}
      <section className="border border-neutral-800 bg-neutral-900/70 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-bold text-white">💳 Configuración de Links de Cobro</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Carga aquí los enlaces de Mercado Pago (pesos) y PayPal / dLocal Go (dólares) para cada plan y tu WhatsApp de soporte.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2">
            <div className="text-[11px] text-neutral-400">
              URL de retorno: <code className="text-indigo-300">{returnUrl}</code>
            </div>
            <button
              type="button"
              onClick={handleCopyReturnUrl}
              className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-medium rounded-lg flex items-center gap-1 shrink-0"
            >
              {copiedReturnUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedReturnUrl ? 'Copiada' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{plan.name}</span>
                  <span className="text-xs font-mono text-neutral-400 tabular-nums">
                    ${plan.priceUsd} USD
                  </span>
                </div>

                <label className="block space-y-1">
                  <span className="text-[11px] text-neutral-400">🇦🇷 Link Mercado Pago (Pesos)</span>
                  <input
                    type="url"
                    value={config.paymentLinks[plan.id]?.mpUrl || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        paymentLinks: {
                          ...prev.paymentLinks,
                          [plan.id]: {
                            ...prev.paymentLinks[plan.id],
                            mpUrl: e.target.value,
                          },
                        },
                      }))
                    }
                    placeholder="https://mpago.la/..."
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-[11px] text-neutral-400">
                    🌎 Link PayPal / dLocal Go (Dólares)
                  </span>
                  <input
                    type="url"
                    value={config.paymentLinks[plan.id]?.globalUrl || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        paymentLinks: {
                          ...prev.paymentLinks,
                          [plan.id]: {
                            ...prev.paymentLinks[plan.id],
                            globalUrl: e.target.value,
                          },
                        },
                      }))
                    }
                    placeholder="https://paypal.me/... o https://checkout.dlocalgo.com/..."
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500"
                  />
                </label>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
            <label className="block space-y-1 flex-1 max-w-md">
              <span className="text-xs font-semibold text-neutral-300">
                WhatsApp de Ventas / Soporte (con código de país)
              </span>
              <input
                type="text"
                value={config.supportWhatsapp}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, supportWhatsapp: e.target.value }))
                }
                placeholder="Ej. +5491145678901"
                className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500"
              />
            </label>

            <button
              type="submit"
              disabled={savingConfig}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 shrink-0"
            >
              {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Guardar Links de Cobro</span>
            </button>
          </div>

          {configNotice && (
            <div
              className={`p-3 rounded-xl text-xs border ${
                configNotice.type === 'ok'
                  ? 'border-emerald-800/70 bg-emerald-950/30 text-emerald-200'
                  : 'border-red-900/70 bg-red-950/30 text-red-200'
              }`}
            >
              {configNotice.text}
            </div>
          )}
        </form>
      </section>

      {/* 2. Subscription Requests (VLC-XXXX) */}
      <section className="border border-neutral-800 bg-neutral-900/70 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-bold text-white">Solicitudes de Suscripción (VLC-XXXX)</h2>
            <p className="text-xs text-neutral-400">
              Pedidos registrados desde /checkout. Activa el pedido al verificar el pago para generar su PIN de 4 dígitos.
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-400 tabular-nums">
            {orders.length} solicitudes
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
            Todavía no hay solicitudes de suscripción registradas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400">
                  <th className="py-2.5 px-3 font-medium">Pedido</th>
                  <th className="py-2.5 px-3 font-medium">Cliente / Estudio</th>
                  <th className="py-2.5 px-3 font-medium">WhatsApp</th>
                  <th className="py-2.5 px-3 font-medium">Plan</th>
                  <th className="py-2.5 px-3 font-medium">N° Operación</th>
                  <th className="py-2.5 px-3 font-medium">Estado</th>
                  <th className="py-2.5 px-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/70">
                {orders.map((ord) => (
                  <tr key={ord.code} className="hover:bg-neutral-950/40">
                    <td className="py-3 px-3 font-mono font-bold text-white tabular-nums">
                      {ord.code}
                    </td>
                    <td className="py-3 px-3 text-neutral-200 font-medium">{ord.customerName}</td>
                    <td className="py-3 px-3 font-mono text-neutral-300 tabular-nums">
                      {ord.whatsapp}
                    </td>
                    <td className="py-3 px-3 text-neutral-300">
                      {ord.planName} (${ord.priceUsd})
                    </td>
                    <td className="py-3 px-3 font-mono text-neutral-400">
                      {ord.operationNumber || '—'}
                    </td>
                    <td className="py-3 px-3">
                      {ord.status === 'activated' ? (
                        <span className="text-emerald-400 font-medium">
                          Activado · PIN {ord.licensePin}
                        </span>
                      ) : (
                        <span className="text-amber-400 font-medium">Pendiente</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleActivateOrder(ord.code)}
                          disabled={activatingCode === ord.code}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap"
                        >
                          {activatingCode === ord.code
                            ? 'Activando...'
                            : ord.status === 'activated'
                            ? 'Ver / Reenviar PIN'
                            : 'Activar y Generar PIN'}
                        </button>

                        {confirmDeleteOrderCode === ord.code ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteOrder(ord.code)}
                              className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-[11px] rounded-md"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setConfirmDeleteOrderCode(null)}
                              className="px-2 py-1 bg-neutral-800 text-neutral-300 text-[11px] rounded-md"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteOrderCode(ord.code)}
                            title="Eliminar solicitud"
                            className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 3. Active Licenses Management */}
      <section className="border border-neutral-800 bg-neutral-900/70 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-bold text-white">Gestión de Licencias Activas</h2>
            <p className="text-xs text-neutral-400">
              Edita clientes, pausa o reactiva accesos, y activa el modo Marca Blanca para ocultar la marca VoiceLab Coach en el estudio.
            </p>
          </div>

          <button
            onClick={() => setShowNewLicenseForm(!showNewLicenseForm)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Licencia Manual</span>
          </button>
        </div>

        {licenseActionError && (
          <div className="p-3 rounded-xl border border-red-900/70 bg-red-950/30 text-xs text-red-200">
            {licenseActionError}
          </div>
        )}

        {showNewLicenseForm && (
          <form
            onSubmit={handleCreateManualLicense}
            className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end"
          >
            <label className="sm:col-span-2 space-y-1">
              <span className="text-[11px] text-neutral-400">Cliente / Estudio *</span>
              <input
                type="text"
                required
                value={newLicName}
                onChange={(e) => setNewLicName(e.target.value)}
                placeholder="Nombre"
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-neutral-400">WhatsApp</span>
              <input
                type="text"
                value={newLicWhatsapp}
                onChange={(e) => setNewLicWhatsapp(e.target.value)}
                placeholder="+549..."
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-neutral-400">Plan</span>
              <select
                value={newLicPlanId}
                onChange={(e) => setNewLicPlanId(e.target.value as PlanId)}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-neutral-400">PIN (4 díg., opcional)</span>
              <input
                type="text"
                maxLength={4}
                value={newLicPin}
                onChange={(e) => setNewLicPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Auto"
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs font-mono text-white"
              />
            </label>
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-1.5 text-xs text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newLicWhiteLabel}
                  onChange={(e) => setNewLicWhiteLabel(e.target.checked)}
                />
                <span>Marca Blanca</span>
              </label>
              <button
                type="submit"
                disabled={creatingLicense}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
              >
                {creatingLicense ? '...' : 'Crear'}
              </button>
            </div>
          </form>
        )}

        {licenses.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
            No hay licencias emitidas aún. Activa una solicitud pendiente o crea una licencia manual.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400">
                  <th className="py-2.5 px-3 font-medium">PIN</th>
                  <th className="py-2.5 px-3 font-medium">Cliente / Estudio</th>
                  <th className="py-2.5 px-3 font-medium">WhatsApp</th>
                  <th className="py-2.5 px-3 font-medium">Plan</th>
                  <th className="py-2.5 px-3 font-medium">Estado</th>
                  <th className="py-2.5 px-3 font-medium">Marca Blanca</th>
                  <th className="py-2.5 px-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/70">
                {licenses.map((lic) => {
                  const isEditing = editingLicenseId === lic.id;
                  const planObj = plans.find((p) => p.id === lic.planId);

                  return (
                    <tr key={lic.id} className="hover:bg-neutral-950/40">
                      <td className="py-3 px-3 font-mono font-bold text-indigo-300 tabular-nums">
                        {isEditing ? (
                          <input
                            type="text"
                            maxLength={4}
                            value={editLicForm.pin}
                            onChange={(e) =>
                              setEditLicForm((prev) => ({
                                ...prev,
                                pin: e.target.value.replace(/\D/g, '').slice(0, 4),
                              }))
                            }
                            className="w-16 px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-xs font-mono text-white"
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <KeyRound className="w-3 h-3 text-indigo-400" />
                            {lic.pin}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-neutral-200 font-medium">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editLicForm.customerName}
                            onChange={(e) =>
                              setEditLicForm((prev) => ({ ...prev, customerName: e.target.value }))
                            }
                            className="w-full px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-xs text-white"
                          />
                        ) : (
                          <div>
                            <div>{lic.customerName}</div>
                            {lic.orderCode && (
                              <div className="text-[11px] font-mono text-neutral-500">
                                Pedido {lic.orderCode}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-neutral-300 tabular-nums">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editLicForm.whatsapp}
                            onChange={(e) =>
                              setEditLicForm((prev) => ({ ...prev, whatsapp: e.target.value }))
                            }
                            className="w-full px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-xs text-white"
                          />
                        ) : (
                          lic.whatsapp || '—'
                        )}
                      </td>

                      <td className="py-3 px-3 text-neutral-300">
                        {isEditing ? (
                          <select
                            value={editLicForm.planId}
                            onChange={(e) =>
                              setEditLicForm((prev) => ({
                                ...prev,
                                planId: e.target.value as PlanId,
                              }))
                            }
                            className="px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-xs text-white"
                          >
                            {plans.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          planObj?.name || lic.planId
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`font-medium ${
                            lic.status === 'active' ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {lic.status === 'active' ? 'Activa' : 'Pausada'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <button
                          onClick={() =>
                            isEditing
                              ? setEditLicForm((prev) => ({
                                  ...prev,
                                  whiteLabel: !prev.whiteLabel,
                                }))
                              : handlePatchLicense(lic.id, { whiteLabel: !lic.whiteLabel })
                          }
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                            (isEditing ? editLicForm.whiteLabel : lic.whiteLabel)
                              ? 'border-amber-500/60 bg-amber-950/40 text-amber-200'
                              : 'border-neutral-700 bg-neutral-950 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {(isEditing ? editLicForm.whiteLabel : lic.whiteLabel)
                            ? 'Marca Blanca ON'
                            : 'Estándar'}
                        </button>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEditLicense(lic.id)}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold rounded-lg"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={() => setEditingLicenseId(null)}
                                className="px-2.5 py-1 bg-neutral-800 text-neutral-300 text-[11px] rounded-lg"
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditLicense(lic)}
                                className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-[11px] rounded-lg inline-flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Editar</span>
                              </button>

                              <button
                                onClick={() =>
                                  handlePatchLicense(lic.id, {
                                    status: lic.status === 'active' ? 'paused' : 'active',
                                  })
                                }
                                className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-[11px] rounded-lg whitespace-nowrap"
                              >
                                {lic.status === 'active' ? '⏸️ Pausar' : '▶️ Activar'}
                              </button>

                              {confirmDeleteLicenseId === lic.id ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    onClick={() => handleDeleteLicense(lic.id)}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-[11px] rounded-md"
                                  >
                                    Eliminar
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteLicenseId(null)}
                                    className="px-2 py-1 bg-neutral-800 text-neutral-300 text-[11px] rounded-md"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteLicenseId(lic.id)}
                                  title="Eliminar licencia"
                                  className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
