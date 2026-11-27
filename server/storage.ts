import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export type PlanId = 'creator' | 'pro' | 'agency';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceUsd: number;
  billingLabel: string;
  audience: string;
  highlight?: boolean;
  features: string[];
}

export const PLANS_CATALOG: Record<PlanId, PlanDefinition> = {
  creator: {
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
  pro: {
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
  agency: {
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
};

export interface PlanPaymentLinks {
  mpUrl: string;
  globalUrl: string;
}

export interface CommercialConfig {
  paymentLinks: Record<PlanId, PlanPaymentLinks>;
  supportWhatsapp: string;
  updatedAt: string;
}

export type OrderStatus = 'pending' | 'activated' | 'cancelled';

export interface SubscriptionOrder {
  code: string; // VLC-XXXX
  customerName: string;
  whatsapp: string;
  planId: PlanId;
  planName: string;
  priceUsd: number;
  status: OrderStatus;
  operationNumber?: string;
  paymentMethod?: 'mercadopago' | 'global';
  licensePin?: string;
  createdAt: string;
  updatedAt: string;
}

export type LicenseStatus = 'active' | 'paused';

export interface LicenseRecord {
  id: string;
  pin: string; // 4 digits
  customerName: string;
  whatsapp: string;
  planId: PlanId;
  status: LicenseStatus;
  whiteLabel: boolean;
  orderCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbHealthStatus {
  mode: 'supabase' | 'local';
  connected: boolean;
  label: string;
  detail?: string;
}

export interface GeminiDailyUsageCounts {
  date: string; // YYYY-MM-DD
  textRequests: number;
  ttsRequests: number;
}

export interface GeminiDailyUsageEntry {
  textRequests: number;
  ttsRequests: number;
  updatedAt: string;
}

export type GeminiUsageStore = Record<string, GeminiDailyUsageEntry>;

const DEFAULT_CONFIG: CommercialConfig = {
  paymentLinks: {
    creator: { mpUrl: '', globalUrl: '' },
    pro: { mpUrl: '', globalUrl: '' },
    agency: { mpUrl: '', globalUrl: '' },
  },
  supportWhatsapp: '',
  updatedAt: new Date(0).toISOString(),
};

const LOCAL_DATA_DIR = path.resolve(process.cwd(), '.data');
const LOCAL_STORAGE_FILE = path.join(LOCAL_DATA_DIR, 'voicelab_storage.json');

function getSupabaseCredentials(): { url: string; serviceKey: string } | null {
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !serviceKey) return null;
  return { url, serviceKey };
}

export function isValidHttpUrl(raw: string): boolean {
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function sanitizeWhatsapp(raw: string): string {
  return raw.replace(/[^\d+]/g, '').trim();
}

export function formatWhatsappDigits(raw: string): string {
  return raw.replace(/\D/g, '');
}

async function readLocalStore(): Promise<Record<string, unknown>> {
  try {
    const raw = await fs.readFile(LOCAL_STORAGE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeLocalStore(store: Record<string, unknown>): Promise<void> {
  await fs.mkdir(LOCAL_DATA_DIR, { recursive: true });
  await fs.writeFile(LOCAL_STORAGE_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

async function supabaseGet<T>(key: string): Promise<T | null> {
  const creds = getSupabaseCredentials();
  if (!creds) return null;

  const endpoint = `${creds.url}/rest/v1/voicelab_storage?key=eq.${encodeURIComponent(key)}&select=data`;
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      apikey: creds.serviceKey,
      Authorization: `Bearer ${creds.serviceKey}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase GET (${res.status}): ${text.slice(0, 200)}`);
  }

  const rows = (await res.json()) as Array<{ data: T }>;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0].data ?? null;
}

async function supabaseSet<T>(key: string, data: T): Promise<void> {
  const creds = getSupabaseCredentials();
  if (!creds) return;

  const endpoint = `${creds.url}/rest/v1/voicelab_storage?on_conflict=key`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: creds.serviceKey,
      Authorization: `Bearer ${creds.serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      key,
      data,
      updated_at: new Date().toISOString(),
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase UPSERT (${res.status}): ${text.slice(0, 200)}`);
  }
}

export async function checkDatabaseHealth(): Promise<DbHealthStatus> {
  const creds = getSupabaseCredentials();
  if (!creds) {
    return {
      mode: 'local',
      connected: true,
      label: 'Respaldo local activo (faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY)',
    };
  }

  try {
    const endpoint = `${creds.url}/rest/v1/voicelab_storage?select=key&limit=1`;
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: creds.serviceKey,
        Authorization: `Bearer ${creds.serviceKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        mode: 'supabase',
        connected: false,
        label: 'Error de conexión con Supabase (voicelab_storage)',
        detail: `HTTP ${res.status}: ${errText.slice(0, 140)}`,
      };
    }

    return {
      mode: 'supabase',
      connected: true,
      label: 'Conectada a Supabase (voicelab_storage)',
    };
  } catch (error: any) {
    return {
      mode: 'supabase',
      connected: false,
      label: 'Error de conexión con Supabase (voicelab_storage)',
      detail: error?.message || 'Timeout de conexión',
    };
  }
}

export async function getStorageValue<T>(key: string, fallback: T): Promise<T> {
  const creds = getSupabaseCredentials();
  if (creds) {
    try {
      const remote = await supabaseGet<T>(key);
      if (remote !== null) return remote;
    } catch (err) {
      console.warn(`[Storage] Error leyendo "${key}" en Supabase, intentando respaldo local:`, err);
    }
  }

  const localStore = await readLocalStore();
  if (key in localStore && localStore[key] !== undefined) {
    return localStore[key] as T;
  }
  return fallback;
}

export async function setStorageValue<T>(key: string, value: T): Promise<void> {
  const creds = getSupabaseCredentials();
  if (creds) {
    await supabaseSet<T>(key, value);
  }
  // Keep local fallback mirror up to date cleanly
  const localStore = await readLocalStore();
  localStore[key] = value;
  localStore[`${key}__updated_at`] = new Date().toISOString();
  await writeLocalStore(localStore);
}

export async function getCommercialConfig(): Promise<CommercialConfig> {
  const raw = await getStorageValue<CommercialConfig>('config', DEFAULT_CONFIG);
  return {
    paymentLinks: {
      creator: {
        mpUrl: raw?.paymentLinks?.creator?.mpUrl || '',
        globalUrl: raw?.paymentLinks?.creator?.globalUrl || '',
      },
      pro: {
        mpUrl: raw?.paymentLinks?.pro?.mpUrl || '',
        globalUrl: raw?.paymentLinks?.pro?.globalUrl || '',
      },
      agency: {
        mpUrl: raw?.paymentLinks?.agency?.mpUrl || '',
        globalUrl: raw?.paymentLinks?.agency?.globalUrl || '',
      },
    },
    supportWhatsapp: raw?.supportWhatsapp || '',
    updatedAt: raw?.updatedAt || DEFAULT_CONFIG.updatedAt,
  };
}

export async function saveCommercialConfig(config: CommercialConfig): Promise<CommercialConfig> {
  const next: CommercialConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
  };
  await setStorageValue('config', next);
  return next;
}

export async function getOrders(): Promise<SubscriptionOrder[]> {
  const list = await getStorageValue<SubscriptionOrder[]>('orders', []);
  return Array.isArray(list) ? list : [];
}

export async function saveOrders(orders: SubscriptionOrder[]): Promise<void> {
  await setStorageValue('orders', orders);
}

export async function getLicenses(): Promise<LicenseRecord[]> {
  const list = await getStorageValue<LicenseRecord[]>('licenses', []);
  return Array.isArray(list) ? list : [];
}

export async function saveLicenses(licenses: LicenseRecord[]): Promise<void> {
  await setStorageValue('licenses', licenses);
}

export function generateOrderCode(existingOrders: SubscriptionOrder[]): string {
  const used = new Set(existingOrders.map((o) => o.code.toUpperCase()));
  for (let attempt = 0; attempt < 100; attempt++) {
    const num = crypto.randomInt(1000, 10000);
    const code = `VLC-${num}`;
    if (!used.has(code)) return code;
  }
  const fallback = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `VLC-${fallback}`;
}

export function generateLicensePin(existingLicenses: LicenseRecord[]): string {
  const used = new Set(existingLicenses.map((l) => l.pin));
  for (let attempt = 0; attempt < 200; attempt++) {
    const pin = String(crypto.randomInt(1000, 10000));
    if (!used.has(pin)) return pin;
  }
  throw new Error('No hay pines de 4 dígitos disponibles.');
}

const GEMINI_USAGE_STORAGE_KEY = 'gemini_daily_usage';
const MAX_USAGE_RETENTION_DAYS = 30;

let usageMemoryStore: GeminiUsageStore | null = null;
let usageHydrationPromise: Promise<GeminiUsageStore> | null = null;
let usagePersistQueue: Promise<void> = Promise.resolve();

export function getCurrentUsageDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function sanitizeUsageStore(raw: unknown): GeminiUsageStore {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const clean: GeminiUsageStore = {};
  for (const [dateKey, val] of Object.entries(raw as Record<string, any>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !val || typeof val !== 'object') continue;
    clean[dateKey] = {
      textRequests: Math.max(0, Number(val.textRequests) || 0),
      ttsRequests: Math.max(0, Number(val.ttsRequests) || 0),
      updatedAt: typeof val.updatedAt === 'string' ? val.updatedAt : new Date().toISOString(),
    };
  }
  return clean;
}

function pruneUsageStore(store: GeminiUsageStore): GeminiUsageStore {
  const sortedDates = Object.keys(store).sort().slice(-MAX_USAGE_RETENTION_DAYS);
  const pruned: GeminiUsageStore = {};
  for (const d of sortedDates) {
    pruned[d] = store[d];
  }
  return pruned;
}

async function ensureUsageStoreHydrated(): Promise<GeminiUsageStore> {
  if (usageMemoryStore !== null) {
    return usageMemoryStore;
  }
  if (!usageHydrationPromise) {
    usageHydrationPromise = getStorageValue<GeminiUsageStore>(GEMINI_USAGE_STORAGE_KEY, {})
      .then((loaded) => {
        const sanitized = pruneUsageStore(sanitizeUsageStore(loaded));
        usageMemoryStore = sanitized;
        return sanitized;
      })
      .catch((err) => {
        console.warn('[Storage] No se pudo hidratar el consumo diario de Gemini, iniciando en memoria:', err);
        usageMemoryStore = {};
        return usageMemoryStore;
      })
      .finally(() => {
        usageHydrationPromise = null;
      });
  }
  return usageHydrationPromise;
}

function scheduleUsagePersist(snapshot: GeminiUsageStore): void {
  usagePersistQueue = usagePersistQueue
    .then(async () => {
      await setStorageValue<GeminiUsageStore>(GEMINI_USAGE_STORAGE_KEY, snapshot);
    })
    .catch((err) => {
      console.warn('[Storage] No se pudo persistir el consumo diario de Gemini:', err);
    });
}

export async function recordGeminiDailyUsage(
  kind: 'text' | 'tts',
  date = new Date()
): Promise<GeminiDailyUsageCounts> {
  const store = await ensureUsageStoreHydrated();
  const dateKey = getCurrentUsageDate(date);
  const current = store[dateKey] || {
    textRequests: 0,
    ttsRequests: 0,
    updatedAt: date.toISOString(),
  };

  const nextEntry: GeminiDailyUsageEntry = {
    textRequests: current.textRequests + (kind === 'text' ? 1 : 0),
    ttsRequests: current.ttsRequests + (kind === 'tts' ? 1 : 0),
    updatedAt: new Date().toISOString(),
  };

  store[dateKey] = nextEntry;
  const pruned = pruneUsageStore(store);
  usageMemoryStore = pruned;

  // Persist deep snapshot asynchronously so Gemini API responses are never blocked or broken
  const snapshot: GeminiUsageStore = JSON.parse(JSON.stringify(pruned));
  scheduleUsagePersist(snapshot);

  return {
    date: dateKey,
    textRequests: nextEntry.textRequests,
    ttsRequests: nextEntry.ttsRequests,
  };
}

export async function getGeminiDailyUsage(date = new Date()): Promise<GeminiDailyUsageCounts> {
  const store = await ensureUsageStoreHydrated();
  const dateKey = getCurrentUsageDate(date);
  const entry = store[dateKey];
  return {
    date: dateKey,
    textRequests: entry?.textRequests || 0,
    ttsRequests: entry?.ttsRequests || 0,
  };
}

export async function flushGeminiUsagePersistenceForTesting(): Promise<void> {
  await usagePersistQueue;
}

export function resetGeminiUsageMemoryForTesting(): void {
  usageMemoryStore = null;
  usageHydrationPromise = null;
  usagePersistQueue = Promise.resolve();
}
