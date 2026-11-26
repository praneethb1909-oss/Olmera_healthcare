/**
 * Olmera Healthcare - End-to-End Encryption (E2EE) & HIPAA Data Handling Service
 * Uses Web Crypto API (AES-256-GCM + ECDH P-256 + PBKDF2-SHA256) for sensitive health data
 * across iOS WKWebView, Android WebView, and Web clients.
 */

export interface EncryptedHealthEnvelope {
  version: '1.0';
  alg: 'AES-256-GCM';
  kdf?: 'ECDH-P256' | 'PBKDF2-SHA256';
  iv: string; // Base64 12-byte nonce
  salt?: string; // Hex salt for PBKDF2
  ciphertext: string; // Base64 encrypted payload + GCM auth tag
  encryptedAt: string;
  hipaaCompliant: true;
}

export interface IdentityKeyPair {
  publicKeyJwk: JsonWebKey;
  privateKey: CryptoKey;
}

function getSubtleCrypto(): SubtleCrypto {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('Web Crypto API (crypto.subtle) is unavailable in this environment.');
  }
  return cryptoObj.subtle;
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export class E2EEService {
  /**
   * Generates an ephemeral or session ECDH P-256 key pair for Doctor <-> Patient E2EE.
   */
  async generateIdentityKeyPair(): Promise<IdentityKeyPair> {
    const subtle = getSubtleCrypto();
    const pair = await subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveKey']
    );
    const publicKeyJwk = await subtle.exportKey('jwk', pair.publicKey);
    return {
      publicKeyJwk,
      privateKey: pair.privateKey,
    };
  }

  /**
   * Derives a shared AES-256-GCM key between local private key and peer's public JWK.
   */
  async deriveSharedSecretKey(privateKey: CryptoKey, peerPublicKeyJwk: JsonWebKey): Promise<CryptoKey> {
    const subtle = getSubtleCrypto();
    const peerPublicKey = await subtle.importKey(
      'jwk',
      peerPublicKeyJwk,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );
    return subtle.deriveKey(
      { name: 'ECDH', public: peerPublicKey },
      privateKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts sensitive PHI / clinical message payload using AES-256-GCM.
   */
  async encryptHealthPayload(
    plaintext: string,
    key: CryptoKey,
    kdf: 'ECDH-P256' | 'PBKDF2-SHA256' = 'ECDH-P256',
    salt?: string
  ): Promise<EncryptedHealthEnvelope> {
    const subtle = getSubtleCrypto();
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);

    const encryptedBuffer = await subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    return {
      version: '1.0',
      alg: 'AES-256-GCM',
      kdf,
      iv: toBase64(iv),
      ...(salt ? { salt } : {}),
      ciphertext: toBase64(new Uint8Array(encryptedBuffer)),
      encryptedAt: new Date().toISOString(),
      hipaaCompliant: true,
    };
  }

  /**
   * Decrypts and authenticates an AES-256-GCM health payload envelope.
   * Throws automatically if ciphertext or IV was tampered with.
   */
  async decryptHealthPayload(envelope: EncryptedHealthEnvelope, key: CryptoKey): Promise<string> {
    if (envelope.alg !== 'AES-256-GCM') {
      throw new Error(`Unsupported encryption algorithm: ${envelope.alg}`);
    }
    const subtle = getSubtleCrypto();
    const iv = fromBase64(envelope.iv);
    const ciphertext = fromBase64(envelope.ciphertext);

    const decryptedBuffer = await subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ciphertext as BufferSource
    );

    return new TextDecoder().decode(decryptedBuffer);
  }

  /**
   * Derives a 256-bit AES-GCM key from a user passphrase using PBKDF2-SHA256 (100k iterations)
   * for HIPAA-compliant local EHR vault encryption at rest.
   */
  async derivePassphraseKey(passphrase: string, saltHex?: string): Promise<{ key: CryptoKey; salt: string }> {
    const subtle = getSubtleCrypto();
    const saltBytes = saltHex
      ? fromHex(saltHex)
      : globalThis.crypto.getRandomValues(new Uint8Array(16));
    const resolvedSalt = saltHex || toHex(saltBytes);

    const keyMaterial = await subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const key = await subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes as BufferSource,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    return { key, salt: resolvedSalt };
  }

  async encryptWithPassphrase(plaintext: string, passphrase: string): Promise<EncryptedHealthEnvelope> {
    const { key, salt } = await this.derivePassphraseKey(passphrase);
    return this.encryptHealthPayload(plaintext, key, 'PBKDF2-SHA256', salt);
  }

  async decryptWithPassphrase(envelope: EncryptedHealthEnvelope, passphrase: string): Promise<string> {
    if (!envelope.salt) {
      throw new Error('Missing PBKDF2 salt in encrypted vault envelope.');
    }
    const { key } = await this.derivePassphraseKey(passphrase, envelope.salt);
    return this.decryptHealthPayload(envelope, key);
  }

  /**
   * HIPAA Safe Harbor de-identification helper for telemetry & audit logs.
   */
  redactPhiForTelemetry<T extends Record<string, any>>(record: T): Record<string, any> {
    const phiFields = new Set([
      'fullName',
      'patientName',
      'email',
      'patientEmail',
      'phone',
      'patientPhone',
      'dateOfBirth',
      'dob',
      'address',
      'deliveryAddress',
      'ssn',
      'aadhaar',
    ]);

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(record)) {
      if (phiFields.has(key)) {
        sanitized[key] = '[REDACTED_PHI]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.redactPhiForTelemetry(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}

export const e2eeService = new E2EEService();
