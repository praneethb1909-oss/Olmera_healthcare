/**
 * Olmera Healthcare - Facilities Discovery Service
 * Provides spatial queries, distance sorting, emergency triage lookup,
 * and service filtering for hospitals, clinics, pharmacies, and diagnostic centers.
 */

import { HealthcareFacility, HealthcareFacilityType, GeoCoordinates } from './types';
import { HEALTHCARE_FACILITIES } from './facilitiesRegistry';
import { locationService } from './locationService';

export interface FacilitySearchFilters {
  type?: HealthcareFacilityType | 'all';
  searchQuery?: string;
  city?: string;
  maxDistanceKm?: number;
  isOpen24x7?: boolean;
  emergencyOnly?: boolean;
  homeDeliveryOnly?: boolean;
  department?: string;
  diagnosticTest?: string;
}

export interface FacilityWithDistance extends HealthcareFacility {
  distanceKm: number;
  durationMinutes: number;
}

export class FacilitiesService {
  private facilities: HealthcareFacility[] = HEALTHCARE_FACILITIES;

  getAllFacilities(): HealthcareFacility[] {
    return [...this.facilities];
  }

  getFacilityById(id: string): HealthcareFacility | undefined {
    return this.facilities.find(f => f.id === id);
  }

  /**
   * Search and filter facilities with live distance sorting from user's coordinates
   */
  getNearbyFacilities(
    userCoords: { latitude: number; longitude: number },
    filters?: FacilitySearchFilters
  ): FacilityWithDistance[] {
    let result = this.facilities.map(facility => {
      const distanceKm = locationService.calculateDistance(userCoords, facility.coords);
      const durationMinutes = locationService.estimateTravelDurationMinutes(distanceKm, 'driving');
      return {
        ...facility,
        distanceKm,
        durationMinutes
      };
    });

    if (!filters) {
      return result.sort((a, b) => a.distanceKm - b.distanceKm);
    }

    // Filter by type
    if (filters.type && filters.type !== 'all') {
      result = result.filter(f => f.type === filters.type);
    }

    // Filter by city
    if (filters.city && filters.city !== 'All') {
      result = result.filter(f => f.city.toLowerCase() === filters.city!.toLowerCase());
    }

    // Filter by 24x7 status
    if (filters.isOpen24x7) {
      result = result.filter(f => f.isOpen24x7);
    }

    // Filter by emergency department
    if (filters.emergencyOnly) {
      result = result.filter(f => f.emergencyDepartment);
    }

    // Filter by pharmacy home delivery
    if (filters.homeDeliveryOnly) {
      result = result.filter(f => f.pharmacyServices?.homeDelivery === true);
    }

    // Filter by department
    if (filters.department) {
      const deptLower = filters.department.toLowerCase();
      result = result.filter(f => f.departments?.some(d => d.toLowerCase().includes(deptLower)));
    }

    // Filter by diagnostic test
    if (filters.diagnosticTest) {
      const testLower = filters.diagnosticTest.toLowerCase();
      result = result.filter(f => f.diagnosticServices?.some(s => s.toLowerCase().includes(testLower)));
    }

    // Filter by text search query
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      result = result.filter(f => 
        f.name.toLowerCase().includes(q) ||
        f.address.toLowerCase().includes(q) ||
        f.city.toLowerCase().includes(q) ||
        f.departments?.some(d => d.toLowerCase().includes(q)) ||
        f.diagnosticServices?.some(s => s.toLowerCase().includes(q))
      );
    }

    // Filter by max distance in km
    if (filters.maxDistanceKm && filters.maxDistanceKm > 0) {
      result = result.filter(f => f.distanceKm <= filters.maxDistanceKm!);
    }

    // Sort ascending by distance (nearest facility first)
    return result.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  /**
   * Find closest hospital with 24/7 Emergency Care for immediate dispatch
   */
  getClosestEmergencyHospital(userCoords: { latitude: number; longitude: number }): FacilityWithDistance | null {
    const hospitals = this.getNearbyFacilities(userCoords, {
      type: 'hospital',
      emergencyOnly: true
    });
    return hospitals.length > 0 ? hospitals[0] : null;
  }

  /**
   * Find nearby certified pharmacies within delivery radius
   */
  getNearbyPharmaciesForDelivery(userCoords: { latitude: number; longitude: number }): FacilityWithDistance[] {
    const pharmacies = this.getNearbyFacilities(userCoords, {
      type: 'pharmacy',
      homeDeliveryOnly: true
    });

    // Check if user is within the pharmacy's specific delivery radius
    return pharmacies.filter(p => {
      const maxRadius = p.pharmacyServices?.deliveryRadiusKm || 15;
      return p.distanceKm <= maxRadius;
    });
  }

  /**
   * Find nearby diagnostic laboratories offering a specific requisition test
   */
  getNearbyDiagnosticLabs(
    userCoords: { latitude: number; longitude: number }, 
    testName?: string
  ): FacilityWithDistance[] {
    return this.getNearbyFacilities(userCoords, {
      type: 'diagnostic_lab',
      diagnosticTest: testName
    });
  }
}

export const facilitiesService = new FacilitiesService();
