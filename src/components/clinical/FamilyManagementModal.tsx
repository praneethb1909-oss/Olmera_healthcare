import React, { useState, useEffect } from 'react';
import { 
  Users, X, Plus, User, Heart, Shield, Calendar, Phone, 
  Trash2, Edit3, CheckCircle2 
} from 'lucide-react';
import { familyService, FamilyMember } from '../../services/clinical/familyService';
import { useAuth } from '../../contexts/AuthContext';

interface FamilyManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMemberForBooking?: (member: FamilyMember) => void;
}

export function FamilyManagementModal({ isOpen, onClose, onSelectMemberForBooking }: FamilyManagementModalProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    relationship: 'Child' as FamilyMember['relationship'],
    age: 10,
    gender: 'Female' as FamilyMember['gender'],
    bloodGroup: 'O+',
    allergies: '',
    conditions: '',
    emergencyContactPhone: ''
  });

  useEffect(() => {
    if (user && isOpen) {
      setMembers(familyService.getFamilyMembers(user.uid));
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    familyService.addFamilyMember({
      primaryPatientId: user.uid,
      fullName: formData.fullName,
      relationship: formData.relationship,
      age: Number(formData.age),
      gender: formData.gender,
      bloodGroup: formData.bloodGroup,
      knownAllergies: formData.allergies ? formData.allergies.split(',').map(s => s.trim()) : [],
      chronicConditions: formData.conditions ? formData.conditions.split(',').map(s => s.trim()) : [],
      emergencyContactPhone: formData.emergencyContactPhone || undefined
    });

    setMembers(familyService.getFamilyMembers(user.uid));
    setShowAddForm(false);
    setFormData({
      fullName: '',
      relationship: 'Child',
      age: 10,
      gender: 'Female',
      bloodGroup: 'O+',
      allergies: '',
      conditions: '',
      emergencyContactPhone: ''
    });
  };

  const handleRemove = (memberId: string) => {
    if (!user) return;
    if (confirm('Remove this family member profile?')) {
      familyService.removeFamilyMember(memberId, user.uid);
      setMembers(familyService.getFamilyMembers(user.uid));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 font-ui">
      <div className="bg-[var(--color-surface)] text-[var(--color-ink)] w-full max-w-2xl rounded-3xl shadow-2xl border border-[var(--color-line)] max-h-[90vh] overflow-hidden flex flex-col animate-scaleIn">
        
        {/* Header */}
        <div className="p-6 bg-[var(--color-primary)] text-white flex items-center justify-between border-b border-black/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Users size={20} className="text-[var(--color-mist)]" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-white">
                Family Health & Dependent Profiles
              </h3>
              <p className="text-xs text-[var(--color-mist)] mt-0.5">
                Manage household medical records and schedule consultations for family members
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            aria-label="Close Modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {!showAddForm ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  Registered Family Members ({members.length})
                </span>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-all shadow-sm"
                >
                  <Plus size={14} />
                  <span>Add Family Member</span>
                </button>
              </div>

              {members.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-[var(--color-line)] rounded-2xl">
                  <Users size={32} className="mx-auto text-[var(--color-muted)] mb-2" />
                  <p className="text-sm font-semibold text-[var(--color-ink)]">No family profiles added yet</p>
                  <p className="text-xs text-[var(--color-muted)] mt-1">
                    Add children, parents, or spouse to manage their prescriptions and book doctor visits.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {members.map(m => (
                    <div 
                      key={m.id} 
                      className="p-4 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl shadow-sm space-y-3 relative group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-display font-semibold text-sm text-[var(--color-ink)]">
                              {m.fullName}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-[var(--color-surface-subtle)] border border-[var(--color-line)] text-[10px] font-bold text-[var(--color-primary)]">
                              {m.relationship}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--color-muted)] mt-0.5">
                            {m.age} Yrs • {m.gender} • Blood Group: <strong className="text-[var(--color-ink)]">{m.bloodGroup}</strong>
                          </p>
                        </div>

                        <button
                          onClick={() => handleRemove(m.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove profile"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {m.chronicConditions.length > 0 && (
                        <div className="text-[11px] text-[var(--color-muted)]">
                          <span className="font-semibold text-[var(--color-ink)]">Conditions:</span> {m.chronicConditions.join(', ')}
                        </div>
                      )}

                      {m.knownAllergies.length > 0 && (
                        <div className="text-[11px] text-rose-700 dark:text-rose-400">
                          <span className="font-semibold">Allergies:</span> {m.knownAllergies.join(', ')}
                        </div>
                      )}

                      <div className="pt-2 border-t border-[var(--color-line)] flex items-center justify-between">
                        <span className="text-[10px] text-[var(--color-muted)]">
                          ID: {m.id}
                        </span>
                        {onSelectMemberForBooking && (
                          <button
                            onClick={() => {
                              onSelectMemberForBooking(m);
                              onClose();
                            }}
                            className="px-2.5 py-1 bg-[var(--color-surface-subtle)] hover:bg-[var(--color-primary)] hover:text-white rounded-lg text-xs font-semibold text-[var(--color-ink)] transition-colors"
                          >
                            Book For {m.relationship}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleAddMember} className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-line)]">
                <h4 className="font-display font-semibold text-sm">Add New Household Member</h4>
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)} 
                  className="text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="input-field w-full text-xs font-semibold"
                    placeholder="e.g. Ramesh Rao"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                    Relationship
                  </label>
                  <select
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value as any })}
                    className="input-field w-full text-xs font-semibold"
                  >
                    <option value="Child">Child</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Grandparent">Grandparent</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                    Age
                  </label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                    className="input-field w-full text-xs font-semibold"
                    min={0}
                    max={120}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="input-field w-full text-xs font-semibold"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                    Blood Group
                  </label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="input-field w-full text-xs font-semibold"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                    Emergency Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                    className="input-field w-full text-xs font-semibold"
                    placeholder="+91 94400 00000"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  Chronic Health Conditions (Comma separated)
                </label>
                <input
                  type="text"
                  value={formData.conditions}
                  onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                  className="input-field w-full text-xs font-semibold"
                  placeholder="e.g. Hypertension, Thyroid, Asthma"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  Known Drug or Food Allergies (Comma separated)
                </label>
                <input
                  type="text"
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  className="input-field w-full text-xs font-semibold"
                  placeholder="e.g. Penicillin, Peanuts"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-[var(--color-line)] rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-xl hover:opacity-90 shadow-sm"
                >
                  Save Family Member Profile
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[var(--color-surface-subtle)] border-t border-[var(--color-line)] flex items-center justify-between text-xs text-[var(--color-muted)]">
          <span>Unified Household Care Continuity</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-line)] text-[var(--color-ink)] rounded-xl font-semibold hover:bg-[var(--color-surface-subtle)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
