/**
 * Olmera Healthcare - Automated Follow-Up Coordination & Recall System
 * Proactively flags overdue patients, calculates risk scores, and dispatches automated recall alerts.
 */

export type FollowUpUrgency = 'routine' | 'medium_risk' | 'high_priority';
export type FollowUpRecallChannel = 'whatsapp' | 'sms' | 'email';

export interface RecallLogEntry {
  id: string;
  channel: FollowUpRecallChannel;
  dispatchedAt: string;
  status: 'sent' | 'delivered' | 'acknowledged';
  notes?: string;
}

export interface FollowUpCase {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  attendingDoctorId?: string;
  attendingDoctorName: string;
  hospitalId?: string;
  hospitalName?: string;
  primaryCondition: string;
  recommendedDate: string;
  lastVisitDate: string;
  riskScore: number; // 0 - 100
  riskFactors: string[];
  recallLogs: RecallLogEntry[];
  urgency?: FollowUpUrgency;
  notificationStatus?: 'pending_dispatch' | 'sent' | 'patient_acknowledged';
}

// Backward-compatible interface alias
export type PatientFollowUpRecord = FollowUpCase;

const STORAGE_KEY = 'olmera_follow_up_records';
let memoryStore: FollowUpCase[] | null = null;

export class FollowUpService {
  private getStore(): FollowUpCase[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) return JSON.parse(data);
      } else if (memoryStore) {
        return memoryStore;
      }
    } catch (e) {
      console.warn('Follow up parse error:', e);
    }

    const defaultCases: FollowUpCase[] = [
      {
        id: 'rec-01',
        patientId: 'demo-patient-uid',
        patientName: 'Priya Sharma',
        patientPhone: '+91 94401 23456',
        patientEmail: 'priya.sharma@example.com',
        attendingDoctorId: 'doc-01',
        attendingDoctorName: 'Dr. A Suresh',
        hospitalId: 'hosp-01',
        hospitalName: 'Olmera Super Specialty Care',
        primaryCondition: 'Type 2 Diabetes & Moderate Hypertension',
        recommendedDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
        lastVisitDate: new Date(Date.now() - 35 * 86400000).toISOString().split('T')[0],
        riskScore: 78,
        riskFactors: ['Systolic BP > 140 mmHg', 'Missed refill interval', 'Fasting Sugar > 130 mg/dL'],
        recallLogs: [
          {
            id: 'log-1',
            channel: 'whatsapp',
            dispatchedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
            status: 'sent',
            notes: 'Automated 30-day glycemic check reminder'
          }
        ],
        urgency: 'high_priority',
        notificationStatus: 'sent'
      },
      {
        id: 'rec-02',
        patientId: 'p-002',
        patientName: 'K. Venkat Rao',
        patientPhone: '+91 98480 12345',
        patientEmail: 'venkat.k@gmail.com',
        attendingDoctorId: 'doc-02',
        attendingDoctorName: 'Dr. Ravi Kumar Gurugubelli',
        hospitalId: 'hosp-01',
        hospitalName: 'Apollo Hospital',
        primaryCondition: 'Post-CABG Cardiac Rehabilitation',
        recommendedDate: new Date(Date.now() - 8 * 86400000).toISOString().split('T')[0],
        lastVisitDate: new Date(Date.now() - 38 * 86400000).toISOString().split('T')[0],
        riskScore: 88,
        riskFactors: ['Cardiac surgery within 6 months', 'Post-prandial fluctuations', 'Overdue consult by 8 days'],
        recallLogs: [],
        urgency: 'high_priority',
        notificationStatus: 'pending_dispatch'
      },
      {
        id: 'rec-03',
        patientId: 'p-003',
        patientName: 'Sunitha Patel',
        patientPhone: '+91 91234 56789',
        patientEmail: 'sunitha.p@gmail.com',
        attendingDoctorId: 'doc-03',
        attendingDoctorName: 'Dr. Anita Tripathy',
        hospitalId: 'hosp-02',
        hospitalName: 'Care Hospital',
        primaryCondition: 'Pediatric Asthma Maintenance',
        recommendedDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
        lastVisitDate: new Date(Date.now() - 17 * 86400000).toISOString().split('T')[0],
        riskScore: 38,
        riskFactors: ['Seasonal allergen change alert'],
        recallLogs: [],
        urgency: 'routine',
        notificationStatus: 'pending_dispatch'
      }
    ];

    if (typeof localStorage === 'undefined') {
      memoryStore = defaultCases;
    }
    return defaultCases;
  }

  private saveStore(records: FollowUpCase[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      } else {
        memoryStore = records;
      }
    } catch (e) {
      console.error('Failed to save follow-up records', e);
    }
  }

  getFollowUpCases(): FollowUpCase[] {
    return this.getStore();
  }

  getFollowUpQueue(filter?: { urgency?: FollowUpUrgency; status?: string }): FollowUpCase[] {
    let list = this.getStore();
    if (filter?.urgency) {
      list = list.filter(r => r.urgency === filter.urgency);
    }
    if (filter?.status) {
      list = list.filter(r => r.notificationStatus === filter.status);
    }
    return list.sort((a, b) => b.riskScore - a.riskScore);
  }

  getOverdueCases(): FollowUpCase[] {
    const list = this.getStore();
    const today = new Date().toISOString().split('T')[0];
    return list.filter(c => c.recommendedDate < today);
  }

  scheduleFollowUp(params: {
    patientId: string;
    patientName: string;
    patientPhone: string;
    patientEmail?: string;
    attendingDoctorId?: string;
    attendingDoctorName?: string;
    hospitalId?: string;
    hospitalName?: string;
    primaryCondition: string;
    recommendedDate: string;
    notes?: string;
  }): FollowUpCase {
    const list = this.getStore();
    const isOverdue = new Date(params.recommendedDate) < new Date();
    const baseScore = isOverdue ? 75 : 30;

    const newCase: FollowUpCase = {
      id: `rec-${Date.now().toString(36)}`,
      patientId: params.patientId,
      patientName: params.patientName,
      patientPhone: params.patientPhone,
      patientEmail: params.patientEmail,
      attendingDoctorId: params.attendingDoctorId || 'doc-default',
      attendingDoctorName: params.attendingDoctorName || 'Attending Physician',
      hospitalId: params.hospitalId || 'hosp-main',
      hospitalName: params.hospitalName || 'Olmera Healthcare Network',
      primaryCondition: params.primaryCondition,
      recommendedDate: params.recommendedDate,
      lastVisitDate: new Date().toISOString().split('T')[0],
      riskScore: baseScore,
      riskFactors: isOverdue ? ['Lapsed follow-up appointment window'] : ['Routine surveillance protocol'],
      recallLogs: [],
      urgency: isOverdue ? 'high_priority' : 'routine',
      notificationStatus: 'pending_dispatch'
    };

    list.unshift(newCase);
    this.saveStore(list);
    return newCase;
  }

  async triggerRecallNotification(caseId: string, channel: FollowUpRecallChannel, customNotes?: string): Promise<{ status: string; channel: string; dispatchedAt: string }> {
    const list = this.getStore();
    const target = list.find(c => c.id === caseId);
    const now = new Date().toISOString();

    if (target) {
      target.recallLogs.unshift({
        id: `log-${Date.now().toString(36)}`,
        channel,
        dispatchedAt: now,
        status: 'sent',
        notes: customNotes
      });
      target.notificationStatus = 'sent';
      this.saveStore(list);
    }

    return {
      status: 'sent',
      channel,
      dispatchedAt: now
    };
  }
}

export const followUpService = new FollowUpService();
