/**
 * Olmera Healthcare - Family Health Management Service
 * Supports household profiles, dependent records, and proxy appointment scheduling.
 */

export interface FamilyMember {
  id: string;
  primaryPatientId: string;
  fullName: string;
  relationship: 'Spouse' | 'Child' | 'Parent' | 'Sibling' | 'Grandparent' | 'Other' | string;
  dateOfBirth?: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other' | string;
  bloodGroup: string;
  knownAllergies: string[];
  allergies?: string[];
  chronicConditions: string[];
  emergencyContactPhone?: string;
  created_at: string;
}

const STORAGE_KEY = 'olmera_family_members';

export class FamilyService {
  private getStore(): FamilyMember[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Failed to parse family members store, using fallback', e);
    }

    return [
      {
        id: 'fam-001',
        primaryPatientId: 'demo-patient-uid',
        fullName: 'Lakshmi Rao',
        relationship: 'Parent',
        age: 62,
        gender: 'Female',
        bloodGroup: 'B+',
        knownAllergies: ['Sulfa drugs'],
        chronicConditions: ['Type 2 Diabetes', 'Hypertension'],
        emergencyContactPhone: '+91 94401 23456',
        created_at: new Date(Date.now() - 30 * 86400000).toISOString()
      },
      {
        id: 'fam-002',
        primaryPatientId: 'demo-patient-uid',
        fullName: 'Ananya Rao',
        relationship: 'Child',
        age: 8,
        gender: 'Female',
        bloodGroup: 'O+',
        knownAllergies: ['Peanuts'],
        chronicConditions: ['Mild Asthma'],
        emergencyContactPhone: '+91 94401 23456',
        created_at: new Date(Date.now() - 60 * 86400000).toISOString()
      }
    ];
  }

  private saveStore(members: FamilyMember[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
    } catch (e) {
      console.error('Failed to save family members', e);
    }
  }

  getFamilyMembers(primaryPatientId: string): FamilyMember[] {
    return this.getStore().filter(m => m.primaryPatientId === primaryPatientId);
  }

  addFamilyMember(
    primaryIdOrParams: string | Omit<FamilyMember, 'id' | 'created_at'>,
    maybeParams?: Partial<Omit<FamilyMember, 'id' | 'created_at'>>
  ): FamilyMember {
    const members = this.getStore();
    let finalParams: any;

    if (typeof primaryIdOrParams === 'string') {
      finalParams = {
        primaryPatientId: primaryIdOrParams,
        ...maybeParams
      };
    } else {
      finalParams = { ...primaryIdOrParams };
    }

    const allergies = finalParams.allergies || finalParams.knownAllergies || [];
    let age = finalParams.age;
    if (age === undefined && finalParams.dateOfBirth) {
      const birth = new Date(finalParams.dateOfBirth);
      const diff = Date.now() - birth.getTime();
      age = Math.max(0, Math.floor(diff / (365.25 * 86400000)));
    }

    const newMember: FamilyMember = {
      primaryPatientId: finalParams.primaryPatientId || 'unknown',
      fullName: finalParams.fullName || 'Family Member',
      relationship: finalParams.relationship || 'Other',
      dateOfBirth: finalParams.dateOfBirth,
      age: age ?? 30,
      gender: finalParams.gender || 'Other',
      bloodGroup: finalParams.bloodGroup || 'O+',
      knownAllergies: allergies,
      allergies: allergies,
      chronicConditions: finalParams.chronicConditions || [],
      emergencyContactPhone: finalParams.emergencyContactPhone,
      id: `fam-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString()
    };

    members.push(newMember);
    this.saveStore(members);
    return newMember;
  }

  updateFamilyMember(
    idOrPatientId: string, 
    memberIdOrUpdates: string | Partial<FamilyMember>, 
    maybeUpdates?: Partial<FamilyMember>
  ): FamilyMember | null {
    const members = this.getStore();
    let targetId = idOrPatientId;
    let updates: Partial<FamilyMember> = {};

    if (typeof memberIdOrUpdates === 'string') {
      targetId = memberIdOrUpdates;
      updates = maybeUpdates || {};
    } else if (typeof memberIdOrUpdates === 'object') {
      updates = memberIdOrUpdates;
    }

    const idx = members.findIndex(m => m.id === targetId);
    if (idx === -1) return null;

    if (updates.allergies && !updates.knownAllergies) {
      updates.knownAllergies = updates.allergies;
    }

    members[idx] = { ...members[idx], ...updates };
    this.saveStore(members);
    return members[idx];
  }

  removeFamilyMember(id: string, primaryPatientId: string): boolean {
    const members = this.getStore();
    const filtered = members.filter(m => !(m.id === id && m.primaryPatientId === primaryPatientId));
    if (filtered.length === members.length) return false;

    this.saveStore(filtered);
    return true;
  }
}

export const familyService = new FamilyService();
