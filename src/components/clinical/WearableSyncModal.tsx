import React, { useState, useEffect } from 'react';
import { 
  Activity, X, Watch, Smartphone, RefreshCw, CheckCircle2, 
  Battery, Heart, Moon, Zap, ShieldCheck 
} from 'lucide-react';
import { vitalsDeviceService, WearableDeviceState, VitalsEntry } from '../../services/clinical/vitalsDeviceService';
import { useAuth } from '../../contexts/AuthContext';

interface WearableSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVitalsSynced?: (entry: VitalsEntry) => void;
}

export function WearableSyncModal({ isOpen, onClose, onVitalsSynced }: WearableSyncModalProps) {
  const { user } = useAuth();
  const [devices, setDevices] = useState<WearableDeviceState[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user && isOpen) {
      setDevices(vitalsDeviceService.getConnectedDevices(user.uid));
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleToggleConnect = (platform: WearableDeviceState['platform'], currentConnected: boolean) => {
    if (!user) return;
    const updated = vitalsDeviceService.toggleDeviceConnection(user.uid, platform, !currentConnected);
    setDevices(updated);
  };

  const handleSyncNow = (platform: 'apple_health' | 'google_health_connect') => {
    if (!user) return;
    setSyncing(platform);
    setSuccessMessage(null);

    setTimeout(() => {
      const { latestEntry } = vitalsDeviceService.syncWearableData(user.uid, platform);
      setDevices(vitalsDeviceService.getConnectedDevices(user.uid));
      setSyncing(null);
      setSuccessMessage(`Telemetry synchronized from ${platform === 'apple_health' ? 'Apple Health' : 'Health Connect'}: Heart rate, SpO2, glucose, and steps updated.`);
      if (onVitalsSynced) onVitalsSynced(latestEntry);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 font-ui">
      <div className="bg-[var(--color-surface)] text-[var(--color-ink)] w-full max-w-xl rounded-3xl shadow-2xl border border-[var(--color-line)] max-h-[90vh] overflow-hidden flex flex-col animate-scaleIn">
        
        {/* Header */}
        <div className="p-6 bg-[var(--color-primary)] text-white flex items-center justify-between border-b border-black/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Activity size={20} className="text-[var(--color-mist)]" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-white">
                Wearable & Health Platform Sync
              </h3>
              <p className="text-xs text-[var(--color-mist)] mt-0.5">
                Connect Apple Health, Google Health Connect, and continuous biometric monitors
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
          
          {successMessage && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-start gap-3 text-xs text-emerald-800 dark:text-emerald-300 animate-fadeIn">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Privacy Note */}
          <div className="p-4 bg-[var(--color-surface-subtle)] border border-[var(--color-line)] rounded-2xl flex items-start gap-3 text-xs text-[var(--color-muted)] leading-relaxed">
            <ShieldCheck size={16} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
            <span>
              <strong>Zero Third-Party Advertising:</strong> Biometric telemetry stream is encrypted end-to-end and stored solely for your attending physician's clinical decision support.
            </span>
          </div>

          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Configured Health Platforms
            </span>

            {devices.map(dev => (
              <div 
                key={dev.platform}
                className="p-5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)] flex items-center justify-center text-[var(--color-primary)]">
                      {dev.platform === 'apple_health' ? <Watch size={20} /> : <Smartphone size={20} />}
                    </div>
                    <div>
                      <h4 className="font-display font-semibold text-sm text-[var(--color-ink)]">
                        {dev.deviceName}
                      </h4>
                      <p className="text-[11px] text-[var(--color-muted)]">
                        Platform: {dev.platform === 'apple_health' ? 'Apple HealthKit' : 'Google Health Connect'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleConnect(dev.platform, dev.isConnected)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      dev.isConnected 
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {dev.isConnected ? 'Connected' : 'Connect'}
                  </button>
                </div>

                {dev.isConnected && (
                  <>
                    <div className="flex items-center gap-4 text-[11px] text-[var(--color-muted)] pt-1">
                      {dev.batteryLevel && (
                        <div className="flex items-center gap-1">
                          <Battery size={13} className="text-emerald-600" />
                          <span>{dev.batteryLevel}% Battery</span>
                        </div>
                      )}
                      <div>
                        Last synced: {dev.lastSyncTimestamp ? new Date(dev.lastSyncTimestamp).toLocaleTimeString() : 'Never'}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {dev.syncMetrics.map((m, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-[var(--color-surface-subtle)] border border-[var(--color-line)] text-[10px] rounded-md">
                          {m}
                        </span>
                      ))}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => handleSyncNow(dev.platform as any)}
                        disabled={syncing === dev.platform}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
                      >
                        <RefreshCw size={13} className={syncing === dev.platform ? 'animate-spin' : ''} />
                        <span>{syncing === dev.platform ? 'Syncing...' : 'Sync Telemetry Now'}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[var(--color-surface-subtle)] border-t border-[var(--color-line)] flex items-center justify-between text-xs text-[var(--color-muted)]">
          <span>Continuous Health Sensor Pipeline</span>
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
