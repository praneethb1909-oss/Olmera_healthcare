import React, { useState, useEffect } from 'react';
import { 
  X, MapPin, Home, Briefcase, Building2, Pill, Plus, Trash2, 
  ShieldCheck, Check, Crosshair, Navigation, AlertCircle
} from 'lucide-react';
import { locationService } from '../../services/location/locationService';
import { SavedLocation, SavedLocationType, LocationPrivacySettings } from '../../services/location/types';

interface PatientLocationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function PatientLocationPreferencesModal({
  isOpen,
  onClose,
  userId
}: PatientLocationPreferencesModalProps) {
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [privacySettings, setPrivacySettings] = useState<LocationPrivacySettings>(locationService.getPrivacySettings());
  const [activeTab, setActiveTab] = useState<'saved_locations' | 'privacy'>('saved_locations');

  // Form for adding new location
  const [showAddForm, setShowAddForm] = useState(false);
  const [newType, setNewType] = useState<SavedLocationType>('home');
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newLat, setNewLat] = useState('18.4500');
  const [newLng, setNewLng] = useState('83.6550');
  const [isAcquiringCurrentGps, setIsAcquiringCurrentGps] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSaved();
      setPrivacySettings(locationService.getPrivacySettings());
    }
  }, [isOpen, userId]);

  const loadSaved = () => {
    const list = locationService.getSavedLocations(userId);
    setSavedLocations(list);
  };

  const handleUseCurrentGps = async () => {
    setIsAcquiringCurrentGps(true);
    try {
      const loc = await locationService.getCurrentLocation();
      setNewLat(loc.coords.latitude.toFixed(5));
      setNewLng(loc.coords.longitude.toFixed(5));
      if (!newAddress && loc.addressLabel) {
        setNewAddress(loc.addressLabel);
      }
    } catch {
      setStatusMessage('Unable to acquire live GPS. Please enter coordinates manually.');
    } finally {
      setIsAcquiringCurrentGps(false);
    }
  };

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel || !newAddress) return;

    locationService.saveLocation(userId, {
      userId,
      type: newType,
      label: newLabel,
      address: newAddress,
      coords: {
        latitude: parseFloat(newLat) || 18.4500,
        longitude: parseFloat(newLng) || 83.6550,
        timestamp: Date.now()
      }
    });

    loadSaved();
    setShowAddForm(false);
    setNewLabel('');
    setNewAddress('');
    setStatusMessage('Location saved successfully.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleDelete = (id: string) => {
    locationService.deleteSavedLocation(userId, id);
    loadSaved();
  };

  const handleUpdatePrivacy = (key: keyof LocationPrivacySettings, value: any) => {
    const updated = locationService.updatePrivacySettings({ [key]: value });
    setPrivacySettings(updated);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all cached GPS records and saved locations? This cannot be undone.')) {
      locationService.clearAllLocationData(userId);
      loadSaved();
      setStatusMessage('All personal location data purged.');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  if (!isOpen) return null;

  const getLocationIcon = (type: SavedLocationType) => {
    switch (type) {
      case 'home': return <Home size={16} className="text-emerald-600" />;
      case 'work': return <Briefcase size={16} className="text-blue-600" />;
      case 'preferred_hospital': return <Building2 size={16} className="text-[#0E4F4A]" />;
      case 'preferred_pharmacy': return <Pill size={16} className="text-coral-500 text-[#FF7A59]" />;
      default: return <MapPin size={16} className="text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn font-ui">
      <div className="card w-full max-w-xl bg-white dark:bg-[#0A2220] border-[var(--color-line)] shadow-2xl rounded-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--color-line)] flex items-center justify-between bg-[var(--color-surface-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <MapPin size={20} />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg text-[var(--color-ink)]">
                Location Preferences & Privacy
              </h2>
              <p className="text-xs text-[var(--color-muted)]">
                Manage home, work, preferred healthcare hubs, and data retention rules.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close preferences modal"
            className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-xs">
          <button
            onClick={() => setActiveTab('saved_locations')}
            className={`flex-1 py-3 font-semibold text-center transition-colors border-b-2 ${
              activeTab === 'saved_locations'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-white dark:bg-[#0A2220]'
                : 'border-transparent text-[var(--color-muted)]'
            }`}
          >
            Saved Healthcare Locations ({savedLocations.length})
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-3 font-semibold text-center transition-colors border-b-2 ${
              activeTab === 'privacy'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-white dark:bg-[#0A2220]'
                : 'border-transparent text-[var(--color-muted)]'
            }`}
          >
            Privacy & Retention Controls
          </button>
        </div>

        {statusMessage && (
          <div className="mx-5 mt-4 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
            <Check size={14} className="shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* TAB 1: SAVED LOCATIONS */}
        {activeTab === 'saved_locations' && (
          <div className="p-5 sm:p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-muted)] font-medium">Quick-access addresses for ambulance & emergency dispatch</span>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="btn-primary py-1.5 px-3 rounded-lg flex items-center gap-1 text-xs"
              >
                <Plus size={13} />
                <span>Add Location</span>
              </button>
            </div>

            {/* Add New Form */}
            {showAddForm && (
              <form onSubmit={handleSaveLocation} className="p-4 bg-[var(--color-surface-subtle)] border border-[var(--color-line)] rounded-xl space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-[var(--color-ink)]">Save New Location</h4>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['home', 'work', 'preferred_hospital', 'preferred_pharmacy'] as SavedLocationType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewType(t)}
                      className={`p-2 rounded-lg border text-center capitalize transition-colors ${
                        newType === t 
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold' 
                          : 'border-[var(--color-line)] text-[var(--color-muted)]'
                      }`}
                    >
                      {t.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[var(--color-muted)] block mb-1">Location Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Home (Rajam) or Parents Residence"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    required
                    className="w-full p-2 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[var(--color-muted)] block mb-1">Full Postal Address / Landmark</label>
                  <input
                    type="text"
                    placeholder="e.g. Near Old Bus Stand, Rajam, AP 532127"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    required
                    className="w-full p-2 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg text-xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[11px] font-medium text-[var(--color-muted)] block mb-1">Latitude</label>
                    <input
                      type="text"
                      value={newLat}
                      onChange={(e) => setNewLat(e.target.value)}
                      className="w-full p-2 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-medium text-[var(--color-muted)] block mb-1">Longitude</label>
                    <input
                      type="text"
                      value={newLng}
                      onChange={(e) => setNewLng(e.target.value)}
                      className="w-full p-2 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div className="pt-5">
                    <button
                      type="button"
                      onClick={handleUseCurrentGps}
                      disabled={isAcquiringCurrentGps}
                      className="btn-outline p-2 rounded-lg text-xs flex items-center gap-1"
                      title="Fetch current GPS"
                    >
                      <Navigation size={13} className={isAcquiringCurrentGps ? 'animate-spin' : ''} />
                      <span>GPS</span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full py-2.5 rounded-xl font-semibold text-xs mt-2"
                >
                  Save Healthcare Location
                </button>
              </form>
            )}

            {/* List of saved locations */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {savedLocations.length === 0 ? (
                <p className="text-center py-6 text-[var(--color-muted)]">No saved locations yet.</p>
              ) : (
                savedLocations.map(loc => (
                  <div 
                    key={loc.id} 
                    className="p-3 bg-[var(--color-surface-subtle)] border border-[var(--color-line)] rounded-xl flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-line)] mt-0.5">
                        {getLocationIcon(loc.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-[var(--color-ink)]">{loc.label}</h4>
                          {loc.isDefault && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--color-muted)] mt-0.5">{loc.address}</p>
                        <p className="text-[10px] text-[var(--color-muted)] font-mono mt-1">
                          GPS: {loc.coords.latitude.toFixed(4)}, {loc.coords.longitude.toFixed(4)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(loc.id)}
                      className="p-1.5 text-[var(--color-muted)] hover:text-rose-600 transition-colors"
                      title="Delete saved location"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PRIVACY & DATA RETENTION */}
        {activeTab === 'privacy' && (
          <div className="p-5 sm:p-6 space-y-4 text-xs">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
              <ShieldCheck size={18} className="shrink-0 text-emerald-600" />
              <p className="text-xs">
                Olmera never continuously tracks your location in the background without active consent. All telemetry is encrypted and partitioned per patient.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center justify-between p-3 bg-[var(--color-surface-subtle)] rounded-xl border border-[var(--color-line)] cursor-pointer">
                <div>
                  <span className="font-semibold text-[var(--color-ink)] block">Device GPS Telemetry</span>
                  <span className="text-[11px] text-[var(--color-muted)]">Allow Olmera to query browser GPS for hospital discovery and distance estimation.</span>
                </div>
                <input
                  type="checkbox"
                  checked={privacySettings.allowGpsTracking}
                  onChange={(e) => handleUpdatePrivacy('allowGpsTracking', e.target.checked)}
                  className="rounded text-[var(--color-primary)] w-4 h-4 ml-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-[var(--color-surface-subtle)] rounded-xl border border-[var(--color-line)] cursor-pointer">
                <div>
                  <span className="font-semibold text-[var(--color-ink)] block">Campus Arrival Geofencing</span>
                  <span className="text-[11px] text-[var(--color-muted)]">Automatically prompt arrival check-in when you enter a configured hospital boundary.</span>
                </div>
                <input
                  type="checkbox"
                  checked={privacySettings.allowArrivalGeofencing}
                  onChange={(e) => handleUpdatePrivacy('allowArrivalGeofencing', e.target.checked)}
                  className="rounded text-[var(--color-primary)] w-4 h-4 ml-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-[var(--color-surface-subtle)] rounded-xl border border-[var(--color-line)] cursor-pointer">
                <div>
                  <span className="font-semibold text-[var(--color-ink)] block">108 Emergency Location Broadcast</span>
                  <span className="text-[11px] text-[var(--color-muted)]">Enable 1-tap live GPS sharing with trauma response teams during active SOS sessions.</span>
                </div>
                <input
                  type="checkbox"
                  checked={privacySettings.allowEmergencyBroadcast}
                  onChange={(e) => handleUpdatePrivacy('allowEmergencyBroadcast', e.target.checked)}
                  className="rounded text-[var(--color-primary)] w-4 h-4 ml-4"
                />
              </label>
            </div>

            {/* Retention and Purge Policy */}
            <div className="pt-3 border-t border-[var(--color-line)] flex items-center justify-between">
              <div>
                <span className="font-semibold text-[var(--color-ink)] block">Right to be Forgotten</span>
                <span className="text-[11px] text-[var(--color-muted)]">Permanently erase all stored coordinates, breadcrumbs, and location caches.</span>
              </div>
              <button
                onClick={handleClearAll}
                className="btn-outline py-2 px-3 text-xs text-rose-600 border-rose-300 hover:bg-rose-50 rounded-xl"
              >
                Clear Location Data
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
