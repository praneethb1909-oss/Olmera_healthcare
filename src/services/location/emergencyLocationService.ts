/**
 * Olmera Healthcare - Emergency Location Services
 * Real-time emergency GPS capture, live location sharing sessions with explicit consent,
 * breadcrumbs, ambulance coordinator telemetry, and audited location history.
 */

import { EmergencyLiveSession, EmergencyLocationLog, UserLocation, GeoCoordinates } from './types';
import { facilitiesService } from './facilitiesService';

const STORAGE_EMERGENCY_SESSIONS = 'olmera_emergency_sessions';
const STORAGE_EMERGENCY_LOGS = 'olmera_emergency_logs';

export class EmergencyLocationService {
  private activeSessions: Map<string, EmergencyLiveSession> = new Map();

  constructor() {
    this.loadSessionsFromStorage();
  }

  private loadSessionsFromStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      const data = localStorage.getItem(STORAGE_EMERGENCY_SESSIONS);
      if (data) {
        const list: EmergencyLiveSession[] = JSON.parse(data);
        const now = Date.now();
        list.forEach(session => {
          // Check expiration
          if (new Date(session.expiresAt).getTime() > now && session.status === 'active') {
            this.activeSessions.set(session.sessionId, session);
          }
        });
      }
    } catch (e) {
      console.warn('Failed to load emergency sessions', e);
    }
  }

  private persistSessions() {
    if (typeof localStorage === 'undefined') return;
    try {
      const list = Array.from(this.activeSessions.values());
      localStorage.setItem(STORAGE_EMERGENCY_SESSIONS, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to persist emergency sessions', e);
    }
  }

  /**
   * Start an emergency assistance session with explicit user consent
   */
  startEmergencySession(params: {
    patientId: string;
    patientName: string;
    emergencyContactPhone?: string;
    location: UserLocation;
    severity?: 'critical' | 'urgent' | 'standard';
    notes?: string;
    consentDurationMinutes?: number;
  }): EmergencyLiveSession {
    const sessionId = `emg-session-${Date.now()}`;
    const durationMins = params.consentDurationMinutes || 60; // Auto-terminates after 60 mins
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMins * 60000).toISOString();

    // Resolve nearest hospital with emergency department
    const closestHospital = facilitiesService.getClosestEmergencyHospital(params.location.coords);

    const session: EmergencyLiveSession = {
      sessionId,
      patientId: params.patientId,
      patientName: params.patientName,
      emergencyContactPhone: params.emergencyContactPhone,
      assignedHospitalId: closestHospital?.id,
      assignedHospitalName: closestHospital?.name,
      status: 'active',
      explicitConsentGranted: true,
      consentGrantedAt: now.toISOString(),
      expiresAt,
      currentLocation: params.location,
      locationBreadcrumbs: [
        {
          coords: params.location.coords,
          timestamp: params.location.coords.timestamp || Date.now(),
          accuracy: params.location.coords.accuracy || 10
        }
      ],
      severity: params.severity || 'critical',
      notes: params.notes
    };

    this.activeSessions.set(sessionId, session);
    this.persistSessions();

    this.logAction({
      sessionId,
      patientId: params.patientId,
      action: 'session_started',
      recipientRole: 'ambulance_coordinator',
      approximateCoords: {
        latitude: params.location.coords.latitude,
        longitude: params.location.coords.longitude
      },
      accuracyMeters: params.location.coords.accuracy || 10
    });

    return session;
  }

  /**
   * Update live location during an active emergency session (breadcrumbs)
   */
  updateSessionLocation(sessionId: string, newLocation: UserLocation): EmergencyLiveSession | null {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.status !== 'active') return null;

    // Check expiration
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      session.status = 'resolved';
      this.persistSessions();
      return null;
    }

    session.currentLocation = newLocation;
    session.locationBreadcrumbs.push({
      coords: newLocation.coords,
      timestamp: Date.now(),
      accuracy: newLocation.coords.accuracy || 10
    });

    // Limit breadcrumbs to last 50 points to prevent storage bloat
    if (session.locationBreadcrumbs.length > 50) {
      session.locationBreadcrumbs.shift();
    }

    this.activeSessions.set(sessionId, session);
    this.persistSessions();

    this.logAction({
      sessionId,
      patientId: session.patientId,
      action: 'location_updated',
      recipientRole: 'ambulance_coordinator',
      approximateCoords: {
        latitude: newLocation.coords.latitude,
        longitude: newLocation.coords.longitude
      },
      accuracyMeters: newLocation.coords.accuracy || 10
    });

    return session;
  }

  /**
   * Stop/resolve an active emergency live location sharing session
   */
  stopEmergencySession(sessionId: string, reason: 'resolved' | 'cancelled' | 'arrived' = 'resolved'): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    session.status = reason;
    this.activeSessions.set(sessionId, session);
    this.persistSessions();

    this.logAction({
      sessionId,
      patientId: session.patientId,
      action: 'session_stopped',
      recipientRole: 'ambulance_coordinator',
      approximateCoords: {
        latitude: session.currentLocation.coords.latitude,
        longitude: session.currentLocation.coords.longitude
      },
      accuracyMeters: session.currentLocation.coords.accuracy || 10
    });

    return true;
  }

  getActiveSessionForPatient(patientId: string): EmergencyLiveSession | null {
    for (const session of this.activeSessions.values()) {
      if (session.patientId === patientId && session.status === 'active') {
        if (new Date(session.expiresAt).getTime() > Date.now()) {
          return session;
        } else {
          session.status = 'resolved';
          this.persistSessions();
        }
      }
    }
    return null;
  }

  getSession(sessionId: string): EmergencyLiveSession | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;
    if (new Date(session.expiresAt).getTime() < Date.now() && session.status === 'active') {
      session.status = 'resolved';
      this.persistSessions();
    }
    return session;
  }

  // ==================== EMERGENCY LOCATION LOGS & AUDIT ====================

  private logAction(data: Omit<EmergencyLocationLog, 'id' | 'timestamp'>) {
    if (typeof localStorage === 'undefined') return;
    try {
      const logs = this.getEmergencyLogs(data.patientId);
      const newLog: EmergencyLocationLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp: new Date().toISOString(),
        ...data
      };
      logs.unshift(newLog);

      // Keep up to 30 most recent logs
      if (logs.length > 30) logs.pop();

      localStorage.setItem(`${STORAGE_EMERGENCY_LOGS}_${data.patientId}`, JSON.stringify(logs));
    } catch (e) {
      console.warn('Failed to record emergency location log', e);
    }
  }

  getEmergencyLogs(patientId: string): EmergencyLocationLog[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const data = localStorage.getItem(`${STORAGE_EMERGENCY_LOGS}_${patientId}`);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Failed to read emergency location logs', e);
    }
    return [];
  }

  clearEmergencyLogs(patientId: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`${STORAGE_EMERGENCY_LOGS}_${patientId}`);
    }
  }
}

export const emergencyLocationService = new EmergencyLocationService();
