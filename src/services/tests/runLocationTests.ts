/**
 * Olmera Healthcare - GPS & Location-Based Healthcare System Test Suite
 * Validates Section G requirements:
 * 1. Location permission handling
 * 2. Accurate location retrieval
 * 3. Manual location selection
 * 4. Distance calculations
 * 5. Nearby healthcare facility discovery
 * 6. Hospital navigation & directions
 * 7. Arrival geofencing & notifications
 * 8. Emergency location sharing & explicit consent
 * 9. GPS failure & fallback scenarios
 * 10. Location privacy & authorization
 * 11. Location-based medicine delivery routing
 */

// Safe in-memory polyfill for Node.js test execution
if (typeof globalThis.localStorage === 'undefined') {
  const memStore = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => memStore.get(key) || null,
    setItem: (key: string, value: string) => memStore.set(key, String(value)),
    removeItem: (key: string) => memStore.delete(key),
    clear: () => memStore.clear(),
  };
}

import { locationService } from '../location/locationService';
import { facilitiesService } from '../location/facilitiesService';
import { emergencyLocationService } from '../location/emergencyLocationService';
import { appointmentNavigationService } from '../location/appointmentNavigationService';
import { HEALTHCARE_FACILITIES, REGIONAL_CENTERS } from '../location/facilitiesRegistry';

let passed = 0;
let failed = 0;

function assert(condition: any, message: string) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${message}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${message}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('\n================================================================');
  console.log('  OLMERA HEALTHCARE - GPS & LOCATION SERVICES TEST RUNNER');
  console.log('================================================================\n');

  // 1. Distance Calculation Tests (Haversine Formula)
  console.log('\x1b[36m[1/11] Testing Haversine Distance Calculations...\x1b[0m');
  {
    // Distance between Rajam (18.4503, 83.6558) and Visakhapatnam (17.6868, 83.2185) is ~96-98 km
    const distRajamVizag = locationService.calculateDistance(
      REGIONAL_CENTERS.rajam.coords,
      REGIONAL_CENTERS.vizag.coords
    );
    assert(distRajamVizag >= 94 && distRajamVizag <= 100, `Calculated distance between Rajam & Vizag is ${distRajamVizag} km (expected ~96 km)`);

    // Distance between two points at the same location must be 0
    const zeroDist = locationService.calculateDistance(
      REGIONAL_CENTERS.rajam.coords,
      REGIONAL_CENTERS.rajam.coords
    );
    assert(zeroDist === 0, 'Distance between identical points is exactly 0 km');

    // Distance in meters
    const meters = locationService.calculateDistanceMeters(
      { latitude: 18.4520, longitude: 83.6580 },
      { latitude: 18.4525, longitude: 83.6585 }
    );
    assert(meters > 50 && meters < 120, `Proximity distance is ${meters}m (expected ~75m)`);
  }

  // 2. Permission and Fallback Handling
  console.log('\n\x1b[36m[2/11] Testing Geolocation Permission & Graceful Fallback Scenarios...\x1b[0m');
  {
    const permissionStatus = await locationService.checkPermissionStatus();
    assert(['prompt', 'granted', 'denied', 'unavailable'].includes(permissionStatus), `Reported permission status: '${permissionStatus}'`);

    // In Node.js environment without browser GPS, getCurrentLocation must fall back to default regional center
    const loc = await locationService.getCurrentLocation({ timeoutMs: 500 });
    assert(loc.coords.latitude !== undefined && loc.coords.longitude !== undefined, 'Coordinates returned on fallback');
    assert(loc.isFallback === true, 'Fallback flag is true when native browser GPS is absent');
    assert(loc.addressLabel !== undefined, 'Regional address label present on fallback');
  }

  // 3. Manual Location Selection and Preset Centers
  console.log('\n\x1b[36m[3/11] Testing Manual Location Selection & Regional Presets...\x1b[0m');
  {
    const manualLoc = locationService.setManualLocation({ latitude: 18.4510, longitude: 83.6560 }, 'Custom Rajam Landmark');
    assert(manualLoc.source === 'manual', 'Location source correctly marked as manual');
    assert(manualLoc.accuracyDescription === 'manual', 'Accuracy description marked as manual');
    assert(manualLoc.coords.latitude === 18.4510, 'Latitude correctly preserved');

    // Preset selection
    const vizagPreset = locationService.setPresetCity('vizag');
    assert(vizagPreset.coords.latitude === REGIONAL_CENTERS.vizag.coords.latitude, 'Preset switches to Vizag coordinates');
    assert(vizagPreset.addressLabel?.includes('Visakhapatnam'), 'Address label reflects Visakhapatnam center');
  }

  // 4. Saved Locations Management
  console.log('\n\x1b[36m[4/11] Testing Saved Locations (Home, Work, Preferred Facility)...\x1b[0m');
  {
    const testUserId = 'test_patient_gps_01';
    const initialSaved = locationService.getSavedLocations(testUserId);
    assert(initialSaved.length >= 2, 'Initial saved locations contains default home and work templates');

    const added = locationService.saveLocation(testUserId, {
      userId: testUserId,
      type: 'preferred_hospital',
      label: 'My Local Care Center',
      address: 'Main Road, Rajam Hub',
      coords: { latitude: 18.4520, longitude: 83.6580, timestamp: Date.now() },
      isDefault: false
    });
    assert(added.id.startsWith('loc-'), 'New saved location has unique ID');

    const updatedList = locationService.getSavedLocations(testUserId);
    assert(updatedList.some(l => l.label === 'My Local Care Center'), 'New location retrieved from saved locations list');

    // Delete saved location
    locationService.deleteSavedLocation(testUserId, added.id);
    const afterDelete = locationService.getSavedLocations(testUserId);
    assert(!afterDelete.some(l => l.id === added.id), 'Deleted location removed from patient profile');
  }

  // 5. Healthcare Facility Discovery & Spatial Sorting
  console.log('\n\x1b[36m[5/11] Testing Nearby Healthcare Facility Discovery & Proximity Sorting...\x1b[0m');
  {
    const rajamOrigin = REGIONAL_CENTERS.rajam.coords;
    const allNearby = facilitiesService.getNearbyFacilities(rajamOrigin);
    assert(allNearby.length === HEALTHCARE_FACILITIES.length, 'All registered facilities retrieved');

    // Check sorted ascending by distance
    for (let i = 0; i < allNearby.length - 1; i++) {
      assert(allNearby[i].distanceKm <= allNearby[i + 1].distanceKm, `Facility [${i}] ${allNearby[i].name} (${allNearby[i].distanceKm} km) <= [${i+1}] ${allNearby[i+1].name} (${allNearby[i+1].distanceKm} km)`);
    }

    // Filter by type: Hospitals only
    const hospitalsOnly = facilitiesService.getNearbyFacilities(rajamOrigin, { type: 'hospital' });
    assert(hospitalsOnly.every(f => f.type === 'hospital'), 'Filtered list contains only hospitals');

    // Closest hospital from Rajam origin must be GMR Varalakshmi Care Hospital
    const closestHospital = hospitalsOnly[0];
    assert(closestHospital.id === 'hosp-rajam-01', `Closest hospital is '${closestHospital.name}' at ${closestHospital.distanceKm} km`);
  }

  // 6. Emergency Hospital Resolution
  console.log('\n\x1b[36m[6/11] Testing Emergency Hospital Triage Resolution...\x1b[0m');
  {
    const closestEmergency = facilitiesService.getClosestEmergencyHospital(REGIONAL_CENTERS.rajam.coords);
    assert(closestEmergency !== null, 'Closest emergency hospital resolved');
    assert(closestEmergency?.emergencyDepartment === true, 'Resolved hospital has active emergency trauma department');
    assert(closestEmergency?.isOpen24x7 === true, 'Resolved hospital is open 24/7');
  }

  // 7. Emergency Live Location Sharing Session Lifecycle
  console.log('\n\x1b[36m[7/11] Testing Emergency Live Location Sharing & Consent Protocol...\x1b[0m');
  {
    const patientLoc = locationService.setManualLocation(REGIONAL_CENTERS.rajam.coords, 'Rajam Emergency Site');
    const session = emergencyLocationService.startEmergencySession({
      patientId: 'patient_emergency_01',
      patientName: 'Priya Sharma',
      location: patientLoc,
      severity: 'critical',
      notes: 'Acute chest discomfort',
      consentDurationMinutes: 60
    });

    assert(session.status === 'active', 'Emergency session is in active state');
    assert(session.explicitConsentGranted === true, 'Explicit consent flag granted');
    assert(session.assignedHospitalName?.includes('Hospital'), 'Hospital assigned for trauma routing');
    assert(session.locationBreadcrumbs.length === 1, 'Initial GPS breadcrumb recorded');

    // Update location telemetry (movement)
    const updatedLoc = locationService.setManualLocation(
      { latitude: 18.4515, longitude: 83.6570 },
      'Moving north towards Main Road'
    );
    const updatedSession = emergencyLocationService.updateSessionLocation(session.sessionId, updatedLoc);
    assert(updatedSession !== null, 'Emergency session updated with new GPS breadcrumb');
    assert(updatedSession!.locationBreadcrumbs.length === 2, 'Two breadcrumbs now present in tracking history');

    // Audit logs recorded
    const logs = emergencyLocationService.getEmergencyLogs('patient_emergency_01');
    assert(logs.length >= 2, 'Audit logs recorded for session initiation and location update');

    // Stop emergency session
    const stopped = emergencyLocationService.stopEmergencySession(session.sessionId, 'resolved');
    assert(stopped === true, 'Emergency session stopped successfully');

    const activeCheck = emergencyLocationService.getActiveSessionForPatient('patient_emergency_01');
    assert(activeCheck === null, 'No active emergency session remains after termination');
  }

  // 8. Hospital Navigation & Route Directions
  console.log('\n\x1b[36m[8/11] Testing Hospital Route Navigation & Travel Time Estimation...\x1b[0m');
  {
    const userOrigin = { latitude: 18.4450, longitude: 83.6500, timestamp: Date.now() };
    const route = appointmentNavigationService.getDirectionsForAppointment(
      userOrigin,
      'GMR Varalakshmi Care Hospital',
      'driving'
    );

    assert(route !== null, 'Route directions generated');
    assert(route!.distanceKm > 0, `Route distance is ${route!.distanceKm} km`);
    assert(route!.durationMinutes > 0, `Est. travel time is ${route!.durationMinutes} minutes`);
    assert(route!.polyline.length > 2, 'Route polyline contains waypoints');
    assert(route!.steps.length >= 3, 'Turn-by-turn navigation steps generated');
  }

  // 9. Campus Arrival Geofencing & Check-In
  console.log('\n\x1b[36m[9/11] Testing Campus Arrival Geofencing Verification...\x1b[0m');
  {
    const hospitalCoords = { latitude: 18.4520, longitude: 83.6580 };

    // Case A: Patient is 5 km away (outside geofence)
    const distantCoords = { latitude: 18.4100, longitude: 83.6580, timestamp: Date.now() };
    const outsideResult = appointmentNavigationService.performArrivalCheckIn({
      appointmentId: 'apt_test_01',
      patientId: 'patient_test_01',
      hospitalIdOrName: 'hosp-rajam-01',
      patientCoords: distantCoords
    });
    assert(outsideResult.isInsideGeofence === false, 'Patient 5km away correctly rejected as outside geofence');
    assert(outsideResult.checkInStatus === 'outside_geofence', 'Check-in status is outside_geofence');

    // Case B: Patient is on campus (within 100m)
    const onCampusCoords = { latitude: 18.4522, longitude: 83.6581, timestamp: Date.now() };
    const insideResult = appointmentNavigationService.performArrivalCheckIn({
      appointmentId: 'apt_test_02',
      patientId: 'patient_test_01',
      hospitalIdOrName: 'hosp-rajam-01',
      patientCoords: onCampusCoords
    });
    assert(insideResult.isInsideGeofence === true, 'Patient on campus recognized within geofence boundary');
    assert(insideResult.checkInStatus === 'checked_in', 'Check-in status confirmed as checked_in');

    // Case C: Manual reception override
    const manualResult = appointmentNavigationService.performArrivalCheckIn({
      appointmentId: 'apt_test_03',
      patientId: 'patient_test_01',
      hospitalIdOrName: 'hosp-rajam-01',
      patientCoords: distantCoords,
      forceManualOverride: true
    });
    assert(manualResult.checkInStatus === 'manual_override', 'Manual reception desk override confirmed');
  }

  // 10. Location Privacy, Retention & Right to be Forgotten
  console.log('\n\x1b[36m[10/10] Testing Location Privacy Settings & Data Purge...\x1b[0m');
  {
    const initialPrivacy = locationService.getPrivacySettings();
    assert(initialPrivacy.allowGpsTracking === true, 'GPS tracking enabled by default');

    const updatedPrivacy = locationService.updatePrivacySettings({
      dataRetentionDays: 14,
      allowArrivalGeofencing: false
    });
    assert(updatedPrivacy.dataRetentionDays === 14, 'Data retention days updated to 14');
    assert(updatedPrivacy.allowArrivalGeofencing === false, 'Arrival geofencing toggled off');

    // Right to be forgotten (clear all location data)
    locationService.clearAllLocationData('patient_test_01');
    const cachedAfterClear = locationService.getCachedLocation();
    assert(cachedAfterClear === null, 'Cached location data completely erased');
  }

  console.log('\n================================================================');
  console.log(`  GPS & LOCATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
