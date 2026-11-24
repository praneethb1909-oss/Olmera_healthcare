import { useEffect, useState, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { Building2, ChevronRight, Search, Activity, Phone, Mail, Users, MapPin, Navigation, Compass, LayoutGrid, Map } from 'lucide-react';
import { MedicareWaveLoader } from './common/MedicareWaveLoader';
import { locationService } from '../services/location/locationService';
import { facilitiesService } from '../services/location/facilitiesService';
import { HEALTHCARE_FACILITIES } from '../services/location/facilitiesRegistry';
import { UserLocation, HealthcareFacility } from '../services/location/types';
import { OlmeraInteractiveMap } from './location/OlmeraInteractiveMap';

interface Hospital {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  description: string;
  image_url: string;
  latitude?: number;
  longitude?: number;
}

interface HospitalListProps {
  onSelectHospital: (hospitalId: string) => void;
  onBack?: () => void;
}

export function HospitalList({ onSelectHospital, onBack }: HospitalListProps) {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [sortByDistance, setSortByDistance] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'map'>('cards');
  const [selectedMapFacility, setSelectedMapFacility] = useState<HealthcareFacility | null>(null);

  useEffect(() => {
    loadHospitals();
    acquireLocation();
  }, []);

  const acquireLocation = async () => {
    setIsLocating(true);
    try {
      const loc = await locationService.getCurrentLocation({ timeoutMs: 6000 });
      setUserLocation(loc);
    } catch {
      const fallback = locationService.getDefaultLocation();
      setUserLocation(fallback);
    } finally {
      setIsLocating(false);
    }
  };

  const loadHospitals = async () => {
    try {
      const q = query(collection(db, 'hospitals'), orderBy('name'));
      const querySnapshot = await getDocs(q);
      const hospitalsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hospital));

      if (hospitalsData.length === 0) {
        // Fallback to registered network hospitals
        const registryHospitals: Hospital[] = HEALTHCARE_FACILITIES
          .filter(f => f.type === 'hospital')
          .map(f => ({
            id: f.id,
            name: f.name,
            address: f.address,
            city: f.city,
            phone: f.phone,
            email: f.email,
            description: `${f.category.replace('_', ' ').toUpperCase()} • ${f.totalBeds} Beds • 24/7 ICU & Emergency Trauma Center`,
            image_url: f.imageUrl || '/images/hospital-institute-800.webp',
            latitude: f.coords.latitude,
            longitude: f.coords.longitude
          }));
        setHospitals(registryHospitals);
      } else {
        // Enrich with coordinates from registry if available
        const enriched = hospitalsData.map(h => {
          const match = HEALTHCARE_FACILITIES.find(f => 
            f.name.toLowerCase().includes(h.name.toLowerCase()) || 
            h.name.toLowerCase().includes(f.name.toLowerCase()) ||
            f.city.toLowerCase() === h.city.toLowerCase()
          );
          return {
            ...h,
            latitude: match ? match.coords.latitude : 18.4520,
            longitude: match ? match.coords.longitude : 83.6580
          };
        });
        setHospitals(enriched);
      }
    } catch (error) {
      console.error('Error loading hospitals:', error);
      // Fallback to registry
      const registryHospitals: Hospital[] = HEALTHCARE_FACILITIES
        .filter(f => f.type === 'hospital')
        .map(f => ({
          id: f.id,
          name: f.name,
          address: f.address,
          city: f.city,
          phone: f.phone,
          email: f.email,
          description: `${f.category.replace('_', ' ').toUpperCase()} • ${f.totalBeds} Beds • 24/7 ICU & Emergency Trauma Center`,
          image_url: f.imageUrl || '/images/hospital-institute-800.webp',
          latitude: f.coords.latitude,
          longitude: f.coords.longitude
        }));
      setHospitals(registryHospitals);
    } finally {
      setLoading(false);
    }
  };

  const getDistanceInfo = (h: Hospital) => {
    if (!userLocation) return { distanceKm: null, durationMins: null };
    const hCoords = {
      latitude: h.latitude || 18.4520,
      longitude: h.longitude || 83.6580
    };
    const distanceKm = locationService.calculateDistance(userLocation.coords, hCoords);
    const durationMins = locationService.estimateTravelDurationMinutes(distanceKm, 'driving');
    return { distanceKm, durationMins };
  };

  const processedHospitals = useMemo(() => {
    let list = hospitals.filter(h => {
      const matchesSearch = h.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            h.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCity = selectedCity === 'All Cities' || h.city === selectedCity;
      return matchesSearch && matchesCity;
    });

    if (sortByDistance && userLocation) {
      list = [...list].sort((a, b) => {
        const distA = getDistanceInfo(a).distanceKm || 999;
        const distB = getDistanceInfo(b).distanceKm || 999;
        return distA - distB;
      });
    }

    return list;
  }, [hospitals, searchTerm, selectedCity, sortByDistance, userLocation]);

  const cities = ['All Cities', ...new Set(hospitals.map(h => h.city))];

  // Facilities mapped for Interactive Map
  const mapFacilities: HealthcareFacility[] = useMemo(() => {
    return HEALTHCARE_FACILITIES.filter(f => f.type === 'hospital');
  }, []);

  if (loading) {
    return (
      <MedicareWaveLoader 
        variant="card" 
        text="Connecting Hospital Network..." 
        subtitle="Locating accredited medical facilities and live bed status"
        className="my-12 min-h-[340px]"
      />
    );
  }

  return (
    <div className="animate-fadeIn space-y-6 max-w-7xl mx-auto py-4 font-ui">
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors mb-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          ← Back to Homepage
        </button>
      )}

      {/* Top Header & GPS Status Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex-1 max-w-2xl">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
            Find Healthcare & Hospitals
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-4 text-sm">
            Search, filter, and navigate to accredited hospitals and emergency trauma centers.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="Search hospital name, trauma unit, city..."
                aria-label="Search hospital name or description"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10 py-3 shadow-xs text-xs"
              />
            </div>
            <div className="sm:w-48">
              <select 
                value={selectedCity}
                aria-label="Filter hospitals by city"
                onChange={(e) => setSelectedCity(e.target.value)}
                className="input-field py-3 shadow-xs text-xs appearance-none cursor-pointer"
              >
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* GPS Location & View Switcher */}
        <div className="flex flex-col items-start sm:items-end gap-2">
          <div className="flex items-center gap-2 bg-[var(--color-surface-subtle)] p-1.5 rounded-xl border border-[var(--color-line)] text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
            <span className="text-[var(--color-ink)] font-medium truncate max-w-[190px]">
              {userLocation?.addressLabel || 'Locating GPS...'}
            </span>
            <button
              onClick={acquireLocation}
              disabled={isLocating}
              aria-label="Acquire live GPS location"
              className="btn-outline px-2 py-1 text-[11px] rounded-lg flex items-center gap-1"
            >
              <Navigation size={11} className={isLocating ? 'animate-spin' : ''} />
              <span>{isLocating ? '...' : 'GPS'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortByDistance(!sortByDistance)}
              className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                sortByDistance 
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' 
                  : 'bg-[var(--color-surface)] border-[var(--color-line)] text-[var(--color-ink)]'
              }`}
            >
              Sort by Nearest {sortByDistance ? '✓' : ''}
            </button>

            <div className="flex items-center bg-[var(--color-surface)] p-0.5 rounded-lg border border-[var(--color-line)] text-xs">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-md ${viewMode === 'cards' ? 'bg-[var(--color-surface-subtle)] text-[var(--color-primary)] font-bold' : 'text-[var(--color-muted)]'}`}
                title="Grid Cards View"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-1.5 rounded-md ${viewMode === 'map' ? 'bg-[var(--color-surface-subtle)] text-[var(--color-primary)] font-bold' : 'text-[var(--color-muted)]'}`}
                title="Interactive Map View"
              >
                <Map size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MAP VIEW */}
      {viewMode === 'map' && (
        <div className="space-y-4">
          <OlmeraInteractiveMap
            center={userLocation ? { latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude } : undefined}
            userCoords={userLocation?.coords}
            facilities={mapFacilities}
            selectedFacility={selectedMapFacility}
            onSelectFacility={(fac) => setSelectedMapFacility(fac)}
            height="520px"
            showFacilityTypesFilter={false}
          />

          {selectedMapFacility && (
            <div className="card p-4 bg-white dark:bg-[#0A2220] border-[var(--color-line)] rounded-xl flex items-center justify-between gap-4 animate-fadeIn text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--color-primary)]">Selected Hospital</span>
                <h3 className="font-display font-semibold text-base text-[var(--color-ink)]">{selectedMapFacility.name}</h3>
                <p className="text-[11px] text-[var(--color-muted)]">{selectedMapFacility.address} • {selectedMapFacility.city}</p>
              </div>
              <button
                onClick={() => onSelectHospital(selectedMapFacility.id)}
                className="btn-primary py-2 px-4 rounded-xl text-xs flex items-center gap-1.5"
              >
                <span>Book Appointment</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* CARDS VIEW */}
      {viewMode === 'cards' && (
        <>
          {processedHospitals.length === 0 ? (
            <div className="card p-20 text-center">
              <div className="bg-slate-50 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                <Search size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No Hospitals Found</h3>
              <p className="text-slate-500 dark:text-slate-400">Try adjusting your search terms or filters.</p>
              <button onClick={() => { setSearchTerm(''); setSelectedCity('All Cities'); }} className="btn-primary mt-6">Clear All Filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {processedHospitals.map((hospital) => {
                const { distanceKm, durationMins } = getDistanceInfo(hospital);

                return (
                  <div
                    key={hospital.id}
                    className="card group overflow-hidden flex flex-col md:flex-row h-full hover:border-[var(--color-primary)] transition-all shadow-sm"
                  >
                    <div className="w-full md:w-2/5 h-48 md:h-auto overflow-hidden relative">
                      <img
                        src={hospital.image_url || '/images/hospital-institute-800.webp'}
                        alt={hospital.name}
                        loading="lazy"
                        width={800}
                        height={500}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      
                      {/* Live Distance Pill on Image */}
                      {distanceKm !== null && (
                        <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-[var(--color-primary)] border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1">
                          <Navigation size={10} />
                          <span>{distanceKm} km away (~{durationMins}m)</span>
                        </div>
                      )}
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-[var(--color-primary)] transition-colors">
                              {hospital.name}
                            </h3>
                            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 mt-1">
                              <MapPin size={12} className="text-slate-400" />
                              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                {hospital.city} Regional Hub
                              </span>
                            </div>
                          </div>
                          <div className="bg-[var(--color-primary)]/10 text-[var(--color-primary)] p-2 rounded-xl">
                            <Building2 size={18} />
                          </div>
                        </div>

                        <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 line-clamp-2 mt-2 leading-relaxed">
                          {hospital.description}
                        </p>

                        <div className="flex flex-wrap gap-1.5 mb-6">
                          {['Emergency Trauma', 'Cardiology', 'ICU 24/7'].map((spec, i) => (
                            <span key={i} className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg border border-slate-100 dark:border-slate-700">
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => onSelectHospital(hospital.id)}
                          className="flex-1 btn-primary py-2.5 text-xs flex items-center justify-center gap-1.5 group/btn rounded-xl"
                        >
                          <span className="font-semibold">Book Consultation</span>
                          <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
