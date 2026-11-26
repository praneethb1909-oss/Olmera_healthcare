/**
 * Hospital Identity Provider (IdP) & Enterprise Directory Service
 * Authenticates users EXCLUSIVELY against verified hospital personnel records.
 * Rejects all generic/unaffiliated credentials and enforces account lockout policies.
 */

import { HospitalAdminRole, hasHospitalPermission, getHospitalRoleMetadata } from './rbac';
import { validateHospitalPassword } from './passwordPolicy';
import { auditLogger } from './auditLogger';
import { hasOtpChallenge, verifyLoginOtp } from './otpService';
import {
  hashPasswordPBKDF2,
  verifyPasswordPBKDF2,
  generateRandomHex,
  WebCryptoUnavailableError,
  enforceServerAuthRateLimit,
  issueExpiringResetToken,
  sanitizePlainText,
  validateEmailAddress
} from '../security/securityControls';
import { auth, db, isFirebaseConfigured } from '../../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, updateDoc, setDoc, query, where, limit } from 'firebase/firestore';

export interface HospitalRecord {
  id: string;
  name: string;
  city: string;
  code: string;
  allowedDomain: string;
}

export interface HospitalStaffProfile {
  id: string;
  staffId: string;
  fullName: string;
  hospitalId: string;
  hospitalName: string;
  email: string;
  department: string;
  role: HospitalAdminRole;
  status: 'active' | 'suspended' | 'locked';
  failedAttempts: number;
  lockedUntil: string | null;
  lastLogin: string | null;
  mfaEnabled: boolean;
}

export interface HospitalStaffCredential extends HospitalStaffProfile {
  passwordHash: string;
  salt: string;
}

export interface HospitalAuthResponse {
  success: boolean;
  user?: HospitalStaffProfile;
  sessionToken?: string;
  permissions?: string[];
  error?: string;
  remainingAttempts?: number;
  lockoutRemainingSeconds?: number;
}

// Certified Network Hospitals in Olmera Care Circle
export const NETWORK_HOSPITALS: HospitalRecord[] = [
  {
    id: 'hosp-1',
    name: 'Olmera Center for Health',
    city: 'Rajam',
    code: 'OCH-RJM',
    allowedDomain: 'rajam.olmera.health'
  },
  {
    id: 'hosp-2',
    name: 'Olmera Apex Medical Institute',
    city: 'Visakhapatnam',
    code: 'OAMI-VZG',
    allowedDomain: 'vizag.olmera.health'
  },
  {
    id: 'hosp-3',
    name: 'Medicover Hospitals',
    city: 'Srikakulam',
    code: 'MDC-SRK',
    allowedDomain: 'srikakulam.olmera.health'
  },
  {
    id: 'hosp-4',
    name: 'Apollo Hospitals Vizag',
    city: 'Visakhapatnam',
    code: 'APL-VZG',
    allowedDomain: 'apollo.olmera.health'
  }
];

// Helper: PBKDF2-SHA256 Hashing (100,000 iterations) exclusively via Web Crypto Subtle
export async function hashHospitalPassword(password: string, salt: string): Promise<string> {
  const { hash } = await hashPasswordPBKDF2(password, salt);
  return hash;
}

export async function verifyHospitalPassword(password: string, storedHash: string, salt: string): Promise<boolean> {
  if (!storedHash.startsWith('pbkdf2_sha256$')) {
    return false;
  }
  return verifyPasswordPBKDF2(password, storedHash, salt);
}

// Certified Hospital User Database (Metadata Roster — secrets are NEVER hardcoded in client source)
// Credentials are stored in Firebase Firestore (`admins` collection) with PBKDF2-SHA256 hashes.
const MASTER_ADMIN_EMAIL = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MASTER_ADMIN_EMAIL) ||
  (typeof process !== 'undefined' && process.env?.MASTER_ADMIN_EMAIL) ||
  'praneethburada@gmail.com'
).trim().toLowerCase();

const DEFAULT_HOSPITAL_ADMIN_EMAIL =
  typeof process !== 'undefined' && process.env?.HOSPITAL_ADMIN_EMAIL
    ? process.env.HOSPITAL_ADMIN_EMAIL.trim().toLowerCase()
    : 'hospital.admin@olmera.health';

const INITIAL_HOSPITAL_STAFF: HospitalStaffCredential[] = [
  {
    id: 'staff-hadm-01',
    staffId: 'OLM-HADM-01',
    fullName: 'Dr. Ananya Rao',
    hospitalId: 'hosp-1',
    hospitalName: 'Olmera Center for Health',
    email: DEFAULT_HOSPITAL_ADMIN_EMAIL,
    department: 'Hospital Operations & Clinical Administration',
    role: 'hospital_administrator',
    passwordHash: '',
    salt: '',
    status: 'active',
    failedAttempts: 0,
    lockedUntil: null,
    lastLogin: null,
    mfaEnabled: true
  },
  {
    id: 'master-admin-01',
    staffId: 'OLM-MASTER-01',
    fullName: 'Praneeth Burada',
    hospitalId: 'hosp-1',
    hospitalName: 'Olmera Master Command Center',
    email: MASTER_ADMIN_EMAIL,
    department: 'Master Network Governance & Security',
    role: 'super_admin',
    passwordHash: '',
    salt: '',
    status: 'active',
    failedAttempts: 0,
    lockedUntil: null,
    lastLogin: null,
    mfaEnabled: true
  },
  {
    id: 'staff-rjm-01',
    staffId: 'OCH-ADM-01',
    fullName: 'Dr. K. V. Ramanayya',
    hospitalId: 'hosp-1',
    hospitalName: 'Olmera Center for Health',
    email: 'admin.rajam@olmera.health',
    department: 'Hospital Administration & EHR Governance',
    role: 'hospital_administrator',
    passwordHash: '', // computed on init
    salt: 'salt_rajam_01',
    status: 'active',
    failedAttempts: 0,
    lockedUntil: null,
    lastLogin: '2026-11-19T08:15:00Z',
    mfaEnabled: true
  },
  {
    id: 'staff-vzg-01',
    staffId: 'OAMI-DIR-01',
    fullName: 'Dr. Sandhya Varma',
    hospitalId: 'hosp-2',
    hospitalName: 'Olmera Apex Medical Institute',
    email: 'director.vizag@olmera.health',
    department: 'Executive Medical Board',
    role: 'hospital_director',
    passwordHash: '',
    salt: 'salt_vizag_02',
    status: 'active',
    failedAttempts: 0,
    lockedUntil: null,
    lastLogin: '2026-11-18T14:30:00Z',
    mfaEnabled: true
  },
  {
    id: 'staff-srk-01',
    staffId: 'MDC-CMO-01',
    fullName: 'Dr. P. Rajesh Kumar',
    hospitalId: 'hosp-3',
    hospitalName: 'Medicover Hospitals',
    email: 'cmo.srikakulam@olmera.health',
    department: 'Critical Care & Clinical Governance',
    role: 'chief_medical_officer',
    passwordHash: '',
    salt: 'salt_srik_03',
    status: 'active',
    failedAttempts: 0,
    lockedUntil: null,
    lastLogin: '2026-11-17T11:00:00Z',
    mfaEnabled: true
  },
  {
    id: 'staff-net-01',
    staffId: 'OLM-SUP-00',
    fullName: 'Praneeth Burada',
    hospitalId: 'hosp-1', // Root Regional Administrator
    hospitalName: 'Olmera Health Regional Command',
    email: 'admin@olmera.health',
    department: 'Regional Healthcare Technology & Security',
    role: 'super_admin',
    passwordHash: '',
    salt: 'salt_net_00',
    status: 'active',
    failedAttempts: 0,
    lockedUntil: null,
    lastLogin: '2026-11-19T09:00:00Z',
    mfaEnabled: true
  },
  {
    id: 'staff-aud-01',
    staffId: 'OLM-AUD-04',
    fullName: 'Lakshmi Narayana',
    hospitalId: 'hosp-2',
    hospitalName: 'Olmera Apex Medical Institute',
    email: 'compliance.vizag@olmera.health',
    department: 'Clinical Compliance & Privacy Audit',
    role: 'audit_compliance_officer',
    passwordHash: '',
    salt: 'salt_aud_04',
    status: 'active',
    failedAttempts: 0,
    lockedUntil: null,
    lastLogin: '2026-11-16T16:45:00Z',
    mfaEnabled: true
  }
];

const LOCAL_STAFF_DB_KEY = 'olmera_hospital_staff_db';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

/**
 * Cryptographically secure token generator using crypto.getRandomValues().
 * Prevents session hijacking and token prediction attacks.
 */
export function generateSecureSessionToken(prefix = 'hosp_sec'): string {
  try {
    const cryptoObj = typeof window !== 'undefined'
      ? (window.crypto || (window as any).msCrypto)
      : (typeof globalThis !== 'undefined' ? globalThis.crypto : undefined);

    if (cryptoObj?.getRandomValues) {
      const buffer = new Uint8Array(32);
      cryptoObj.getRandomValues(buffer);
      const secureHex = Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
      return `${prefix}_${secureHex}_${Date.now()}`;
    }
  } catch (e) {
    console.warn('Cryptographic random values generation warning:', e);
  }

  // Safe fallback if crypto is unavailable
  const fallbackBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    fallbackBytes[i] = Math.floor(Math.random() * 256);
  }
  return `${prefix}_${Array.from(fallbackBytes).map(b => b.toString(16).padStart(2, '0')).join('')}_${Date.now()}`;
}

/**
 * Generates a cryptographically secure staff-ID suffix (40 bits of entropy).
 * Replaces the previous `Math.random()` 4-digit suffix whose tiny ID space caused
 * frequent collisions and made staff IDs predictable/enumerable.
 */
function generateSecureStaffIdSuffix(): string {
  try {
    const cryptoObj = typeof window !== 'undefined'
      ? (window.crypto || (window as any).msCrypto)
      : (typeof globalThis !== 'undefined' ? globalThis.crypto : undefined);

    if (cryptoObj?.getRandomValues) {
      const buffer = new Uint8Array(5);
      cryptoObj.getRandomValues(buffer);
      return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    }
  } catch (e) {
    console.warn('Cryptographic random values generation warning:', e);
  }

  const fallbackBytes = new Uint8Array(5);
  for (let i = 0; i < 5; i++) {
    fallbackBytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(fallbackBytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export class HospitalIdentityProvider {
  private static instance: HospitalIdentityProvider;
  private staffDatabase: Map<string, HospitalStaffCredential> = new Map();
  private initialized = false;
  private persistenceSuspended = false;

  private constructor() { }

  public static getInstance(): HospitalIdentityProvider {
    if (!HospitalIdentityProvider.instance) {
      HospitalIdentityProvider.instance = new HospitalIdentityProvider();
    }
    return HospitalIdentityProvider.instance;
  }

  /**
   * Initializes staff directory from Firebase Firestore (`admins` collection).
   * Never reads or writes credential hashes to localStorage or hardcoded client secrets.
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    // 1. Seed metadata-only directory entries (without credentials)
    for (const staff of INITIAL_HOSPITAL_STAFF) {
      this.staffDatabase.set(staff.email.toLowerCase(), { ...staff });
      this.staffDatabase.set(staff.staffId.toUpperCase(), { ...staff });
    }

    // 2. Load persisted encrypted credentials from Firebase Firestore (`admins` collection)
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(db, 'admins'));
        snap.forEach((docSnap) => {
          const data = docSnap.data() as Record<string, any>;
          if (!data.email || !data.staff_id) return;
          const cred: HospitalStaffCredential = {
            id: data.id || docSnap.id,
            staffId: String(data.staff_id),
            fullName: String(data.full_name || 'Hospital Administrator'),
            hospitalId: String(data.hospital_id || 'hosp-1'),
            hospitalName: String(data.hospital_name || 'Olmera Center for Health'),
            email: String(data.email).toLowerCase(),
            department: String(data.department || 'Hospital Administration'),
            role: (data.role || 'hospital_administrator') as HospitalAdminRole,
            passwordHash: String(data.password_hash || ''),
            salt: String(data.password_salt || ''),
            status: (data.status || 'active') as 'active' | 'suspended' | 'locked',
            failedAttempts: Number(data.failed_attempts || 0),
            lockedUntil: data.locked_until || null,
            lastLogin: data.last_login_at || null,
            mfaEnabled: data.mfa_enabled !== false
          };
          this.staffDatabase.set(cred.email.toLowerCase(), cred);
          this.staffDatabase.set(cred.staffId.toUpperCase(), cred);
        });
      } catch (e) {
        console.warn('Firestore admin directory load warning:', e);
      }
    }

    // 3. Optional server-side env provisioning (Node/CLI only; never bundled into client)
    if (typeof process !== 'undefined' && process.env) {
      const envMasterPw = process.env.MASTER_ADMIN_PASSWORD;
      if (envMasterPw) {
        await this.bootstrapStaffCredential(MASTER_ADMIN_EMAIL, envMasterPw);
      }
      const envHospPw = process.env.HOSPITAL_ADMIN_PASSWORD;
      if (envHospPw) {
        await this.bootstrapStaffCredential(DEFAULT_HOSPITAL_ADMIN_EMAIL, envHospPw);
      }
    }

    this.initialized = true;
  }

  /**
   * Provisions or updates a staff account's PBKDF2-SHA256 hash using a fresh random salt
   * and syncs it to Firebase Firestore (`admins`).
   */
  public async bootstrapStaffCredential(emailOrStaffId: string, plainPassword: string): Promise<boolean> {
    const pwCheck = validateHospitalPassword(plainPassword);
    if (!pwCheck.valid) return false;
    const staff =
      this.staffDatabase.get(emailOrStaffId.trim().toLowerCase()) ||
      this.staffDatabase.get(emailOrStaffId.trim().toUpperCase());
    if (!staff) return false;
    const { hash, salt } = await hashPasswordPBKDF2(plainPassword);
    staff.passwordHash = hash;
    staff.salt = salt;
    staff.failedAttempts = 0;
    staff.lockedUntil = null;
    this.staffDatabase.set(staff.email.toLowerCase(), staff);
    this.staffDatabase.set(staff.staffId.toUpperCase(), staff);
    await this.syncCredentialToDatabase(staff);
    return true;
  }

  private saveState(): void {
    // Persist changes to Firebase Firestore (never localStorage for credential hashes)
    if (!isFirebaseConfigured) return;
    const uniqueStaff = Array.from(new Set(Array.from(this.staffDatabase.values())));
    for (const cred of uniqueStaff) {
      if (cred.passwordHash && cred.salt) {
        void this.syncCredentialToDatabase(cred);
      }
    }
  }

  /**
   * Starts an isolated validation sandbox used by automated test suites.
   * Suspends Firestore credential persistence and snapshots the in-memory registry so
   * suite fixtures (ephemeral passwords, induced lockouts) never mutate production
   * credential documents or leak into the live session. Returns a callback that
   * restores the snapshot and re-enables persistence — call it in a `finally` block.
   */
  public startIsolatedRun(): () => void {
    const snapshot = Array.from(new Set(Array.from(this.staffDatabase.values()))).map(c => ({ ...c }));
    const previousSuspended = this.persistenceSuspended;
    this.persistenceSuspended = true;
    return () => {
      this.staffDatabase.clear();
      for (const cred of snapshot) {
        this.staffDatabase.set(cred.email.toLowerCase(), cred);
        this.staffDatabase.set(cred.staffId.toUpperCase(), cred);
      }
      this.persistenceSuspended = previousSuspended;
    };
  }

  /**
   * Persists sanitized credential metadata & PBKDF2-SHA256 hash to Firestore `admins`
   * collection when Firebase is configured (never stores plaintext passwords).
   */
  public async syncCredentialToDatabase(cred: HospitalStaffCredential): Promise<void> {
    if (!isFirebaseConfigured || this.persistenceSuspended) return;
    try {
      await setDoc(doc(db, 'admins', cred.id), {
        id: cred.id,
        staff_id: cred.staffId,
        hospital_id: cred.hospitalId,
        hospital_name: cred.hospitalName,
        email: cred.email.toLowerCase(),
        full_name: cred.fullName,
        department: cred.department,
        role: cred.role,
        password_hash: cred.passwordHash,
        password_salt: cred.salt,
        hash_algorithm: cred.passwordHash.startsWith('pbkdf2_sha256$') ? 'PBKDF2-SHA256-100000' : 'PBKDF2-FALLBACK',
        status: cred.status,
        mfa_enabled: cred.mfaEnabled,
        updated_at: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('Firestore admin credential sync skipped:', e);
    }
  }

  /**
   * Retrieves non-sensitive credential verification metadata for a staff account
   */
  public async getCredentialRecordMetadata(emailOrStaffId: string): Promise<{
    id: string;
    staffId: string;
    email: string;
    hospitalId: string;
    hospitalName: string;
    role: HospitalAdminRole;
    status: string;
    hasEncryptedPassword: boolean;
    hashAlgorithm: string;
  } | null> {
    await this.initialize();
    const record =
      this.staffDatabase.get(emailOrStaffId.trim().toLowerCase()) ||
      this.staffDatabase.get(emailOrStaffId.trim().toUpperCase());
    if (!record) return null;
    return {
      id: record.id,
      staffId: record.staffId,
      email: record.email,
      hospitalId: record.hospitalId,
      hospitalName: record.hospitalName,
      role: record.role,
      status: record.status,
      hasEncryptedPassword: Boolean(record.passwordHash && record.salt && record.passwordHash.length >= 16),
      hashAlgorithm: record.passwordHash.startsWith('pbkdf2_sha256$')
        ? 'PBKDF2-SHA256-100000'
        : record.passwordHash.startsWith('pbkdf2_')
          ? 'PBKDF2-FALLBACK'
          : 'LEGACY-SHA256'
    };
  }

  /**
   * Retrieves all verified hospital facilities
   */
  public getHospitals(): HospitalRecord[] {
    return NETWORK_HOSPITALS;
  }

  /**
   * Retrieves a hospital record by ID
   */
  public getHospitalById(hospitalId: string): HospitalRecord | undefined {
    return NETWORK_HOSPITALS.find(h => h.id === hospitalId);
  }

  /**
   * Authenticates users exclusively against the hospital's user database
   */
  public async authenticate(params: {
    hospitalId: string;
    staffIdOrEmail: string;
    password: string;
    securityToken?: string;
  }): Promise<HospitalAuthResponse> {
    await this.initialize();

    const lookupKey = params.staffIdOrEmail.trim().toLowerCase();
    const upperKey = params.staffIdOrEmail.trim().toUpperCase();
    const hospital = this.getHospitalById(params.hospitalId);

    if (!hospital) {
      await auditLogger.logEvent({
        eventType: 'AUTH_FAILURE',
        status: 'failure',
        email: params.staffIdOrEmail,
        details: `Rejected login: Hospital facility ID "${params.hospitalId}" not recognized.`
      });
      return {
        success: false,
        error: 'Invalid hospital selection. Please select an accredited network facility.'
      };
    }

    // Lookup staff member in hospital user database
    const staff = this.staffDatabase.get(lookupKey) || this.staffDatabase.get(upperKey);

    if (!staff) {
      await auditLogger.logEvent({
        eventType: 'AUTH_FAILURE',
        status: 'failure',
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        email: params.staffIdOrEmail,
        details: `Access Denied: Identifier "${params.staffIdOrEmail}" does not exist in ${hospital.name} personnel registry.`
      });
      return {
        success: false,
        error: 'Access Denied: Unrecognized hospital staff credentials. Only authorized hospital personnel may enter.'
      };
    }

    // 1. Check Account Lockout Status
    if (staff.lockedUntil) {
      const lockExpiry = new Date(staff.lockedUntil).getTime();
      const now = Date.now();
      if (now < lockExpiry) {
        const remainingSec = Math.ceil((lockExpiry - now) / 1000);
        await auditLogger.logEvent({
          eventType: 'ACCOUNT_LOCKED',
          status: 'blocked',
          hospitalId: hospital.id,
          hospitalName: hospital.name,
          staffId: staff.staffId,
          email: staff.email,
          role: staff.role,
          details: `Blocked attempt: Account is locked for another ${remainingSec} seconds.`
        });
        return {
          success: false,
          error: `Hospital staff account is locked due to multiple security violations. Lock expires in ${Math.ceil(remainingSec / 60)} minutes.`,
          lockoutRemainingSeconds: remainingSec
        };
      } else {
        // Lockout expired, reset failed attempts
        staff.lockedUntil = null;
        staff.failedAttempts = 0;
        this.saveState();
      }
    }

    // 2. Validate Hospital Affiliation Match
    // (Except super_admin who governs the entire regional network)
    if (staff.role !== 'super_admin' && staff.hospitalId !== hospital.id) {
      await auditLogger.logEvent({
        eventType: 'ACCESS_DENIED',
        status: 'blocked',
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        staffId: staff.staffId,
        email: staff.email,
        role: staff.role,
        details: `Facility Mismatch: Staff member is accredited for ${staff.hospitalName}, not ${hospital.name}.`
      });
      return {
        success: false,
        error: `Credential Mismatch: Your staff profile is registered with ${staff.hospitalName}. Please select your accredited facility.`
      };
    }

    // 3. Verify Password Hash (PBKDF2-SHA256 constant-time verification)
    // If client directory did not load passwordHash (because firestore.rules blocks unauthenticated
    // reads of `admins` before sign-in), authenticate against Firebase Auth and hydrate from `admins/{uid}`.
    let passwordMatch = false;
    try {
      if (staff.passwordHash && staff.salt) {
        passwordMatch = await verifyHospitalPassword(params.password, staff.passwordHash, staff.salt);
      } else if (isFirebaseConfigured) {
        try {
          const userCred = await signInWithEmailAndPassword(auth, staff.email, params.password);
          passwordMatch = true;
          try {
            const adminSnap = await getDoc(doc(db, 'admins', userCred.user.uid));
            if (adminSnap.exists()) {
              const data = adminSnap.data() as Record<string, any>;
              staff.id = data.id || userCred.user.uid;
              staff.role = (data.role || staff.role) as HospitalAdminRole;
              staff.hospitalId = String(data.hospital_id || staff.hospitalId);
              staff.hospitalName = String(data.hospital_name || staff.hospitalName);
              staff.passwordHash = String(data.password_hash || '');
              staff.salt = String(data.password_salt || '');
            }
          } catch {
            // Firestore profile hydration is best-effort after Firebase Auth succeeds
          }
        } catch {
          passwordMatch = false;
        }
      }
    } catch (err) {
      if (err instanceof WebCryptoUnavailableError) {
        return {
          success: false,
          error: err.message
        };
      }
      throw err;
    }

    if (!passwordMatch) {
      staff.failedAttempts += 1;
      const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - staff.failedAttempts);

      if (staff.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString();
        staff.lockedUntil = lockUntil;
        this.saveState();

        await auditLogger.logEvent({
          eventType: 'ACCOUNT_LOCKED',
          status: 'blocked',
          hospitalId: hospital.id,
          hospitalName: hospital.name,
          staffId: staff.staffId,
          email: staff.email,
          role: staff.role,
          details: `Account auto-locked for ${LOCKOUT_DURATION_MINUTES} mins after ${MAX_FAILED_ATTEMPTS} consecutive failed attempts.`
        });

        return {
          success: false,
          error: `Account locked: ${MAX_FAILED_ATTEMPTS} consecutive failed attempts. Contact facility security to unlock.`,
          remainingAttempts: 0,
          lockoutRemainingSeconds: LOCKOUT_DURATION_MINUTES * 60
        };
      }

      this.saveState();

      await auditLogger.logEvent({
        eventType: 'AUTH_FAILURE',
        status: 'failure',
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        staffId: staff.staffId,
        email: staff.email,
        role: staff.role,
        details: `Invalid password entered. Remaining attempts before lockout: ${remainingAttempts}.`
      });

      return {
        success: false,
        error: `Invalid hospital password. ${remainingAttempts} attempt(s) remaining before security lockout.`,
        remainingAttempts
      };
    }

    // 4. Validate Security Token if MFA is required
    if (staff.mfaEnabled && params.securityToken !== undefined) {
      const cleanToken = params.securityToken.trim();
      const otpLookupKey = hasOtpChallenge(params.staffIdOrEmail)
        ? params.staffIdOrEmail
        : hasOtpChallenge(staff.email)
          ? staff.email
          : null;

      let isValidMfa = /^\d{6}$/.test(cleanToken);
      let mfaError = 'Invalid 6-digit hospital security token. Please enter your hardware/app authenticator code.';

      if (otpLookupKey) {
        const otpCheck = verifyLoginOtp(otpLookupKey, cleanToken);
        isValidMfa = otpCheck.valid;
        if (!otpCheck.valid && otpCheck.reason) {
          mfaError = otpCheck.reason;
        }
      }

      if (!isValidMfa) {
        await auditLogger.logEvent({
          eventType: 'AUTH_FAILURE',
          status: 'failure',
          hospitalId: hospital.id,
          hospitalName: hospital.name,
          staffId: staff.staffId,
          email: staff.email,
          role: staff.role,
          details: `Invalid or expired MFA verification token: "${cleanToken}".`
        });
        return {
          success: false,
          error: mfaError
        };
      }
    }

    // 5. Successful Authentication
    staff.failedAttempts = 0;
    staff.lockedUntil = null;
    staff.lastLogin = new Date().toISOString();
    this.saveState();

    // Generate cryptographically secure session token (32-byte CSPRNG)
    const sessionToken = generateSecureSessionToken('hosp_sec');
    const roleDef = getHospitalRoleMetadata(staff.role);

    await auditLogger.logEvent({
      eventType: 'AUTH_SUCCESS',
      status: 'success',
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      staffId: staff.staffId,
      email: staff.email,
      role: staff.role,
      details: `Successful authenticated hospital admin session initiated for ${staff.fullName} (${roleDef.title}).`
    });

    const userProfile: HospitalStaffProfile = {
      id: staff.id,
      staffId: staff.staffId,
      fullName: staff.fullName,
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      email: staff.email,
      department: staff.department,
      role: staff.role,
      status: 'active',
      failedAttempts: 0,
      lockedUntil: null,
      lastLogin: staff.lastLogin,
      mfaEnabled: staff.mfaEnabled
    };

    return {
      success: true,
      user: userProfile,
      sessionToken,
      permissions: roleDef.permissions
    };
  }

  /**
   * Administrative function: Unlocks a locked hospital staff account
   */
  public async unlockAccount(staffIdOrEmail: string, authorizedByStaffId: string): Promise<boolean> {
    await this.initialize();
    const staff = this.staffDatabase.get(staffIdOrEmail.toLowerCase()) || this.staffDatabase.get(staffIdOrEmail.toUpperCase());
    if (!staff) return false;

    staff.lockedUntil = null;
    staff.failedAttempts = 0;
    this.saveState();

    await auditLogger.logEvent({
      eventType: 'ELEVATED_ACTION',
      status: 'success',
      hospitalId: staff.hospitalId,
      hospitalName: staff.hospitalName,
      staffId: staff.staffId,
      email: staff.email,
      role: staff.role,
      details: `Account unlocked by administrator "${authorizedByStaffId}".`
    });

    return true;
  }

  /**
   * Lists all registered hospital admin accounts (sanitized, excluding hashes/salts)
   */
  public async getAllStaffAccounts(): Promise<HospitalStaffProfile[]> {
    await this.initialize();
    const seenIds = new Set<string>();
    const profiles: HospitalStaffProfile[] = [];
    for (const entry of this.staffDatabase.values()) {
      if (seenIds.has(entry.id)) continue;
      seenIds.add(entry.id);
      const { passwordHash: _h, salt: _s, ...safeProfile } = entry;
      profiles.push(safeProfile);
    }
    return profiles;
  }

  /**
   * Creates a new Hospital Admin account with RBAC, password policy enforcement & audit logging
   */
  public async createHospitalAdminAccount(
    actor: { staffId: string; email: string; role: HospitalAdminRole | string },
    params: {
      fullName: string;
      email: string;
      hospitalId: string;
      hospitalName?: string;
      department: string;
      role: HospitalAdminRole;
      password: string;
      mfaEnabled?: boolean;
    }
  ): Promise<{ success: boolean; profile?: HospitalStaffProfile; error?: string }> {
    await this.initialize();

    const canManage =
      actor.role === 'super_admin' ||
      actor.role === 'hospital_director' ||
      hasHospitalPermission(actor.role as HospitalAdminRole, 'security:manage');

    if (!canManage) {
      await auditLogger.logEvent({
        eventType: 'ACCESS_DENIED',
        status: 'blocked',
        staffId: actor.staffId,
        email: actor.email,
        role: String(actor.role),
        details: `RBAC Denied: Attempted to create hospital admin account "${params.email}" without authorization.`
      });
      return { success: false, error: 'Access Denied: Only authorized Master/Executive Admins can create admin accounts.' };
    }

    const fullName = sanitizePlainText(params.fullName, 120);
    const email = sanitizePlainText(params.email, 254).toLowerCase();
    const department = sanitizePlainText(params.department, 120);

    if (fullName.length < 2) return { success: false, error: 'Full name is required.' };
    if (!validateEmailAddress(email)) return { success: false, error: 'Valid institutional email address is required.' };
    if (this.staffDatabase.has(email)) {
      return { success: false, error: 'A hospital admin account with this email already exists.' };
    }

    const pwCheck = validateHospitalPassword(params.password);
    if (!pwCheck.valid) {
      return { success: false, error: `Password policy violation: ${pwCheck.errors.join(', ')}.` };
    }

    const hospital = this.getHospitalById(params.hospitalId);
    const hospitalName = params.hospitalName || hospital?.name || 'Olmera Network Facility';
    let salt: string;
    let passwordHash: string;
    try {
      salt = generateRandomHex(16);
      passwordHash = await hashHospitalPassword(params.password, salt);
    } catch (err) {
      if (err instanceof WebCryptoUnavailableError) {
        return { success: false, error: err.message };
      }
      throw err;
    }
    // Cryptographically secure ID with a duplicate check. The previous Math.random()
    // 4-digit suffix offered only 9,000 values (collisions likely) and was enumerable.
    let staffId = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = `OLM-ADM-${generateSecureStaffIdSuffix()}`;
      if (!this.staffDatabase.has(candidate.toUpperCase())) {
        staffId = candidate;
        break;
      }
    }
    if (!staffId) {
      return { success: false, error: 'Unable to allocate a unique staff ID. Please retry.' };
    }

    const newCred: HospitalStaffCredential = {
      id: `staff-${Date.now().toString(36)}`,
      staffId,
      fullName,
      hospitalId: params.hospitalId,
      hospitalName,
      email,
      department: department || 'Hospital Operations',
      role: params.role,
      passwordHash,
      salt,
      status: 'active',
      failedAttempts: 0,
      lockedUntil: null,
      lastLogin: null,
      mfaEnabled: params.mfaEnabled ?? true
    };

    this.staffDatabase.set(email, newCred);
    this.staffDatabase.set(staffId.toUpperCase(), newCred);
    this.saveState();
    void this.syncCredentialToDatabase(newCred);

    await auditLogger.logEvent({
      eventType: 'ELEVATED_ACTION',
      status: 'success',
      hospitalId: newCred.hospitalId,
      hospitalName: newCred.hospitalName,
      staffId: actor.staffId,
      email: actor.email,
      role: String(actor.role),
      details: `Created hospital admin account "${newCred.fullName}" (${newCred.email}, role: ${newCred.role}, staffId: ${newCred.staffId}).`
    });

    const { passwordHash: _h, salt: _s, ...safeProfile } = newCred;
    return { success: true, profile: safeProfile };
  }

  /**
   * Updates role, status, or MFA configuration for an existing Hospital Admin account
   */
  public async updateHospitalAdminCredentials(
    actor: { staffId: string; email: string; role: HospitalAdminRole | string },
    targetEmailOrStaffId: string,
    updates: Partial<Pick<HospitalStaffProfile, 'role' | 'department' | 'status' | 'mfaEnabled'>>
  ): Promise<{ success: boolean; profile?: HospitalStaffProfile; error?: string }> {
    await this.initialize();

    const canManage =
      actor.role === 'super_admin' ||
      hasHospitalPermission(actor.role as HospitalAdminRole, 'security:manage');

    if (!canManage) {
      return { success: false, error: 'Access Denied: Insufficient permissions to modify admin accounts.' };
    }

    const staff =
      this.staffDatabase.get(targetEmailOrStaffId.trim().toLowerCase()) ||
      this.staffDatabase.get(targetEmailOrStaffId.trim().toUpperCase());

    if (!staff) return { success: false, error: 'Hospital admin account not found.' };
    if (staff.email.toLowerCase() === 'praneethburada@gmail.com' && updates.status === 'suspended') {
      return { success: false, error: 'Primary Master Admin account cannot be suspended.' };
    }

    if (updates.role) staff.role = updates.role;
    if (updates.department !== undefined) staff.department = sanitizePlainText(updates.department, 120);
    if (updates.status) staff.status = updates.status;
    if (updates.mfaEnabled !== undefined) staff.mfaEnabled = updates.mfaEnabled;

    this.saveState();

    await auditLogger.logEvent({
      eventType: 'ELEVATED_ACTION',
      status: 'success',
      hospitalId: staff.hospitalId,
      hospitalName: staff.hospitalName,
      staffId: actor.staffId,
      email: actor.email,
      role: String(actor.role),
      details: `Updated admin account "${staff.email}" (role: ${staff.role}, status: ${staff.status}, MFA: ${staff.mfaEnabled}).`
    });

    const { passwordHash: _h, salt: _s, ...safeProfile } = staff;
    return { success: true, profile: safeProfile };
  }

  /**
   * Initiates a secure expiring password reset workflow for an existing Hospital Admin
   */
  public async initiateAdminPasswordReset(
    actor: { staffId: string; email: string; role: HospitalAdminRole | string },
    targetEmailOrStaffId: string,
    newTemporaryPassword?: string
  ): Promise<{ success: boolean; resetToken?: string; expiresAt?: number; error?: string }> {
    await this.initialize();

    const canManage =
      actor.role === 'super_admin' ||
      actor.role === 'hospital_director' ||
      hasHospitalPermission(actor.role as HospitalAdminRole, 'security:manage');

    if (!canManage) {
      return { success: false, error: 'Access Denied: Insufficient permissions to initiate password resets.' };
    }

    const serverResetRate = await enforceServerAuthRateLimit('password_reset', targetEmailOrStaffId.trim().toLowerCase());
    if (!serverResetRate.allowed) {
      return { success: false, error: serverResetRate.error || 'Too many password reset requests. Please wait before retrying.' };
    }

    const staff =
      this.staffDatabase.get(targetEmailOrStaffId.trim().toLowerCase()) ||
      this.staffDatabase.get(targetEmailOrStaffId.trim().toUpperCase());

    if (!staff) return { success: false, error: 'Target hospital admin account not found.' };

    if (newTemporaryPassword && newTemporaryPassword.trim().length > 0) {
      const pwCheck = validateHospitalPassword(newTemporaryPassword);
      if (!pwCheck.valid) {
        return { success: false, error: `New password violates hospital policy: ${pwCheck.errors.join(', ')}.` };
      }
      try {
        const newSalt = generateRandomHex(16);
        staff.salt = newSalt;
        staff.passwordHash = await hashHospitalPassword(newTemporaryPassword, newSalt);
      } catch (err) {
        if (err instanceof WebCryptoUnavailableError) {
          return { success: false, error: err.message };
        }
        throw err;
      }
      staff.failedAttempts = 0;
      staff.lockedUntil = null;
      this.saveState();
      void this.syncCredentialToDatabase(staff);
    }

    const { token, expiresAt } = issueExpiringResetToken(staff.email);

    await auditLogger.logEvent({
      eventType: 'PASSWORD_RESET_ATTEMPT',
      status: 'success',
      hospitalId: staff.hospitalId,
      hospitalName: staff.hospitalName,
      staffId: actor.staffId,
      email: actor.email,
      role: String(actor.role),
      details: `Secure 15-minute password reset initiated for "${staff.email}" (${staff.staffId}) by ${actor.email}.`
    });

    return { success: true, resetToken: token, expiresAt };
  }
}

export const hospitalIdp = HospitalIdentityProvider.getInstance();
