import { GoogleGenAI } from '@google/genai';

const clientCache = new Map<string, GoogleGenAI>();
const keyCooldownUntil = new Map<string, number>();
const keyModelCooldownUntil = new Map<string, number>();
let roundRobinCursor = 0;

const QUOTA_COOLDOWN_MS = 60_000;
const INVALID_KEY_COOLDOWN_MS = 5 * 60_000;

export function parseGeminiApiKeys(rawPrimary?: string, rawExtra?: string): string[] {
  const combined = [rawPrimary || '', rawExtra || ''].filter(Boolean).join('\n');
  if (!combined.trim()) return [];

  const tokens = combined
    .split(/[\r\n,]+/)
    .map((part) => part.trim().replace(/^["']|["']$/g, '').trim())
    .filter((part) => part.length > 0 && part !== 'MY_GEMINI_API_KEY');

  return Array.from(new Set(tokens));
}

export function getGeminiApiKeys(): string[] {
  return parseGeminiApiKeys(process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEYS);
}

export interface GeminiPoolHealth {
  totalKeys: number;
  healthyKeys: number;
  pausedKeys: number;
  quotaPausedKeys: number;
}

export function getGeminiPoolCount(): number {
  return getGeminiApiKeys().length;
}

export function getGeminiPoolHealth(now = Date.now()): GeminiPoolHealth {
  const keys = getGeminiApiKeys();
  const totalKeys = keys.length;

  for (const [key, expiresAt] of keyCooldownUntil.entries()) {
    if (expiresAt <= now) {
      keyCooldownUntil.delete(key);
    }
  }
  for (const [entryKey, expiresAt] of keyModelCooldownUntil.entries()) {
    if (expiresAt <= now) {
      keyModelCooldownUntil.delete(entryKey);
    }
  }

  let pausedKeys = 0;
  let quotaPausedKeys = 0;

  for (const key of keys) {
    const globalCooldown = keyCooldownUntil.get(key) || 0;
    const isGlobalPaused = globalCooldown > now;

    let isQuotaPaused = false;
    const prefix = `${key}:`;
    for (const [entryKey, expiresAt] of keyModelCooldownUntil.entries()) {
      if (entryKey.startsWith(prefix) && expiresAt > now) {
        isQuotaPaused = true;
        break;
      }
    }

    if (isQuotaPaused) {
      quotaPausedKeys += 1;
    }
    if (isGlobalPaused || isQuotaPaused) {
      pausedKeys += 1;
    }
  }

  return {
    totalKeys,
    healthyKeys: Math.max(0, totalKeys - pausedKeys),
    pausedKeys,
    quotaPausedKeys,
  };
}

function getClientForKey(apiKey: string): GoogleGenAI {
  let client = clientCache.get(apiKey);
  if (!client) {
    client = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    clientCache.set(apiKey, client);
  }
  return client;
}

export function extractStatusCode(error: any): number | undefined {
  if (typeof error?.status === 'number') return error.status;
  if (typeof error?.code === 'number') return error.code;
  if (typeof error?.statusCode === 'number') return error.statusCode;
  const msg = String(error?.message || '');
  const match = msg.match(/\b(400|401|403|404|408|429|500|502|503|504)\b/);
  return match ? Number(match[1]) : undefined;
}

export function isQuotaError(error: any): boolean {
  const status = extractStatusCode(error);
  const msg = String(error?.message || '').toLowerCase();
  return (
    status === 429 ||
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate limit')
  );
}

export function isRotatableKeyError(error: any): boolean {
  if (isQuotaError(error)) return true;

  const status = extractStatusCode(error);
  const msg = String(error?.message || '').toLowerCase();

  if (status === 403 || status === 400 || status === 401) {
    return true;
  }

  return (
    msg.includes('api_key_invalid') ||
    msg.includes('api key not valid') ||
    msg.includes('permission_denied') ||
    msg.includes('permission denied') ||
    msg.includes('unauthorized') ||
    msg.includes('billing')
  );
}

export function shouldFallbackModel(error: any): boolean {
  const status = extractStatusCode(error);
  const name = String(error?.name || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  const msg = String(error?.message || '').toLowerCase();

  if (
    status === 503 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 504 ||
    status === 408 ||
    status === 404 ||
    status === 403 ||
    status === 400
  ) {
    return true;
  }

  return (
    name.includes('abort') ||
    name.includes('timeout') ||
    code.includes('timeout') ||
    code.includes('etimedout') ||
    code.includes('econnreset') ||
    code.includes('econnaborted') ||
    msg.includes('aborted') ||
    msg.includes('unavailable') ||
    msg.includes('overloaded') ||
    msg.includes('high demand') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('internal') ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('deadline') ||
    msg.includes('not found') ||
    msg.includes('not supported') ||
    msg.includes('permission') ||
    msg.includes('access') ||
    msg.includes('deprecated') ||
    msg.includes('unknown model') ||
    msg.includes('fetch failed')
  );
}

function markKeyCooldown(apiKey: string, model: string, error: any) {
  const now = Date.now();
  const msg = String(error?.message || '').toLowerCase();
  const status = extractStatusCode(error);

  if (
    status === 401 ||
    status === 403 ||
    msg.includes('api_key_invalid') ||
    msg.includes('api key not valid') ||
    msg.includes('permission_denied')
  ) {
    keyCooldownUntil.set(apiKey, now + INVALID_KEY_COOLDOWN_MS);
    return;
  }

  if (isQuotaError(error)) {
    keyModelCooldownUntil.set(`${apiKey}:${model}`, now + QUOTA_COOLDOWN_MS);
  }
}

function getOrderedKeyIndices(keys: string[], model: string): number[] {
  const now = Date.now();
  const total = keys.length;
  const start = roundRobinCursor % total;
  const ready: number[] = [];
  const cooled: number[] = [];

  for (let offset = 0; offset < total; offset++) {
    const idx = (start + offset) % total;
    const key = keys[idx];
    const globalCooldown = keyCooldownUntil.get(key) || 0;
    const modelCooldown = keyModelCooldownUntil.get(`${key}:${model}`) || 0;
    if (globalCooldown > now || modelCooldown > now) {
      cooled.push(idx);
    } else {
      ready.push(idx);
    }
  }

  return [...ready, ...cooled];
}

export async function executeWithGeminiPool<TStep extends { model: string }, TResult>(
  chain: readonly TStep[],
  runner: (ai: GoogleGenAI, step: TStep) => Promise<TResult>,
  label: string
): Promise<TResult> {
  const keys = getGeminiApiKeys();
  if (keys.length === 0) {
    throw new Error('No hay claves de Gemini API configuradas en el servidor.');
  }

  let lastError: any;

  for (let m = 0; m < chain.length; m++) {
    const step = chain[m];
    const orderedIndices = getOrderedKeyIndices(keys, step.model);

    for (let k = 0; k < orderedIndices.length; k++) {
      const keyIdx = orderedIndices[k];
      const apiKey = keys[keyIdx];
      const client = getClientForKey(apiKey);

      try {
        const result = await runner(client, step);
        roundRobinCursor = (keyIdx + 1) % keys.length;
        return result;
      } catch (error: any) {
        lastError = error;
        const rotatable = isRotatableKeyError(error);
        if (rotatable) {
          markKeyCooldown(apiKey, step.model, error);
        }

        const hasMoreKeys = k < orderedIndices.length - 1;
        if (rotatable && hasMoreKeys) {
          const nextKeyIdx = orderedIndices[k + 1];
          console.warn(
            `[Gemini Pool ${label}] Clave #${keyIdx + 1}/${keys.length} en ${step.model} falló (${
              extractStatusCode(error) || 'error de clave/cuota'
            }), rotando a clave #${nextKeyIdx + 1}...`
          );
          continue;
        }
        break;
      }
    }

    const hasNextModel = m < chain.length - 1;
    if (hasNextModel && (shouldFallbackModel(lastError) || isRotatableKeyError(lastError))) {
      console.warn(
        `[Fallback ${label}] Modelo ${step.model} falló (${
          extractStatusCode(lastError) || lastError?.name || 'error'
        }), reintentando con ${chain[m + 1].model}...`
      );
      continue;
    }

    throw lastError;
  }

  throw lastError;
}

export function resetGeminiPoolStateForTesting() {
  clientCache.clear();
  keyCooldownUntil.clear();
  keyModelCooldownUntil.clear();
  roundRobinCursor = 0;
}
