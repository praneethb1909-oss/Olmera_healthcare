/**
 * Olmera Healthcare - Consent-Based Cross-Hospital Record Sharing Service
 * Manages patient-governed data access authorizations between accredited hospital facilities.
 */

import { auditLogger } from '../auth/auditLogger';

export type ConsentScope = 
  | 'medical_history' 
  | 'diagnostic_reports' 
  | 'prescriptions' 
  | 'clinical_notes' 
  | 'vitals_telemetry'
  | 'diagnoses'
  | 'lab_reports'
  | 'scans';

export type ConsentStatus = 'active' | 'revoked' | 'expired';

export interface ConsentRecord {
  id: string;
  patientId: string;
  patientName: string;
  targetHospitalId: string;
  targetHospitalName: string;
  requestingDoctorId?: string;
  requestingDoctorName?: string;
  scopes: ConsentScope[];
  scope?: ConsentScope[];
  grantedAt: string;
  expiresAt: string;
  status: ConsentStatus;
  purposeOfAccess: string;
  revokedAt?: string;
}

const STORAGE_KEY = 'olmera_clinical_consents';
let memoryStore: ConsentRecord[] | null = null;

export class ConsentService {
  private getStore(): ConsentRecord[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) return JSON.parse(data);
      } else if (memoryStore) {
        return memoryStore;
      }
    } catch (e) {
      console.warn('Failed to parse consents store, using fallback', e);
    }

    // Default seeded sample consent
    const defaultData: ConsentRecord[] = [
      {
        id: 'cst-001',
        patientId: 'demo-patient-uid',
        patientName: 'Demo Patient',
        targetHospitalId: 'hosp-2',
        targetHospitalName: 'Olmera Vizag Care Center',
        requestingDoctorId: 'doc-2',
        requestingDoctorName: 'Dr. Anita Tripathy',
        scopes: ['medical_history', 'diagnostic_reports', 'prescriptions'],
        grantedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        expiresAt: new Date(Date.now() + 27 * 86400000).toISOString(),
        status: 'active',
        purposeOfAccess: 'Tertiary cardiology consultation & multi-center history review'
      }
    ];

    if (typeof localStorage === 'undefined') {
      memoryStore = defaultData;
    }
    return defaultData;
  }

  private saveStore(consents: ConsentRecord[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(consents));
      } else {
        memoryStore = consents;
      }
    } catch (e) {
      console.error('Failed to save consents to localStorage', e);
    }
  }

  /**
   * Grant new cross-hospital consent
   */
  grantConsent(params: {
    patientId: string;
    patientName: string;
    targetHospitalId: string;
    targetHospitalName: string;
    scopes?: ConsentScope[];
    scope?: ConsentScope[];
    validityDays?: number;
    expiryDays?: number;
    purposeOfAccess?: string;
    purpose?: string;
    requestingDoctorId?: string;
    requestingDoctorName?: string;
  }): ConsentRecord {
    const consents = this.getStore();
    const now = new Date();
    const days = params.validityDays ?? params.expiryDays ?? 30;
    const expires = new Date(now.getTime() + days * 86400000);
    const resolvedScopes = params.scopes || params.scope || ['medical_history', 'prescriptions'];
    const resolvedPurpose = params.purposeOfAccess || params.purpose || 'Clinical care and multi-hospital record coordination';

    const newRecord: ConsentRecord = {
      id: `cst-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      patientId: params.patientId,
      patientName: params.patientName,
      targetHospitalId: params.targetHospitalId,
      targetHospitalName: params.targetHospitalName,
      requestingDoctorId: params.requestingDoctorId,
      requestingDoctorName: params.requestingDoctorName,
      scopes: resolvedScopes,
      scope: resolvedScopes,
      grantedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      status: 'active',
      purposeOfAccess: resolvedPurpose
    };

    consents.unshift(newRecord);
    this.saveStore(consents);

    // Record in security audit log
    try {
      auditLogger.logEvent?.({
        eventType: 'ELEVATED_ACTION',
        status: 'success',
        hospitalId: params.targetHospitalId,
        hospitalName: params.targetHospitalName,
        staffId: params.patientId,
        details: `Consent granted to ${params.targetHospitalName} for scopes: ${resolvedScopes.join(', ')}`
      });
    } catch (e) {
      console.warn('Audit log write skipped:', e);
    }

    return newRecord;
  }

  /**
   * Revoke existing consent
   */
  revokeConsent(consentId: string, patientId?: string): boolean {
    const consents = this.getStore();
    const item = consents.find(c => c.id === consentId && (!patientId || c.patientId === patientId));
    if (!item) return false;

    item.status = 'revoked';
    item.revokedAt = new Date().toISOString();
    this.saveStore(consents);

    try {
      auditLogger.logEvent?.({
        eventType: 'ELEVATED_ACTION',
        status: 'warning',
        hospitalId: item.targetHospitalId,
        hospitalName: item.targetHospitalName,
        staffId: patientId || item.patientId,
        details: `Patient revoked cross-hospital data sharing with ${item.targetHospitalName}`
      });
    } catch (e) {
      console.warn('Audit log write skipped:', e);
    }

    return true;
  }

  /**
   * Get all active & historic consents for a patient
   */
  getConsentsForPatient(patientId: string): ConsentRecord[] {
    const consents = this.getStore();
    const now = new Date().toISOString();

    // Auto-expire
    return consents
      .filter(c => c.patientId === patientId)
      .map(c => {
        if (c.status === 'active' && c.expiresAt < now) {
          return { ...c, status: 'expired' as ConsentStatus };
        }
        return c;
      });
  }

  /**
   * Verify whether a hospital or doctor has authorization to view a patient's data
   */
  verifyAccessPermission(params: {
    patientId: string;
    hospitalId: string;
    requiredScope: ConsentScope;
  }): { allowed: boolean; reason?: string; consent?: ConsentRecord } {
    const consents = this.getStore();
    const now = new Date().toISOString();

    const matching = consents.find(c => 
      c.patientId === params.patientId &&
      c.targetHospitalId === params.hospitalId &&
      c.status === 'active' &&
      c.expiresAt > now &&
      c.scopes.includes(params.requiredScope)
    );

    if (matching) {
      return { allowed: true, consent: matching };
    }

    return { 
      allowed: false, 
      reason: `No active patient consent for hospital '${params.hospitalId}' with scope '${params.requiredScope}'.` 
    };
  }

  /**
   * Helper check for cross-hospital access
   */
  checkCrossHospitalAccess(patientId: string, hospitalId: string, requiredScope: any): boolean {
    const scopeMap: Record<string, ConsentScope> = {
      'prescriptions': 'prescriptions',
      'diagnoses': 'diagnoses',
      'lab_reports': 'diagnostic_reports',
      'scans': 'scans',
      'medical_history': 'medical_history'
    };
    const mapped = scopeMap[requiredScope] || (requiredScope as ConsentScope);
    return this.verifyAccessPermission({ patientId, hospitalId, requiredScope: mapped }).allowed;
  }
}

export const consentService = new ConsentService();
