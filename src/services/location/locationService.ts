/**
 * Olmera Healthcare - Core Location Service
 * Implements GPS tracking, permission management, distance mathematics,
 * geofencing arrival detection, and saved locations management.
 */

import { 
  GeoCoordinates, 
  UserLocation, 
  LocationPermissionState, 
  SavedLocation, 
  SavedLocationType,
  RouteDirections,
  TravelMode,
  NavigationStep,
  LocationPrivacySettings
} from './types';
import { REGIONAL_CENTERS } from './facilitiesRegistry';

const STORAGE_SAVED_LOCATIONS = 'olmera_saved_locations';
const STORAGE_PRIVACY_SETTINGS = 'olmera_location_privacy';
const STORAGE_CACHED_LOCATION = 'olmera_cached_user_location';

export class LocationService {
  private activeWatchId: number | null = null;
  private cachedLocation: UserLocation | null = null;

  constructor() {
    this.initCachedLocation();
  }

  private initCachedLocation() {
    if (typeof localStorage !== 'undefined') {
      try {
        const cached = localStorage.getItem(STORAGE_CACHED_LOCATION);
        if (cached) {
          this.cachedLocation = JSON.parse(cached);
        }
      } catch (e) {
        console.warn('Failed to read cached location', e);
      }
    }
  }

  /**
   * Check browser / device permission state for Geolocation
   */
  async checkPermissionStatus(): Promise<LocationPermissionState> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return 'unavailable';
    }

    try {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        return result.state as LocationPermissionState;
      }
    } catch {
      // Permissions API not supported for geolocation in some environments
    }

    return 'prompt';
  }

  /**
   * Request and obtain current GPS location with high accuracy and graceful fallbacks
   */
  async getCurrentLocation(options?: {
    timeoutMs?: number;
    maximumAgeMs?: number;
    enableHighAccuracy?: boolean;
    requireConsent?: boolean;
  }): Promise<UserLocation> {
    const timeout = options?.timeoutMs ?? 10000;
    const enableHighAccuracy = options?.enableHighAccuracy ?? true;
    const maximumAge = options?.maximumAgeMs ?? 30000;

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return this.getDefaultLocation('Geolocation is not supported by your browser.');
    }

    return new Promise((resolve) => {
      let isSettled = false;

      const timeoutTimer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          console.warn('GPS location request timed out; falling back to cached or regional center.');
          resolve(this.getFallbackLocation('GPS satellite signal timed out. Using regional center.'));
        }
      }, timeout);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (isSettled) return;
          isSettled = true;
          clearTimeout(timeoutTimer);

          const coords: GeoCoordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp || Date.now()
          };

          const accuracyDescription: 'high' | 'medium' | 'low' = 
            (position.coords.accuracy <= 15) ? 'high' :
            (position.coords.accuracy <= 60) ? 'medium' : 'low';

          const resolvedLocation: UserLocation = {
            coords,
            source: 'gps',
            addressLabel: this.guessRegionalLabel(coords.latitude, coords.longitude),
            isFallback: false,
            accuracyDescription
          };

          this.cacheLocation(resolvedLocation);
          resolve(resolvedLocation);
        },
        (error) => {
          if (isSettled) return;
          isSettled = true;
          clearTimeout(timeoutTimer);

          let errorMsg = 'Unable to retrieve your current location.';
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg = 'Location permission was denied. Please select a city or enter an address.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMsg = 'GPS satellite position unavailable. Using regional default.';
          } else if (error.code === error.TIMEOUT) {
            errorMsg = 'GPS satellite signal timed out.';
          }

          console.info('[LocationService] Geolocation notice:', errorMsg);
          resolve(this.getFallbackLocation(errorMsg));
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge
        }
      );
    });
  }

  /**
   * Battery-efficient location watching with distance filtering
   */
  watchLocation(
    onLocationUpdate: (location: UserLocation) => void,
    onError?: (error: string) => void,
    options?: { enableHighAccuracy?: boolean; intervalMs?: number }
  ): () => void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      if (onError) onError('Geolocation not supported');
      return () => {};
    }

    this.stopWatchingLocation();

    let lastSentTimestamp = 0;
    const throttleMs = options?.intervalMs ?? 4000; // Battery-efficient interval

    this.activeWatchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - lastSentTimestamp < throttleMs) {
          return;
        }
        lastSentTimestamp = now;

        const coords: GeoCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp || now
        };

        const accuracyDescription = (position.coords.accuracy <= 15) ? 'high' : 'medium';
        const userLoc: UserLocation = {
          coords,
          source: 'gps',
          addressLabel: this.guessRegionalLabel(coords.latitude, coords.longitude),
          isFallback: false,
          accuracyDescription
        };

        this.cacheLocation(userLoc);
        onLocationUpdate(userLoc);
      },
      (error) => {
        if (onError) onError(error.message);
      },
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        maximumAge: 10000,
        timeout: 15000
      }
    );

    return () => this.stopWatchingLocation();
  }

  stopWatchingLocation(): void {
    if (this.activeWatchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.activeWatchId);
      this.activeWatchId = null;
    }
  }

  /**
   * Set user location manually (e.g. from map pin drag, address selection, or city choice)
   */
  setManualLocation(coords: { latitude: number; longitude: number }, addressLabel?: string): UserLocation {
    const userLocation: UserLocation = {
      coords: {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: 10,
        timestamp: Date.now()
      },
      source: 'manual',
      addressLabel: addressLabel || this.guessRegionalLabel(coords.latitude, coords.longitude),
      isFallback: false,
      accuracyDescription: 'manual'
    };

    this.cacheLocation(userLocation);
    return userLocation;
  }

  /**
   * Quick location preset selection (Rajam, Vizag, Srikakulam)
   */
  setPresetCity(cityKey: 'rajam' | 'vizag' | 'srikakulam'): UserLocation {
    const preset = REGIONAL_CENTERS[cityKey] || REGIONAL_CENTERS.rajam;
    return this.setManualLocation(preset.coords, preset.label);
  }

  private cacheLocation(location: UserLocation) {
    this.cachedLocation = location;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_CACHED_LOCATION, JSON.stringify(location));
      } catch (e) {
        console.warn('Failed to cache location', e);
      }
    }
  }

  getCachedLocation(): UserLocation | null {
    return this.cachedLocation;
  }

  private getFallbackLocation(reason: string): UserLocation {
    if (this.cachedLocation) {
      return {
        ...this.cachedLocation,
        isFallback: true,
        addressLabel: `${this.cachedLocation.addressLabel || 'Recent Location'} (${reason})`
      };
    }
    return this.getDefaultLocation(reason);
  }

  getDefaultLocation(reason?: string): UserLocation {
    const center = REGIONAL_CENTERS.rajam;
    return {
      coords: {
        ...center.coords,
        timestamp: Date.now()
      },
      source: 'default',
      addressLabel: center.label + (reason ? ` • ${reason}` : ''),
      isFallback: true,
      accuracyDescription: 'low'
    };
  }

  private guessRegionalLabel(lat: number, lng: number): string {
    const dRajam = this.calculateDistance({ latitude: lat, longitude: lng }, REGIONAL_CENTERS.rajam.coords);
    const dVizag = this.calculateDistance({ latitude: lat, longitude: lng }, REGIONAL_CENTERS.vizag.coords);
    const dSklm = this.calculateDistance({ latitude: lat, longitude: lng }, REGIONAL_CENTERS.srikakulam.coords);

    if (dRajam <= 15) return 'Rajam Corridor, Andhra Pradesh';
    if (dVizag <= 25) return 'Visakhapatnam Metropolitan Region, AP';
    if (dSklm <= 20) return 'Srikakulam District Network, AP';
    return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }

  // ==================== GEODETIC & DISTANCE CALCULATIONS ====================

  /**
   * Great-circle distance between two GPS coordinates using the Haversine formula
   * @returns Distance in Kilometers
   */
  calculateDistance(
    coord1: { latitude: number; longitude: number }, 
    coord2: { latitude: number; longitude: number }
  ): number {
    const R = 6371; // Earth's mean radius in km
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLng = this.toRadians(coord2.longitude - coord1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.latitude)) *
      Math.cos(this.toRadians(coord2.latitude)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  }

  /**
   * Distance in meters
   */
  calculateDistanceMeters(
    coord1: { latitude: number; longitude: number }, 
    coord2: { latitude: number; longitude: number }
  ): number {
    return Math.round(this.calculateDistance(coord1, coord2) * 1000);
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Estimate travel duration based on real-world medical transit and road network conditions
   */
  estimateTravelDurationMinutes(distanceKm: number, mode: TravelMode = 'driving'): number {
    // Average speeds in km/h:
    // Driving: 32 km/h (accounts for urban/peri-urban traffic)
    // Ambulance: 48 km/h (priority sirens and hospital corridor clearance)
    // Transit: 24 km/h (bus/auto stops)
    // Walking: 4.5 km/h
    let avgSpeedKmH = 32;
    if (mode === 'ambulance') avgSpeedKmH = 48;
    else if (mode === 'transit') avgSpeedKmH = 24;
    else if (mode === 'walking') avgSpeedKmH = 4.5;

    const hours = distanceKm / avgSpeedKmH;
    const minutes = Math.ceil(hours * 60);
    return Math.max(1, minutes);
  }

  /**
   * Verify if a user coordinate is within a facility's arrival geofence
   */
  isInsideGeofence(
    userCoords: { latitude: number; longitude: number },
    targetCoords: { latitude: number; longitude: number },
    geofenceRadiusMeters: number
  ): { isInside: boolean; distanceMeters: number } {
    const distanceMeters = this.calculateDistanceMeters(userCoords, targetCoords);
    return {
      isInside: distanceMeters <= geofenceRadiusMeters,
      distanceMeters
    };
  }

  /**
   * Generate realistic route polyline and turn navigation instructions
   */
  generateRouteDirections(
    origin: GeoCoordinates,
    destination: GeoCoordinates,
    destinationName: string,
    mode: TravelMode = 'driving'
  ): RouteDirections {
    const distanceKm = this.calculateDistance(origin, destination);
    const durationMinutes = this.estimateTravelDurationMinutes(distanceKm, mode);

    // Generate intermediate waypoints for polyline rendering
    const pointsCount = Math.max(4, Math.min(12, Math.round(distanceKm / 2)));
    const polyline: [number, number][] = [];

    for (let i = 0; i <= pointsCount; i++) {
      const fraction = i / pointsCount;
      // Slight natural curve perturbation for road realism
      const latWiggle = Math.sin(fraction * Math.PI) * 0.0025;
      const lngWiggle = Math.cos(fraction * Math.PI) * 0.0020;

      const lat = origin.latitude + (destination.latitude - origin.latitude) * fraction + latWiggle;
      const lng = origin.longitude + (destination.longitude - origin.longitude) * fraction + lngWiggle;
      polyline.push([lat, lng]);
    }

    const steps: NavigationStep[] = [
      {
        instruction: `Head towards ${destinationName} via primary medical corridor`,
        distanceMeters: Math.round(distanceKm * 200),
        durationSeconds: Math.round((durationMinutes * 60) * 0.2),
        turnType: 'straight'
      },
      {
        instruction: 'Continue on State Highway / Main Road towards hospital campus',
        distanceMeters: Math.round(distanceKm * 600),
        durationSeconds: Math.round((durationMinutes * 60) * 0.6),
        turnType: 'straight'
      },
      {
        instruction: `Arrive at ${destinationName} Patient Reception / Emergency Bay`,
        distanceMeters: Math.round(distanceKm * 200),
        durationSeconds: Math.round((durationMinutes * 60) * 0.2),
        turnType: 'arrive'
      }
    ];

    return {
      origin,
      destination,
      destinationName,
      distanceKm,
      durationMinutes,
      travelMode: mode,
      polyline,
      steps,
      trafficCongestion: distanceKm > 10 ? 'moderate' : 'low'
    };
  }

  // ==================== SAVED LOCATIONS ====================

  getSavedLocations(userId: string): SavedLocation[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const data = localStorage.getItem(`${STORAGE_SAVED_LOCATIONS}_${userId}`);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Failed to load saved locations', e);
    }

    // Default starting saved locations for demo/new patient
    const defaults: SavedLocation[] = [
      {
        id: 'loc-home-01',
        userId,
        type: 'home',
        label: 'Home (Rajam)',
        address: 'Main Road, Near Old Bus Stand, Rajam, AP 532127',
        coords: { latitude: 18.4500, longitude: 83.6550, timestamp: Date.now() },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: true
      },
      {
        id: 'loc-work-01',
        userId,
        type: 'work',
        label: 'Work (GMRIT Campus)',
        address: 'GMR Institute of Technology, Rajam, AP 532127',
        coords: { latitude: 18.4650, longitude: 83.6620, timestamp: Date.now() },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    this.saveLocations(userId, defaults);
    return defaults;
  }

  saveLocation(userId: string, locationData: Omit<SavedLocation, 'id' | 'createdAt' | 'updatedAt'>): SavedLocation {
    const list = this.getSavedLocations(userId);
    const newLocation: SavedLocation = {
      ...locationData,
      id: `loc-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (newLocation.isDefault) {
      list.forEach(l => l.isDefault = false);
    }

    list.push(newLocation);
    this.saveLocations(userId, list);
    return newLocation;
  }

  deleteSavedLocation(userId: string, locationId: string): void {
    let list = this.getSavedLocations(userId);
    list = list.filter(l => l.id !== locationId);
    this.saveLocations(userId, list);
  }

  private saveLocations(userId: string, list: SavedLocation[]) {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`${STORAGE_SAVED_LOCATIONS}_${userId}`, JSON.stringify(list));
      } catch (e) {
        console.warn('Failed to write saved locations', e);
      }
    }
  }

  // ==================== PRIVACY SETTINGS ====================

  getPrivacySettings(): LocationPrivacySettings {
    const defaults: LocationPrivacySettings = {
      allowGpsTracking: true,
      allowArrivalGeofencing: true,
      allowEmergencyBroadcast: true,
      dataRetentionDays: 30,
      anonymizeLocationLogs: false
    };

    if (typeof localStorage === 'undefined') return defaults;
    try {
      const data = localStorage.getItem(STORAGE_PRIVACY_SETTINGS);
      if (data) return { ...defaults, ...JSON.parse(data) };
    } catch (e) {
      console.warn('Failed to load location privacy settings', e);
    }
    return defaults;
  }

  updatePrivacySettings(settings: Partial<LocationPrivacySettings>): LocationPrivacySettings {
    const current = this.getPrivacySettings();
    const updated = { ...current, ...settings };
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_PRIVACY_SETTINGS, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save location privacy settings', e);
      }
    }
    return updated;
  }

  /**
   * Clear all stored GPS cookies and location logs (Right to be Forgotten)
   */
  clearAllLocationData(userId?: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_CACHED_LOCATION);
      if (userId) {
        localStorage.removeItem(`${STORAGE_SAVED_LOCATIONS}_${userId}`);
      }
    }
    this.cachedLocation = null;
  }
}

export const locationService = new LocationService();
