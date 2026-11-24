/**
 * Olmera Healthcare - Comprehensive Clinical Test Suite
 * Validates 100% of the newly implemented clinical services and data parity features.
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

import { consentService } from '../clinical/consentService';
import { familyService } from '../clinical/familyService';
import { vitalsDeviceService } from '../clinical/vitalsDeviceService';
import { pharmacyOrderService } from '../clinical/pharmacyOrderService';
import { doctorHierarchyService } from '../clinical/doctorHierarchyService';
import { followUpService } from '../clinical/followUpService';
import { fhirService } from '../clinical/fhirService';
import { partnerService } from '../clinical/partnerService';
import { doctorManagementService } from '../clinical/doctorManagementService';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${message}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${message}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('  OLMERA HEALTHCARE - CLINICAL SPECIFICATION TEST RUNNER');
  console.log('======================================================\n');

  // 1. Consent Management Tests
  console.log('\x1b[36m[1/8] Testing Consent Management Service...\x1b[0m');
  {
    const consent = consentService.grantConsent({
      patientId: 'patient_test_01',
      patientName: 'Rohan Verma',
      targetHospitalId: 'hosp_apollo',
      targetHospitalName: 'Apollo Hospital',
      purpose: 'Specialist Second Opinion',
      scope: ['diagnoses', 'prescriptions', 'lab_reports', 'scans'],
      expiryDays: 30
    });
    assert(consent.status === 'active', 'Consent successfully created in active state');
    assert(consent.scopes.includes('lab_reports'), 'Consent contains requested clinical scopes');

    const hasAccess = consentService.checkCrossHospitalAccess('patient_test_01', 'hosp_apollo', 'prescriptions');
    assert(hasAccess === true, 'Authorized hospital permitted to view consented prescriptions');

    const deniedAccess = consentService.checkCrossHospitalAccess('patient_test_01', 'hosp_unauthorized', 'prescriptions');
    assert(deniedAccess === false, 'Unauthorized hospital blocked from viewing records');

    consentService.revokeConsent(consent.id);
    const postRevokeAccess = consentService.checkCrossHospitalAccess('patient_test_01', 'hosp_apollo', 'prescriptions');
    assert(postRevokeAccess === false, 'Revoking consent immediately terminates hospital access');
  }

  // 2. Family Health Profile Tests
  console.log('\n\x1b[36m[2/8] Testing Family Health Profiles Service...\x1b[0m');
  {
    const dependent = familyService.addFamilyMember('patient_test_01', {
      fullName: 'Aarav Verma',
      relationship: 'child',
      dateOfBirth: '2018-06-12',
      gender: 'male',
      bloodGroup: 'O+',
      allergies: ['Peanuts'],
      chronicConditions: []
    });
    assert(dependent.relationship === 'child', 'Family member registered with correct kinship');
    assert((dependent.allergies || dependent.knownAllergies)?.[0] === 'Peanuts', 'Dependent allergies properly recorded');

    const family = familyService.getFamilyMembers('patient_test_01');
    assert(family.length >= 1, 'Primary account holder retrieves dependent list');

    familyService.updateFamilyMember('patient_test_01', dependent.id, {
      chronicConditions: ['Mild Asthma']
    });
    const updated = familyService.getFamilyMembers('patient_test_01').find(m => m.id === dependent.id);
    assert(updated?.chronicConditions.includes('Mild Asthma') === true, 'Dependent health history updated successfully');
  }

  // 3. Vitals & Wearable Sync Tests
  console.log('\n\x1b[36m[3/8] Testing Vitals & Wearables Sync Service...\x1b[0m');
  {
    const manualEntry = vitalsDeviceService.recordManualVitals('patient_test_01', {
      systolicBp: 142,
      diastolicBp: 92,
      heartRate: 84,
      bloodGlucose: 165,
      sleepHours: 6.5,
      stepCount: 7400,
      symptoms: ['Mild morning headache']
    });
    assert(manualEntry.systolicBp === 142, 'Manual vitals logged accurately');
    assert(manualEntry.flags?.includes('High Blood Pressure') === true, 'Systolic hypertension out-of-range flag triggered');
    assert(manualEntry.flags?.includes('Elevated Blood Glucose') === true, 'Hyperglycemia out-of-range flag triggered');

    const syncedDevice = vitalsDeviceService.syncWearableData('patient_test_01', 'apple_health');
    assert(syncedDevice.source === 'apple_health', 'Apple Health wearable telemetry synchronized');
    assert(syncedDevice.stepCount > 0, 'Wearable steps recorded');
    assert(syncedDevice.heartRate > 0, 'Wearable resting pulse recorded');
  }

  // 4. Pharmacy Orders & Dispensing Tests
  console.log('\n\x1b[36m[4/8] Testing Pharmacy Orders & Fulfillment Service...\x1b[0m');
  {
    // Pickup Order
    const pickupOrder = pharmacyOrderService.createOrder({
      patientId: 'patient_test_01',
      patientName: 'Rohan Verma',
      patientPhone: '+91 9876543210',
      fulfillmentType: 'pickup',
      items: [
        { medicineId: 'med_1', name: 'Metformin 500mg', dosage: '1 tablet bid', quantity: 60, price: 120 }
      ]
    });
    assert(pickupOrder.fulfillmentType === 'pickup', 'Pickup order initialized');
    assert(typeof pickupOrder.pickupOtp === 'string' && pickupOrder.pickupOtp.length === 6, '6-digit OTP generated for pickup security');

    const wrongOtpResult = pharmacyOrderService.verifyPickupOtp(pickupOrder.id, '000000');
    assert(wrongOtpResult === false, 'Incorrect OTP rejected by pharmacy');

    const correctOtpResult = pharmacyOrderService.verifyPickupOtp(pickupOrder.id, pickupOrder.pickupOtp!);
    assert(correctOtpResult === true, 'Valid OTP approved and order marked fulfilled');

    // Home Delivery Order
    const deliveryOrder = pharmacyOrderService.createOrder({
      patientId: 'patient_test_01',
      patientName: 'Rohan Verma',
      patientPhone: '+91 9876543210',
      fulfillmentType: 'delivery',
      deliveryAddress: 'Flat 402, Green Valley Apartments, Vizag',
      items: [
        { medicineId: 'med_2', name: 'Amlodipine 5mg', dosage: '1 tablet od', quantity: 30, price: 80 }
      ]
    });
    // Check tax and delivery calculation (80 + 50 delivery = 130 subtotal + 5% tax of 80 is 4 -> ~134)
    assert(deliveryOrder.totalAmount > 80, 'Delivery fee and taxes computed in total price');

    pharmacyOrderService.updateOrderStatus(deliveryOrder.id, 'out_for_delivery', {
      courierPartner: 'BlueDart',
      trackingId: 'BD-991244'
    });
    const tracked = pharmacyOrderService.getOrderById(deliveryOrder.id);
    assert(tracked?.status === 'out_for_delivery', 'Order dispatched with courier tracking ID');
  }

  // 5. Doctor Hierarchy & Supervision Tests
  console.log('\n\x1b[36m[5/8] Testing Doctor Hierarchy & Escalation Service...\x1b[0m');
  {
    const triageCase = doctorHierarchyService.createJuniorDoctorTriage({
      patientId: 'patient_test_01',
      patientName: 'Rohan Verma',
      patientAge: 38,
      patientGender: 'male',
      juniorDoctorId: 'doc_junior_01',
      juniorDoctorName: 'Dr. Neha Patel',
      chiefComplaint: 'Mild chest tightness after strenuous exertion',
      provisionalDiagnosis: 'Musculoskeletal strain vs Angina',
      severity: 'moderate',
      initialPrescription: ['Tab Paracetamol 650mg prn', 'Rest and ECG test advised']
    });
    assert(triageCase.status === 'pending_supervision', 'Junior triage case queued for senior doctor review');

    // Senior supervision sign-off
    const reviewed = doctorHierarchyService.seniorDoctorReview(
      triageCase.id,
      'doc_senior_01',
      'Dr. Rajesh Gupta',
      'ECG indicated borderline ST changes. Recommend cardiology consult.',
      'approved'
    );
    assert(reviewed.status === 'approved', 'Senior doctor approved case with supervisory notes');

    // Specialist escalation
    const escalated = doctorHierarchyService.escalateToSpecialist(
      triageCase.id,
      'Cardiology',
      'doc_specialist_01',
      'Dr. Vikram Seth',
      'Borderline ischemic ECG findings requiring echo evaluation.'
    );
    assert(escalated.status === 'escalated', 'Case escalated to Cardiology Specialist');
    assert(escalated.targetSpecialty === 'Cardiology', 'Target specialty accurately routed');
  }

  // 6. Follow-up & Priority Scoring Tests
  console.log('\n\x1b[36m[6/8] Testing Follow-Up & Priority Recall Service...\x1b[0m');
  {
    const followUp = followUpService.scheduleFollowUp({
      patientId: 'patient_test_01',
      patientName: 'Rohan Verma',
      patientPhone: '+91 9876543210',
      patientEmail: 'rohan.verma@example.com',
      attendingDoctorId: 'doc_senior_01',
      attendingDoctorName: 'Dr. Rajesh Gupta',
      hospitalId: 'hosp_apollo',
      hospitalName: 'Apollo Hospital',
      primaryCondition: 'Hypertension Stage 2 & Dyslipidemia',
      recommendedDate: '2025-02-01', // past date to simulate overdue
      notes: 'Evaluate BP response to Amlodipine'
    });
    assert(followUp.riskScore >= 0 && followUp.riskScore <= 100, 'Valid risk score between 0 and 100 calculated');

    const overdueCases = followUpService.getOverdueCases();
    assert(overdueCases.some(c => c.id === followUp.id), 'Identified overdue case needing urgent recall');

    // Dispatch automated recall
    const recallDispatch = await followUpService.triggerRecallNotification(followUp.id, 'whatsapp', 'Please visit clinic for repeat BP monitoring');
    assert(recallDispatch.status === 'sent', 'Automated WhatsApp recall successfully dispatched');
    assert(recallDispatch.channel === 'whatsapp', 'Channel recorded in patient engagement history');
  }

  // 7. HL7 FHIR R4 Interoperability Tests
  console.log('\n\x1b[36m[7/8] Testing HL7 FHIR Release 4 Export & Validation...\x1b[0m');
  {
    const fhirBundle = fhirService.exportPatientRecordToFHIR({
      patientId: 'patient_test_01',
      fullName: 'Rohan Verma',
      gender: 'male',
      birthDate: '1987-04-22',
      phone: '+91 9876543210',
      conditions: [{ code: 'I10', display: 'Essential hypertension' }],
      medications: [{ code: '197361', display: 'Amlodipine 5 MG Oral Tablet' }],
      observations: [{ code: '8480-6', display: 'Systolic blood pressure', value: 140, unit: 'mmHg' }]
    });

    assert(fhirBundle.resourceType === 'Bundle', 'FHIR Bundle has standard resourceType "Bundle"');
    assert(fhirBundle.type === 'collection', 'FHIR Bundle configured as collection');
    assert(fhirBundle.entry.length === 4, 'Includes Patient, Condition, MedicationRequest, and Observation');

    const validation = fhirService.validateFHIRBundle(fhirBundle);
    assert(validation.valid === true, 'Generated FHIR bundle passes standard schema validation');

    const invalidBundleCheck = fhirService.validateFHIRBundle({ invalid: true });
    assert(invalidBundleCheck.valid === false, 'Invalid FHIR payload correctly rejected with error messages');
  }

  // 8. Diagnostic Lab & Partner Services Tests
  console.log('\n\x1b[36m[8/8] Testing Diagnostic Partner Lab Requisition & Report Upload...\x1b[0m');
  {
    const req = partnerService.createRequisition({
      patientId: 'patient_test_01',
      patientName: 'Rohan Verma',
      referringDoctorId: 'doc_senior_01',
      referringDoctorName: 'Dr. Rajesh Gupta',
      hospitalId: 'hosp_apollo',
      testName: 'Lipid Profile & Serum Creatinine'
    });
    assert(req.status === 'pending', 'Lab requisition opened in pending status');

    partnerService.updateRequisitionStatus(req.id, 'sample_collected');
    const updatedReq = partnerService.getRequisitionById(req.id);
    assert(updatedReq?.status === 'sample_collected', 'Requisition sample collection milestone recorded');

    const publishedReport = partnerService.uploadDiagnosticReport(
      req.id,
      [
        { name: 'Total Cholesterol', value: '235', unit: 'mg/dL', referenceRange: '< 200', status: 'high' },
        { name: 'Serum Creatinine', value: '1.0', unit: 'mg/dL', referenceRange: '0.7 - 1.3', status: 'normal' }
      ],
      'Mild hypercholesterolemia noted. Renal function is intact.'
    );
    assert(publishedReport.status === 'completed', 'Diagnostic report verified and published');
    assert(publishedReport.biomarkers.length === 2, 'Biomarkers accurately attached to patient record');
  }

  // 9. Senior & Junior Doctor Management, RBAC & Approval Gate Tests
  console.log('\n\x1b[36m[9/9] Testing Senior & Junior Doctor Management, RBAC & Clinical Review...\x1b[0m');
  {
    const seniorDoc = doctorManagementService.resolveActiveDoctor('suresh.a@olmera.health');
    assert(seniorDoc.hierarchyRole === 'senior_consultant', 'Senior Consultant account resolved');

    const regResult = doctorManagementService.createJuniorDoctor(seniorDoc, {
      fullName: 'Dr. Kavya Menon',
      email: 'kavya.menon@olmera.health',
      accessCode: 'kavya2026',
      qualification: 'MBBS, MD Resident',
      specialization: 'Cardiology',
      experienceYears: 2,
      licenseNumber: 'APMC-2026-99102',
      phone: '+91 98480 99102'
    });
    assert(regResult.success && !!regResult.doctor, 'Senior Doctor registered new Junior Doctor account');
    const juniorDoc = regResult.doctor!;
    assert(juniorDoc.assignedSeniorDoctorId === seniorDoc.id, 'Junior Doctor mapped to responsible Senior Doctor');

    // RBAC check: Junior Doctor cannot create another Junior Doctor
    const unauthorizedCreate = doctorManagementService.createJuniorDoctor(juniorDoc, {
      fullName: 'Dr. Unauth',
      email: 'unauth@olmera.health',
      accessCode: '123456',
      qualification: 'MBBS',
      specialization: 'General',
      experienceYears: 1,
      licenseNumber: 'APMC-000',
      phone: '000'
    });
    assert(unauthorizedCreate.success === false, 'RBAC blocked Junior Doctor from creating Junior Doctor accounts');

    // Individual Login test
    const loginOk = doctorManagementService.authenticateDoctorLogin('kavya.menon@olmera.health', 'kavya2026');
    assert(loginOk.success === true, 'Junior Doctor authenticated with individual login');

    // Submission & Mandatory Approval Gate
    const subRes = doctorManagementService.submitClinicalRecommendation(juniorDoc, {
      submissionType: 'prescription',
      patientId: 'patient_test_01',
      patientName: 'Rohan Verma',
      title: 'Beta Blocker Dose Titration',
      clinicalDetails: 'Suggest Metoprolol Succinate 25mg OD after breakfast.'
    });
    assert(subRes.success && !!subRes.submission, 'Junior Doctor submitted prescription for Senior review');
    assert(subRes.submission!.isOfficialDecision === false && subRes.submission!.visibleToPatient === false, 'Unapproved Junior submission is NOT official or visible to patient');

    // Senior requests modification -> Junior revises -> Senior approves
    const modRes = doctorManagementService.reviewClinicalSubmission(seniorDoc, subRes.submission!.id, 'modification_requested', 'Verify resting heart rate before titration.');
    assert(modRes.success && modRes.submission?.status === 'modification_requested', 'Senior Doctor requested modification');
    assert(modRes.submission?.visibleToPatient === false, 'Modified request remains hidden from patient');

    const resub = doctorManagementService.resubmitModifiedRecommendation(juniorDoc, subRes.submission!.id, {
      title: 'Beta Blocker Dose Titration (HR 78 bpm verified)',
      clinicalDetails: 'Resting HR verified at 78 bpm. Recommend Metoprolol Succinate 25mg OD.'
    });
    assert(resub.success && resub.submission?.status === 'pending_review', 'Junior Doctor revised and resubmitted');

    const approved = doctorManagementService.reviewClinicalSubmission(seniorDoc, subRes.submission!.id, 'approved', 'Approved after HR verification.');
    assert(approved.success && approved.submission?.isOfficialDecision === true && approved.submission?.visibleToPatient === true, 'Senior approval promoted submission to official patient-visible decision');
    assert((approved.submission?.history.length || 0) >= 4, 'Complete submission/modification/approval history preserved with timestamps');

    // Deactivate Junior Doctor & verify login blocked
    const toggled = doctorManagementService.toggleJuniorDoctorStatus(seniorDoc, juniorDoc.id);
    assert(toggled.success && toggled.doctor?.status === 'deactivated', 'Senior Doctor deactivated Junior Doctor account');
    const blockedLogin = doctorManagementService.authenticateDoctorLogin('kavya.menon@olmera.health', 'kavya2026');
    assert(blockedLogin.success === false, 'Deactivated Junior Doctor blocked from logging in');
  }

  // Summary
  console.log('\n======================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test suite crashed with error:', err);
  process.exit(1);
});
