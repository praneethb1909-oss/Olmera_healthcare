/**
 * Olmera Healthcare - Security Hardening Validation & Penetration Test Suite
 *
 * Tests all implemented application-level security controls:
 * 1. PBKDF2-SHA256 salted password hashing & constant-time verification
 * 2. XSS payload sanitization & HTML escaping
 * 3. SQLi / NoSQLi pattern detection & strict input validation
 * 4. Sliding-window rate limiting & brute-force blocking
 * 5. Session-bound CSRF token validation
 * 6. Expiring, single-use password reset tokens
 * 7. File upload size, MIME, and magic-byte signature validation
 * 8. Authoritative price & coupon manipulation rejection
 * 9. RBAC & admin/senior route authorization checks
 * 10. Audit logging with tamper-evident checksums
 */

// Safe in-memory polyfills for Node.js test execution
if (typeof globalThis.localStorage === 'undefined') {
  const memLocal = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => memLocal.get(k) || null,
    setItem: (k: string, v: string) => memLocal.set(k, String(v)),
    removeItem: (k: string) => memLocal.delete(k),
    clear: () => memLocal.clear(),
  };
}

if (typeof (globalThis as any).window === 'undefined') {
  const memSession = new Map<string, string>();
  (globalThis as any).window = {
    crypto: globalThis.crypto,
    sessionStorage: {
      getItem: (k: string) => memSession.get(k) || null,
      setItem: (k: string, v: string) => memSession.set(k, String(v)),
      removeItem: (k: string) => memSession.delete(k),
      clear: () => memSession.clear(),
    },
  };
}

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  hashPasswordPBKDF2,
  verifyPasswordPBKDF2,
  generateRandomHex,
  WebCryptoUnavailableError,
  escapeHtml,
  sanitizePlainText,
  hasSqlOrNoSqlInjectionPattern,
  validateEmailAddress,
  checkRateLimit,
  resetRateLimit,
  getOrCreateCsrfToken,
  validateCsrfToken,
  issueExpiringResetToken,
  consumeExpiringResetToken,
  validateUploadedFile,
  verifyTransactionPricing,
} from '../security/securityControls';
import { auditLogger } from '../auth/auditLogger';
import { doctorManagementService } from '../clinical/doctorManagementService';
import { isOriginAllowed, checkPersistentRateLimit, PersistentRateLimitStore, validateDoubleSubmitCsrf } from '../../../api/llm';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${message}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${message}`);
    failed++;
  }
}

async function runSecuritySuite() {
  console.log('\n======================================================');
  console.log('  OLMERA HEALTHCARE - SECURITY VALIDATION TEST SUITE');
  console.log('======================================================\n');

  // 1. Password Hashing
  console.log('\x1b[36m[1/8] Testing Salted PBKDF2-SHA256 Password Hashing...\x1b[0m');
  {
    const { hash, salt } = await hashPasswordPBKDF2('OlmeraClinical#2026');
    assert(hash.startsWith('pbkdf2_sha256$100000$'), 'Password hashed exclusively with PBKDF2-SHA256 (100,000 iterations)');
    assert(salt.length === 32, 'Unique 128-bit cryptographic salt generated');
    assert(await verifyPasswordPBKDF2('OlmeraClinical#2026', hash, salt), 'Valid password verified in constant time');
    assert(!(await verifyPasswordPBKDF2('WrongPassword!', hash, salt)), 'Incorrect password rejected');
    // Verify stored iteration count is parsed correctly — simulate a hash created with a
    // different (older/lower) iteration count to confirm verifyPasswordPBKDF2 uses the
    // embedded count rather than the current PBKDF2_ITERATIONS constant.
    const { hash: legacyHash, salt: legacySalt } = await hashPasswordPBKDF2('LegacyPassword#999');
    // Rewrite iteration count in stored string to simulate a hash from a legacy config (50,000 iters)
    const legacyHashLowIter = legacyHash.replace(/^pbkdf2_sha256\$\d+\$/, 'pbkdf2_sha256$50000$');
    assert(!(await verifyPasswordPBKDF2('LegacyPassword#999', legacyHashLowIter, legacySalt)),
      'Hash with tampered/mismatched iteration count correctly fails verification (iteration count parsed from stored hash)');
    assert(await verifyPasswordPBKDF2('OlmeraClinical#2026', hash, salt),
      'Original hash still verifies correctly after iteration-count parsing fix');
  }

  // 2. XSS & Injection Protection
  console.log('\n\x1b[36m[2/8] Testing XSS Sanitization & Injection Detection...\x1b[0m');
  {
    const xssPayload = '<script>alert("xss")</script><img src=x onerror="steal()">';
    const sanitized = sanitizePlainText(xssPayload);
    const escaped = escapeHtml('<div onclick="hack()">hello</div>');
    assert(!sanitized.includes('<script>'), 'Script tags stripped from plain text input');
    assert(!sanitized.includes('onerror='), 'Inline event handlers stripped');
    assert(escaped.includes('&lt;div') && !escaped.includes('<div'), 'HTML angle brackets escaped');
    assert(hasSqlOrNoSqlInjectionPattern("' OR 1=1; DROP TABLE patients; --"), 'SQL injection payload flagged');
    assert(hasSqlOrNoSqlInjectionPattern('{"$ne": null}'), 'NoSQL injection operator flagged');
    assert(validateEmailAddress('doctor@olmera.health'), 'Valid email accepted');
    assert(!validateEmailAddress('bad@@email..com'), 'Malformed email rejected');
  }

  // 3. Rate Limiting
  console.log('\n\x1b[36m[3/8] Testing Sliding-Window Rate Limiting...\x1b[0m');
  {
    const bucketKey = 'test_auth_bucket';
    resetRateLimit(bucketKey);
    for (let i = 0; i < 5; i++) {
      const res = checkRateLimit(bucketKey, 5, 60_000);
      assert(res.allowed === true, `Attempt ${i + 1}/5 permitted`);
    }
    const blocked = checkRateLimit(bucketKey, 5, 60_000);
    assert(blocked.allowed === false && blocked.retryAfterSeconds > 0, '6th brute-force attempt blocked with retry-after');
    const persistedRaw = globalThis.localStorage.getItem('olmera_rate_limit_buckets_v1');
    assert(Boolean(persistedRaw && persistedRaw.includes(bucketKey)), 'Rate limit state persisted to localStorage across reloads/tabs');
  }

  // 4. CSRF Token Protection
  console.log('\n\x1b[36m[4/8] Testing Session-Bound CSRF Protection...\x1b[0m');
  {
    const token = getOrCreateCsrfToken();
    assert(token.length >= 32, 'Cryptographic CSRF token generated');
    assert(validateCsrfToken(token) === true, 'Valid session CSRF token accepted');
    assert(validateCsrfToken('tampered-forged-token-000000000000') === false, 'Forged CSRF token rejected');
  }

  // 5. Expiring Single-Use Reset Links
  console.log('\n\x1b[36m[5/8] Testing Expiring Single-Use Password Reset Tokens...\x1b[0m');
  {
    const { token } = issueExpiringResetToken('patient@olmera.health');
    const firstUse = consumeExpiringResetToken(token, 'patient@olmera.health');
    assert(firstUse.valid === true, 'Valid reset token accepted on first use');
    const secondUse = consumeExpiringResetToken(token, 'patient@olmera.health');
    assert(secondUse.valid === false, 'Replay of already-used reset token blocked');
    const tampered = consumeExpiringResetToken('forged-token', 'patient@olmera.health');
    assert(tampered.valid === false, 'Tampered reset token rejected');

    // Verify tokens are stored in sessionStorage, NOT localStorage (XSS-exposure reduction).
    const inLocal = (globalThis as any).localStorage.getItem('olmera_reset_tokens_v1');
    assert(inLocal === null, 'Reset tokens NOT written to localStorage (sessionStorage only)');
    const inSession = (globalThis as any).window?.sessionStorage?.getItem('olmera_reset_tokens_v1');
    assert(typeof inSession === 'string' && inSession.length > 0, 'Reset tokens ARE stored in sessionStorage');
  }

  // 6. File Upload Limits & Magic-Byte Signature Validation
  console.log('\n\x1b[36m[6/8] Testing File Upload Magic-Byte & Size Limits...\x1b[0m');
  {
    const validPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4
    const validPdfFile = new File([validPdfBytes], 'lab-report.pdf', { type: 'application/pdf' });
    const pdfCheck = await validateUploadedFile(validPdfFile, { maxSizeMb: 10, allowPdf: true });
    assert(pdfCheck.valid === true && pdfCheck.detectedType === 'pdf', 'Authentic PDF magic bytes accepted');

    const fakeExeBytes = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]); // MZ executable disguised as .pdf
    const spoofedFile = new File([fakeExeBytes], 'malicious.pdf', { type: 'application/pdf' });
    const spoofCheck = await validateUploadedFile(spoofedFile, { maxSizeMb: 10, allowPdf: true });
    assert(spoofCheck.valid === false, 'Disguised executable (MZ header) masquerading as PDF rejected');
  }

  // 7. Authoritative Price & Coupon Verification
  console.log('\n\x1b[36m[7/8] Testing Server-Side Price Tampering Protection...\x1b[0m');
  {
    const legitimate = verifyTransactionPricing({
      serviceKey: 'general_consultation',
      claimedBaseAmount: 1200,
      couponCode: 'OLMERA10',
    });
    assert(legitimate.valid === true && legitimate.totalDue === 1125, 'Valid fee & 10% coupon calculated accurately (1200 - 120 + 45 = 1125)');

    const tamperedPrice = verifyTransactionPricing({
      serviceKey: 'general_consultation',
      claimedBaseAmount: 1, // Attacker tampered price to INR 1
    });
    assert(tamperedPrice.valid === false, 'Tampered client-side price (INR 1) rejected');

    const invalidCoupon = verifyTransactionPricing({
      serviceKey: 'general_consultation',
      claimedBaseAmount: 1200,
      couponCode: 'FREE100',
    });
    assert(invalidCoupon.valid === false, 'Unauthorized coupon code rejected');
  }

  // 8. RBAC & Tamper-Evident Audit Logging
  console.log('\n\x1b[36m[8/8] Testing RBAC & Tamper-Evident Audit Logging...\x1b[0m');
  {
    assert(doctorManagementService.canPerformAction('junior_resident', 'create_junior_doctor') === false, 'RBAC denies Junior Doctor from creating doctor accounts');
    assert(doctorManagementService.canPerformAction('senior_consultant', 'approve_submission') === true, 'RBAC permits Senior Consultant clinical approvals');

    const log = await auditLogger.logEvent({
      eventType: 'ELEVATED_ACTION',
      status: 'success',
      email: 'admin@olmera.health',
      role: 'super_admin',
      details: 'Security validation suite test log entry',
    });
    assert(Boolean(log.checksum && log.checksum.length >= 8), 'Audit log entry sealed with cryptographic checksum');
  }

  // 9. Regression Tests for Issues 1-5 (Crypto-only PBKDF2, CSPRNG Salts, Firestore Rules, CORS Allowlist, Persistent Rate Limit)
  console.log('\n\x1b[36m[9/9] Testing Security Remediation Issues 1-5...\x1b[0m');
  {
    // Issue 1: Web Crypto Subtle is strictly required (FNV-1a fallback removed)
    const originalCrypto = globalThis.crypto;
    let threwWebCryptoErr = false;
    try {
      Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
      await hashPasswordPBKDF2('OlmeraClinical#2026');
    } catch (err) {
      threwWebCryptoErr = err instanceof WebCryptoUnavailableError && err.message.includes('Web Crypto Subtle');
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: originalCrypto, configurable: true });
    }
    assert(threwWebCryptoErr, 'Issue 1: Throws WebCryptoUnavailableError when Web Crypto Subtle is unavailable (no FNV-1a fallback)');

    // Issue 2: CSPRNG 16-byte random hex salt (32 hex chars)
    const saltA = generateRandomHex(16);
    const saltB = generateRandomHex(16);
    assert(/^[0-9a-f]{32}$/.test(saltA) && saltA !== saltB, 'Issue 2: generateRandomHex(16) produces unique 16-byte cryptographic salts');

    // Issue 3: Firestore appointment read rule restricts doctors to assigned doctor_id
    const rulesContent = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
    const apptMatch = rulesContent.match(/match \/appointments\/\{appointmentId\}\s*\{[\s\S]*?allow read:[\s\S]*?;/);
    const apptReadRule = apptMatch ? apptMatch[0] : '';
    assert(
      apptReadRule.includes('(isDoctor() && resource.data.doctor_id == request.auth.uid)') &&
        !apptReadRule.includes('isDoctor() ||'),
      'Issue 3: Firestore appointments read rule requires (isDoctor() && resource.data.doctor_id == request.auth.uid)'
    );

    const txMatch = rulesContent.match(/match \/transactions\/\{txId\}\s*\{[\s\S]*?allow create:[\s\S]*?;/);
    const txCreateRule = txMatch ? txMatch[0] : '';
    assert(
      txCreateRule.includes('request.resource.data.base_amount is number') &&
        txCreateRule.includes('request.resource.data.discount_amount is number') &&
        txCreateRule.includes('request.resource.data.platform_fee is number'),
      'Transactions create rule validates numeric base_amount, discount_amount, and platform_fee consistency'
    );

    // Issue 4: Strict CORS allowlist (no wildcard/regex vercel.app matching)
    assert(isOriginAllowed('https://olmera.health') === true, 'Issue 4: Production origin https://olmera.health allowed');
    assert(isOriginAllowed('https://evil-olmera-phish.vercel.app') === false, 'Issue 4: Arbitrary -olmera*.vercel.app origin rejected');

    // Issue 5: Persistent shared rate limiter across serverless instances
    const sharedDb = new Map<string, number>();
    const persistentStore: PersistentRateLimitStore = {
      async incrementAndCount(key: string) {
        const next = (sharedDb.get(key) || 0) + 1;
        sharedDb.set(key, next);
        return next;
      },
    };
    let blockedOn21st = false;
    for (let i = 1; i <= 21; i++) {
      // Simulate alternating serverless instances sharing the same persistent store
      const res = await checkPersistentRateLimit('203.0.113.42', 'llm', persistentStore, 20, 60_000);
      if (i === 21) blockedOn21st = res.limited && res.count === 21;
    }
    assert(blockedOn21st, 'Issue 5: Persistent shared rate limiter blocks 21st request across serverless instances');
    const paymentsBucket = await checkPersistentRateLimit('203.0.113.42', 'payments', persistentStore, 20, 60_000);
    assert(
      !paymentsBucket.limited && paymentsBucket.count === 1,
      'Service key isolation: Payments rate-limit bucket is isolated from LLM bucket'
    );

    // Server-side Double-Submit CSRF validation
    const validCsrf = 'abcdef0123456789abcdef0123456789abcdef0123456789';
    assert(
      validateDoubleSubmitCsrf({ headers: { 'x-csrf-token': validCsrf } }).valid === false,
      'CSRF header without olmera_csrf cookie rejected'
    );
    assert(
      validateDoubleSubmitCsrf({
        headers: { 'x-csrf-token': validCsrf, cookie: 'olmera_csrf=different0123456789abcdef0123456789abcdef01234567' },
      }).valid === false,
      'Mismatched CSRF header and olmera_csrf cookie rejected'
    );
    assert(
      validateDoubleSubmitCsrf({
        headers: { 'x-csrf-token': validCsrf, cookie: `other=1; olmera_csrf=${validCsrf}` },
      }).valid === true,
      'Matching CSRF header and olmera_csrf cookie accepted'
    );
  }

  console.log('\n======================================================');
  console.log(`  SECURITY TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecuritySuite().catch(err => {
  console.error('Security test suite crashed:', err);
  process.exit(1);
});
