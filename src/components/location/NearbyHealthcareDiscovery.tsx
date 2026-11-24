import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, MapPin, Navigation, Building2, Stethoscope, Pill, 
  TestTube2, Phone, Star, Clock, Filter, ArrowRight, ShieldCheck, 
  Crosshair, Layers, CheckCircle2, ChevronRight, AlertCircle, Compass, Bed
} from 'lucide-react';
import { OlmeraInteractiveMap } from './OlmeraInteractiveMap';
import { locationService } from '../../services/location/locationService';
import { facilitiesService, FacilityWithDistance } from '../../services/location/facilitiesService';
import { HealthcareFacility, UserLocation, RouteDirections, HealthcareFacilityType } from '../../services/location/types';
import { REGIONAL_CENTERS } from '../../services/location/facilitiesRegistry';
import { maskPhone } from '../../utils/masking';

interface NearbyHealthcareDiscoveryProps {
  onSelectHospitalForBooking?: (hospitalId: string) => void;
  onNavigateToView?: (view: string, data?: any) => void;
  initialType?: HealthcareFacilityType | 'all';
}

export function NearbyHealthcareDiscovery({
  onSelectHospitalForBooking,
  onNavigateToView,
  initialType = 'all'
}: NearbyHealthcareDiscoveryProps) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<HealthcareFacilityType | 'all'>(initialType);
  const [selectedCity, setSelectedCity] = useState<'All' | 'Rajam' | 'Visakhapatnam' | 'Srikakulam'>('All');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(50);
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [open24x7Only, setOpen24x7Only] = useState(false);

  const [selectedFacility, setSelectedFacility] = useState<HealthcareFacility | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteDirections | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'list'>('split');
  const [isPinDropMode, setIsPinDropMode] = useState(false);

  // Initialize location on mount
  useEffect(() => {
    handleGetGpsLocation();
  }, []);

  const handleGetGpsLocation = async () => {
    setIsLocating(true);
    setLocationError(null);
    try {
      const loc = await locationService.getCurrentLocation({
        timeoutMs: 8000,
        enableHighAccuracy: true
      });
      setUserLocation(loc);
    } catch (err: any) {
      console.warn('GPS location retrieval error:', err);
      const fallback = locationService.getDefaultLocation('GPS unavailable; using Rajam Regional Hub.');
      setUserLocation(fallback);
      setLocationError('GPS permission denied or unavailable. Using default regional center.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSelectPresetCity = (cityKey: 'rajam' | 'vizag' | 'srikakulam') => {
    const loc = locationService.setPresetCity(cityKey);
    setUserLocation(loc);
    setSelectedCity(cityKey === 'rajam' ? 'Rajam' : cityKey === 'vizag' ? 'Visakhapatnam' : 'Srikakulam');
    setActiveRoute(null);
  };

  const handlePinDropped = (coords: { latitude: number; longitude: number }) => {
    const loc = locationService.setManualLocation(coords, `Custom Pin (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`);
    setUserLocation(loc);
    setIsPinDropMode(false);
    setActiveRoute(null);
  };

  // Query facilities with distance sorting
  const nearbyFacilities: FacilityWithDistance[] = useMemo(() => {
    const originCoords = userLocation?.coords || REGIONAL_CENTERS.rajam.coords;
    return facilitiesService.getNearbyFacilities(originCoords, {
      type: selectedType,
      searchQuery,
      city: selectedCity === 'All' ? undefined : selectedCity,
      maxDistanceKm: maxDistanceKm > 0 ? maxDistanceKm : undefined,
      emergencyOnly,
      isOpen24x7: open24x7Only
    });
  }, [userLocation, selectedType, searchQuery, selectedCity, maxDistanceKm, emergencyOnly, open24x7Only]);

  const handleGetDirections = (facility: HealthcareFacility) => {
    if (!userLocation) return;
    const route = locationService.generateRouteDirections(
      userLocation.coords,
      facility.coords,
      facility.name,
      'driving'
    );
    setActiveRoute(route);
    setSelectedFacility(facility);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4 animate-fadeIn font-ui">
      {/* 1. HEADER & LOCATION STATUS BAR */}
      <div className="card p-5 bg-[var(--color-surface)] border-[var(--color-line)] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <Compass size={18} />
              </span>
              <h1 className="font-display font-semibold text-2xl text-[var(--color-ink)]">
                Healthcare Network & Live GPS Discovery
              </h1>
            </div>
            <p className="text-xs text-[var(--color-muted)]">
              Discover accredited hospitals, clinics, 24/7 pharmacies, and diagnostic laboratories nearest to you.
            </p>
          </div>

          {/* Current GPS Badge & Quick Selector */}
          <div className="flex flex-wrap items-center gap-2 bg-[var(--color-surface-subtle)] p-2 rounded-xl border border-[var(--color-line)]">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-line)] text-xs text-[var(--color-ink)] font-medium">
              <span className={`w-2 h-2 rounded-full ${userLocation?.source === 'gps' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="max-w-[180px] sm:max-w-[220px] truncate">
                {userLocation?.addressLabel || 'Locating GPS...'}
              </span>
              {userLocation?.accuracyDescription && (
                <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-mono">
                  (±{userLocation.coords.accuracy || 15}m)
                </span>
              )}
            </div>

            <button
              onClick={handleGetGpsLocation}
              disabled={isLocating}
              aria-label="Acquire live GPS location"
              className="btn-outline px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 min-h-[32px] hover:border-[var(--color-primary)]"
            >
              <Navigation size={13} className={isLocating ? 'animate-spin' : ''} />
              <span>{isLocating ? 'Acquiring...' : 'Use GPS'}</span>
            </button>

            <button
              onClick={() => setIsPinDropMode(!isPinDropMode)}
              className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 min-h-[32px] border transition-colors ${
                isPinDropMode 
                  ? 'bg-amber-500 text-white border-amber-600' 
                  : 'bg-[var(--color-surface)] border-[var(--color-line)] text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)]'
              }`}
            >
              <Crosshair size={13} />
              <span>{isPinDropMode ? 'Drop Active' : 'Drop Pin'}</span>
            </button>
          </div>
        </div>

        {locationError && (
          <div className="mt-3 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{locationError}</span>
          </div>
        )}

        {/* Quick Regional Center Presets */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-[var(--color-line)] text-xs">
          <span className="text-[var(--color-muted)] font-medium">Quick Center:</span>
          <button
            onClick={() => handleSelectPresetCity('rajam')}
            className={`px-2.5 py-1 rounded-lg border text-xs transition-colors ${
              selectedCity === 'Rajam'
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'bg-[var(--color-surface)] border-[var(--color-line)] text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)]'
            }`}
          >
            Rajam Hub
          </button>
          <button
            onClick={() => handleSelectPresetCity('vizag')}
            className={`px-2.5 py-1 rounded-lg border text-xs transition-colors ${
              selectedCity === 'Visakhapatnam'
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'bg-[var(--color-surface)] border-[var(--color-line)] text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)]'
            }`}
          >
            Visakhapatnam (Vizag)
          </button>
          <button
            onClick={() => handleSelectPresetCity('srikakulam')}
            className={`px-2.5 py-1 rounded-lg border text-xs transition-colors ${
              selectedCity === 'Srikakulam'
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'bg-[var(--color-surface)] border-[var(--color-line)] text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)]'
            }`}
          >
            Srikakulam
          </button>
        </div>
      </div>

      {/* 2. FILTERS & SEARCH ROW */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={16} />
          <input
            type="text"
            placeholder="Search facility name, cardiology, MRI, pharmacy delivery..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-primary)] shadow-xs"
          />
        </div>

        {/* Facility Type Filter Tabs */}
        <div className="flex items-center gap-1 bg-[var(--color-surface)] p-1 rounded-xl border border-[var(--color-line)] text-xs overflow-x-auto">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              selectedType === 'all'
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)]'
            }`}
          >
            All Facilities
          </button>
          <button
            onClick={() => setSelectedType('hospital')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
              selectedType === 'hospital'
                ? 'bg-[#0E4F4A] text-white'
                : 'text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)]'
            }`}
          >
            <Building2 size={13} /> Hospitals
          </button>
          <button
            onClick={() => setSelectedType('clinic')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
              selectedType === 'clinic'
                ? 'bg-[#0E8FB0] text-white'
                : 'text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)]'
            }`}
          >
            <Stethoscope size={13} /> Clinics
          </button>
          <button
            onClick={() => setSelectedType('pharmacy')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
              selectedType === 'pharmacy'
                ? 'bg-[#FF7A59] text-white'
                : 'text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)]'
            }`}
          >
            <Pill size={13} /> Pharmacies
          </button>
          <button
            onClick={() => setSelectedType('diagnostic_lab')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
              selectedType === 'diagnostic_lab'
                ? 'bg-[#6D5BD0] text-white'
                : 'text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)]'
            }`}
          >
            <TestTube2 size={13} /> Diagnostic Labs
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-[var(--color-surface)] p-1 rounded-xl border border-[var(--color-line)] text-xs shrink-0">
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              viewMode === 'split' ? 'bg-[var(--color-surface-subtle)] text-[var(--color-primary)] font-bold' : 'text-[var(--color-muted)]'
            }`}
          >
            Split View
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              viewMode === 'map' ? 'bg-[var(--color-surface-subtle)] text-[var(--color-primary)] font-bold' : 'text-[var(--color-muted)]'
            }`}
          >
            Map Only
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              viewMode === 'list' ? 'bg-[var(--color-surface-subtle)] text-[var(--color-primary)] font-bold' : 'text-[var(--color-muted)]'
            }`}
          >
            List Only
          </button>
        </div>
      </div>

      {/* Radius & Capability Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-[var(--color-surface-subtle)] p-3 rounded-xl border border-[var(--color-line)]">
        <div className="flex items-center gap-3">
          <span className="text-[var(--color-muted)] font-medium">Distance Radius:</span>
          {[10, 25, 50, 100].map(km => (
            <button
              key={km}
              onClick={() => setMaxDistanceKm(km)}
              className={`px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                maxDistanceKm === km
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[var(--color-surface)] border-[var(--color-line)] text-[var(--color-ink)]'
              }`}
            >
              {km} km
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={emergencyOnly}
              onChange={(e) => setEmergencyOnly(e.target.checked)}
              className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
            <span className="font-medium text-[var(--color-ink)]">Emergency Trauma Only</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={open24x7Only}
              onChange={(e) => setOpen24x7Only(e.target.checked)}
              className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
            <span className="font-medium text-[var(--color-ink)]">24/7 Open</span>
          </label>
        </div>
      </div>

      {/* 3. MAIN INTERACTIVE CONTENT (Map + Facilities List) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Interactive Map Section */}
        {viewMode !== 'list' && (
          <div className={`${viewMode === 'map' ? 'lg:col-span-12' : 'lg:col-span-7'} space-y-3`}>
            <OlmeraInteractiveMap
              center={userLocation ? { latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude } : undefined}
              userCoords={userLocation?.coords}
              facilities={nearbyFacilities}
              selectedFacility={selectedFacility}
              onSelectFacility={(fac) => {
                setSelectedFacility(fac);
                handleGetDirections(fac);
              }}
              activeRoute={activeRoute}
              isPinDropMode={isPinDropMode}
              onPinDropped={handlePinDropped}
              height={viewMode === 'map' ? '600px' : '520px'}
            />

            {/* Route Directions Card if Active */}
            {activeRoute && (
              <div className="card p-4 bg-emerald-50/60 dark:bg-[#07131A] border-emerald-200 dark:border-emerald-900/60 rounded-xl animate-fadeIn text-xs">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Navigation size={16} className="text-emerald-700 dark:text-emerald-400" />
                    <span className="font-display font-semibold text-sm text-[var(--color-ink)]">
                      Route Directions to {activeRoute.destinationName}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveRoute(null)}
                    className="text-[10px] text-[var(--color-muted)] hover:underline"
                  >
                    Clear Route
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-emerald-200/60 dark:border-emerald-900/40 text-center font-medium">
                  <div>
                    <span className="text-[10px] text-[var(--color-muted)] block">Distance</span>
                    <span className="text-sm font-bold text-[var(--color-ink)]">{activeRoute.distanceKm} km</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--color-muted)] block">Est. Driving Time</span>
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{activeRoute.durationMinutes} mins</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--color-muted)] block">Congestion</span>
                    <span className="text-sm font-bold capitalize text-[var(--color-ink)]">{activeRoute.trafficCongestion}</span>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  {activeRoute.steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[11px] text-[var(--color-ink)]">
                      <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{step.instruction}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Facilities List Section */}
        {viewMode !== 'map' && (
          <div className={`${viewMode === 'list' ? 'lg:col-span-12' : 'lg:col-span-5'} space-y-3`}>
            <div className="flex items-center justify-between text-xs text-[var(--color-muted)] px-1">
              <span>{nearbyFacilities.length} facilities within {maxDistanceKm} km</span>
              <span>Sorted by nearest distance</span>
            </div>

            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {nearbyFacilities.length === 0 ? (
                <div className="card p-8 text-center bg-[var(--color-surface)] border-[var(--color-line)] rounded-xl">
                  <Compass size={32} className="mx-auto text-[var(--color-muted)] mb-2" />
                  <p className="font-semibold text-sm text-[var(--color-ink)]">No facilities found matching your criteria</p>
                  <p className="text-xs text-[var(--color-muted)] mt-1">Try expanding the distance radius or clearing active filters.</p>
                </div>
              ) : (
                nearbyFacilities.map((facility) => {
                  const isSelected = selectedFacility?.id === facility.id;
                  let typeBadgeColor = 'bg-[#0E4F4A]/10 text-[#0E4F4A]';
                  if (facility.type === 'clinic') typeBadgeColor = 'bg-[#0E8FB0]/10 text-[#0E8FB0]';
                  else if (facility.type === 'pharmacy') typeBadgeColor = 'bg-[#FF7A59]/10 text-[#FF7A59]';
                  else if (facility.type === 'diagnostic_lab') typeBadgeColor = 'bg-[#6D5BD0]/10 text-[#6D5BD0]';

                  return (
                    <div
                      key={facility.id}
                      onClick={() => {
                        setSelectedFacility(facility);
                        handleGetDirections(facility);
                      }}
                      className={`card p-4 transition-all cursor-pointer rounded-xl border ${
                        isSelected 
                          ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 shadow-md bg-white dark:bg-[#07131A]' 
                          : 'border-[var(--color-line)] hover:border-[var(--color-primary)]/50 bg-[var(--color-surface)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${typeBadgeColor}`}>
                              {facility.type.replace('_', ' ')}
                            </span>
                            {facility.emergencyDepartment && (
                              <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                                Emergency Trauma
                              </span>
                            )}
                          </div>
                          <h3 className="font-display font-semibold text-sm text-[var(--color-ink)]">
                            {facility.name}
                          </h3>
                        </div>

                        {/* Distance & ETA Pill */}
                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold text-[var(--color-primary)] block">
                            {facility.distanceKm} km
                          </span>
                          <span className="text-[10px] text-[var(--color-muted)] font-medium">
                            ~{facility.durationMinutes} mins drive
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-[var(--color-muted)] mt-1.5 flex items-center gap-1.5">
                        <MapPin size={12} className="shrink-0 text-[var(--color-muted)]" />
                        <span className="truncate">{facility.address}</span>
                      </p>

                      {/* Capabilities pills */}
                      <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-[var(--color-line)] text-[11px]">
                        {facility.availableBeds !== undefined && (
                          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                            <Bed size={12} /> {facility.availableBeds} beds available
                          </span>
                        )}
                        {facility.pharmacyServices?.homeDelivery && (
                          <span className="text-amber-700 dark:text-amber-400 font-medium">
                            🚚 Home Delivery ({facility.pharmacyServices.deliveryRadiusKm} km radius)
                          </span>
                        )}
                        {facility.diagnosticServices && facility.diagnosticServices.length > 0 && (
                          <span className="text-[var(--color-muted)] truncate max-w-[200px]">
                            🔬 {facility.diagnosticServices.slice(0, 2).join(', ')}...
                          </span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 mt-3 pt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGetDirections(facility);
                          }}
                          className="btn-outline flex-1 py-1.5 text-xs rounded-lg flex items-center justify-center gap-1 min-h-[32px]"
                        >
                          <Navigation size={12} />
                          <span>Directions</span>
                        </button>

                        {facility.type === 'hospital' && onSelectHospitalForBooking && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectHospitalForBooking(facility.id);
                            }}
                            className="btn-primary flex-1 py-1.5 text-xs rounded-lg flex items-center justify-center gap-1 min-h-[32px]"
                          >
                            <span>Book Consultation</span>
                            <ChevronRight size={12} />
                          </button>
                        )}

                        {facility.type === 'pharmacy' && onNavigateToView && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateToView('patient-prescriptions');
                            }}
                            className="btn-primary flex-1 py-1.5 text-xs rounded-lg flex items-center justify-center gap-1 min-h-[32px]"
                          >
                            <span>Order Medicine</span>
                            <ChevronRight size={12} />
                          </button>
                        )}

                        {facility.type === 'diagnostic_lab' && onNavigateToView && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateToView('patient-medical-reports');
                            }}
                            className="btn-primary flex-1 py-1.5 text-xs rounded-lg flex items-center justify-center gap-1 min-h-[32px]"
                          >
                            <span>View Tests</span>
                            <ChevronRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
