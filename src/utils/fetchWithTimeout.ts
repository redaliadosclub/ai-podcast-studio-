export interface FetchWithFallbackOptions {
  timeoutMs?: number;
  fallbackDelayMs?: number;
  onFallbackDelay?: () => void;
}

/**
 * Performs a fetch request with a configurable timeout (default 60s) so the browser
 * does not abort prematurely while the backend completes synthesis or fallback.
 */
export async function fetchWithFallbackNotice(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: FetchWithFallbackOptions = {}
): Promise<Response> {
  const {
    timeoutMs = 60000,
    fallbackDelayMs = 8500,
    onFallbackDelay,
  } = options;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  const fallbackTimerId = onFallbackDelay
    ? window.setTimeout(() => onFallbackDelay(), fallbackDelayMs)
    : undefined;

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      const secs = Math.round(timeoutMs / 1000);
      throw new Error(
        `La operación superó el tiempo máximo de espera (${secs}s). Por favor, inténtalo de nuevo.`
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    if (fallbackTimerId !== undefined) {
      window.clearTimeout(fallbackTimerId);
    }
  }
}
