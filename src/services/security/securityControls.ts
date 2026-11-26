/**
 * Olmera Healthcare - Centralized Security Hardening & Validation Controls
 *
 * Implements:
 * - Salted PBKDF2-SHA256 password hashing & constant-time verification
 * - Strict input validation & XSS output sanitization
 * - Sliding-window rate limiting (brute-force & DoS protection)
 * - Session-bound CSRF token generation & verification
 * - Short-lived, single-use password reset tokens
 * - File upload magic-byte signature, MIME, and size validation
 * - Authoritative consultation pricing & coupon verification
 * - Production-safe error sanitization (no stack trace leaks)
 */

// ---------------------------------------------------------------------------
// 1. SALTED PBKDF2-SHA256 PASSWORD HASHING
// ---------------------------------------------------------------------------
const PBKDF2_ITERATIONS = 100_000;

export class WebCryptoUnavailableError extends Error {
  constructor() {
    super('Secure password operations require a modern browser or runtime with Web Crypto Subtle support.');
    this.name = 'WebCryptoUnavailableError';
  }
}

export function generateRandomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    throw new WebCryptoUnavailableError();
  }
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function hashPasswordPBKDF2(password: string, existingSalt?: string): Promise<{ hash: string; salt: string }> {
  if (typeof globalThis === 'undefined' || !globalThis.crypto?.subtle) {
    throw new WebCryptoUnavailableError();
  }

  const salt = existingSalt || generateRandomHex(16);
  const enc = new TextEncoder();
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  const hash = Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return { hash: `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${hash}`, salt };
}

export async function verifyPasswordPBKDF2(password: string, storedHash: string, salt: string): Promise<boolean> {
  if (!password || !storedHash || !salt) return false;

  // Parse the stored iteration count from the hash string (pbkdf2_sha256$ITERATIONS$HASH).
  // This ensures verification remains correct even after PBKDF2_ITERATIONS is increased for
  // stronger security — existing hashes retain their original iteration count.
  const parts = storedHash.split('$');
  const storedIterations = parts.length === 3 && parts[0] === 'pbkdf2_sha256'
    ? parseInt(parts[1], 10)
    : NaN;
  const iterations = Number.isFinite(storedIterations) && storedIterations > 0
    ? storedIterations
    : PBKDF2_ITERATIONS;

  if (typeof globalThis === 'undefined' || !globalThis.crypto?.subtle) {
    throw new WebCryptoUnavailableError();
  }

  const enc = new TextEncoder();
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  const recomputedHash = Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const recomputedFull = `pbkdf2_sha256$${iterations}$${recomputedHash}`;
  return constantTimeEqual(recomputedFull, storedHash);
}

// ---------------------------------------------------------------------------
// 2. XSS SANITIZATION & SERVER-SIDE / CLIENT-SIDE INPUT VALIDATION
// ---------------------------------------------------------------------------
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
};

export function escapeHtml(input: string): string {
  return String(input || '').replace(/[&<>"'`/]/g, char => HTML_ESCAPE_MAP[char] || char);
}

export function sanitizePlainText(input: string, maxLength = 2000): string {
  if (typeof input !== 'string') return '';
  // Strip script/style tags, null bytes, and dangerous event handlers
  return input
    .replace(/\0/g, '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/on\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/javascript:/gi, '')
    .trim()
    .slice(0, maxLength);
}

export function hasSqlOrNoSqlInjectionPattern(input: string): boolean {
  const value = String(input || '');
  const patterns = [
    /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC)\b.*\b(FROM|INTO|TABLE|WHERE)\b)/i,
    /(--|\/\*|\*\/|;\s*(DROP|DELETE|SELECT))/i,
    /\$where|\$ne|\$gt|\$regex/i,
  ];
  return patterns.some(rx => rx.test(value));
}

export function validateEmailAddress(email: string): boolean {
  const trimmed = String(email || '').trim();
  if (trimmed.length > 254) return false;
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(trimmed);
}

export function validateSafeId(id: string): boolean {
  return /^[A-Za-z0-9_-]{3,80}$/.test(String(id || '').trim());
}

// ---------------------------------------------------------------------------
// 3. PERSISTENT SLIDING-WINDOW RATE LIMITER (localStorage + Authoritative Server Layer)
// ---------------------------------------------------------------------------
interface RateBucket {
  timestamps: number[];
}

const RATE_LIMIT_STORAGE_KEY = 'olmera_rate_limit_buckets_v1';
const memoryRateBuckets = new Map<string, RateBucket>();

function loadRateBuckets(): Record<string, RateBucket> {
  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      const raw = (globalThis as any).localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  const obj: Record<string, RateBucket> = {};
  memoryRateBuckets.forEach((v, k) => {
    obj[k] = v;
  });
  return obj;
}

function saveRateBuckets(buckets: Record<string, RateBucket>): void {
  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      (globalThis as any).localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(buckets));
    }
  } catch {
    // ignore storage errors
  }
  memoryRateBuckets.clear();
  for (const [k, v] of Object.entries(buckets)) {
    memoryRateBuckets.set(k, v);
  }
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const buckets = loadRateBuckets();
  const bucket = buckets[key] || { timestamps: [] };
  bucket.timestamps = (bucket.timestamps || []).filter(ts => now - ts < windowMs);

  if (bucket.timestamps.length >= maxRequests) {
    const oldest = bucket.timestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    buckets[key] = bucket;
    saveRateBuckets(buckets);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  bucket.timestamps.push(now);
  buckets[key] = bucket;
  saveRateBuckets(buckets);
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - bucket.timestamps.length),
    retryAfterSeconds: 0,
  };
}

export function resetRateLimit(key: string): void {
  const buckets = loadRateBuckets();
  delete buckets[key];
  saveRateBuckets(buckets);
}

/**
 * Authoritative server-side authentication rate limiting supplement.
 * Calls `/api/auth/rate-limit` for login, OTP verification, and password reset.
 *
 * Security: returns `allowed: false` on fetch failure so that an attacker who
 * blocks API requests cannot bypass the server-side rate limit.  The only
 * exception is a non-browser (SSR/test) environment where `window` is absent,
 * because the check is irrelevant there.
 */
export async function enforceServerAuthRateLimit(
  action: 'login' | 'otp' | 'password_reset',
  identifier?: string
): Promise<{ allowed: boolean; error?: string }> {
  if (typeof fetch !== 'function' || typeof window === 'undefined') {
    // Non-browser context (SSR, Node tests) — skip server check.
    return { allowed: true };
  }
  try {
    const csrfToken = getOrCreateCsrfToken();
    const res = await fetch('/api/auth/rate-limit', {
      method: 'POST',
      credentials: 'same-origin', // send the CSRF double-submit cookie
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ action, identifier }),
    });
    if (res.status === 429) {
      const data = await res.json().catch(() => null);
      return {
        allowed: false,
        error: data?.error || 'Too many authentication attempts. Please wait before retrying.',
      };
    }
    if (!res.ok) {
      // Server returned a non-429 error (503, 403, etc.) — deny to be safe.
      return { allowed: false, error: 'Authentication service temporarily unavailable.' };
    }
    return { allowed: true };
  } catch {
    // Network error or fetch blocked — deny rather than allow bypass.
    return { allowed: false, error: 'Could not reach authentication service. Please check your connection.' };
  }
}

// ---------------------------------------------------------------------------
// 4. CSRF TOKEN PROTECTION (Double-Submit Cookie Pattern)
//
// The token is stored in sessionStorage AND written as a SameSite=Strict
// cookie with the same value.  On every API request the browser sends the
// cookie automatically; the client also copies the token into the
// X-CSRF-Token header.  The server reads both and compares them — an
// attacker who can forge a request from a different origin cannot read the
// cookie (SameSite + HttpOnly=false intentional here so JS can read it for
// the header) but cannot replicate the value.
// ---------------------------------------------------------------------------
const CSRF_STORAGE_KEY = 'olmera_csrf_token';
const CSRF_COOKIE_NAME = 'olmera_csrf';

/** Write the token into sessionStorage AND as a SameSite=Strict cookie. */
function persistCsrfToken(token: string): void {
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(CSRF_STORAGE_KEY, token);
      // HttpOnly=false intentionally — JS must read it to place it in the header.
      // SameSite=Strict prevents cross-site requests from carrying this cookie.
      document.cookie = `${CSRF_COOKIE_NAME}=${token}; SameSite=Strict; Path=/; Max-Age=86400`;
    }
  } catch {
    // ignore storage errors
  }
}

export function getOrCreateCsrfToken(): string {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const existing = window.sessionStorage.getItem(CSRF_STORAGE_KEY);
      if (existing && existing.length >= 32) {
        // Ensure the double-submit cookie is always present and in sync with sessionStorage
        if (typeof document !== 'undefined' && !document.cookie.includes(`${CSRF_COOKIE_NAME}=${existing}`)) {
          persistCsrfToken(existing);
        }
        return existing;
      }
      const fresh = generateRandomHex(24);
      persistCsrfToken(fresh);
      return fresh;
    }
  } catch {
    // ignore storage errors
  }
  return generateRandomHex(24);
}

export function validateCsrfToken(candidateToken: string): boolean {
  if (!candidateToken || candidateToken.length < 32) return false;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const expected = window.sessionStorage.getItem(CSRF_STORAGE_KEY);
      if (!expected) return false;
      return constantTimeEqual(candidateToken, expected);
    }
  } catch {
    return false;
  }
  return false;
}

// ---------------------------------------------------------------------------
// 5. EXPIRING, SINGLE-USE PASSWORD RESET TOKENS (15-Minute TTL)
//
// Security: tokens are stored in sessionStorage (not localStorage).
// sessionStorage is:
//   - Scoped to the current tab/window — not shared across tabs or persisted
//     to disk after the tab closes, limiting the XSS exposure window.
//   - Not accessible to other origins.
// Tokens must only be generated server-side in a production flow; this
// in-process store is used only during the admin portal reset workflow that
// runs within the same authenticated session.
// ---------------------------------------------------------------------------
interface ResetTokenRecord {
  token: string;
  email: string;
  expiresAt: number;
  used: boolean;
}

const RESET_TOKENS_KEY = 'olmera_reset_tokens_v1';
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

function loadResetTokens(): ResetTokenRecord[] {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const raw = window.sessionStorage.getItem(RESET_TOKENS_KEY);
      if (raw) return JSON.parse(raw) as ResetTokenRecord[];
    }
  } catch {
    // ignore
  }
  return [];
}

function saveResetTokens(records: ResetTokenRecord[]): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(RESET_TOKENS_KEY, JSON.stringify(records));
    }
  } catch {
    // ignore
  }
}

export function issueExpiringResetToken(email: string): { token: string; expiresAt: number } {
  const cleanEmail = email.trim().toLowerCase();
  const token = generateRandomHex(24);
  const expiresAt = Date.now() + RESET_TOKEN_TTL_MS;

  // Replace any existing unexpired token for this email (one active token per account)
  const existing = loadResetTokens().filter(r => r.email !== cleanEmail && r.expiresAt > Date.now() && !r.used);
  existing.push({ token, email: cleanEmail, expiresAt, used: false });
  saveResetTokens(existing);

  return { token, expiresAt };
}

export function consumeExpiringResetToken(
  token: string,
  email: string
): { valid: boolean; reason?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const records = loadResetTokens();
  const target = records.find(r => r.email === cleanEmail && constantTimeEqual(r.token, token));

  if (!target) {
    return { valid: false, reason: 'Invalid or tampered recovery token.' };
  }
  if (target.used) {
    return { valid: false, reason: 'This recovery link has already been used.' };
  }
  if (Date.now() > target.expiresAt) {
    return { valid: false, reason: 'This recovery link has expired (15-minute limit).' };
  }

  target.used = true;
  saveResetTokens(records);
  return { valid: true };
}

// ---------------------------------------------------------------------------
// 6. STRICT FILE UPLOAD VALIDATION (MIME + Size + Magic-Byte Signatures)
// ---------------------------------------------------------------------------
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedType?: 'pdf' | 'jpeg' | 'png';
}

export async function validateUploadedFile(
  file: File,
  options: { maxSizeMb: number; allowPdf?: boolean } = { maxSizeMb: 10, allowPdf: true }
): Promise<FileValidationResult> {
  if (!file) return { valid: false, error: 'No file provided.' };

  const maxBytes = options.maxSizeMb * 1024 * 1024;
  if (file.size <= 0) {
    return { valid: false, error: 'Uploaded file is empty.' };
  }
  if (file.size > maxBytes) {
    return { valid: false, error: `File exceeds maximum allowed size of ${options.maxSizeMb} MB.` };
  }

  const allowedMimes = options.allowPdf
    ? ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    : ['image/jpeg', 'image/jpg', 'image/png'];

  if (file.type && !allowedMimes.includes(file.type.toLowerCase())) {
    return { valid: false, error: `Disallowed file type "${file.type}".` };
  }

  // Inspect file header magic bytes to block disguised scripts/executables
  try {
    const headerSlice = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(headerSlice);

    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF

    if (isJpeg) return { valid: true, detectedType: 'jpeg' };
    if (isPng) return { valid: true, detectedType: 'png' };
    if (isPdf && options.allowPdf) return { valid: true, detectedType: 'pdf' };

    return {
      valid: false,
      error: 'File content signature does not match an authentic JPG, PNG, or PDF document.',
    };
  } catch {
    return { valid: false, error: 'Unable to inspect uploaded file signature.' };
  }
}

// ---------------------------------------------------------------------------
// 7. AUTHORITATIVE PRICING & COUPON VERIFICATION
// ---------------------------------------------------------------------------
export const CONSULTATION_FEE_CATALOG: Record<string, number> = {
  general_consultation: 1200,
  cardiology_consultation: 1500,
  telemedicine_visit: 800,
  emergency_triage: 1800,
};

const VERIFIED_COUPONS: Record<string, number> = {
  OLMERA10: 0.1,
  CAREFIRST: 0.15,
  SENIORCARE: 0.2,
};

export function verifyTransactionPricing(params: {
  serviceKey?: string;
  claimedBaseAmount?: number;
  couponCode?: string;
}): {
  valid: boolean;
  baseAmount: number;
  discountAmount: number;
  platformFee: number;
  totalDue: number;
  reason?: string;
} {
  const key = params.serviceKey || 'general_consultation';
  const authoritativeBase = CONSULTATION_FEE_CATALOG[key] ?? 1200;

  if (
    typeof params.claimedBaseAmount === 'number' &&
    (!Number.isFinite(params.claimedBaseAmount) ||
      params.claimedBaseAmount <= 0 ||
      params.claimedBaseAmount !== authoritativeBase)
  ) {
    return {
      valid: false,
      baseAmount: authoritativeBase,
      discountAmount: 0,
      platformFee: 45,
      totalDue: authoritativeBase + 45,
      reason: 'Client-submitted price did not match authoritative fee schedule.',
    };
  }

  let discountRate = 0;
  if (params.couponCode) {
    const normalized = params.couponCode.trim().toUpperCase();
    if (VERIFIED_COUPONS[normalized] !== undefined) {
      discountRate = VERIFIED_COUPONS[normalized];
    } else {
      return {
        valid: false,
        baseAmount: authoritativeBase,
        discountAmount: 0,
        platformFee: 45,
        totalDue: authoritativeBase + 45,
        reason: 'Invalid or expired promotional code.',
      };
    }
  }

  const discountAmount = Math.round(authoritativeBase * discountRate);
  const platformFee = 45;
  const totalDue = Math.max(100, authoritativeBase - discountAmount + platformFee);

  return {
    valid: true,
    baseAmount: authoritativeBase,
    discountAmount,
    platformFee,
    totalDue,
  };
}

// ---------------------------------------------------------------------------
// 8. PRODUCTION-SAFE ERROR SANITIZER (Debug Mode Off)
// ---------------------------------------------------------------------------
export function toSafeUserError(err: unknown, fallbackMessage = 'An unexpected error occurred. Please try again.'): string {
  const isProd =
    typeof import.meta !== 'undefined' &&
    Boolean((import.meta as any).env?.PROD);

  if (isProd) {
    return fallbackMessage;
  }

  if (err instanceof Error) {
    // Strip file paths or stack traces even in dev UI alerts
    return err.message.split('\n')[0].replace(/[A-Za-z]:\\[^\s]+/g, '[path]');
  }
  return fallbackMessage;
}
