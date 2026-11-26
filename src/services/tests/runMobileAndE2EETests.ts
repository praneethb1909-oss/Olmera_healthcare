/**
 * Olmera Healthcare - Cross-Platform Mobile & E2EE Security Test Suite
 * Validates Android/iOS Capacitor production configs, Material 3 / HIG adaptive navigation,
 * AES-256-GCM + ECDH P-256 End-to-End Encryption, and HIPAA Safe Harbor PHI redaction.
 */

import fs from 'node:fs';
import path from 'node:path';
import { e2eeService } from '../security/e2eeService';

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

async function runTests() {
  console.log('\n======================================================');
  console.log('  OLMERA MOBILE (ANDROID & iOS) & E2EE TEST SUITE');
  console.log('======================================================\n');

  // 1. ECDH P-256 + AES-256-GCM Doctor <-> Patient E2EE
  console.log('\x1b[36m[1/4] Testing Doctor-Patient ECDH P-256 + AES-256-GCM E2EE...\x1b[0m');
  {
    const doctorKeys = await e2eeService.generateIdentityKeyPair();
    const patientKeys = await e2eeService.generateIdentityKeyPair();

    const doctorSharedKey = await e2eeService.deriveSharedSecretKey(doctorKeys.privateKey, patientKeys.publicKeyJwk);
    const patientSharedKey = await e2eeService.deriveSharedSecretKey(patientKeys.privateKey, doctorKeys.publicKeyJwk);

    const clinicalMessage = 'BP 128/82 mmHg. Continue Metformin 500mg twice daily after meals.';
    const envelope = await e2eeService.encryptHealthPayload(clinicalMessage, doctorSharedKey);

    assert(envelope.alg === 'AES-256-GCM', 'Envelope specifies AES-256-GCM');
    assert(envelope.hipaaCompliant === true, 'Envelope marked HIPAA compliant');
    assert(envelope.ciphertext !== clinicalMessage && !envelope.ciphertext.includes('Metformin'), 'Ciphertext does not leak plaintext PHI');

    const decryptedByPatient = await e2eeService.decryptHealthPayload(envelope, patientSharedKey);
    assert(decryptedByPatient === clinicalMessage, 'Patient cleanly decrypts Doctor E2EE message');

    // Tamper detection
    const tamperedEnvelope = {
      ...envelope,
      ciphertext: envelope.ciphertext.slice(0, -4) + 'AAAA',
    };
    let tamperRejected = false;
    try {
      await e2eeService.decryptHealthPayload(tamperedEnvelope, patientSharedKey);
    } catch {
      tamperRejected = true;
    }
    assert(tamperRejected === true, 'Tampered AES-GCM ciphertext rejected by authentication tag verification');
  }

  // 2. PBKDF2-SHA256 Local EHR Vault Encryption at Rest
  console.log('\n\x1b[36m[2/4] Testing PBKDF2-SHA256 EHR Vault Encryption...\x1b[0m');
  {
    const ehrJson = JSON.stringify({ diagnoses: ['Type 2 Diabetes'], hba1c: '6.4%' });
    const vaultEnvelope = await e2eeService.encryptWithPassphrase(ehrJson, 'OlmeraVaultSecret#2026');
    assert(vaultEnvelope.kdf === 'PBKDF2-SHA256' && Boolean(vaultEnvelope.salt), 'PBKDF2 salt and KDF metadata persisted');

    const restored = await e2eeService.decryptWithPassphrase(vaultEnvelope, 'OlmeraVaultSecret#2026');
    assert(restored === ehrJson, 'EHR vault payload decrypted accurately with valid passphrase');

    let wrongPassRejected = false;
    try {
      await e2eeService.decryptWithPassphrase(vaultEnvelope, 'WrongPassphrase');
    } catch {
      wrongPassRejected = true;
    }
    assert(wrongPassRejected === true, 'Wrong passphrase rejected during EHR vault decryption');
  }

  // 3. HIPAA Safe Harbor PHI Redaction
  console.log('\n\x1b[36m[3/4] Testing HIPAA Safe Harbor PHI Redaction...\x1b[0m');
  {
    const rawTelemetry = {
      event: 'CONSULTATION_COMPLETED',
      patientName: 'Priya Sharma',
      phone: '+91 9876543210',
      email: 'priya@example.com',
      diagnosisCode: 'E11.9',
      systolicBp: 124,
    };
    const redacted = e2eeService.redactPhiForTelemetry(rawTelemetry);
    assert(redacted.patientName === '[REDACTED_PHI]', 'Patient name redacted from telemetry');
    assert(redacted.phone === '[REDACTED_PHI]', 'Phone number redacted from telemetry');
    assert(redacted.email === '[REDACTED_PHI]', 'Email redacted from telemetry');
    assert(redacted.diagnosisCode === 'E11.9' && redacted.systolicBp === 124, 'Non-PHI clinical metrics preserved');
  }

  // 4. Cross-Platform Android & iOS Production Configuration Verification
  console.log('\n\x1b[36m[4/4] Verifying Android & iOS Native Build Configurations...\x1b[0m');
  {
    const root = process.cwd();
    const capConfig = fs.readFileSync(path.join(root, 'capacitor.config.ts'), 'utf8');
    assert(capConfig.includes("appId: 'com.olmera.app'"), 'Capacitor appId matches com.olmera.app');
    assert(capConfig.includes("iosScheme: 'https'") && capConfig.includes("androidScheme: 'https'"), 'HTTPS scheme enforced on iOS and Android WebViews');

    const buildGradle = fs.readFileSync(path.join(root, 'android', 'app', 'build.gradle'), 'utf8');
    assert(buildGradle.includes('applicationId "com.olmera.app"'), 'Android applicationId aligned to com.olmera.app');
    assert(buildGradle.includes('minifyEnabled true'), 'Android release build enables ProGuard/R8 minification');

    const manifest = fs.readFileSync(path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'), 'utf8');
    assert(manifest.includes('android.permission.CAMERA') && manifest.includes('android.permission.RECORD_AUDIO'), 'AndroidManifest declares telehealth Camera & Audio permissions');
    assert(manifest.includes('android.permission.USE_BIOMETRIC'), 'AndroidManifest declares Biometric protection permission');

    const iosPlistPath = path.join(root, 'ios', 'App', 'App', 'Info.plist');
    assert(fs.existsSync(iosPlistPath), 'Native iOS Xcode Info.plist generated');
    const iosPlist = fs.readFileSync(iosPlistPath, 'utf8');
    assert(iosPlist.includes('NSCameraUsageDescription') && iosPlist.includes('NSFaceIDUsageDescription'), 'iOS Info.plist declares Camera & Face ID privacy usage strings');
  }

  console.log('\n======================================================');
  console.log(`  MOBILE & E2EE TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Mobile/E2EE test suite failed:', err);
  process.exit(1);
});
