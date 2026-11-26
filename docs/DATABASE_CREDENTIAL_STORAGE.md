# Olmera Healthcare — Firebase Firestore Admin Credential Storage & Security Documentation

## 1. Overview
Administrative and privileged staff credentials (`hospital_administrator`, `super_admin`, `hospital_director`, `chief_medical_officer`, and `audit_compliance_officer`) are persisted in **Firebase Firestore** (`admins` and `user_roles` collections) — never in local browser `localStorage` or local SQL files — and never with hardcoded secrets in client source code.

## 2. Firebase Firestore Collections & Schema

### Collection: `admins/{adminId}`
| Field | Type | Validation / Relationship | Purpose |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Primary document ID (Firebase Auth UID or staff ID) | Unique credential record ID |
| `staff_id` | `string` | Unique staff identifier (e.g. `OLM-HADM-01`, `OLM-MASTER-01`) | Official hospital staff ID |
| `hospital_id` | `string` | Facility reference (e.g. `hosp-1`) | Accredited hospital affiliation |
| `hospital_name` | `string` | Non-empty string | Accredited facility display name |
| `email` | `string` | Lowercase institutional email | Login identifier |
| `full_name` | `string` | Non-empty string | Administrator full name |
| `department` | `string` | Non-empty string | Operational department |
| `role` | `string` | `super_admin` \| `hospital_administrator` \| `hospital_director` \| `chief_medical_officer` \| `audit_compliance_officer` | RBAC role |
| `password_hash` | `string` | `pbkdf2_sha256$100000$<hex>` | PBKDF2-SHA256 derived key (never plaintext) |
| `password_salt` | `string` | 128-bit random hex salt | Per-record cryptographic salt |
| `hash_algorithm` | `string` | `PBKDF2-SHA256-100000` | Hash algorithm identifier |
| `status` | `string` | `active` \| `suspended` \| `locked` | Account lifecycle state |
| `failed_attempts` | `number` | `0..5` | Lockout counter |
| `locked_until` | `string \| null` | ISO-8601 timestamp or `null` | Temporary lockout expiration |
| `mfa_enabled` | `boolean` | `true` | Mandatory 6-digit MFA enforcement flag |
| `created_at` / `updated_at` | `string` | ISO-8601 timestamp | Audit timestamps |

### Collection: `user_roles/{uid}`
Links Firebase Auth UIDs to `role` and `hospital_id` for Firestore Security Rules and portal routing.

## 3. Security & Encryption Controls
1. **Zero Hardcoded Secrets**: No passwords, secrets, or salts are hardcoded in client-side source (`src/services/auth/hospitalIdp.ts`, `src/components/**`) or seed scripts (`src/scripts/seed_auth.ts`).
2. **Environment-Variable Seeding**: `npm run seed:auth` (`src/scripts/seed_auth.ts`) reads `SEED_HOSPITAL_ADMIN_EMAIL`, `SEED_HOSPITAL_ADMIN_PASSWORD`, `SEED_MASTER_ADMIN_EMAIL`, and `SEED_MASTER_ADMIN_PASSWORD` from `.env` (server/CLI only), validates every password against `validateHospitalPassword`, and writes PBKDF2-SHA256 hashes + 128-bit random salts to Firebase Auth & Firestore `admins`.
3. **Uniform Password Policy**: `HospitalAdminLogin.tsx` and `hospitalIdp.ts` enforce `validateHospitalPassword` uniformly for **all** accounts, including `super_admin` (no exemptions).
4. **PBKDF2-SHA256 + Constant-Time Verification**: Passwords are derived with 100,000 iterations of PBKDF2-SHA256 (`hashPasswordPBKDF2`) and verified in constant time (`constantTimeEqual`).
5. **Firestore Security Rules (`firestore.rules`)**: `/admins/{adminId}` allows reads only for `isOwner(adminId) || isAdmin()` and writes only for `isAdmin()`, with all unmatched collections denied by default.
