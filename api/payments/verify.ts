/**
 * Olmera Healthcare - Server-Side Payment & Price Verification Endpoint
 *
 * Prevents client-side tampering of consultation prices, platform fees,
 * or promotional discounts by computing totals from the authoritative catalog.
 */

import { isOriginAllowed, checkPersistentRateLimit } from '../llm';

const AUTHORITATIVE_FEES: Record<string, number> = {
  general_consultation: 1200,
  cardiology_consultation: 1500,
  telemedicine_visit: 800,
  emergency_triage: 1800,
};

const AUTHORITATIVE_COUPONS: Record<string, number> = {
  OLMERA10: 0.1,
  CAREFIRST: 0.15,
  SENIORCARE: 0.2,
};

export default async function handler(req: any, res: any) {
  // CORS — same logic as /api/auth/rate-limit and /api/llm
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
   * CSRF — Double-Submit Cookie Pattern (matches /api/auth/rate-limit).
   * Client sends the same random token in both the X-CSRF-Token header and
   * the olmera_csrf SameSite=Strict cookie. We compare them server-side with
   * constant-time equality — a length-only check is bypassable with any
   * 24-char string.
   */
  const csrfHeader = req.headers?.['x-csrf-token'];
  if (!csrfHeader || typeof csrfHeader !== 'string') {
    return res.status(403).json({ error: 'Missing CSRF token.' });
  }

  const rawCookies = typeof req.headers?.cookie === 'string' ? req.headers.cookie : '';
  const csrfCookie = rawCookies
    .split(';')
    .map((c: string) => c.trim())
    .find((c: string) => c.startsWith('olmera_csrf='))
    ?.slice('olmera_csrf='.length) ?? '';

  if (!csrfCookie || csrfHeader.length !== csrfCookie.length) {
    return res.status(403).json({ error: 'Invalid CSRF token.' });
  }
  let csrfDiff = 0;
  for (let i = 0; i < csrfHeader.length; i++) {
    csrfDiff |= csrfHeader.charCodeAt(i) ^ csrfCookie.charCodeAt(i);
  }
  if (csrfDiff !== 0) {
    return res.status(403).json({ error: 'CSRF token mismatch.' });
  }

  // Authoritative server-side persistent rate limiting
  const clientIp = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();
  try {
    const rateStatus = await checkPersistentRateLimit(clientIp, 'payments');
    if (rateStatus.limited) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please wait before retrying.' });
    }
  } catch {
    return res.status(503).json({ error: 'Rate limiting service unavailable.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const serviceKey = typeof body.serviceKey === 'string' ? body.serviceKey : 'general_consultation';
    const couponCode = typeof body.couponCode === 'string' ? body.couponCode.trim().toUpperCase() : '';
    const claimedBase = Number(body.claimedBaseAmount);

    const baseAmount = AUTHORITATIVE_FEES[serviceKey] ?? 1200;
    if (Number.isFinite(claimedBase) && claimedBase !== baseAmount) {
      return res.status(400).json({
        valid: false,
        error: 'Price integrity check failed. Client amount does not match authoritative schedule.',
      });
    }

    let discountRate = 0;
    if (couponCode) {
      if (AUTHORITATIVE_COUPONS[couponCode] === undefined) {
        return res.status(400).json({ valid: false, error: 'Invalid promotional code.' });
      }
      discountRate = AUTHORITATIVE_COUPONS[couponCode];
    }

    const discountAmount = Math.round(baseAmount * discountRate);
    const platformFee = 45;
    const totalDue = Math.max(100, baseAmount - discountAmount + platformFee);

    return res.status(200).json({
      valid: true,
      serviceKey,
      baseAmount,
      discountAmount,
      platformFee,
      totalDue,
    });
  } catch {
    return res.status(400).json({ valid: false, error: 'Invalid payment verification payload.' });
  }
}
