/**
 * Olmera Healthcare - Appointment Navigation & Geofence Arrival Service
 * Handles hospital route generation, travel time estimates, campus geofencing,
 * and privacy-preserving arrival notifications for clinic desks.
 */

import { ArrivalCheckInResult, RouteDirections, TravelMode, GeoCoordinates } from './types';
import { locationService } from './locationService';
import { facilitiesService } from './facilitiesService';
import { HEALTHCARE_FACILITIES } from './facilitiesRegistry';

const STORAGE_ARRIVAL_CHECKINS = 'olmera_arrival_checkins';

export class AppointmentNavigationService {
  /**
   * Calculate navigation directions from patient location to appointment hospital
   */
  getDirectionsForAppointment(
    patientCoords: GeoCoordinates,
    hospitalIdOrName: string,
    travelMode: TravelMode = 'driving'
  ): RouteDirections | null {
    // Attempt lookup by ID or fuzzy name match
    let facility = facilitiesService.getFacilityById(hospitalIdOrName);
    if (!facility) {
      facility = HEALTHCARE_FACILITIES.find(f => 
        f.name.toLowerCase().includes(hospitalIdOrName.toLowerCase()) ||
        hospitalIdOrName.toLowerCase().includes(f.name.toLowerCase())
      );
    }

    if (!facility) {
      // Default to Rajam anchor hospital if facility not recognized
      facility = HEALTHCARE_FACILITIES[0];
    }

    const route = locationService.generateRouteDirections(
      patientCoords,
      facility.coords,
      facility.name,
      travelMode
    );
    route.destinationFacilityId = facility.id;

    return route;
  }

  /**
   * Verify patient proximity to hospital campus and perform geofenced arrival check-in
   */
  performArrivalCheckIn(params: {
    appointmentId: string;
    patientId: string;
    hospitalIdOrName: string;
    patientCoords: GeoCoordinates;
    forceManualOverride?: boolean;
  }): ArrivalCheckInResult {
    let facility = facilitiesService.getFacilityById(params.hospitalIdOrName);
    if (!facility) {
      facility = HEALTHCARE_FACILITIES.find(f => 
        f.name.toLowerCase().includes(params.hospitalIdOrName.toLowerCase()) ||
        params.hospitalIdOrName.toLowerCase().includes(f.name.toLowerCase())
      ) || HEALTHCARE_FACILITIES[0];
    }

    const geofenceRadius = facility.geofenceRadiusMeters || 350;
    const { isInside, distanceMeters } = locationService.isInsideGeofence(
      params.patientCoords,
      facility.coords,
      geofenceRadius
    );

    const now = new Date().toISOString();

    if (params.forceManualOverride) {
      const result: ArrivalCheckInResult = {
        appointmentId: params.appointmentId,
        patientId: params.patientId,
        hospitalId: facility.id,
        distanceMeters,
        geofenceRadiusMeters: geofenceRadius,
        isInsideGeofence: isInside,
        checkInStatus: 'manual_override',
        timestamp: now,
        message: `Arrival verified manually at ${facility.name} reception desk.`
      };
      this.recordCheckIn(result);
      return result;
    }

    if (isInside) {
      const result: ArrivalCheckInResult = {
        appointmentId: params.appointmentId,
        patientId: params.patientId,
        hospitalId: facility.id,
        distanceMeters,
        geofenceRadiusMeters: geofenceRadius,
        isInsideGeofence: true,
        checkInStatus: 'checked_in',
        timestamp: now,
        message: `Welcome to ${facility.name}! You are within the campus boundary (${distanceMeters}m). Your consultation arrival is confirmed.`
      };
      this.recordCheckIn(result);
      return result;
    }

    return {
      appointmentId: params.appointmentId,
      patientId: params.patientId,
      hospitalId: facility.id,
      distanceMeters,
      geofenceRadiusMeters: geofenceRadius,
      isInsideGeofence: false,
      checkInStatus: 'outside_geofence',
      timestamp: now,
      message: `You are ${(distanceMeters / 1000).toFixed(1)} km away from ${facility.name}. Automatic arrival check-in will activate when you reach the campus (within ${geofenceRadius}m).`
    };
  }

  private recordCheckIn(checkIn: ArrivalCheckInResult) {
    if (typeof localStorage === 'undefined') return;
    try {
      const existing = this.getCheckInHistory();
      existing.unshift(checkIn);
      if (existing.length > 50) existing.pop();
      localStorage.setItem(STORAGE_ARRIVAL_CHECKINS, JSON.stringify(existing));
    } catch (e) {
      console.warn('Failed to record check-in', e);
    }
  }

  getCheckInHistory(): ArrivalCheckInResult[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_ARRIVAL_CHECKINS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Failed to read check-ins', e);
    }
    return [];
  }

  getCheckInForAppointment(appointmentId: string): ArrivalCheckInResult | undefined {
    return this.getCheckInHistory().find(c => c.appointmentId === appointmentId);
  }
}

export const appointmentNavigationService = new AppointmentNavigationService();
