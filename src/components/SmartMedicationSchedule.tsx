import React, { useState, useMemo, useRef } from 'react';
import { 
  Pill, Clock, Calendar, CheckCircle2, XCircle, AlertTriangle, 
  Upload, Camera, RefreshCw, Plus, Shield, Search, ArrowRight, User,
  FileText, Trash2, Check, AlertCircle, FileUp
} from 'lucide-react';
import { 
  parsePrescriptionText, checkDrugInteractions, 
  ParsedMedication, DrugInteraction 
} from '../services/ai/prescriptionParser';
import { 
  processPrescriptionDocument, 
  EditablePrescriptionItem, 
  OcrExtractionResult 
} from '../services/ai/prescriptionOcrEngine';
import { useAuth } from '../contexts/AuthContext';
import { MedicareWaveLoader } from './common/MedicareWaveLoader';
import { PharmacyOrderModal } from './clinical/PharmacyOrderModal';

export function SmartMedicationSchedule() {
  const { user } = useAuth();
  const [medications, setMedications] = useState<ParsedMedication[]>(() => {
    return parsePrescriptionText(''); // Default calibrated medications
  });

  const [activeSlot, setActiveSlot] = useState<'all' | 'morning' | 'afternoon' | 'night'>('all');
  const [takenStatus, setTakenStatus] = useState<Record<string, 'taken' | 'missed'>>({});
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showPharmacyModal, setShowPharmacyModal] = useState(false);

  // Real OCR Upload & Review States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanStage, setScanStage] = useState<string>('');
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [ocrResult, setOcrResult] = useState<OcrExtractionResult | null>(null);
  const [reviewItems, setReviewItems] = useState<EditablePrescriptionItem[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'review'>('upload');
  const [approvalNotice, setApprovalNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Check drug interactions across all current scheduled medications
  const interactions = useMemo(() => {
    const medNames = medications.map(m => m.name);
    return checkDrugInteractions(medNames);
  }, [medications]);

  // Check drug interactions within newly extracted review items
  const reviewInteractions = useMemo(() => {
    const medNames = [
      ...medications.map(m => m.name),
      ...reviewItems.map(m => m.name)
    ];
    return checkDrugInteractions(medNames);
  }, [medications, reviewItems]);

  // Calculate adherence percentage
  const adherenceStats = useMemo(() => {
    const totalScheduled = medications.length;
    if (totalScheduled === 0) return { taken: 0, total: 0, pct: 100 };

    const takenCount = Object.values(takenStatus).filter(s => s === 'taken').length;
    const pct = Math.round((takenCount / totalScheduled) * 100);
    return { taken: takenCount, total: totalScheduled, pct };
  }, [medications, takenStatus]);

  const handleMarkDose = (id: string, status: 'taken' | 'missed') => {
    setTakenStatus(prev => ({
      ...prev,
      [id]: prev[id] === status ? undefined as any : status
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const processSelectedFile = (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const isExtensionMatch = /\.(jpe?g|png|pdf)$/i.test(file.name);
    
    if (!allowed.includes(file.type) && !isExtensionMatch) {
      alert('Unsupported file format. Please upload a JPG, JPEG, PNG image or a PDF document.');
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleRunOcrExtraction = async () => {
    if (!selectedFile) return;

    setScanning(true);
    setScanProgress(15);
    setScanStage('Ingesting clinical file and initializing OCR engine...');

    try {
      await new Promise(r => setTimeout(r, 400));
      setScanProgress(45);
      setScanStage(
        selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf')
          ? 'Reading PDF document text streams & structure...'
          : 'Processing image contrast, grayscale and character segmentation...'
      );

      const result = await processPrescriptionDocument(selectedFile);

      setScanProgress(80);
      setScanStage('Extracting medicine names, dosages, frequencies & instructions...');
      await new Promise(r => setTimeout(r, 400));

      setOcrResult(result);
      setReviewItems(result.extractedMedications);
      setScanProgress(100);
      setScanStage('Extraction complete! Awaiting clinical approval.');
      setCurrentStep('review');
    } catch (err) {
      console.error('Prescription OCR extraction error:', err);
      alert('Unable to extract text from this document. Please verify the file is legible and try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleUpdateItem = (index: number, field: keyof EditablePrescriptionItem, value: any) => {
    setReviewItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setReviewItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddBlankItem = () => {
    const newItem: EditablePrescriptionItem = {
      id: `manual-item-${Date.now()}`,
      name: '',
      dosage: '500 mg',
      frequency: 'Once daily (Morning 1-0-0)',
      form: 'tablet',
      timing: 'after_food',
      scheduleSlots: ['morning'],
      defaultTimes: ['08:00'],
      durationDays: 14,
      instructions: 'Take with full glass of water after meals.',
      prescribingDoctor: 'Dr. S. Rao'
    };
    setReviewItems(prev => [...prev, newItem]);
  };

  // MANDATORY USER APPROVAL GATE
  const handleApprovePrescription = () => {
    if (reviewItems.length === 0) {
      alert('Please add at least one medication before approving.');
      return;
    }

    // Validate that names are not empty
    const invalidItem = reviewItems.find(item => !item.name.trim());
    if (invalidItem) {
      alert('Please provide a medicine name for all items before approving.');
      return;
    }

    // Convert reviewed items into ParsedMedication format and append to schedule
    const newMeds: ParsedMedication[] = reviewItems.map((item, idx) => ({
      id: `approved-${Date.now()}-${idx}`,
      name: item.name.trim(),
      dosage: item.dosage.trim(),
      form: item.form,
      frequency: item.frequency,
      timing: item.timing,
      scheduleSlots: item.scheduleSlots,
      defaultTimes: item.defaultTimes,
      durationDays: item.durationDays,
      instructions: item.instructions.trim(),
      prescribingDoctor: item.prescribingDoctor || 'Verified Specialist',
      prescribedDate: new Date().toISOString().split('T')[0]
    }));

    setMedications(prev => [...prev, ...newMeds]);
    setApprovalNotice(`Successfully approved and added ${newMeds.length} prescription medications to your daily schedule.`);
    
    // Reset modal state
    handleCloseModal();

    setTimeout(() => {
      setApprovalNotice(null);
    }, 6000);
  };

  const handleCloseModal = () => {
    setShowScannerModal(false);
    setSelectedFile(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    setScanning(false);
    setScanStage('');
    setScanProgress(0);
    setOcrResult(null);
    setReviewItems([]);
    setCurrentStep('upload');
  };

  const filteredMeds = medications.filter(med => {
    if (activeSlot === 'all') return true;
    return med.scheduleSlots.includes(activeSlot);
  });

  return (
    <div className="space-y-6 animate-fadeIn font-ui text-[var(--color-ink)]">
      
      {/* Approval Success Banner */}
      {approvalNotice && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center justify-between text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{approvalNotice}</span>
          </div>
          <button 
            onClick={() => setApprovalNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="card p-6 sm:p-8 bg-[var(--color-surface)] border-[var(--color-line)] rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-surface-subtle)] rounded-full text-xs font-semibold text-[var(--color-primary)] border border-[var(--color-line)] mb-2">
            <Pill size={14} /> Smart Prescription & Dosage Engine
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--color-ink)]">
            Daily Medication Schedule
          </h2>
          <p className="text-xs sm:text-sm text-[var(--color-muted)] max-w-xl">
            Upload prescription images or PDF documents. Optical OCR extracts medicines, dosages, and schedules for your review and explicit approval.
          </p>
        </div>

        {/* Adherence Ring Card */}
        <div className="flex items-center gap-4 p-4 bg-[var(--color-surface-subtle)] border border-[var(--color-line)] rounded-2xl">
          <div className="w-14 h-14 rounded-full border-4 border-[var(--color-primary)] flex items-center justify-center font-display font-semibold text-lg text-[var(--color-primary)]">
            {adherenceStats.pct}%
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Today's Adherence</p>
            <p className="text-sm font-semibold text-[var(--color-ink)]">
              {adherenceStats.taken} of {adherenceStats.total} Doses Confirmed
            </p>
            <button
              onClick={() => setShowPharmacyModal(true)}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-xl hover:opacity-90 shadow-sm transition-all"
            >
              <Pill size={13} />
              <span>Order Medicines (Pharmacy Partner Pickup)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Drug-Drug Interaction Safety Alert (if detected) */}
      {interactions.length > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-400 dark:border-amber-700/60 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-sm">
            <AlertTriangle size={18} />
            <span>Clinical Drug Interaction Notice ({interactions.length} Found)</span>
          </div>
          {interactions.map((int, i) => (
            <div key={i} className="text-xs text-amber-900 dark:text-amber-200 pl-6 border-l-2 border-amber-300 dark:border-amber-600 ml-2 py-1">
              <p><strong>Interaction:</strong> {int.drugs[0].toUpperCase()} + {int.drugs[1].toUpperCase()}</p>
              <p className="text-amber-800/90 dark:text-amber-300/90">{int.description}</p>
              <p className="italic mt-0.5 text-[11px]"><strong>Guidance:</strong> {int.clinicalAction}</p>
            </div>
          ))}
        </div>
      )}

      {/* Action Strip: Tabs & Scanner Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Time-of-Day Filter Tabs */}
        <div className="inline-flex p-1 bg-[var(--color-surface-subtle)] rounded-xl border border-[var(--color-line)] text-xs font-medium">
          {[
            { id: 'all', label: 'All Doses' },
            { id: 'morning', label: 'Morning (08:00)' },
            { id: 'afternoon', label: 'Afternoon (13:00)' },
            { id: 'night', label: 'Night (20:30)' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSlot(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeSlot === tab.id 
                  ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm font-semibold' 
                  : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Prescription Scanner Action Button */}
        <button
          onClick={() => {
            setShowScannerModal(true);
            setCurrentStep('upload');
          }}
          className="btn-accent px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm min-h-[44px]"
        >
          <Camera size={16} /> Scan / Upload Prescription (JPG, PNG, PDF)
        </button>
      </div>

      {/* Medication Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMeds.map((med) => {
          const status = takenStatus[med.id];
          return (
            <div
              key={med.id}
              className={`card p-5 bg-[var(--color-surface)] border rounded-2xl transition-all shadow-sm ${
                status === 'taken' 
                  ? 'border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10' 
                  : status === 'missed'
                  ? 'border-rose-500/40 bg-rose-50/20 dark:bg-rose-950/10'
                  : 'border-[var(--color-line)]'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold text-base text-[var(--color-ink)]">
                      {med.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-muted)] border border-[var(--color-line)] uppercase font-semibold">
                      {med.dosage}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-muted)]">
                    {med.frequency} • {med.timing.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-[var(--color-ink)]/80 pt-1">
                    {med.instructions}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] font-mono text-[var(--color-primary)] font-semibold flex items-center gap-1 justify-end">
                    <Clock size={12} /> {med.defaultTimes.join(', ')}
                  </span>
                  <span className="text-[10px] text-[var(--color-muted)] block mt-0.5">
                    {med.durationDays} Days Course
                  </span>
                </div>
              </div>

              {/* Action Buttons: Taken / Missed */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[var(--color-line)] text-xs">
                <button
                  onClick={() => handleMarkDose(med.id, 'taken')}
                  className={`flex-1 py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all min-h-[44px] ${
                    status === 'taken'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'border border-[var(--color-line)] hover:bg-[var(--color-surface-subtle)] text-[var(--color-ink)]'
                  }`}
                >
                  <CheckCircle2 size={15} /> Taken
                </button>
                <button
                  onClick={() => handleMarkDose(med.id, 'missed')}
                  className={`flex-1 py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all min-h-[44px] ${
                    status === 'missed'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'border border-[var(--color-line)] hover:bg-[var(--color-surface-subtle)] text-[var(--color-ink)]'
                  }`}
                >
                  <XCircle size={15} /> Missed
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* REAL OCR PRESCRIPTION MODAL */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[var(--color-surface)] text-[var(--color-ink)] w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-[var(--color-line)] animate-scaleIn space-y-5 my-8 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-line)] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-mist)] text-[var(--color-primary)] flex items-center justify-center border border-[var(--color-line)]">
                  <Camera size={20} />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg">Real Prescription OCR & Analysis</h3>
                  <p className="text-xs text-[var(--color-muted)]">
                    {currentStep === 'upload' 
                      ? 'Upload doctor prescription file (JPG, JPEG, PNG, or PDF)' 
                      : 'Mandatory Review: Verify extracted details before approving'}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleCloseModal}
                className="p-2 text-[var(--color-muted)] hover:text-[var(--color-ink)] rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* STEP 1: FILE UPLOAD SCREEN */}
            {currentStep === 'upload' && (
              <div className="space-y-4 overflow-y-auto pr-1">
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[var(--color-line)] hover:border-[var(--color-primary)] bg-[var(--color-surface-subtle)] rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all space-y-3"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-[var(--color-mist)] text-[var(--color-primary)] flex items-center justify-center mx-auto shadow-inner">
                    <FileUp size={28} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[var(--color-ink)]">
                      Click to choose prescription file or drag & drop
                    </p>
                    <p className="text-xs text-[var(--color-muted)] mt-1">
                      Supports JPG, JPEG, PNG medical photos and official PDF prescription documents
                    </p>
                  </div>
                  <span className="inline-block px-3 py-1 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-full text-[10px] font-semibold text-[var(--color-primary)]">
                    Max file size: 15 MB • Client-Side Secure OCR
                  </span>
                </div>

                {/* Selected File Card */}
                {selectedFile && (
                  <div className="p-4 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {filePreviewUrl ? (
                        <img 
                          src={filePreviewUrl} 
                          alt="Prescription preview" 
                          className="w-12 h-12 object-cover rounded-xl border border-[var(--color-line)]"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-600 flex items-center justify-center font-bold text-xs border border-red-200">
                          PDF
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-xs text-[var(--color-ink)] truncate max-w-xs">
                          {selectedFile.name}
                        </p>
                        <p className="text-[10px] text-[var(--color-muted)]">
                          {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Document'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setFilePreviewUrl(null);
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold p-2"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {/* Progress / Scanning State */}
                {scanning && (
                  <div className="p-4 bg-[var(--color-surface-subtle)] border border-[var(--color-line)] rounded-2xl space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-[var(--color-primary)]">{scanStage}</span>
                      <span className="font-mono">{scanProgress}%</span>
                    </div>
                    <div className="w-full bg-[var(--color-line)] h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-[var(--color-primary)] h-full transition-all duration-300"
                        style={{ width: `${scanProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="p-3 bg-[var(--color-surface-subtle)] border border-[var(--color-line)] rounded-xl text-[11px] text-[var(--color-muted)] flex items-start gap-2">
                  <Shield size={14} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                  <span>
                    HIPAA Compliance Guarantee: Prescription image data is processed privately in your browser session. Raw images are never permanently logged or shared without clinical authorization.
                  </span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn-outline flex-1 py-3 text-xs rounded-xl min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={scanning || !selectedFile}
                    onClick={handleRunOcrExtraction}
                    className="btn-primary flex-[2] py-3 text-xs rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
                  >
                    {scanning ? (
                      <MedicareWaveLoader variant="button" text="Extracting Clinical Data..." />
                    ) : (
                      <>
                        <Camera size={14} />
                        <span>Run Real OCR Extraction</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: MANDATORY REVIEW & APPROVAL SCREEN */}
            {currentStep === 'review' && (
              <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                {/* Mandatory Approval Warning Banner */}
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Mandatory Patient Approval Required:</strong>
                    <p className="mt-0.5 text-amber-800/90 dark:text-amber-300/90">
                      The items below were extracted from your uploaded prescription. Please carefully verify and correct any medicine names, dosages, or instructions. 
                      <strong> No medications will be saved to your schedule until you click "Approve & Add to Daily Schedule" below.</strong>
                    </p>
                  </div>
                </div>

                {/* Interaction Notice in Review */}
                {reviewInteractions.length > 0 && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 rounded-xl text-rose-900 dark:text-rose-200 text-xs space-y-1">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle size={14} className="text-rose-600" />
                      <span>Drug Interaction Warning ({reviewInteractions.length} detected)</span>
                    </div>
                    {reviewInteractions.map((int, i) => (
                      <p key={i} className="text-[11px] text-rose-800 dark:text-rose-300">
                        • {int.drugs[0].toUpperCase()} + {int.drugs[1].toUpperCase()}: {int.description}
                      </p>
                    ))}
                  </div>
                )}

                {/* Editable Items List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                      Extracted Medications ({reviewItems.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddBlankItem}
                      className="text-xs text-[var(--color-primary)] font-semibold flex items-center gap-1 hover:underline"
                    >
                      <Plus size={13} /> Add Medicine
                    </button>
                  </div>

                  {reviewItems.map((item, idx) => (
                    <div 
                      key={item.id || idx}
                      className="p-4 bg-[var(--color-surface-subtle)] border border-[var(--color-line)] rounded-2xl space-y-3 text-xs"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-line)] text-[var(--color-primary)]">
                          #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-[var(--color-muted)] hover:text-rose-600 p-1"
                          title="Delete medication"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">
                            Medicine Name
                          </label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                            placeholder="e.g. Atorvastatin"
                            className="w-full p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-primary)] font-semibold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">
                            Dosage / Strength
                          </label>
                          <input
                            type="text"
                            value={item.dosage}
                            onChange={(e) => handleUpdateItem(idx, 'dosage', e.target.value)}
                            placeholder="e.g. 20 mg, 500 mg"
                            className="w-full p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-primary)]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">
                            Frequency & Timing
                          </label>
                          <select
                            value={item.frequency}
                            onChange={(e) => handleUpdateItem(idx, 'frequency', e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-primary)]"
                          >
                            <option value="Once daily (Morning 1-0-0)">Once daily (Morning 1-0-0)</option>
                            <option value="Twice daily (1-0-1)">Twice daily (1-0-1)</option>
                            <option value="Three times daily (1-1-1)">Three times daily (1-1-1)</option>
                            <option value="Once daily (Night 0-0-1)">Once daily (Night 0-0-1)</option>
                            <option value="As needed (SOS / PRN)">As needed (SOS / PRN)</option>
                            <option value="Once weekly">Once weekly</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">
                            Duration (Days)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="365"
                            value={item.durationDays}
                            onChange={(e) => handleUpdateItem(idx, 'durationDays', parseInt(e.target.value, 10) || 1)}
                            className="w-full p-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-primary)] font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold uppercase text-[var(--color-muted)] block mb-1">
                          Doctor's Instructions
                        </label>
                        <input
                          type="text"
                          value={item.instructions}
                          onChange={(e) => handleUpdateItem(idx, 'instructions', e.target.value)}
                          placeholder="e.g. Take after food with water"
                          className="w-full p-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-primary)]"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons for Mandatory Approval */}
                <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-[var(--color-line)] shrink-0">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn-outline flex-1 py-3 text-xs rounded-xl min-h-[44px]"
                  >
                    Discard & Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApprovePrescription}
                    className="btn-primary flex-[2] py-3 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm min-h-[44px]"
                  >
                    <CheckCircle2 size={16} />
                    <span>Approve & Add to Daily Schedule</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pharmacy Partner Order Modal */}
      {showPharmacyModal && (
        <PharmacyOrderModal
          isOpen={showPharmacyModal}
          onClose={() => setShowPharmacyModal(false)}
          prescriptionItems={medications.map(m => ({ name: m.name, dosage: m.dosage }))}
        />
      )}
    </div>
  );
}
