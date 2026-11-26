/**
 * Olmera Healthcare - Master Admin Portal & Credits Management Test Suite
 *
 * Verifies:
 * 1. Master Admin authentication & rejection of invalid credentials (using runtime-provisioned PBKDF2 hash)
 * 2. Strict RBAC restricting operations exclusively to Master Admin (super_admin)
 * 3. Credits Management (balances, allocations, usage deductions, insufficient balance guard, history)
 * 4. Full CRUD (Add, Read, Update, Delete) for Patients, Doctors, and Hospitals
 * 5. Input validation & Audit logging for all mutations
 */

if (typeof globalThis.localStorage === 'undefined') {
  const memLocal = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => memLocal.get(k) || null,
    setItem: (k: string, v: string) => memLocal.set(k, String(v)),
    removeItem: (k: string) => memLocal.delete(k),
    clear: () => memLocal.clear(),
  };
}

import { hospitalIdp } from '../auth/hospitalIdp';
import { issueLoginOtp, verifyLoginOtp, clearOtpChallenge, OTP_VALIDITY_SECONDS } from '../auth/otpService';
import { masterAdminService, MasterAdminActor } from '../admin/masterAdminService';
import { auditLogger } from '../auth/auditLogger';

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

async function runMasterAdminSuite() {
  console.log('\n======================================================');
  console.log('  OLMERA HEALTHCARE - MASTER ADMIN PORTAL TEST SUITE');
  console.log('======================================================\n');

  // 1. Authentication (provision ephemeral policy-compliant test credentials at runtime)
  console.log('\x1b[36m[1/8] Testing Master Admin Authentication...\x1b[0m');
  await hospitalIdp.initialize();
  const masterTestPass = `MasterTest#${Date.now().toString(36)}!A9`;
  const weakMasterAttempt = await hospitalIdp.bootstrapStaffCredential('praneethburada@gmail.com', 'weak123');
  assert(weakMasterAttempt === false, 'Uniform password policy rejects weak Master Admin password');
  const masterBootstrapped = await hospitalIdp.bootstrapStaffCredential('praneethburada@gmail.com', masterTestPass);
  assert(masterBootstrapped === true, 'Master Admin provisioned with policy-compliant PBKDF2-SHA256 hash');

  const authOk = await hospitalIdp.authenticate({
    hospitalId: 'hosp-1',
    staffIdOrEmail: 'praneethburada@gmail.com',
    password: masterTestPass,
    securityToken: '482910',
  });
  assert(authOk.success === true && authOk.user?.role === 'super_admin', 'Master Admin authenticated with PBKDF2-verified credentials');
  assert(Boolean(authOk.sessionToken), 'Secure session token issued for Master Admin');

  const authFail = await hospitalIdp.authenticate({
    hospitalId: 'hosp-1',
    staffIdOrEmail: 'praneethburada@gmail.com',
    password: 'WrongPassword@999',
    securityToken: '482910',
  });
  assert(authFail.success === false, 'Wrong Master Admin password rejected');

  const masterActor: MasterAdminActor = {
    staffId: authOk.user!.staffId,
    email: authOk.user!.email,
    fullName: authOk.user!.fullName,
    role: authOk.user!.role,
  };

  const nonMasterActor: MasterAdminActor = {
    staffId: 'OCH-ADM-01',
    email: 'admin.rajam@olmera.health',
    fullName: 'Facility Admin',
    role: 'hospital_administrator',
  };

  // 2. RBAC Enforcement
  console.log('\n\x1b[36m[2/6] Testing Master Admin Exclusive RBAC...\x1b[0m');
  const blockedCredit = await masterAdminService.allocateCredits(nonMasterActor, {
    amount: 1000,
    recipientOrTarget: 'Unauthorized Unit',
    purpose: 'Test bypass',
  });
  assert(blockedCredit.success === false, 'RBAC blocked non-master admin from allocating credits');

  const blockedDelete = await masterAdminService.deletePatient(nonMasterActor, 'pt-101');
  assert(blockedDelete.success === false, 'RBAC blocked non-master admin from deleting patient records');

  const emailSpoofNonSuperAdmin: MasterAdminActor = {
    staffId: 'OLM-SPOOF-01',
    email: 'praneethburada@gmail.com',
    fullName: 'Non-Super Role User',
    role: 'hospital_administrator',
  };
  assert(
    masterAdminService.isMasterAdmin(emailSpoofNonSuperAdmin) === false,
    'RBAC blocks master-admin email when assigned a non-super_admin role (no email bypass)'
  );

  // 3. Credits Management
  console.log('\n\x1b[36m[3/6] Testing Credits Management & History...\x1b[0m');
  const initialSummary = masterAdminService.getCreditSummary();
  const allocRes = await masterAdminService.allocateCredits(masterActor, {
    amount: 25000,
    recipientOrTarget: 'Olmera Care Hospital Srikakulam',
    purpose: 'Monthly Diagnostic OCR Allocation',
  });
  assert(allocRes.success === true && allocRes.summary?.availableCredits === initialSummary.availableCredits + 25000, 'Credit allocation increased available balance by 25,000');

  const usageRes = await masterAdminService.recordCreditUsage(masterActor, {
    amount: 5000,
    recipientOrTarget: 'Telehealth Engine',
    purpose: 'Video consultation routing batch',
  });
  assert(usageRes.success === true && usageRes.summary?.availableCredits === initialSummary.availableCredits + 20000, 'Credit usage deducted 5,000 from available balance');

  const overdrawRes = await masterAdminService.recordCreditUsage(masterActor, {
    amount: 999_999_999,
    recipientOrTarget: 'Test',
    purpose: 'Overdraw attempt',
  });
  assert(overdrawRes.success === false, 'Insufficient credit balance guard rejected overdraw');

  const history = masterAdminService.getCreditHistory();
  assert(history.length >= 2 && history[0].type === 'usage' && history[1].type === 'allocation', 'Credit usage & allocation history tracked accurately');

  // 4. Patients CRUD
  console.log('\n\x1b[36m[4/6] Testing Patients Full CRUD & Validation...\x1b[0m');
  const invalidPatient = await masterAdminService.addPatient(masterActor, {
    fullName: 'A',
    email: 'not-an-email',
    phone: '123',
    age: 30,
    gender: 'Male',
    bloodGroup: 'O+',
    city: 'Vizag',
    status: 'active',
  });
  assert(invalidPatient.success === false, 'Input validation rejected malformed patient email/name');

  const addedPatient = await masterAdminService.addPatient(masterActor, {
    fullName: 'Srinivas Rao',
    email: 'srinivas.rao@example.com',
    phone: '+91 98480 55443',
    age: 44,
    gender: 'Male',
    bloodGroup: 'B+',
    city: 'Rajam',
    status: 'active',
  });
  assert(addedPatient.success === true && !!addedPatient.record, 'Patient added successfully');

  const updatedPatient = await masterAdminService.updatePatient(masterActor, addedPatient.record!.id, { city: 'Visakhapatnam', age: 45 });
  assert(updatedPatient.success === true && updatedPatient.record?.city === 'Visakhapatnam', 'Patient updated successfully');

  const deletedPatient = await masterAdminService.deletePatient(masterActor, addedPatient.record!.id);
  assert(deletedPatient.success === true && !masterAdminService.getPatients().some(p => p.id === addedPatient.record!.id), 'Patient deleted successfully');

  // 5. Doctors CRUD
  console.log('\n\x1b[36m[5/6] Testing Doctors Full CRUD...\x1b[0m');
  const addedDoctor = await masterAdminService.addDoctor(masterActor, {
    fullName: 'Dr. Meera Krishnan',
    email: 'meera.k@olmera.health',
    phone: '+91 98490 22334',
    specialization: 'Neurology',
    qualification: 'MBBS, DM (Neurology)',
    experienceYears: 9,
    hospitalName: 'Olmera Institute of Medical Sciences',
    hierarchyRole: 'senior_consultant',
    status: 'active',
  });
  assert(addedDoctor.success === true && !!addedDoctor.record, 'Doctor added successfully');

  const updatedDoctor = await masterAdminService.updateDoctor(masterActor, addedDoctor.record!.id, { experienceYears: 10 });
  assert(updatedDoctor.success === true && updatedDoctor.record?.experienceYears === 10, 'Doctor updated successfully');

  const deletedDoctor = await masterAdminService.deleteDoctor(masterActor, addedDoctor.record!.id);
  assert(deletedDoctor.success === true && !masterAdminService.getDoctors().some(d => d.id === addedDoctor.record!.id), 'Doctor deleted successfully');

  // 6. Hospitals CRUD & Audit Log
  console.log('\n\x1b[36m[6/6] Testing Hospitals Full CRUD & Audit Logging...\x1b[0m');
  const addedHospital = await masterAdminService.addHospital(masterActor, {
    name: 'Olmera Coastal Pavilion',
    city: 'Kakinada',
    code: 'OCP-KKD',
    totalBeds: 180,
    icuBeds: 30,
    contactEmail: 'kakinada@olmera.health',
    status: 'operational',
  });
  assert(addedHospital.success === true && !!addedHospital.record, 'Hospital registered successfully');

  const updatedHospital = await masterAdminService.updateHospital(masterActor, addedHospital.record!.id, { icuBeds: 35, status: 'maintenance' });
  assert(updatedHospital.success === true && updatedHospital.record?.icuBeds === 35, 'Hospital updated successfully');

  const deletedHospital = await masterAdminService.deleteHospital(masterActor, addedHospital.record!.id);
  assert(deletedHospital.success === true && !masterAdminService.getHospitals().some(h => h.id === addedHospital.record!.id), 'Hospital deleted successfully');

  const logs = await auditLogger.getRecentLogs(50);
  assert(logs.some(l => l.email === 'praneethburada@gmail.com' && l.details.includes('Allocated')), 'Audit logs recorded credit allocation by Master Admin');
  assert(logs.some(l => l.details.includes('Deleted hospital')), 'Audit logs recorded delete operations');

  // 7. Hospital Admin Account Creation & Secure Password Reset
  console.log('\n\x1b[36m[7/7] Testing Hospital Admin Account Controls & Password Reset...\x1b[0m');
  const weakAdminPw = await hospitalIdp.createHospitalAdminAccount(masterActor, {
    fullName: 'Weak Admin',
    email: 'weak.admin@olmera.health',
    hospitalId: 'hosp-1',
    department: 'Operations',
    role: 'hospital_administrator',
    password: 'olmera123',
  });
  assert(weakAdminPw.success === false, 'Hospital password policy rejected weak admin password');

  const unauthAdminCreate = await hospitalIdp.createHospitalAdminAccount(
    { staffId: 'AUD-1', email: 'audit@olmera.health', role: 'audit_compliance_officer' },
    {
      fullName: 'Unauth Admin',
      email: 'unauth.admin@olmera.health',
      hospitalId: 'hosp-1',
      department: 'Operations',
      role: 'hospital_administrator',
      password: 'ValidClinical#2026!',
    }
  );
  assert(unauthAdminCreate.success === false, 'RBAC blocked non-privileged user from creating hospital admin accounts');

  const createdAdmin = await hospitalIdp.createHospitalAdminAccount(masterActor, {
    fullName: 'Dr. Kavitha Rao',
    email: 'kavitha.admin@olmera.health',
    hospitalId: 'hosp-2',
    department: 'Clinical Operations',
    role: 'hospital_administrator',
    password: 'ClinicalVault#2026!',
  });
  assert(createdAdmin.success === true && Boolean(createdAdmin.profile?.staffId), 'Created new Hospital Admin account with hashed credentials');

  const resetRes = await hospitalIdp.initiateAdminPasswordReset(masterActor, 'kavitha.admin@olmera.health', 'UpdatedVault#2026!');
  assert(resetRes.success === true && Boolean(resetRes.resetToken) && (resetRes.expiresAt || 0) > Date.now(), 'Initiated expiring single-use password reset for Hospital Admin');

  const loginWithNewPw = await hospitalIdp.authenticate({
    hospitalId: 'hosp-2',
    staffIdOrEmail: 'kavitha.admin@olmera.health',
    password: 'UpdatedVault#2026!',
    securityToken: '654321',
  });
  assert(loginWithNewPw.success === true, 'Newly reset Hospital Admin password authenticates successfully');

  console.log('\n[8/8] Testing Encrypted Credential Storage & Retrieval...');
  const hospTestPass = `FacilitySec#${Date.now().toString(36)}!B7`;
  const hospBootstrapped = await hospitalIdp.bootstrapStaffCredential('hospital.admin@olmera.health', hospTestPass);
  assert(hospBootstrapped === true, 'Hospital Admin provisioned with policy-compliant PBKDF2-SHA256 hash');

  const hospAdminMeta = await hospitalIdp.getCredentialRecordMetadata('hospital.admin@olmera.health');
  assert(
    hospAdminMeta !== null &&
      hospAdminMeta.staffId === 'OLM-HADM-01' &&
      hospAdminMeta.hospitalId === 'hosp-1' &&
      hospAdminMeta.role === 'hospital_administrator' &&
      hospAdminMeta.hasEncryptedPassword &&
      hospAdminMeta.hashAlgorithm.startsWith('PBKDF2'),
    'Hospital Admin credential persisted with PBKDF2 hash and hosp-1 FK'
  );

  const masterMeta = await hospitalIdp.getCredentialRecordMetadata('praneethburada@gmail.com');
  assert(
    masterMeta !== null &&
      masterMeta.staffId === 'OLM-MASTER-01' &&
      masterMeta.role === 'super_admin' &&
      masterMeta.hasEncryptedPassword &&
      masterMeta.hashAlgorithm.startsWith('PBKDF2'),
    'Master Admin credential persisted with PBKDF2 hash'
  );

  const hospAdminAuth = await hospitalIdp.authenticate({
    hospitalId: 'hosp-1',
    staffIdOrEmail: 'hospital.admin@olmera.health',
    password: hospTestPass,
    securityToken: '123456',
  });
  assert(hospAdminAuth.success === true && hospAdminAuth.user?.staffId === 'OLM-HADM-01', 'Hospital Admin authenticates against hosp-1 with encrypted password');

  const hospAdminWrongFacility = await hospitalIdp.authenticate({
    hospitalId: 'hosp-2',
    staffIdOrEmail: 'hospital.admin@olmera.health',
    password: hospTestPass,
    securityToken: '123456',
  });
  assert(hospAdminWrongFacility.success === false, 'Facility foreign-key check blocks Hospital Admin on mismatched hospital');

  console.log('\n[9/9] Testing Continuously Updating 30s OTP & Expiration Enforcement...');
  {
    const adminEmail = 'hospital.admin@olmera.health';
    clearOtpChallenge(adminEmail);

    // 1. Expired OTP must be rejected
    const expiredOtp = issueLoginOtp(adminEmail, OTP_VALIDITY_SECONDS, Date.now() - (OTP_VALIDITY_SECONDS + 1) * 1000);
    const expiredAuth = await hospitalIdp.authenticate({
      hospitalId: 'hosp-1',
      staffIdOrEmail: adminEmail,
      password: hospTestPass,
      securityToken: expiredOtp.code,
    });
    assert(expiredAuth.success === false, 'Expired admin OTP rejected during authentication');

    // 2. Refreshing OTP issues a new active code; old code rejected, new code accepted
    const freshOtp = issueLoginOtp(adminEmail, OTP_VALIDITY_SECONDS);
    assert(/^\d{6}$/.test(freshOtp.code) && freshOtp.ttlSeconds === 30, 'Fresh 6-digit OTP issued with 30s validity window');

    if (freshOtp.code !== expiredOtp.code) {
      const staleAuth = await hospitalIdp.authenticate({
        hospitalId: 'hosp-1',
        staffIdOrEmail: adminEmail,
        password: hospTestPass,
        securityToken: expiredOtp.code,
      });
      assert(staleAuth.success === false, 'Previous OTP rejected after automatic OTP refresh');
    }

    const activeAuth = await hospitalIdp.authenticate({
      hospitalId: 'hosp-1',
      staffIdOrEmail: adminEmail,
      password: hospTestPass,
      securityToken: freshOtp.code,
    });
    assert(activeAuth.success === true && activeAuth.user?.staffId === 'OLM-HADM-01', 'Active non-expired OTP accepted for admin authentication');

    // 3. Replay of used OTP rejected
    const replayAuth = await hospitalIdp.authenticate({
      hospitalId: 'hosp-1',
      staffIdOrEmail: adminEmail,
      password: hospTestPass,
      securityToken: freshOtp.code,
    });
    assert(replayAuth.success === false, 'Replay of already-used admin OTP rejected');

    // 4. Consistency with patient/doctor OTP verification
    const patientOtp = issueLoginOtp('patient@olmera.health', OTP_VALIDITY_SECONDS);
    assert(verifyLoginOtp('patient@olmera.health', patientOtp.code).valid === true, 'Patient/Doctor OTP verifies with same otpService');
    assert(verifyLoginOtp('patient@olmera.health', patientOtp.code).valid === false, 'Patient/Doctor OTP replay rejected');
    clearOtpChallenge(adminEmail);
    clearOtpChallenge('patient@olmera.health');
  }

  console.log('\n======================================================');
  console.log(`  MASTER ADMIN TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMasterAdminSuite().catch(err => {
  console.error('Master Admin test suite crashed:', err);
  process.exit(1);
});
