/**
 * Olmera Healthcare - GPS and Location Services Type Definitions
 * Adheres to HIPAA/GDPR health data privacy and precision standards.
 */

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number; // In meters
  heading?: number | null; // Degrees 0-360
  speed?: number | null; // Meters per second
  timestamp: number;
}

export type LocationPermissionState = 'prompt' | 'granted' | 'denied' | 'unavailable';

export type LocationSource = 'gps' | 'network' | 'manual' | 'saved' | 'default';

export interface UserLocation {
  coords: GeoCoordinates;
  source: LocationSource;
  addressLabel?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  isFallback?: boolean;
  accuracyDescription?: 'high' | 'medium' | 'low' | 'manual';
}

export type SavedLocationType = 'home' | 'work' | 'preferred_hospital' | 'preferred_pharmacy' | 'custom';

export interface SavedLocation {
  id: string;
  userId: string;
  type: SavedLocationType;
  label: string;
  address: string;
  coords: GeoCoordinates;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
}

export type HealthcareFacilityType = 'hospital' | 'clinic' | 'pharmacy' | 'diagnostic_lab';

export interface HealthcareFacility {
  id: string;
  name: string;
  type: HealthcareFacilityType;
  category: 'anchor_hub' | 'tertiary_care' | 'specialty_center' | 'urgent_care' | 'outpatient_clinic' | 'retail_pharmacy' | 'diagnostic_center';
  address: string;
  city: string;
  district: string;
  pincode: string;
  phone: string;
  email: string;
  coords: GeoCoordinates;
  rating: number;
  reviewCount: number;
  isOpen24x7: boolean;
  emergencyDepartment: boolean;
  icuAvailable: boolean;
  totalBeds?: number;
  availableBeds?: number;
  departments?: string[];
  diagnosticServices?: string[];
  pharmacyServices?: {
    homeDelivery: boolean;
    deliveryRadiusKm: number;
    estimatedDeliveryMins: number;
    genericMedicines: boolean;
  };
  geofenceRadiusMeters: number; // Campus arrival boundary, typically 250m - 500m
  imageUrl?: string;
}

export type TravelMode = 'driving' | 'ambulance' | 'transit' | 'walking';

export interface NavigationStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  turnType: 'straight' | 'turn-left' | 'turn-right' | 'u-turn' | 'arrive';
}

export interface RouteDirections {
  origin: GeoCoordinates;
  destination: GeoCoordinates;
  destinationFacilityId?: string;
  destinationName: string;
  distanceKm: number;
  durationMinutes: number;
  travelMode: TravelMode;
  polyline: [number, number][]; // [lat, lng] waypoints
  steps: NavigationStep[];
  trafficCongestion?: 'low' | 'moderate' | 'heavy';
}

export interface ArrivalCheckInResult {
  appointmentId: string;
  patientId: string;
  hospitalId: string;
  distanceMeters: number;
  geofenceRadiusMeters: number;
  isInsideGeofence: boolean;
  checkInStatus: 'checked_in' | 'outside_geofence' | 'manual_override';
  timestamp: string;
  message: string;
}

export interface EmergencyLiveSession {
  sessionId: string;
  patientId: string;
  patientName: string;
  emergencyContactPhone?: string;
  assignedHospitalId?: string;
  assignedHospitalName?: string;
  status: 'active' | 'arrived' | 'resolved' | 'cancelled';
  explicitConsentGranted: boolean;
  consentGrantedAt: string;
  expiresAt: string; // Auto-terminates after configured duration for privacy
  currentLocation: UserLocation;
  locationBreadcrumbs: {
    coords: GeoCoordinates;
    timestamp: number;
    accuracy: number;
  }[];
  severity: 'critical' | 'urgent' | 'standard';
  notes?: string;
}

export interface EmergencyLocationLog {
  id: string;
  sessionId: string;
  patientId: string;
  timestamp: string;
  action: 'session_started' | 'location_updated' | 'session_shared' | 'session_stopped' | 'auto_expired';
  recipientRole: 'ambulance_coordinator' | 'emergency_team' | 'family_contact';
  approximateCoords: {
    latitude: number;
    longitude: number;
  };
  accuracyMeters: number;
}

export interface LocationPrivacySettings {
  allowGpsTracking: boolean;
  allowArrivalGeofencing: boolean;
  allowEmergencyBroadcast: boolean;
  dataRetentionDays: number;
  anonymizeLocationLogs: boolean;
}
