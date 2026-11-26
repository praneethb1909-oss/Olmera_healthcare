/**
 * Olmera Healthcare - Server-Side Authentication Rate Limiting Endpoint
 *
 * Enforces authoritative persistent rate limits across all authentication actions
 * (login, OTP verification, password reset) so attackers cannot bypass client-side
 * limits by clearing browser storage.
 */

import { isOriginAllowed, checkPersistentRateLimit } from '../llm';

type AuthAction = 'login' | 'otp' | 'password_reset';

const AUTH_ACTION_POLICIES: Record<AuthAction, { maxReqs: number; windowMs: number }> = {
  login: { maxReqs: 8, windowMs: 5 * 60_000 },
  otp: { maxReqs: 6, windowMs: 5 * 60_000 },
  password_reset: { maxReqs: 5, windowMs: 15 * 60_000 },
};

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

  /**
   * CSRF Validation — Double-Submit Cookie Pattern.
   *
   * The client writes the same random token to:
   *   (a) sessionStorage  — read back and sent as the X-CSRF-Token request header
   *   (b) a SameSite=Strict cookie (olmera_csrf) — sent automatically by the browser
   *
   * We compare (a) and (b) on the server.  An attacker from a foreign origin
   * cannot read the cookie (SameSite=Strict prevents the browser from attaching
   * it to cross-site requests) and therefore cannot replicate the header value.
   * A length-only check is insufficient — any 24-char string would pass it.
   */
  const csrfHeader = req.headers?.['x-csrf-token'];
  if (!csrfHeader || typeof csrfHeader !== 'string') {
    return res.status(403).json({ error: 'Missing CSRF token.' });
  }

  // Parse the olmera_csrf cookie from the Cookie header.
  const rawCookies = typeof req.headers?.cookie === 'string' ? req.headers.cookie : '';
  const csrfCookie = rawCookies
    .split(';')
    .map((c: string) => c.trim())
    .find((c: string) => c.startsWith('olmera_csrf='))
    ?.slice('olmera_csrf='.length) ?? '';

  // Constant-time comparison to prevent timing attacks.
  if (!csrfCookie || csrfHeader.length !== csrfCookie.length) {
    return res.status(403).json({ error: 'Invalid CSRF token.' });
  }
  let diff = 0;
  for (let i = 0; i < csrfHeader.length; i++) {
    diff |= csrfHeader.charCodeAt(i) ^ csrfCookie.charCodeAt(i);
  }
  if (diff !== 0) {
    return res.status(403).json({ error: 'CSRF token mismatch.' });
  }

  let body: Record<string, unknown>;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as Record<string, unknown>) || {};
  } catch {
    return res.status(400).json({ error: 'Invalid request body: malformed JSON.' });
  }
  const action = body.action as AuthAction;
  if (!action || !AUTH_ACTION_POLICIES[action]) {
    return res.status(400).json({ error: 'Invalid authentication action.' });
  }

  const clientIp = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();
  const identifier = typeof body.identifier === 'string' ? body.identifier.trim().toLowerCase().slice(0, 120) : '';
  const subjectKey = identifier ? `${clientIp}:${identifier}` : clientIp;
  const policy = AUTH_ACTION_POLICIES[action];

  try {
    const rateStatus = await checkPersistentRateLimit(
      subjectKey,
      `auth_${action}`,
      undefined,
      policy.maxReqs,
      policy.windowMs
    );
    if (rateStatus.limited) {
      const retryAfterSeconds = Math.ceil(policy.windowMs / 1000);
      return res.status(429).json({
        allowed: false,
        retryAfterSeconds,
        error: `Too many ${action.replace('_', ' ')} attempts. Please wait before retrying.`,
      });
    }
    return res.status(200).json({ allowed: true, count: rateStatus.count });
  } catch {
    return res.status(503).json({ error: 'Authentication rate limiting service unavailable.' });
  }
}
