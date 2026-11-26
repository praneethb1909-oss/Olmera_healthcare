/**
 * Olmera Healthcare - Master Admin Command & Credits Management Service
 *
 * Restricted exclusively to Master Admin (super_admin) users.
 * Provides:
 * - Credits Management (balances, allocations, usage tracking, history)
 * - Centralized Monitoring & Full CRUD for Patients, Doctors, and Hospitals
 * - Strict input validation, XSS sanitization, RBAC enforcement, and audit logging
 */

import { auditLogger } from '../auth/auditLogger';
import { HospitalAdminRole } from '../auth/rbac';
import { sanitizePlainText, validateEmailAddress } from '../security/securityControls';
import { db, isFirebaseConfigured } from '../../lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';

export interface MasterAdminActor {
  staffId: string;
  email: string;
  fullName: string;
  role: HospitalAdminRole | string;
}

export interface CreditSummary {
  availableCredits: number;
  totalAllocatedCredits: number;
  totalUsedCredits: number;
  lastUpdatedAt: string;
}

export interface CreditTransaction {
  id: string;
  type: 'allocation' | 'usage';
  amount: number;
  balanceAfter: number;
  recipientOrTarget: string;
  purpose: string;
  performedBy: string;
  timestamp: string;
}

export interface MasterPatientRecord {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup: string;
  city: string;
  status: 'active' | 'inactive';
  registeredAt: string;
  updatedAt: string;
}

export interface MasterDoctorRecord {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  specialization: string;
  qualification: string;
  experienceYears: number;
  hospitalName: string;
  hierarchyRole: 'senior_consultant' | 'junior_resident';
  status: 'active' | 'deactivated';
  createdAt: string;
  updatedAt: string;
}

export interface MasterHospitalRecord {
  id: string;
  name: string;
  city: string;
  code: string;
  totalBeds: number;
  icuBeds: number;
  contactEmail: string;
  status: 'operational' | 'maintenance';
  createdAt: string;
  updatedAt: string;
}

const CREDITS_SUMMARY_KEY = 'olmera_master_credits_summary_v1';
const CREDITS_HISTORY_KEY = 'olmera_master_credits_history_v1';
const PATIENTS_KEY = 'olmera_master_patients_v1';
const DOCTORS_KEY = 'olmera_master_doctors_v1';
const HOSPITALS_KEY = 'olmera_master_hospitals_v1';

const DEFAULT_CREDITS_SUMMARY: CreditSummary = {
  availableCredits: 125000,
  totalAllocatedCredits: 185000,
  totalUsedCredits: 60000,
  lastUpdatedAt: '2026-11-25T09:00:00.000Z',
};

const DEFAULT_CREDIT_HISTORY: CreditTransaction[] = [
  {
    id: 'crd-1001',
    type: 'allocation',
    amount: 100000,
    balanceAfter: 160000,
    recipientOrTarget: 'Olmera Institute of Medical Sciences (OIMS)',
    purpose: 'Q4 Clinical AI Diagnostics & Telehealth Credit Pool',
    performedBy: 'praneethburada@gmail.com',
    timestamp: '2026-11-18T10:30:00.000Z',
  },
  {
    id: 'crd-1002',
    type: 'usage',
    amount: 22500,
    balanceAfter: 137500,
    recipientOrTarget: 'Diagnostic Lab OCR & Triage Engine',
    purpose: 'Batch prescription OCR & automated lab biomarker extraction (1,500 scans)',
    performedBy: 'system@olmera.health',
    timestamp: '2026-11-21T14:15:00.000Z',
  },
  {
    id: 'crd-1003',
    type: 'usage',
    amount: 12500,
    balanceAfter: 125000,
    recipientOrTarget: 'GMR Varalakshmi Care Hospital (Rajam)',
    purpose: 'Emergency ambulance dispatch & tele-triage routing quota',
    performedBy: 'system@olmera.health',
    timestamp: '2026-11-24T17:40:00.000Z',
  },
];

const DEFAULT_PATIENTS: MasterPatientRecord[] = [
  {
    id: 'pt-101',
    fullName: 'Venkata Satyanarayana',
    email: 'venkata.s@example.com',
    phone: '+91 98480 11223',
    age: 54,
    gender: 'Male',
    bloodGroup: 'O+',
    city: 'Rajam',
    status: 'active',
    registeredAt: '2026-04-12T09:00:00.000Z',
    updatedAt: '2026-11-20T11:30:00.000Z',
  },
  {
    id: 'pt-102',
    fullName: 'Ananya Rao',
    email: 'ananya.rao@example.com',
    phone: '+91 98491 44556',
    age: 32,
    gender: 'Female',
    bloodGroup: 'A+',
    city: 'Visakhapatnam',
    status: 'active',
    registeredAt: '2026-06-05T10:20:00.000Z',
    updatedAt: '2026-11-22T16:10:00.000Z',
  },
  {
    id: 'pt-103',
    fullName: 'K. Murali Krishna',
    email: 'murali.k@example.com',
    phone: '+91 97012 77889',
    age: 61,
    gender: 'Male',
    bloodGroup: 'B+',
    city: 'Srikakulam',
    status: 'active',
    registeredAt: '2026-08-19T14:45:00.000Z',
    updatedAt: '2026-11-23T08:50:00.000Z',
  },
];

const DEFAULT_DOCTORS: MasterDoctorRecord[] = [
  {
    id: 'doc-sr-01',
    fullName: 'Dr. A Suresh',
    email: 'suresh.a@olmera.health',
    phone: '+91 891 274 8810',
    specialization: 'Interventional Cardiology',
    qualification: 'MBBS, MD, DM (Cardiology)',
    experienceYears: 18,
    hospitalName: 'Olmera Institute of Medical Sciences',
    hierarchyRole: 'senior_consultant',
    status: 'active',
    createdAt: '2025-01-10T08:00:00.000Z',
    updatedAt: '2026-11-20T09:30:00.000Z',
  },
  {
    id: 'doc-jr-01',
    fullName: 'Dr. Rahul Varma',
    email: 'rahul.varma@olmera.health',
    phone: '+91 98480 41209',
    specialization: 'Internal Medicine',
    qualification: 'MBBS, MD Resident',
    experienceYears: 3,
    hospitalName: 'Olmera Institute of Medical Sciences',
    hierarchyRole: 'junior_resident',
    status: 'active',
    createdAt: '2026-02-14T10:00:00.000Z',
    updatedAt: '2026-11-21T14:20:00.000Z',
  },
  {
    id: 'doc-jr-02',
    fullName: 'Dr. Sneha Reddy',
    email: 'sneha.reddy@olmera.health',
    phone: '+91 98491 77320',
    specialization: 'Preventive Cardiology',
    qualification: 'MBBS, DNB Resident',
    experienceYears: 2,
    hospitalName: 'GMR Varalakshmi Care Hospital',
    hierarchyRole: 'junior_resident',
    status: 'active',
    createdAt: '2026-04-02T09:15:00.000Z',
    updatedAt: '2026-11-22T11:00:00.000Z',
  },
];

const DEFAULT_HOSPITALS: MasterHospitalRecord[] = [
  {
    id: 'hosp-1',
    name: 'GMR Varalakshmi Care Hospital',
    city: 'Rajam',
    code: 'OCH-RJM',
    totalBeds: 150,
    icuBeds: 28,
    contactEmail: 'rajam@olmera.health',
    status: 'operational',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2026-11-18T10:00:00.000Z',
  },
  {
    id: 'hosp-2',
    name: 'Olmera Institute of Medical Sciences',
    city: 'Visakhapatnam',
    code: 'OAMI-VZG',
    totalBeds: 350,
    icuBeds: 64,
    contactEmail: 'vizag@olmera.health',
    status: 'operational',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2026-11-18T10:00:00.000Z',
  },
  {
    id: 'hosp-3',
    name: 'Olmera Care Hospital',
    city: 'Srikakulam',
    code: 'MDC-SRK',
    totalBeds: 200,
    icuBeds: 36,
    contactEmail: 'srikakulam@olmera.health',
    status: 'operational',
    createdAt: '2025-02-15T00:00:00.000Z',
    updatedAt: '2026-11-19T12:00:00.000Z',
  },
  {
    id: 'hosp-4',
    name: 'Olmera Specialty Institute',
    city: 'Visakhapatnam',
    code: 'APL-VZG',
    totalBeds: 300,
    icuBeds: 52,
    contactEmail: 'specialty@olmera.health',
    status: 'operational',
    createdAt: '2025-03-10T00:00:00.000Z',
    updatedAt: '2026-11-20T09:00:00.000Z',
  },
];

const memoryAdminStore = new Map<string, unknown>();

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readStore<T>(key: string, fallback: T): T {
  if (memoryAdminStore.has(key)) {
    return cloneValue(memoryAdminStore.get(key) as T);
  }
  const cloned = cloneValue(fallback);
  memoryAdminStore.set(key, cloned);
  return cloneValue(cloned);
}

function writeStore<T>(key: string, value: T): void {
  memoryAdminStore.set(key, cloneValue(value));
}

async function persistFirestoreDoc(collectionName: string, docId: string, data: Record<string, any>): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    await setDoc(doc(db, collectionName, docId), data, { merge: true });
  } catch (e) {
    console.warn(`Firestore write skipped (${collectionName}/${docId}):`, e);
  }
}

async function deleteFirestoreDoc(collectionName: string, docId: string): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (e) {
    console.warn(`Firestore delete skipped (${collectionName}/${docId}):`, e);
  }
}

export class MasterAdminService {
  /**
   * Kick off a background Firestore sync immediately so callers always get
   * the latest authoritative data rather than falling back to hardcoded
   * defaults.  The constructor cannot be async, so we fire-and-forget.
   * Individual public read methods remain synchronous because they read from
   * the in-memory store that the sync populates.
   */
  constructor() {
    // Fire-and-forget: errors are caught inside syncFromFirestore()
    this.syncFromFirestore().catch(() => {
      // Sync failure is non-fatal — in-memory defaults remain available.
    });
  }

  /**
   * Synchronizes Master Admin registries (credits, patients, doctors, hospitals) from Firestore.
   */
  public async syncFromFirestore(): Promise<void> {
    if (!isFirebaseConfigured) return;
    try {
      const summarySnap = await getDoc(doc(db, 'master_credits', 'summary'));
      if (summarySnap.exists()) {
        writeStore(CREDITS_SUMMARY_KEY, summarySnap.data() as CreditSummary);
      }
      const historySnap = await getDocs(collection(db, 'master_credits_history'));
      if (!historySnap.empty) {
        writeStore(CREDITS_HISTORY_KEY, historySnap.docs.map(d => ({ id: d.id, ...d.data() })) as CreditTransaction[]);
      }
      const ptsSnap = await getDocs(collection(db, 'patients'));
      if (!ptsSnap.empty) {
        writeStore(PATIENTS_KEY, ptsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as MasterPatientRecord[]);
      }
      const drsSnap = await getDocs(collection(db, 'doctors'));
      if (!drsSnap.empty) {
        writeStore(DOCTORS_KEY, drsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as MasterDoctorRecord[]);
      }
      const hospSnap = await getDocs(collection(db, 'hospitals'));
      if (!hospSnap.empty) {
        writeStore(HOSPITALS_KEY, hospSnap.docs.map(d => ({ id: d.id, ...d.data() })) as MasterHospitalRecord[]);
      }
    } catch (e) {
      console.warn('Firestore MasterAdminService sync warning:', e);
    }
  }

  /**
   * Strict RBAC check: Only super_admin (Master Admin) may mutate credits or global registries.
   */
  public isMasterAdmin(actor?: Partial<MasterAdminActor> | null): boolean {
    if (!actor) return false;
    return actor.role === 'super_admin';
  }

  private async enforceMasterRbac(actor: MasterAdminActor, actionDesc: string): Promise<string | null> {
    if (!this.isMasterAdmin(actor)) {
      await auditLogger.logEvent({
        eventType: 'ACCESS_DENIED',
        status: 'blocked',
        staffId: actor?.staffId || 'UNKNOWN',
        email: actor?.email || 'UNKNOWN',
        role: String(actor?.role || 'unauthorized'),
        details: `RBAC Denied: Attempted Master Admin action "${actionDesc}" without super_admin privileges.`,
      });
      return 'Access Denied: Restricted exclusively to Master Admin users.';
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // CREDITS MANAGEMENT
  // -------------------------------------------------------------------------
  public getCreditSummary(): CreditSummary {
    return readStore<CreditSummary>(CREDITS_SUMMARY_KEY, DEFAULT_CREDITS_SUMMARY);
  }

  public getCreditHistory(): CreditTransaction[] {
    return readStore<CreditTransaction[]>(CREDITS_HISTORY_KEY, DEFAULT_CREDIT_HISTORY);
  }

  public async allocateCredits(
    actor: MasterAdminActor,
    params: { amount: number; recipientOrTarget: string; purpose: string }
  ): Promise<{ success: boolean; summary?: CreditSummary; transaction?: CreditTransaction; error?: string }> {
    const rbacError = await this.enforceMasterRbac(actor, 'ALLOCATE_CREDITS');
    if (rbacError) return { success: false, error: rbacError };

    const amount = Math.floor(Number(params.amount));
    const recipient = sanitizePlainText(params.recipientOrTarget, 140);
    const purpose = sanitizePlainText(params.purpose, 240);

    if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) {
      return { success: false, error: 'Credit allocation amount must be between 1 and 10,000,000.' };
    }
    if (recipient.length < 2 || purpose.length < 3) {
      return { success: false, error: 'Recipient and allocation purpose are required.' };
    }

    const summary = this.getCreditSummary();
    summary.availableCredits += amount;
    summary.totalAllocatedCredits += amount;
    summary.lastUpdatedAt = new Date().toISOString();
    writeStore(CREDITS_SUMMARY_KEY, summary);

    const tx: CreditTransaction = {
      id: `crd-${Date.now().toString(36)}`,
      type: 'allocation',
      amount,
      balanceAfter: summary.availableCredits,
      recipientOrTarget: recipient,
      purpose,
      performedBy: actor.email,
      timestamp: summary.lastUpdatedAt,
    };

    const history = this.getCreditHistory();
    history.unshift(tx);
    writeStore(CREDITS_HISTORY_KEY, history);

    await persistFirestoreDoc('master_credits', 'summary', summary as unknown as Record<string, any>);
    await persistFirestoreDoc('master_credits_history', tx.id, tx as unknown as Record<string, any>);

    await auditLogger.logEvent({
      eventType: 'ELEVATED_ACTION',
      status: 'success',
      staffId: actor.staffId,
      email: actor.email,
      role: String(actor.role),
      details: `Allocated ${amount.toLocaleString()} credits to "${recipient}" (${purpose}). New balance: ${summary.availableCredits.toLocaleString()}.`,
    });

    return { success: true, summary, transaction: tx };
  }

  public async recordCreditUsage(
    actor: MasterAdminActor,
    params: { amount: number; recipientOrTarget: string; purpose: string }
  ): Promise<{ success: boolean; summary?: CreditSummary; transaction?: CreditTransaction; error?: string }> {
    const rbacError = await this.enforceMasterRbac(actor, 'DEDUCT_CREDITS');
    if (rbacError) return { success: false, error: rbacError };

    const amount = Math.floor(Number(params.amount));
    const target = sanitizePlainText(params.recipientOrTarget, 140);
    const purpose = sanitizePlainText(params.purpose, 240);

    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: 'Credit usage amount must be greater than zero.' };
    }
    if (target.length < 2 || purpose.length < 3) {
      return { success: false, error: 'Target facility/module and usage reason are required.' };
    }

    const summary = this.getCreditSummary();
    if (amount > summary.availableCredits) {
      return { success: false, error: `Insufficient credit balance (${summary.availableCredits.toLocaleString()} available).` };
    }

    summary.availableCredits -= amount;
    summary.totalUsedCredits += amount;
    summary.lastUpdatedAt = new Date().toISOString();
    writeStore(CREDITS_SUMMARY_KEY, summary);

    const tx: CreditTransaction = {
      id: `crd-${Date.now().toString(36)}`,
      type: 'usage',
      amount,
      balanceAfter: summary.availableCredits,
      recipientOrTarget: target,
      purpose,
      performedBy: actor.email,
      timestamp: summary.lastUpdatedAt,
    };

    const history = this.getCreditHistory();
    history.unshift(tx);
    writeStore(CREDITS_HISTORY_KEY, history);

    await persistFirestoreDoc('master_credits', 'summary', summary as unknown as Record<string, any>);
    await persistFirestoreDoc('master_credits_history', tx.id, tx as unknown as Record<string, any>);

    await auditLogger.logEvent({
      eventType: 'ELEVATED_ACTION',
      status: 'success',
      staffId: actor.staffId,
      email: actor.email,
      role: String(actor.role),
      details: `Recorded usage of ${amount.toLocaleString()} credits for "${target}" (${purpose}). Remaining balance: ${summary.availableCredits.toLocaleString()}.`,
    });

    return { success: true, summary, transaction: tx };
  }

  // -------------------------------------------------------------------------
  // PATIENTS CRUD
  // -------------------------------------------------------------------------
  public getPatients(): MasterPatientRecord[] {
    return readStore<MasterPatientRecord[]>(PATIENTS_KEY, DEFAULT_PATIENTS);
  }

  public async addPatient(
    actor: MasterAdminActor,
    input: Omit<MasterPatientRecord, 'id' | 'registeredAt' | 'updatedAt'>
  ): Promise<{ success: boolean; record?: MasterPatientRecord; error?: string }> {
    const rbacError = await this.enforceMasterRbac(actor, 'ADD_PATIENT');
    if (rbacError) return { success: false, error: rbacError };

    const fullName = sanitizePlainText(input.fullName, 120);
    const email = sanitizePlainText(input.email, 254).toLowerCase();
    const phone = sanitizePlainText(input.phone, 30);
    const city = sanitizePlainText(input.city, 80);
    const age = Number(input.age);

    if (fullName.length < 2) return { success: false, error: 'Patient full name is required.' };
    if (!validateEmailAddress(email)) return { success: false, error: 'Valid patient email is required.' };
    if (phone.length < 7) return { success: false, error: 'Valid contact phone number is required.' };
    if (!Number.isFinite(age) || age < 0 || age > 125) return { success: false, error: 'Patient age must be between 0 and 125.' };

    const list = this.getPatients();
    if (list.some(p => p.email.toLowerCase() === email)) {
      return { success: false, error: 'A patient with this email already exists.' };
    }

    const now = new Date().toISOString();
    const record: MasterPatientRecord = {
      id: `pt-${Date.now().toString(36)}`,
      fullName,
      email,
      phone,
      age,
      gender: input.gender || 'Other',
      bloodGroup: sanitizePlainText(input.bloodGroup || 'O+', 10),
      city: city || 'Visakhapatnam',
      status: input.status || 'active',
      registeredAt: now,
      updatedAt: now,
    };

    list.unshift(record);
    writeStore(PATIENTS_KEY, list);
    await persistFirestoreDoc('patients', record.id, record as unknown as Record<string, any>);

    await auditLogger.logEvent({
      eventType: 'ELEVATED_ACTION',
      status: 'success',
      staffId: actor.staffId,
      email: actor.email,
      role: String(actor.role),
      details: `Added patient record "${record.fullName}" (${record.id}).`,
    });

    return { success: true, record };
  }

  public async updatePatient(
    actor: MasterAdminActor,
    id: string,
    updates: Partial<Omit<MasterPatientRecord, 'id' | 'registeredAt' | 'updatedAt'>>
  ): Promise<{ success: boolean; record?: MasterPatientRecord; error?: string }> {
    const rbacError = await this.enforceMasterRbac(actor, 'EDIT_PATIENT');
    if (rbacError) return { success: false, error: rbacError };

    const list = this.getPatients();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) return { success: false, error: 'Patient record not found.' };

    if (updates.email && !validateEmailAddress(updates.email)) {
      return { success: false, error: 'Invalid email address.' };
    }

    list[idx] = {
      ...list[idx],
      ...(updates.fullName !== undefined ? { fullName: sanitizePlainText(updates.fullName, 120) } : {}),
      ...(updates.email !== undefined ? { email: sanitizePlainText(updates.email, 254).toLowerCase() } : {}),
      ...(updates.phone !== undefined ? { phone: sanitizePlainText(updates.phone, 30) } : {}),
      ...(updates.age !== undefined ? { age: Number(updates.age) } : {}),
      ...(updates.gender !== undefined ? { gender: updates.gender } : {}),
      ...(updates.bloodGroup !== undefined ? { bloodGroup: sanitizePlainText(updates.bloodGroup, 10) } : {}),
      ...(updates.city !== undefined ? { city: sanitizePlainText(updates.city, 80) } : {}),
      ...(updates.status !== undefined ? { status: updates.status } : {}),
      updatedAt: new Date().toISOString(),
    };

    writeStore(PATIENTS_KEY, list);
    await persistFirestoreDoc('patients', list[idx].id, list[idx] as unknown as Record<string, any>);

    await auditLogger.logEvent({
      eventType: 'ELEVATED_ACTION',
      status: 'success',
      staffId: actor.staffId,
      email: actor.email,
      role: String(actor.role),
      details: `Updated patient record "${list[idx].fullName}" (${id}).`,
    });

    return { success: true, record: list[idx] };
  }

  public async deletePatient(
    actor: MasterAdminActor,
    id: string
  ): Promise<{ success: boolean; error?: string }> {
    const rbacError = await this.enforceMasterRbac(actor, 'DELETE_PATIENT');
    if (rbacError) return { success: false, error: rbacError };

    const list = this.getPatients();
    const target = list.find(p => p.id === id);
    if (!target) return { success: false, error: 'Patient record not found.' };

    writeStore(PATIENTS_KEY, list.filter(p => p.id !== id));
    await deleteFirestoreDoc('patients', id);

    await auditLogger.logEvent({
      eventType: 'ELEVATED_ACTION',
      status: 'warning',
      staffId: actor.staffId,
      email: actor.email,
      role: String(actor.role),
      details: `Deleted patient record "${target.fullName}" (${id}).`,
    });

    return { success: true };
  }

  // -------------------------------------------------------------------------
  // DOCTORS CRUD
  // -------------------------------------------------------------------------
  public getDoctors(): MasterDoctorRecord[] {
    return readStore<MasterDoctorRecord[]>(DOCTORS_KEY, DEFAULT_DOCTORS);
  }

  public async addDoctor(
    actor: MasterAdminActor,
    input: Omit<MasterDoctorRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<{ success: boolean; record?: MasterDoctorRecord; error?: string }> {
    const rbacError = await this.enforceMasterRbac(actor, 'ADD_DOCTOR');
    if (rbacError) return { success: false, error: rbacError };

    const fullName = sanitizePlainText(input.fullName, 120);
    const email = sanitizePlainText(input.email, 254).toLowerCase();
    const specialization = sanitizePlainText(input.specialization, 100);
    const qualification = sanitizePlainText(input.qualification, 120);
    const hospitalName = sanitizePlainText(input.hospitalName, 140);
    const exp = Number(input.experienceYears);

    if (fullName.length < 2) return { success: false, error: 'Doctor full name is required.' };
    if (!validateEmailAddress(email)) return { success: false, error: 'Valid doctor email is required.' };
    if (specialization.length < 2) return { success: false, error: 'Specialization is required.' };
    if (!Number.isFinite(exp) || exp < 0 || exp > 65) return { success: false, error: 'Experience years must be between 0 and 65.' };

    const list = this.getDoctors();
    if (list.some(d => d.email.toLowerCase() === email)) {
      return { success: false, error: 'A doctor with this email is already registered.' };
    }

    const now = new Date().toISOString();
    const record: MasterDoctorRecord = {
      id: `doc-${Date.now().toString(36)}`,
      fullName,
      email,
      phone: sanitizePlainText(input.phone || '+91 891 000 0000', 30),
      specialization,
      qualification: qualification || 'MBBS, MD',
      experienceYears: exp,
      hospitalName: hospitalName || 'Olmera Institute of Medical Sciences',
      hierarchyRole: input.hierarchyRole || 'senior_consultant',
      status: input.status || 'active',
      createdAt: now,
      updatedAt: now,
    };

    list.unshift(record);
    writeStore(DOCTORS_KEY, list);
    await persistFirestoreDoc('doctors', record.id, record as unknown as Record<string, any>);

    await auditLogger.logEvent({
      eventType: 'ELEVATED_ACTION',
      status: 'success',
      staffId: actor.staffId,
      email: actor.email,
      role: String(actor.role),
      details: `Added doctor "${record.fullName}" (${record.specialization}, ${record.id}).`,
    });

    return { success: true, record };
  }

  public async updateDoctor(
    actor: MasterAdminActor,
    id: string,
    updates: Partial<Omit<MasterDoctorRecord, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<{ success: boolean; record?: MasterDoctorRecord; error?: string }> {
    const rbacError = await this.enforceMasterRbac(actor, 'EDIT_DOCTOR');
    if (rbacError) return { success: false, error: rbacError };

    const list = this.getDoctors();
    const idx = list.findIndex(d => d.id === id);
    if (idx === -1) return { success: false, error: 'Doctor record not found.' };

    if (updates.email && !validateEmailAddress(updates.email)) {
      return { success: false, error: 'Invalid email address.' };
    }

    list[idx] = {
      ...list[idx],
      ...(updates.fullName !== undefined ? { fullName: sanitizePlainText(updates.fullName, 120) } : {}),
      ...(updates.email !== undefined ? { email: sanitizePlainText(updates.email, 254).toLowerCase() } : {}),
      ...(updates.phone !== undefined ? { phone: sanitizePlainText(updates.phone, 30) } : {}),
      ...(updates.specialization !== undefined ? { specialization: sanitizePlainText(updates.specialization, 100) } : {}),
      ...(updates.qualification !== undefined ? { qualification: sanitizePlainText(updates.qualification, 120) } : {}),
      ...(updates.experienceYears !== undefined ? { experienceYears: Number(updates.experienceYears) } : {}),
      ...(updates.hospitalName !== undefined ? { hospitalName: sanitizePlainText(updates.hospitalName, 140) } : {}),
      ...(updates.hierarchyRole !== undefined ? { hierarchyRole: updates.hierarchyRole } : {}),
      ...(updates.status !== undefined ? { status: updates.status } : {}),
      updatedAt: new Date().toISOString(),
    };

    writeStore(DOCTORS_KEY, list);
    await persistFirestoreDoc('doctors', list[idx].id, list[idx] as unknown as Record<string, any>);

    await auditLogger.logEvent({
      eventType: 'ELEVATED_ACTION',
      status: 'success',
      staffId: actor.staffId,
      email: actor.email,
      role: String(actor.role),
      details: `Updated doctor record "${list[idx].fullName}" (${id}).`,
    });

    return { success: true, record: list[idx] };
  }

  public async deleteDoctor(
    actor: MasterAdminActor,
    id: string
  ): Promise<{ success: boolean; error?: string }> {
    const rbacError = await this.enforceMasterRbac(actor, 'DELETE_DOCTOR');
    if (rbacError) return { success: false, error: rbacError };

    const list = this.getDoctors();
    const target = list.find(d => d.id === id);
    if (!target) return { success: false, error: 'Doctor record not found.' };

    writeStore(DOCTORS_KEY, list.filter(d => d.id !== id));
    await deleteFirestoreDoc('doctors', id);

    await auditLogger.logEvent({
      eventType: 'ELEVATED_ACTION',
      status: 'warning',
      staffId: actor.staffId,
      email: actor.email,
      role: String(actor.role),
      details: `Deleted doctor record "${target.fullName}" (${id}).`,
    });

    return { success: true };
  }

  // -------------------------------------------------------------------------
  // HOSPITALS CRUD
  // -------------------------------------------------------------------------
  public getHospitals(): MasterHospitalRecord[] {
    return readStore<MasterHospitalRecord[]>(HOSPITALS_KEY, DEFAULT_HOSPITALS);
  }

  public async addHospital(
    actor: MasterAdminActor,
    input: Omit<MasterHospitalRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<{ success: boolean; record?: MasterHospitalRecord; error?: string }> {
    const rbacError = await this.enforceMasterRbac(actor, 'ADD_HOSPITAL');
    if (rbacError) return { success: false, error: rbacError };

    const name = sanitizePlainText(input.name, 140);
    const city = sanitizePlainText(input.city, 80);
    const code = sanitizePlainText(input.code, 20).toUpperCase();
    const contactEmail = sanitizePlainText(input.contactEmail, 254).toLowerCase();
    const totalBeds = Number(input.totalBeds);
    const icuBeds = Number(input.icuBeds);

    if (name.length < 3) return { success: false, error: 'Hospital name is required.' };
    if (city.length < 2) return { success: false, error: 'City is required.' };
    if (code.length < 2) return { success: false, error: 'Facility code is required.' };
    if (!validateEmailAddress(contactEmail)) return { success: false, error: 'Valid facility contact email is required.' };
    if (!Number.isFinite(totalBeds) || totalBeds < 1 || icuBeds < 0 || icuBeds > totalBeds) {
      return { success: false, error: 'Bed counts invalid (ICU beds cannot exceed total beds).' };
    }

    const list = this.getHospitals();
    if (list.some(h => h.code.toUpperCase() === code)) {
      return { success: false, error: `Hospital code "${code}" is already registered.` };
    }

    const now = new Date().toISOString();
    const record: MasterHospitalRecord = {
      id: `hosp-${Date.now().toString(36)}`,
      name,
      city,
      code,
      totalBeds,
      icuBeds,
      contactEmail,
      status: input.status || 'operational',
      createdAt: now,
      updatedAt: now,
    };

    list.unshift(record);
    writeStore(HOSPITALS_KEY, list);
    await persistFirestoreDoc('hospitals', record.id, record as unknown as Record<string, any>);

    await auditLogger.logEvent({
      eventType: 'ELEVATED_ACTION',
      status: 'success',
      staffId: actor.staffId,
      email: actor.email,
      role: String(actor.role),
      details: `Registered hospital "${record.name}" (${record.code}) in ${record.city}.`,
    });

    return { success: true, record };
  }

  public async updateHospital(
    actor: MasterAdminActor,
    id: string,
    updates: Partial<Omit<MasterHospitalRecord, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<{ success: boolean; record?: MasterHospitalRecord; error?: string }> {
    const rbacError = await this.enforceMasterRbac(actor, 'EDIT_HOSPITAL');
    if (rbacError) return { success: false, error: rbacError };

    const list = this.getHospitals();
    const idx = list.findIndex(h => h.id === id);
    if (idx === -1) return { success: false, error: 'Hospital record not found.' };

    if (updates.contactEmail && !validateEmailAddress(updates.contactEmail)) {
      return { success: false, error: 'Invalid facility contact email.' };
    }

    list[idx] = {
      ...list[idx],
      ...(updates.name !== undefined ? { name: sanitizePlainText(updates.name, 140) } : {}),
      ...(updates.city !== undefined ? { city: sanitizePlainText(updates.city, 80) } : {}),
      ...(updates.code !== undefined ? { code: sanitizePlainText(updates.code, 20).toUpperCase() } : {}),
      ...(updates.totalBeds !== undefined ? { totalBeds: Number(updates.totalBeds) } : {}),
      ...(updates.icuBeds !== undefined ? { icuBeds: Number(updates.icuBeds) } : {}),
      ...(updates.contactEmail !== undefined ? { contactEmail: sanitizePlainText(updates.contactEmail, 254).toLowerCase() } : {}),
      ...(updates.status !== undefined ? { status: updates.status } : {}),
      updatedAt: new Date().toISOString(),
    };

    writeStore(HOSPITALS_KEY, list);
    await persistFirestoreDoc('hospitals', list[idx].id, list[idx] as unknown as Record<string, any>);

    await auditLogger.logEvent({
      eventType: 'ELEVATED_ACTION',
      status: 'success',
      staffId: actor.staffId,
      email: actor.email,
      role: String(actor.role),
      details: `Updated hospital "${list[idx].name}" (${id}).`,
    });

    return { success: true, record: list[idx] };
  }

  public async deleteHospital(
    actor: MasterAdminActor,
    id: string
  ): Promise<{ success: boolean; error?: string }> {
    const rbacError = await this.enforceMasterRbac(actor, 'DELETE_HOSPITAL');
    if (rbacError) return { success: false, error: rbacError };

    const list = this.getHospitals();
    const target = list.find(h => h.id === id);
    if (!target) return { success: false, error: 'Hospital record not found.' };

    writeStore(HOSPITALS_KEY, list.filter(h => h.id !== id));
    await deleteFirestoreDoc('hospitals', id);

    await auditLogger.logEvent({
      eventType: 'ELEVATED_ACTION',
      status: 'warning',
      staffId: actor.staffId,
      email: actor.email,
      role: String(actor.role),
      details: `Deleted hospital "${target.name}" (${id}).`,
    });

    return { success: true };
  }
}

export const masterAdminService = new MasterAdminService();
