import React, { useState, useEffect } from 'react';
import { 
  X, Navigation, MapPin, Building2, Calendar, Clock, CheckCircle2, 
  AlertCircle, ShieldCheck, ChevronRight, Compass, Car, Footprints
} from 'lucide-react';
import { locationService } from '../../services/location/locationService';
import { appointmentNavigationService } from '../../services/location/appointmentNavigationService';
import { RouteDirections, UserLocation, ArrivalCheckInResult, TravelMode } from '../../services/location/types';
import { OlmeraInteractiveMap } from './OlmeraInteractiveMap';

interface AppointmentNavigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  patientId: string;
  doctorName: string;
  hospitalName: string;
  hospitalId?: string;
  appointmentDate: string;
  appointmentTime: string;
  onCheckInCompleted?: (result: ArrivalCheckInResult) => void;
}

export function AppointmentNavigationModal({
  isOpen,
  onClose,
  appointmentId,
  patientId,
  doctorName,
  hospitalName,
  hospitalId,
  appointmentDate,
  appointmentTime,
  onCheckInCompleted
}: AppointmentNavigationModalProps) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [travelMode, setTravelMode] = useState<TravelMode>('driving');
  const [route, setRoute] = useState<RouteDirections | null>(null);
  const [checkInResult, setCheckInResult] = useState<ArrivalCheckInResult | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLocationAndRoute();
      const existing = appointmentNavigationService.getCheckInForAppointment(appointmentId);
      if (existing) setCheckInResult(existing);
    }
  }, [isOpen, appointmentId, travelMode]);

  const loadLocationAndRoute = async () => {
    setIsLocating(true);
    try {
      const loc = await locationService.getCurrentLocation({ timeoutMs: 6000 });
      setUserLocation(loc);

      const resolvedRoute = appointmentNavigationService.getDirectionsForAppointment(
        loc.coords,
        hospitalId || hospitalName,
        travelMode
      );
      setRoute(resolvedRoute);
    } catch {
      const fallback = locationService.getDefaultLocation();
      setUserLocation(fallback);
      const resolvedRoute = appointmentNavigationService.getDirectionsForAppointment(
        fallback.coords,
        hospitalId || hospitalName,
        travelMode
      );
      setRoute(resolvedRoute);
    } finally {
      setIsLocating(false);
    }
  };

  const handlePerformCheckIn = (manualOverride = false) => {
    if (!userLocation) return;
    setIsCheckingIn(true);

    const result = appointmentNavigationService.performArrivalCheckIn({
      appointmentId,
      patientId,
      hospitalIdOrName: hospitalId || hospitalName,
      patientCoords: userLocation.coords,
      forceManualOverride: manualOverride
    });

    setCheckInResult(result);
    setIsCheckingIn(false);

    if (onCheckInCompleted) {
      onCheckInCompleted(result);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn font-ui">
      <div className="card w-full max-w-3xl bg-white dark:bg-[#0A2220] border-[var(--color-line)] shadow-2xl rounded-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--color-line)] flex items-center justify-between bg-[var(--color-surface-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <Navigation size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
                Hospital GPS Navigation & Check-In
              </span>
              <h2 className="font-display font-semibold text-lg text-[var(--color-ink)]">
                {hospitalName}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation modal"
            className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Appointment Summary Strip */}
        <div className="px-5 py-3 bg-[var(--color-surface)] border-b border-[var(--color-line)] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[var(--color-ink)]">
            <span className="font-semibold">{doctorName}</span>
            <span className="text-[var(--color-muted)]">•</span>
            <span className="flex items-center gap-1 text-[var(--color-muted)]">
              <Calendar size={12} /> {appointmentDate}
            </span>
            <span className="text-[var(--color-muted)]">•</span>
            <span className="flex items-center gap-1 text-[var(--color-muted)]">
              <Clock size={12} /> {appointmentTime}
            </span>
          </div>

          {/* Travel Mode Selector */}
          <div className="flex items-center gap-1 bg-[var(--color-surface-subtle)] p-0.5 rounded-lg border border-[var(--color-line)]">
            <button
              onClick={() => setTravelMode('driving')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                travelMode === 'driving' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-muted)]'
              }`}
            >
              <Car size={12} /> Drive
            </button>
            <button
              onClick={() => setTravelMode('walking')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                travelMode === 'walking' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-muted)]'
              }`}
            >
              <Footprints size={12} /> Walk
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Interactive Route Map */}
          <div className="rounded-xl overflow-hidden border border-[var(--color-line)]">
            <OlmeraInteractiveMap
              center={route ? { latitude: route.destination.latitude, longitude: route.destination.longitude } : undefined}
              userCoords={userLocation?.coords}
              activeRoute={route}
              height="280px"
              showFacilityTypesFilter={false}
            />
          </div>

          {/* Trip Metrics Card */}
          {route && (
            <div className="grid grid-cols-3 gap-3 p-3.5 bg-[var(--color-surface-subtle)] rounded-xl border border-[var(--color-line)] text-center text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--color-muted)] block">Distance</span>
                <span className="text-base font-bold text-[var(--color-ink)]">{route.distanceKm} km</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--color-muted)] block">Est. Travel Time</span>
                <span className="text-base font-bold text-[var(--color-primary)]">{route.durationMinutes} mins</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--color-muted)] block">Traffic</span>
                <span className="text-base font-bold text-[var(--color-ink)] capitalize">{route.trafficCongestion}</span>
              </div>
            </div>
          )}

          {/* GEOFENCE ARRIVAL CHECK-IN SECTION */}
          <div className="p-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[var(--color-primary)]" />
                <h4 className="font-semibold text-sm text-[var(--color-ink)]">
                  Campus Arrival Verification
                </h4>
              </div>
              {checkInResult && (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  checkInResult.checkInStatus === 'checked_in'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                }`}>
                  {checkInResult.checkInStatus === 'checked_in' ? '✓ Checked In' : 'Outside Campus'}
                </span>
              )}
            </div>

            {checkInResult ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-200">
                <p className="font-semibold">{checkInResult.message}</p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1">
                  Arrival Time: {new Date(checkInResult.timestamp).toLocaleTimeString()} • Reception notified.
                </p>
              </div>
            ) : (
              <p className="text-xs text-[var(--color-muted)]">
                Olmera uses geofencing to verify when you arrive within the hospital campus boundary. Once inside, you can check in to notify the reception desk and doctor queue without waiting in line.
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => handlePerformCheckIn(false)}
                disabled={isCheckingIn || checkInResult?.checkInStatus === 'checked_in'}
                className="btn-primary flex-1 py-2.5 text-xs rounded-xl flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                <span>{checkInResult?.checkInStatus === 'checked_in' ? 'Arrival Confirmed' : 'Verify GPS & Check In'}</span>
              </button>

              <button
                type="button"
                onClick={() => handlePerformCheckIn(true)}
                disabled={checkInResult?.checkInStatus === 'checked_in'}
                className="btn-outline py-2.5 px-3 text-xs rounded-xl text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              >
                Manual Reception Override
              </button>
            </div>
          </div>

          {/* Turn-by-Turn Steps */}
          {route && route.steps.length > 0 && (
            <div className="space-y-2 text-xs">
              <span className="font-semibold text-[var(--color-ink)] block">Navigation Guidance</span>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {route.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-[var(--color-surface-subtle)] text-[11px] text-[var(--color-ink)]">
                    <span className="w-4 h-4 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{step.instruction}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
