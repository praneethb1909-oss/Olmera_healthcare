/**
 * Olmera Healthcare - Partner Portals Data Service
 * Supports Diagnostic Lab requisition tracking and Pharmacy dispensing operations.
 */

export interface StructuredBiomarker {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'high' | 'low';
}

export interface DiagnosticRequisition {
  id: string;
  patientId: string;
  patientName: string;
  referringDoctorId: string;
  referringDoctorName: string;
  hospitalId?: string;
  hospitalName?: string;
  testName: string;
  testNames?: string[];
  urgency?: 'routine' | 'urgent' | 'stat';
  status: 'pending' | 'sample_collected' | 'processing' | 'completed' | 'ordered' | 'analyzing' | 'cancelled';
  createdAt: string;
  orderedAt?: string;
  sampleCollectedAt?: string;
  completedAt?: string;
  summaryReport?: string;
  biomarkers: StructuredBiomarker[];
  biomarkersRecorded?: any[];
}

export type LabRequisition = DiagnosticRequisition;

const STORAGE_LAB_KEY = 'olmera_lab_requisitions';
let memoryStore: DiagnosticRequisition[] | null = null;

export class PartnerService {
  getRequisitions(): DiagnosticRequisition[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(STORAGE_LAB_KEY);
        if (data) return JSON.parse(data);
      } else if (memoryStore) {
        return memoryStore;
      }
    } catch (e) {
      console.warn('Lab requisition parsing error', e);
    }

    const defaultList: DiagnosticRequisition[] = [
      {
        id: 'req-001',
        patientId: 'demo-patient-uid',
        patientName: 'Priya Sharma',
        referringDoctorId: 'doc-1',
        referringDoctorName: 'Dr. A Suresh',
        hospitalId: 'hosp-01',
        hospitalName: 'Olmera Rajam',
        testName: 'Complete Blood Picture (CBP) & Fasting Glucose',
        testNames: ['Complete Blood Picture (CBP)', 'Fasting Blood Glucose'],
        urgency: 'routine',
        status: 'sample_collected',
        createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
        orderedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
        sampleCollectedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        biomarkers: [
          { name: 'Fasting Blood Sugar', value: '118', unit: 'mg/dL', referenceRange: '70 - 100', status: 'high' },
          { name: 'Hemoglobin', value: '13.2', unit: 'g/dL', referenceRange: '12.0 - 15.5', status: 'normal' }
        ]
      },
      {
        id: 'req-002',
        patientId: 'p-002',
        patientName: 'K. Venkat Rao',
        referringDoctorId: 'doc-2',
        referringDoctorName: 'Dr. Anita Tripathy',
        hospitalId: 'hosp-01',
        hospitalName: 'Olmera Vizag',
        testName: 'Serum Creatinine & Electrolytes Panel',
        testNames: ['Serum Creatinine', 'Electrolytes Panel (Na, K, Cl)'],
        urgency: 'urgent',
        status: 'processing',
        createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
        orderedAt: new Date(Date.now() - 6 * 3600000).toISOString(),
        sampleCollectedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
        biomarkers: [
          { name: 'Serum Creatinine', value: '1.4', unit: 'mg/dL', referenceRange: '0.7 - 1.2', status: 'high' }
        ]
      }
    ];

    if (typeof localStorage === 'undefined') {
      memoryStore = defaultList;
    }
    return defaultList;
  }

  getLabRequisitions(): LabRequisition[] {
    return this.getRequisitions();
  }

  getRequisitionById(id: string): DiagnosticRequisition | null {
    return this.getRequisitions().find(r => r.id === id) || null;
  }

  saveRequisitions(list: DiagnosticRequisition[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_LAB_KEY, JSON.stringify(list));
      } else {
        memoryStore = list;
      }
    } catch (e) {
      console.error('Failed to save requisitions', e);
    }
  }

  saveLabRequisitions(list: LabRequisition[]): void {
    this.saveRequisitions(list);
  }

  createRequisition(params: {
    patientId: string;
    patientName: string;
    referringDoctorId: string;
    referringDoctorName: string;
    hospitalId?: string;
    hospitalName?: string;
    testName: string;
    urgency?: 'routine' | 'urgent' | 'stat';
  }): DiagnosticRequisition {
    const list = this.getRequisitions();
    const newReq: DiagnosticRequisition = {
      id: `req-${Date.now().toString(36)}`,
      patientId: params.patientId,
      patientName: params.patientName,
      referringDoctorId: params.referringDoctorId,
      referringDoctorName: params.referringDoctorName,
      hospitalId: params.hospitalId || 'hosp-01',
      hospitalName: params.hospitalName || 'Olmera Healthcare',
      testName: params.testName,
      testNames: [params.testName],
      urgency: params.urgency || 'routine',
      status: 'pending',
      createdAt: new Date().toISOString(),
      orderedAt: new Date().toISOString(),
      biomarkers: []
    };

    list.unshift(newReq);
    this.saveRequisitions(list);
    return newReq;
  }

  updateRequisitionStatus(id: string, status: any): DiagnosticRequisition | null {
    const list = this.getRequisitions();
    const item = list.find(r => r.id === id);
    if (!item) return null;

    item.status = status;
    if (status === 'sample_collected') {
      item.sampleCollectedAt = new Date().toISOString();
    }
    if (status === 'completed') {
      item.completedAt = new Date().toISOString();
    }
    this.saveRequisitions(list);
    return item;
  }

  uploadDiagnosticReport(
    requisitionId: string, 
    biomarkers: StructuredBiomarker[], 
    summaryReport: string
  ): DiagnosticRequisition {
    const list = this.getRequisitions();
    let item = list.find(r => r.id === requisitionId);

    if (!item) {
      item = this.createRequisition({
        patientId: 'patient_test_01',
        patientName: 'Rohan Verma',
        referringDoctorId: 'doc_senior_01',
        referringDoctorName: 'Dr. Rajesh Gupta',
        testName: 'Diagnostic Biomarker Panel'
      });
    }

    item.biomarkers = biomarkers;
    item.summaryReport = summaryReport;
    item.status = 'completed';
    item.completedAt = new Date().toISOString();

    this.saveRequisitions(list);
    return item;
  }

  recordLabResults(id: string, biomarkers: any[]): DiagnosticRequisition | null {
    const normalized: StructuredBiomarker[] = biomarkers.map(b => ({
      name: b.name || 'Biomarker',
      value: String(b.value || ''),
      unit: b.unit || '',
      referenceRange: b.referenceRange || '',
      status: b.isAbnormal ? 'high' : 'normal'
    }));
    return this.uploadDiagnosticReport(id, normalized, 'Laboratory test analysis concluded.');
  }
}

export const partnerService = new PartnerService();
