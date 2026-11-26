/**
 * Olmera Healthcare - Shared Time-Windowed One-Time Password (OTP) Service
 *
 * Provides cryptographically random 6-digit OTP generation, 30-second
 * expiration tracking, single-use replay protection, and constant-time
 * verification across Patient, Doctor, and Hospital Admin login flows.
 */

import { constantTimeEqual } from '../security/securityControls';

export const OTP_VALIDITY_SECONDS = 30;
export const OTP_VALIDITY_MS = OTP_VALIDITY_SECONDS * 1000;

export interface OtpChallenge {
  identifier: string;
  code: string;
  issuedAt: number;
  expiresAt: number;
  used: boolean;
}

export interface OtpIssueResult {
  code: string;
  issuedAt: number;
  expiresAt: number;
  ttlSeconds: number;
}

export interface OtpVerificationResult {
  valid: boolean;
  expired?: boolean;
  reason?: string;
}

const activeChallenges = new Map<string, OtpChallenge>();

function normalizeIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

/**
 * Generates a cryptographically uniform 6-digit OTP (100000-999999) using Web Crypto.
 */
export function generateSixDigitOtp(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const arr = new Uint32Array(1);
    // Rejection sampling avoids modulo bias across [0, 900000)
    const maxUnbiased = Math.floor(0xffffffff / 900_000) * 900_000;
    let rand = 0;
    do {
      globalThis.crypto.getRandomValues(arr);
      rand = arr[0];
    } while (rand >= maxUnbiased);
    return String(100_000 + (rand % 900_000));
  }
  return String(Math.floor(100_000 + Math.random() * 900_000));
}

/**
 * Issues a new 6-digit OTP challenge for an identifier, invalidating any prior active code.
 */
export function issueLoginOtp(
  identifier: string,
  ttlSeconds = OTP_VALIDITY_SECONDS,
  now = Date.now()
): OtpIssueResult {
  const key = normalizeIdentifier(identifier);
  const code = generateSixDigitOtp();
  const expiresAt = now + ttlSeconds * 1000;

  activeChallenges.set(key, {
    identifier: key,
    code,
    issuedAt: now,
    expiresAt,
    used: false,
  });

  return { code, issuedAt: now, expiresAt, ttlSeconds };
}

/**
 * Returns whether an OTP challenge has been issued for the given identifier.
 */
export function hasOtpChallenge(identifier: string): boolean {
  return activeChallenges.has(normalizeIdentifier(identifier));
}

/**
 * Clears any stored OTP challenge for the given identifier (e.g. on back/cancel or test cleanup).
 */
export function clearOtpChallenge(identifier: string): void {
  activeChallenges.delete(normalizeIdentifier(identifier));
}

/**
 * Verifies a submitted 6-digit OTP against the active, non-expired challenge in constant time.
 * Marks the challenge as used upon success to prevent replay attacks.
 */
export function verifyLoginOtp(
  identifier: string,
  candidateCode: string,
  now = Date.now()
): OtpVerificationResult {
  const key = normalizeIdentifier(identifier);
  const challenge = activeChallenges.get(key);
  const cleanCandidate = String(candidateCode || '').trim();

  if (!challenge) {
    return { valid: false, reason: 'No active OTP challenge found. Please request a new verification code.' };
  }
  if (challenge.used) {
    return { valid: false, reason: 'This verification code has already been used. Please wait for the next code.' };
  }
  if (now >= challenge.expiresAt) {
    return {
      valid: false,
      expired: true,
      reason: 'Verification code has expired. Please enter the newly refreshed 6-digit code.',
    };
  }
  if (!/^\d{6}$/.test(cleanCandidate) || !constantTimeEqual(cleanCandidate, challenge.code)) {
    return { valid: false, reason: 'Invalid verification code. Please check the current 6-digit code and try again.' };
  }

  challenge.used = true;
  return { valid: true };
}

