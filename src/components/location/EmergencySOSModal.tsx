import React, { useState, useEffect } from 'react';
import { 
  X, AlertTriangle, Navigation, Phone, ShieldCheck, MapPin, 
  Clock, Share2, Compass, CheckCircle2, History, Trash2, HeartPulse, Bed
} from 'lucide-react';
import { locationService } from '../../services/location/locationService';
import { emergencyLocationService } from '../../services/location/emergencyLocationService';
import { facilitiesService } from '../../services/location/facilitiesService';
import { UserLocation, EmergencyLiveSession, EmergencyLocationLog } from '../../services/location/types';
import { OlmeraInteractiveMap } from './OlmeraInteractiveMap';

interface EmergencySOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  onAmbulanceDispatched?: (locationLabel: string) => void;
}

export function EmergencySOSModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  onAmbulanceDispatched
}: EmergencySOSModalProps) {
  const [currentLocation, setCurrentLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [activeSession, setActiveSession] = useState<EmergencyLiveSession | null>(null);
  const [emergencyNotes, setEmergencyNotes] = useState('');
  const [severity, setSeverity] = useState<'critical' | 'urgent' | 'standard'>('critical');
  const [emergencyLogs, setEmergencyLogs] = useState<EmergencyLocationLog[]>([]);
  const [activeTab, setActiveTab] = useState<'dispatch' | 'live_sharing' | 'audit_history'>('dispatch');
  const [dispatchSuccess, setDispatchSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLocation();
      const existing = emergencyLocationService.getActiveSessionForPatient(patientId);
      setActiveSession(existing);
      setEmergencyLogs(emergencyLocationService.getEmergencyLogs(patientId));
    }
  }, [isOpen, patientId]);

  const fetchLocation = async () => {
    setIsLocating(true);
    try {
      const loc = await locationService.getCurrentLocation({ timeoutMs: 7000 });
      setCurrentLocation(loc);
    } catch {
      const fallback = locationService.getDefaultLocation('GPS unavailable; using Rajam Hub.');
      setCurrentLocation(fallback);
    } finally {
      setIsLocating(false);
    }
  };

  if (!isOpen) return null;

  const nearestHospital = currentLocation 
    ? facilitiesService.getClosestEmergencyHospital(currentLocation.coords)
    : null;

  const handleStartEmergencyDispatch = () => {
    if (!currentLocation) return;

    let finalLocation = currentLocation;
    if (manualAddress.trim()) {
      finalLocation = {
        ...currentLocation,
        source: 'manual',
        addressLabel: manualAddress.trim()
      };
    }

    const session = emergencyLocationService.startEmergencySession({
      patientId,
      patientName,
      location: finalLocation,
      severity,
      notes: emergencyNotes,
      consentDurationMinutes: 60
    });

    setActiveSession(session);
    setDispatchSuccess(true);
    setEmergencyLogs(emergencyLocationService.getEmergencyLogs(patientId));

    if (onAmbulanceDispatched) {
      onAmbulanceDispatched(finalLocation.addressLabel || 'Current Coordinates');
    }
  };

  const handleStopSharing = () => {
    if (activeSession) {
      emergencyLocationService.stopEmergencySession(activeSession.sessionId, 'resolved');
      setActiveSession(null);
      setEmergencyLogs(emergencyLocationService.getEmergencyLogs(patientId));
    }
  };

  const handleClearLogs = () => {
    emergencyLocationService.clearEmergencyLogs(patientId);
    setEmergencyLogs([]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn font-ui">
      <div className="card w-full max-w-2xl bg-white dark:bg-[#0A2220] border-rose-200 dark:border-rose-900/60 shadow-2xl rounded-2xl overflow-hidden my-6">
        
        {/* Top Emergency Red Header */}
        <div className="bg-rose-600 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/20">
              <HeartPulse size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest bg-black/20 px-2 py-0.5 rounded-full">
                  Emergency Protocol 108
                </span>
                {activeSession && (
                  <span className="text-[10px] font-bold bg-white text-rose-600 px-2 py-0.5 rounded-full animate-pulse">
                    Live GPS Sharing Active
                  </span>
                )}
              </div>
              <h2 className="font-display font-semibold text-lg sm:text-xl text-white">
                Emergency Trauma Triage & Live GPS Dispatch
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close emergency modal"
            className="p-2 rounded-xl hover:bg-white/20 text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-xs">
          <button
            onClick={() => setActiveTab('dispatch')}
            className={`flex-1 py-3 font-semibold text-center transition-colors border-b-2 ${
              activeTab === 'dispatch'
                ? 'border-rose-600 text-rose-600 bg-white dark:bg-[#0A2220]'
                : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            Dispatch & Location
          </button>
          <button
            onClick={() => setActiveTab('live_sharing')}
            className={`flex-1 py-3 font-semibold text-center transition-colors border-b-2 ${
              activeTab === 'live_sharing'
                ? 'border-rose-600 text-rose-600 bg-white dark:bg-[#0A2220]'
                : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            Live Tracking Session ({activeSession ? '1 Active' : '0'})
          </button>
          <button
            onClick={() => setActiveTab('audit_history')}
            className={`flex-1 py-3 font-semibold text-center transition-colors border-b-2 ${
              activeTab === 'audit_history'
                ? 'border-rose-600 text-rose-600 bg-white dark:bg-[#0A2220]'
                : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            Access History & Privacy
          </button>
        </div>

        {/* TAB 1: DISPATCH & LOCATION */}
        {activeTab === 'dispatch' && (
          <div className="p-5 sm:p-6 space-y-5 text-xs">
            {dispatchSuccess && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 flex items-start gap-3">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Emergency Dispatch Request Transmitted!</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                    Emergency ambulance crew and nearest hospital ({activeSession?.assignedHospitalName || 'Olmera Trauma Center'}) have received your live GPS coordinates.
                  </p>
                </div>
              </div>
            )}

            {/* GPS Telemetry Accuracy Card */}
            <div className="card p-4 bg-[var(--color-surface-subtle)] border-[var(--color-line)] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation size={16} className="text-rose-600 animate-spin" />
                  <span className="font-semibold text-[var(--color-ink)]">Current GPS Telemetry</span>
                </div>
                <button
                  onClick={fetchLocation}
                  disabled={isLocating}
                  className="btn-outline px-2.5 py-1 text-[11px] rounded-lg"
                >
                  {isLocating ? 'Locating...' : 'Refresh GPS'}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <div>
                  <span className="text-[var(--color-muted)] block text-[10px] uppercase font-bold">Coordinates</span>
                  <p className="font-mono font-medium text-[var(--color-ink)]">
                    {currentLocation?.coords.latitude.toFixed(5)}, {currentLocation?.coords.longitude.toFixed(5)}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--color-muted)] block text-[10px] uppercase font-bold">Accuracy</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    ±{currentLocation?.coords.accuracy || 15} meters ({currentLocation?.accuracyDescription || 'high'})
                  </span>
                </div>
                <div>
                  <span className="text-[var(--color-muted)] block text-[10px] uppercase font-bold">Source</span>
                  <span className="capitalize font-semibold text-[var(--color-ink)]">
                    {currentLocation?.source || 'Device GPS'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-[var(--color-muted)] border-t border-[var(--color-line)] pt-2">
                📍 {currentLocation?.addressLabel || 'Locating regional network...'}
              </p>
            </div>

            {/* Manual Address Fallback Option */}
            <div>
              <label className="font-medium text-[var(--color-ink)] block mb-1">
                Landmark or Manual Location (Optional Fallback):
              </label>
              <input
                type="text"
                placeholder="e.g. Near GMRIT College Main Gate, Rajam / Floor 2, House 4-12..."
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                className="w-full p-2.5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl text-xs focus:outline-none focus:border-rose-600"
              />
            </div>

            {/* Nearest Trauma Facility Preview */}
            {nearestHospital && (
              <div className="card p-4 border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400">
                    Nearest Emergency Trauma Facility
                  </span>
                  <h4 className="font-display font-semibold text-sm text-[var(--color-ink)]">
                    {nearestHospital.name}
                  </h4>
                  <p className="text-[11px] text-[var(--color-muted)]">
                    {nearestHospital.distanceKm} km away • Est. Ambulance Transit: {nearestHospital.durationMinutes} mins
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                    24/7 ICU Online
                  </span>
                </div>
              </div>
            )}

            {/* Severity & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(['critical', 'urgent', 'standard'] as const).map(sev => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverity(sev)}
                  className={`p-2.5 rounded-xl border text-center transition-colors ${
                    severity === sev
                      ? 'bg-rose-600 text-white border-rose-600 font-bold shadow-sm'
                      : 'border-[var(--color-line)] text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)]'
                  }`}
                >
                  <span className="capitalize block">{sev} Condition</span>
                </button>
              ))}
            </div>

            {/* Explicit Consent Notice */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-[var(--color-line)] text-[11px] text-[var(--color-muted)] space-y-1">
              <p className="font-medium text-[var(--color-ink)] flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600" />
                Explicit Emergency Consent & Privacy Policy
              </p>
              <p>
                By initiating dispatch, you explicitly consent to sharing your real-time GPS location with accredited 108 trauma teams and Olmera hospital coordinators. The session expires automatically after 60 minutes.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-outline flex-1 py-3 text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartEmergencyDispatch}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold flex-[2] py-3 text-xs rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                <Phone size={15} />
                <span>Confirm 108 Emergency Dispatch</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE SHARING SESSION */}
        {activeTab === 'live_sharing' && (
          <div className="p-5 sm:p-6 space-y-5 text-xs">
            {activeSession ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      Active Emergency Session
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono text-[10px] animate-pulse">
                      Live
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-base text-emerald-900 dark:text-emerald-100">
                    Broadcasting to: {activeSession.assignedHospitalName}
                  </h3>
                  <p className="text-xs text-emerald-800 dark:text-emerald-200">
                    Session ID: <code className="font-mono">{activeSession.sessionId}</code>
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Auto-expires at: {new Date(activeSession.expiresAt).toLocaleTimeString()}
                  </p>
                </div>

                {/* Mini Live Map View */}
                <div className="rounded-xl overflow-hidden border border-[var(--color-line)]">
                  <OlmeraInteractiveMap
                    center={{ latitude: activeSession.currentLocation.coords.latitude, longitude: activeSession.currentLocation.coords.longitude }}
                    userCoords={activeSession.currentLocation.coords}
                    height="240px"
                    showFacilityTypesFilter={false}
                  />
                </div>

                {/* Breadcrumb Count */}
                <div className="flex items-center justify-between text-xs text-[var(--color-muted)] p-2 bg-[var(--color-surface-subtle)] rounded-xl border border-[var(--color-line)]">
                  <span>GPS Telemetry Breadcrumbs Recorded:</span>
                  <span className="font-bold font-mono text-[var(--color-ink)]">
                    {activeSession.locationBreadcrumbs.length} updates
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleStopSharing}
                  className="btn-outline w-full py-2.5 text-xs text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl font-semibold"
                >
                  Terminate Emergency Live Sharing Session
                </button>
              </div>
            ) : (
              <div className="p-8 text-center bg-[var(--color-surface-subtle)] rounded-xl border border-[var(--color-line)]">
                <Share2 size={32} className="mx-auto text-[var(--color-muted)] mb-2" />
                <p className="font-semibold text-sm text-[var(--color-ink)]">No Active Emergency Session</p>
                <p className="text-xs text-[var(--color-muted)] mt-1">
                  You are not currently broadcasting live GPS location to any hospital or ambulance team.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AUDIT HISTORY & PRIVACY */}
        {activeTab === 'audit_history' && (
          <div className="p-5 sm:p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-[var(--color-ink)]">Emergency Location Access Logs</h3>
                <p className="text-[11px] text-[var(--color-muted)]">
                  Audited record of all emergency location disclosures per health privacy laws.
                </p>
              </div>
              {emergencyLogs.length > 0 && (
                <button
                  onClick={handleClearLogs}
                  className="btn-outline px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  <span>Purge Logs</span>
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {emergencyLogs.length === 0 ? (
                <p className="text-xs text-[var(--color-muted)] text-center py-6">
                  No emergency location disclosure logs recorded.
                </p>
              ) : (
                emergencyLogs.map(log => (
                  <div key={log.id} className="p-3 bg-[var(--color-surface-subtle)] rounded-xl border border-[var(--color-line)] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold capitalize text-[var(--color-ink)]">
                        {log.action.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-[var(--color-muted)]">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--color-muted)]">
                      Recipient: <span className="font-medium text-[var(--color-ink)] capitalize">{log.recipientRole.replace('_', ' ')}</span>
                      {' '}• GPS Accuracy: ±{log.accuracyMeters}m
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
