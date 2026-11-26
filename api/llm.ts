/**
 * Olmera Healthcare - Server-Side LLM Proxy (Vercel Serverless Function)
 *
 * Keeps all AI provider API keys strictly server-side in process.env.
 * Enforces explicit CORS allowlist (no wildcard/regex patterns), persistent
 * distributed rate limiting (Upstash/Vercel KV Redis or Firestore), CSRF header
 * checks, input validation, and sanitized error responses.
 */

const PRODUCTION_ORIGINS = [
  'https://olmera.health',
  'https://www.olmera.health',
  'http://localhost:5173',
  'http://localhost:4173',
];

export function buildAllowedOrigins(): Set<string> {
  const origins = new Set<string>(PRODUCTION_ORIGINS);

  const explicitPreviews = (process.env.ALLOWED_PREVIEW_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(o => o.startsWith('https://') && !o.includes('*'));
  for (const previewOrigin of explicitPreviews) {
    origins.add(previewOrigin);
  }

  if (process.env.VERCEL_URL && !process.env.VERCEL_URL.includes('*')) {
    origins.add(`https://${process.env.VERCEL_URL.trim()}`);
  }

  return origins;
}

export function isOriginAllowed(origin: string, allowedOrigins = buildAllowedOrigins()): boolean {
  if (!origin) return false;
  if (allowedOrigins.has(origin)) return true;
  if (
    process.env.NODE_ENV !== 'production' &&
    !process.env.VERCEL &&
    /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
  ) {
    return true;
  }
  return false;
}

export interface PersistentRateLimitStore {
  incrementAndCount(key: string, windowMs: number): Promise<number>;
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQS = 20;

/**
 * Distributed Upstash / Vercel KV Redis REST rate-limit store.
 */
class RedisRestRateLimitStore implements PersistentRateLimitStore {
  constructor(private readonly url: string, private readonly token: string) {}

  async incrementAndCount(key: string, windowMs: number): Promise<number> {
    const pipelineUrl = `${this.url.replace(/\/$/, '')}/pipeline`;
    const response = await fetch(pipelineUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['PEXPIRE', key, String(windowMs), 'NX'],
      ]),
    });

    if (!response.ok) {
      throw new Error(`Redis rate-limit store failed with status ${response.status}`);
    }

    const payload = (await response.json()) as Array<{ result?: number }>;
    const count = Number(payload?.[0]?.result ?? 0);
    return count;
  }
}

/**
 * Persistent Firestore REST rate-limit store (shared across all serverless instances).
 * Uses Firestore's atomic `documents:commit` fieldTransform (`increment`) so concurrent
 * requests for the same rate-limit key never overwrite each other.
 *
 * Firestore never expires documents on its own, so each write also stamps an `expireAt`
 * timestamp (now + window). A TTL policy on the `rate_limits` collection targeting
 * `expireAt` then deletes stale counters, preventing unbounded storage growth:
 *   gcloud firestore fields ttls update expireAt \
 *     --collection-group=rate_limits --enable-ttl
 */
class FirestoreRestRateLimitStore implements PersistentRateLimitStore {
  constructor(private readonly projectId: string, private readonly apiKey?: string) {}

  async incrementAndCount(key: string, windowMs: number): Promise<number> {
    const docId = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    const querySuffix = this.apiKey ? `?key=${encodeURIComponent(this.apiKey)}` : '';
    const dbPath = `projects/${encodeURIComponent(this.projectId)}/databases/(default)`;
    const commitUrl = `https://firestore.googleapis.com/v1/${dbPath}/documents:commit${querySuffix}`;
    const documentPath = `projects/${this.projectId}/databases/(default)/documents/rate_limits/${docId}`;
    const expireAt = new Date(Date.now() + windowMs).toISOString();

    const commitRes = await fetch(commitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        writes: [
          {
            transform: {
              document: documentPath,
              fieldTransforms: [
                { fieldPath: 'count', increment: { integerValue: '1' } },
                { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
              ],
            },
          },
          {
            update: {
              name: documentPath,
              fields: { expireAt: { timestampValue: expireAt } },
            },
            updateMask: { fieldPaths: ['expireAt'] },
          },
        ],
      }),
    });

    if (!commitRes.ok) {
      throw new Error(`Firestore rate-limit commit failed with status ${commitRes.status}`);
    }

    const payload = (await commitRes.json()) as {
      writeResults?: Array<{
        transformResults?: Array<{ integerValue?: string | number }>;
      }>;
    };
    const nextCount = Number(payload?.writeResults?.[0]?.transformResults?.[0]?.integerValue ?? 0);
    if (!Number.isFinite(nextCount) || nextCount <= 0) {
      throw new Error('Firestore rate-limit commit returned invalid counter value.');
    }
    return nextCount;
  }
}

const devMemoryBuckets = new Map<string, { count: number; expiresAt: number }>();

class DevInMemoryRateLimitStore implements PersistentRateLimitStore {
  async incrementAndCount(key: string, windowMs: number): Promise<number> {
    const now = Date.now();
    const existing = devMemoryBuckets.get(key);
    if (!existing || existing.expiresAt <= now) {
      devMemoryBuckets.set(key, { count: 1, expiresAt: now + windowMs });
      return 1;
    }
    existing.count += 1;
    return existing.count;
  }
}

function resolvePersistentRateLimitStore(): PersistentRateLimitStore | null {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (redisUrl && redisToken) {
    return new RedisRestRateLimitStore(redisUrl, redisToken);
  }

  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (firebaseProjectId && firebaseProjectId !== 'your-project-id') {
    return new FirestoreRestRateLimitStore(firebaseProjectId, process.env.VITE_FIREBASE_API_KEY);
  }

  // Local non-production development fallback when Redis/Firestore env vars are not configured.
  // Production (VERCEL or NODE_ENV=production) still fails closed if no distributed store is configured.
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    return new DevInMemoryRateLimitStore();
  }

  return null;
}

export async function checkPersistentRateLimit(
  ip: string,
  service = 'llm',
  store: PersistentRateLimitStore | null = resolvePersistentRateLimitStore(),
  maxReqs = RATE_LIMIT_MAX_REQS,
  windowMs = RATE_LIMIT_WINDOW_MS
): Promise<{ limited: boolean; count: number }> {
  if (!store) {
    // Fail-closed / explicit error when no distributed store is configured in production
    throw new Error('Persistent rate limit store is not configured.');
  }

  const bucketSlot = Math.floor(Date.now() / windowMs);
  const safeService = String(service || 'llm').replace(/[^a-zA-Z0-9_-]/g, '_');
  const key = `olmera:rl:${safeService}:${ip}:${bucketSlot}`;
  try {
    const count = await store.incrementAndCount(key, windowMs);
    return { limited: count > maxReqs, count };
  } catch (err) {
    // In local non-production development, fall back to in-memory store if unauthenticated
    // Firestore REST calls are blocked by security rules. Production still fails closed.
    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL && !(store instanceof DevInMemoryRateLimitStore)) {
      const count = await new DevInMemoryRateLimitStore().incrementAndCount(key, windowMs);
      return { limited: count > maxReqs, count };
    }
    throw err;
  }
}

/**
 * Validates the CSRF double-submit cookie pattern (`X-CSRF-Token` header vs `olmera_csrf` cookie)
 * using constant-time comparison to prevent timing attacks.
 */
export function validateDoubleSubmitCsrf(req: any): { valid: boolean; error?: string } {
  const csrfHeader = req.headers?.['x-csrf-token'];
  if (!csrfHeader || typeof csrfHeader !== 'string' || csrfHeader.length < 24) {
    return { valid: false, error: 'Missing or invalid CSRF token.' };
  }

  const rawCookies = typeof req.headers?.cookie === 'string' ? req.headers.cookie : '';
  const csrfCookie = rawCookies
    .split(';')
    .map((c: string) => c.trim())
    .find((c: string) => c.startsWith('olmera_csrf='))
    ?.slice('olmera_csrf='.length) ?? '';

  if (!csrfCookie || csrfHeader.length !== csrfCookie.length) {
    return { valid: false, error: 'Invalid CSRF token.' };
  }

  let diff = 0;
  for (let i = 0; i < csrfHeader.length; i++) {
    diff |= csrfHeader.charCodeAt(i) ^ csrfCookie.charCodeAt(i);
  }
  if (diff !== 0) {
    return { valid: false, error: 'CSRF token mismatch.' };
  }

  return { valid: true };
}

export default async function handler(req: any, res: any) {
  const origin = typeof req.headers?.origin === 'string' ? req.headers.origin : '';
  const originPermitted = isOriginAllowed(origin);

  if (origin && !originPermitted) {
    return res.status(403).json({ error: 'Origin not permitted by CORS policy.' });
  }

  if (originPermitted) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CSRF Double-Submit Cookie Verification (constant-time comparison)
  const csrfCheck = validateDoubleSubmitCsrf(req);
  if (!csrfCheck.valid) {
    return res.status(403).json({ error: csrfCheck.error || 'Missing or invalid CSRF token.' });
  }

  // Persistent Distributed Rate Limiting
  const clientIp = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();
  try {
    const rateStatus = await checkPersistentRateLimit(clientIp, 'llm');
    if (rateStatus.limited) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please wait before retrying.' });
    }
  } catch {
    return res.status(503).json({ error: 'Rate limiting service unavailable.' });
  }

  let body: Record<string, unknown>;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as Record<string, unknown>) || {};
  } catch {
    return res.status(400).json({ error: 'Invalid request body: malformed JSON.' });
  }

  try {
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const systemInstruction =
      typeof body.systemInstruction === 'string' ? body.systemInstruction.trim().slice(0, 2000) : undefined;
    const provider = typeof body.provider === 'string' ? body.provider : 'nvidia';
    const model = typeof body.model === 'string' ? body.model : 'mistralai/mistral-large-4-1t-a52b';
    const temperature = Math.min(1, Math.max(0, Number(body.temperature ?? 0.5)));
    const maxTokens = Math.min(2048, Math.max(64, Number(body.maxTokens ?? 1024)));

    if (!prompt || prompt.length > 8000) {
      return res.status(400).json({ error: 'Invalid prompt payload.' });
    }

    // Resolve server-only API keys from environment variables
    const apiKey =
      provider === 'gemini'
        ? process.env.GEMINI_API_KEY
        : provider === 'anthropic'
        ? process.env.ANTHROPIC_API_KEY
        : process.env.NVIDIA_API_KEY_MISTRAL || process.env.NVIDIA_API_KEY_AUTOGEN || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(503).json({ error: 'AI provider not configured on server.' });
    }

    // Set HttpOnly Secure SameSite session affinity cookie
    res.setHeader(
      'Set-Cookie',
      'olmera_api_session=active; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=900'
    );

    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const upstream = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        }),
      });
      if (!upstream.ok) {
        return res.status(502).json({ error: 'Upstream AI service unavailable.' });
      }
      const data = await upstream.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return res.status(200).json({ text });
    }

    // Default: OpenAI-compatible NVIDIA NIM endpoint
    const messages: Array<{ role: string; content: string }> = [];
    if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
    messages.push({ role: 'user', content: prompt });

    const upstream = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
    });

    if (!upstream.ok) {
      return res.status(502).json({ error: 'Upstream AI service unavailable.' });
    }
    const data = await upstream.json();
    const text = data?.choices?.[0]?.message?.content || '';
    return res.status(200).json({ text });
  } catch {
    return res.status(500).json({ error: 'Internal server error processing AI request.' });
  }
}
