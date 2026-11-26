import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { hashPasswordPBKDF2 } from '../services/security/securityControls';
import { validateHospitalPassword } from '../services/auth/passwordPolicy';

// Load environment variables from .env (never commit plaintext credentials to source control)
dotenv.config();

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val || !val.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val.trim();
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function getOrCreateUser(email: string, pass: string, name: string) {
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(userCred.user, { displayName: name });
    console.log(`Created new user: ${email} (UID: ${userCred.user.uid})`);
    return userCred.user.uid;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      const userCred = await signInWithEmailAndPassword(auth, email, pass);
      console.log(`User already exists, signed in: ${email} (UID: ${userCred.user.uid})`);
      return userCred.user.uid;
    }
    throw error;
  }
}

async function seedAuth() {
  console.log('Starting to seed Auth users and link them to Firebase Firestore...');

  try {
    const hospAdminEmail = requireEnv('SEED_HOSPITAL_ADMIN_EMAIL');
    const hospAdminPassword = requireEnv('SEED_HOSPITAL_ADMIN_PASSWORD');
    const masterAdminEmail = requireEnv('SEED_MASTER_ADMIN_EMAIL');
    const masterAdminPassword = requireEnv('SEED_MASTER_ADMIN_PASSWORD');

    const hospPwCheck = validateHospitalPassword(hospAdminPassword);
    if (!hospPwCheck.valid) {
      throw new Error(`SEED_HOSPITAL_ADMIN_PASSWORD violates policy: ${hospPwCheck.errors.join(', ')}`);
    }

    const masterPwCheck = validateHospitalPassword(masterAdminPassword);
    if (!masterPwCheck.valid) {
      throw new Error(`SEED_MASTER_ADMIN_PASSWORD violates policy: ${masterPwCheck.errors.join(', ')}`);
    }

    // 1. Seed Hospital Administrator Account (hosp-1) in Firebase Auth + Firestore `admins`
    const hospAdminUid = await getOrCreateUser(hospAdminEmail, hospAdminPassword, 'Dr. Ananya Rao');
    const hospAdminSec = await hashPasswordPBKDF2(hospAdminPassword);
    await setDoc(doc(db, 'user_roles', hospAdminUid), {
      user_id: hospAdminUid,
      role: 'hospital_administrator',
      hospital_id: 'hosp-1',
      created_at: new Date().toISOString()
    });
    await setDoc(doc(db, 'admins', hospAdminUid), {
      id: hospAdminUid,
      staff_id: 'OLM-HADM-01',
      hospital_id: 'hosp-1',
      hospital_name: 'Olmera Center for Health',
      email: hospAdminEmail.toLowerCase(),
      full_name: 'Dr. Ananya Rao',
      department: 'Hospital Operations & Clinical Administration',
      role: 'hospital_administrator',
      password_hash: hospAdminSec.hash,
      password_salt: hospAdminSec.salt,
      hash_algorithm: 'PBKDF2-SHA256-100000',
      status: 'active',
      failed_attempts: 0,
      locked_until: null,
      mfa_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    console.log(`Seeded Hospital Administrator (${hospAdminEmail}) in Firebase Firestore`);

    // 2. Seed Master Administrator Account in Firebase Auth + Firestore `admins`
    const masterAdminUid = await getOrCreateUser(masterAdminEmail, masterAdminPassword, 'Praneeth Burada');
    const masterAdminSec = await hashPasswordPBKDF2(masterAdminPassword);
    await setDoc(doc(db, 'user_roles', masterAdminUid), {
      user_id: masterAdminUid,
      role: 'super_admin',
      hospital_id: 'hosp-1',
      created_at: new Date().toISOString()
    });
    await setDoc(doc(db, 'admins', masterAdminUid), {
      id: masterAdminUid,
      staff_id: 'OLM-MASTER-01',
      hospital_id: 'hosp-1',
      hospital_name: 'Olmera Master Command Center',
      email: masterAdminEmail.toLowerCase(),
      full_name: 'Praneeth Burada',
      department: 'Master Network Governance & Security',
      role: 'super_admin',
      password_hash: masterAdminSec.hash,
      password_salt: masterAdminSec.salt,
      hash_algorithm: 'PBKDF2-SHA256-100000',
      status: 'active',
      failed_attempts: 0,
      locked_until: null,
      mfa_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    console.log(`Seeded Master Administrator (${masterAdminEmail}) in Firebase Firestore`);

    // 3. Optional Doctor & Patient seed accounts via environment variables
    const doctorEmail = process.env.SEED_DOCTOR_EMAIL?.trim();
    const doctorPassword = process.env.SEED_DOCTOR_PASSWORD?.trim();
    if (doctorEmail && doctorPassword) {
      const sureshUid = await getOrCreateUser(doctorEmail, doctorPassword, 'Dr. A Suresh');
      await setDoc(doc(db, 'user_roles', sureshUid), {
        user_id: sureshUid,
        role: 'doctor',
        hospital_id: 'hosp-5',
        created_at: new Date().toISOString()
      });
      const doctorsRef = collection(db, 'doctors');
      const q = query(doctorsRef, where('name', '==', 'Dr. A Suresh'));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        await updateDoc(doc(db, 'doctors', querySnapshot.docs[0].id), { user_id: sureshUid });
      }
      console.log(`Linked Doctor (${doctorEmail}) to user_roles`);
    }

    const patientEmail = process.env.SEED_PATIENT_EMAIL?.trim();
    const patientPassword = process.env.SEED_PATIENT_PASSWORD?.trim();
    if (patientEmail && patientPassword) {
      const patientUid = await getOrCreateUser(patientEmail, patientPassword, 'Demo Patient');
      await setDoc(doc(db, 'user_roles', patientUid), {
        user_id: patientUid,
        role: 'patient',
        hospital_id: null,
        created_at: new Date().toISOString()
      });
      await setDoc(doc(db, 'patients', patientUid), {
        id: patientUid,
        full_name: 'Demo Patient',
        email: patientEmail.toLowerCase(),
        age: 28,
        gender: 'Male',
        last_visit: new Date().toISOString(),
        created_at: new Date().toISOString()
      });
      console.log(`Linked Patient (${patientEmail}) to user_roles`);
    }

    console.log('Firebase Auth & Firestore seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding Auth:', error);
    process.exit(1);
  }
}

seedAuth();
