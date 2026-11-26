export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string[]>;
  isConflict: boolean;
  isUnauthorized: boolean;
  isServiceUnavailable: boolean;

  constructor(
    message: string,
    options: {
      status: number;
      fieldErrors?: Record<string, string[]>;
      isServiceUnavailable?: boolean;
    }
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.fieldErrors = options.fieldErrors ?? {};
    this.isConflict = options.status === 409;
    this.isUnauthorized = options.status === 401 || options.status === 403;
    this.isServiceUnavailable = Boolean(options.isServiceUnavailable);
  }
}

let inMemoryCsrfToken: string | null = null;
let csrfFetchInFlight: Promise<string | null> | null = null;

export function clearCsrfToken(): void {
  inMemoryCsrfToken = null;
}

function normalizeFieldErrors(payload: unknown): {
  message: string;
  fieldErrors: Record<string, string[]>;
} {
  if (!payload || typeof payload !== 'object') {
    return { message: 'Request failed.', fieldErrors: {} };
  }

  const record = payload as Record<string, unknown>;
  const fieldErrors: Record<string, string[]> = {};
  const topMessages: string[] = [];

  for (const [key, val] of Object.entries(record)) {
    if (key === 'detail' || key === 'error' || key === 'message') {
      if (typeof val === 'string' && val.trim()) {
        topMessages.push(val.trim());
      } else if (Array.isArray(val)) {
        for (const item of val) {
          if (typeof item === 'string' && item.trim()) topMessages.push(item.trim());
        }
      }
      continue;
    }

    if (typeof val === 'string' && val.trim()) {
      fieldErrors[key] = [val.trim()];
      if (key === 'non_field_errors') topMessages.push(val.trim());
    } else if (Array.isArray(val)) {
      const msgs = val
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .filter(Boolean);
      if (msgs.length > 0) {
        fieldErrors[key] = msgs;
        if (key === 'non_field_errors') topMessages.push(...msgs);
      }
    } else if (val && typeof val === 'object') {
      // Nested object errors (e.g. transaction inside recurring confirm)
      const nested = normalizeFieldErrors(val);
      for (const [nk, nv] of Object.entries(nested.fieldErrors)) {
        fieldErrors[`${key}.${nk}`] = nv;
      }
      if (nested.message && nested.message !== 'Request failed.') {
        topMessages.push(nested.message);
      }
    }
  }

  if (topMessages.length > 0) {
    return { message: topMessages.join(' '), fieldErrors };
  }

  const firstField = Object.values(fieldErrors)[0];
  if (firstField && firstField.length > 0) {
    return { message: firstField[0], fieldErrors };
  }

  return { message: 'Request failed.', fieldErrors };
}

export async function refreshCsrfToken(): Promise<string | null> {
  if (csrfFetchInFlight) return csrfFetchInFlight;
  csrfFetchInFlight = (async () => {
    try {
      const res = await fetch('/api/v1/auth/csrf/', {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok || !ct.includes('application/json')) {
        inMemoryCsrfToken = null;
        return null;
      }
      const data = (await res.json()) as { csrf_token?: string };
      if (data.csrf_token) {
        inMemoryCsrfToken = data.csrf_token;
        return data.csrf_token;
      }
      inMemoryCsrfToken = null;
      return null;
    } catch {
      inMemoryCsrfToken = null;
      return null;
    } finally {
      csrfFetchInFlight = null;
    }
  })();
  return csrfFetchInFlight;
}

export async function apiRequest<T>(
  path: string,
  options?: {
    method?: 'GET' | 'POST';
    body?: unknown;
    query?: object;
    signal?: AbortSignal;
    cache?: RequestCache;
  }
): Promise<T> {
  const method = options?.method ?? 'GET';
  let url = path;
  if (options?.query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(options.query as Record<string, unknown>)) {
      if (v !== undefined && v !== null && v !== '') {
        params.set(k, String(v));
      }
    }
    const qs = params.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (method === 'POST') {
    if (!inMemoryCsrfToken) {
      if (!(await refreshCsrfToken())) {
        throw new ApiError('Unable to start a secure session. Refresh and try again.', {
          status: 0,
          isServiceUnavailable: true,
        });
      }
    }
    if (inMemoryCsrfToken) {
      headers['X-CSRFToken'] = inMemoryCsrfToken;
    }
    if (options?.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers,
      body: method === 'POST' && options?.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options?.signal,
      cache: options?.cache,
    });
  } catch {
    throw new ApiError('Unable to reach the Penny backend service.', {
      status: 0,
      isServiceUnavailable: true,
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (response.status === 403) {
    clearCsrfToken();
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(
      response.status === 404 || response.status >= 500
        ? 'Penny backend API is unavailable on this origin.'
        : 'Unexpected non-JSON response from server.',
      {
        status: response.status,
        isServiceUnavailable: response.status === 404 || response.status >= 500,
      }
    );
  }

  const data: unknown = await response.json();

  if (!response.ok) {
    const { message, fieldErrors } = normalizeFieldErrors(data);
    throw new ApiError(message, { status: response.status, fieldErrors });
  }

  return data as T;
}

export async function generateRequestId(): Promise<string> {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const res = await apiRequest<{ request_id: string }>('/api/v1/transactions/request-id/');
  return res.request_id;
}

export async function fetchAllPaginated<T>(
  fetchPage: (page: number) => Promise<{ next: string | null; results: T[] }>,
  maxPages = 25
): Promise<T[]> {
  const collected: T[] = [];
  let page = 1;
  while (page <= maxPages) {
    const res = await fetchPage(page);
    collected.push(...res.results);
    if (!res.next) break;
    page += 1;
  }
  return collected;
}
