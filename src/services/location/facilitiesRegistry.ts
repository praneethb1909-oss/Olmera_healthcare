/**
 * Olmera Healthcare - Healthcare Facilities Registry
 * Standardized GPS coordinates, emergency capabilities, diagnostic labs,
 * and certified 24/7 pharmacies across Andhra Pradesh (Rajam, Vizag, Srikakulam).
 */

import { HealthcareFacility } from './types';

export const HEALTHCARE_FACILITIES: HealthcareFacility[] = [
  // ==================== HOSPITALS ====================
  {
    id: 'hosp-rajam-01',
    name: 'GMR Varalakshmi Care Hospital',
    type: 'hospital',
    category: 'anchor_hub',
    address: 'GMR Nagar, Main Road, Rajam',
    city: 'Rajam',
    district: 'Vizianagaram / Srikakulam Region',
    pincode: '532127',
    phone: '+91 8941 251500',
    email: 'emergency.rajam@olmera.health',
    coords: {
      latitude: 18.4520,
      longitude: 83.6580,
      accuracy: 5,
      timestamp: Date.now()
    },
    rating: 4.8,
    reviewCount: 342,
    isOpen24x7: true,
    emergencyDepartment: true,
    icuAvailable: true,
    totalBeds: 150,
    availableBeds: 34,
    departments: ['Emergency Medicine', 'Cardiology', 'Orthopedics', 'General Surgery', 'Pediatrics', 'Obstetrics'],
    geofenceRadiusMeters: 350,
    imageUrl: '/images/hospital-rajam.webp'
  },
  {
    id: 'hosp-vizag-oims',
    name: 'Olmera Institute of Medical Sciences (OIMS)',
    type: 'hospital',
    category: 'tertiary_care',
    address: 'Health City, Chinagadila, Arilova',
    city: 'Visakhapatnam',
    district: 'Visakhapatnam',
    pincode: '530040',
    phone: '+91 891 2897000',
    email: 'clinical.vizag@olmera.health',
    coords: {
      latitude: 17.7612,
      longitude: 83.3375,
      accuracy: 5,
      timestamp: Date.now()
    },
    rating: 4.9,
    reviewCount: 820,
    isOpen24x7: true,
    emergencyDepartment: true,
    icuAvailable: true,
    totalBeds: 350,
    availableBeds: 78,
    departments: ['Trauma & Emergency', 'Cardiology & CTVS', 'Neurology & Neurosurgery', 'Oncology', 'Organ Transplant', 'Neonatology'],
    geofenceRadiusMeters: 500,
    imageUrl: '/images/hospital-vizag.webp'
  },
  {
    id: 'hosp-srikakulam-care',
    name: 'Olmera Care Hospital Srikakulam',
    type: 'hospital',
    category: 'anchor_hub',
    address: 'Day & Night Junction, GT Road, Srikakulam',
    city: 'Srikakulam',
    district: 'Srikakulam',
    pincode: '532001',
    phone: '+91 8942 279100',
    email: 'care.srikakulam@olmera.health',
    coords: {
      latitude: 18.2980,
      longitude: 83.8985,
      accuracy: 5,
      timestamp: Date.now()
    },
    rating: 4.7,
    reviewCount: 410,
    isOpen24x7: true,
    emergencyDepartment: true,
    icuAvailable: true,
    totalBeds: 200,
    availableBeds: 42,
    departments: ['Emergency Trauma Unit', 'Internal Medicine', 'Cardiology', 'Pulmonology', 'Orthopedics'],
    geofenceRadiusMeters: 400,
    imageUrl: '/images/hospital-srikakulam.webp'
  },
  {
    id: 'hosp-vizag-specialty',
    name: 'Olmera Specialty Institute MVP',
    type: 'hospital',
    category: 'specialty_center',
    address: 'Sector 6, MVP Colony, Visakhapatnam',
    city: 'Visakhapatnam',
    district: 'Visakhapatnam',
    pincode: '530017',
    phone: '+91 891 2548200',
    email: 'specialty.mvp@olmera.health',
    coords: {
      latitude: 17.7340,
      longitude: 83.3150,
      accuracy: 6,
      timestamp: Date.now()
    },
    rating: 4.8,
    reviewCount: 520,
    isOpen24x7: true,
    emergencyDepartment: true,
    icuAvailable: true,
    totalBeds: 300,
    availableBeds: 56,
    departments: ['Maternal & Child Health', 'Pediatrics', 'Fertility & IVF', 'Gastroenterology'],
    geofenceRadiusMeters: 300,
    imageUrl: '/images/hospital-institute.webp'
  },
  {
    id: 'hosp-vizag-apollo',
    name: 'Apollo Hospitals Ramnagar',
    type: 'hospital',
    category: 'tertiary_care',
    address: 'Waltair Main Road, Ramnagar, Visakhapatnam',
    city: 'Visakhapatnam',
    district: 'Visakhapatnam',
    pincode: '530002',
    phone: '+91 891 2727272',
    email: 'apollo.vizag@olmera.health',
    coords: {
      latitude: 17.7125,
      longitude: 83.3090,
      accuracy: 5,
      timestamp: Date.now()
    },
    rating: 4.7,
    reviewCount: 940,
    isOpen24x7: true,
    emergencyDepartment: true,
    icuAvailable: true,
    totalBeds: 280,
    availableBeds: 39,
    departments: ['Cardiology', 'Nephrology', 'Critical Care', 'Endocrinology'],
    geofenceRadiusMeters: 350
  },
  {
    id: 'hosp-srikakulam-medicover',
    name: 'Medicover Hospitals Srikakulam',
    type: 'hospital',
    category: 'specialty_center',
    address: 'Near Collectorate, Palakonda Road, Srikakulam',
    city: 'Srikakulam',
    district: 'Srikakulam',
    pincode: '532001',
    phone: '+91 8942 299999',
    email: 'medicover.sklm@olmera.health',
    coords: {
      latitude: 18.3015,
      longitude: 83.9020,
      accuracy: 8,
      timestamp: Date.now()
    },
    rating: 4.6,
    reviewCount: 310,
    isOpen24x7: true,
    emergencyDepartment: true,
    icuAvailable: true,
    totalBeds: 180,
    availableBeds: 28,
    departments: ['Emergency Medicine', 'General Medicine', 'Neurology'],
    geofenceRadiusMeters: 300
  },

  // ==================== OUTPATIENT CLINICS ====================
  {
    id: 'clinic-rajam-outpatient',
    name: 'Olmera Community Health Pavilion Rajam',
    type: 'clinic',
    category: 'outpatient_clinic',
    address: 'Opp. RTC Complex, Station Road, Rajam',
    city: 'Rajam',
    district: 'Vizianagaram',
    pincode: '532127',
    phone: '+91 8941 252110',
    email: 'clinic.rajam@olmera.health',
    coords: {
      latitude: 18.4485,
      longitude: 83.6530,
      accuracy: 8,
      timestamp: Date.now()
    },
    rating: 4.9,
    reviewCount: 180,
    isOpen24x7: false,
    emergencyDepartment: false,
    icuAvailable: false,
    departments: ['Family Medicine', 'Diabetes & Hypertension Care', 'Preventative Cardiology', 'Geriatrics'],
    geofenceRadiusMeters: 150
  },
  {
    id: 'clinic-vizag-gajuwaka',
    name: 'Olmera Primary Care Clinic Gajuwaka',
    type: 'clinic',
    category: 'outpatient_clinic',
    address: 'High School Road, Gajuwaka, Visakhapatnam',
    city: 'Visakhapatnam',
    district: 'Visakhapatnam',
    pincode: '530026',
    phone: '+91 891 2510200',
    email: 'clinic.gajuwaka@olmera.health',
    coords: {
      latitude: 17.6910,
      longitude: 83.2120,
      accuracy: 10,
      timestamp: Date.now()
    },
    rating: 4.6,
    reviewCount: 145,
    isOpen24x7: false,
    emergencyDepartment: false,
    icuAvailable: false,
    departments: ['General Medicine', 'Pediatrics', 'Vaccination Center'],
    geofenceRadiusMeters: 150
  },

  // ==================== 24/7 PHARMACIES ====================
  {
    id: 'pharmacy-rajam-sanjeevani',
    name: 'Sanjeevani 24/7 Pharmacy & Delivery Hub',
    type: 'pharmacy',
    category: 'retail_pharmacy',
    address: 'Hospital Junction, Near GMRIT Road, Rajam',
    city: 'Rajam',
    district: 'Vizianagaram',
    pincode: '532127',
    phone: '+91 8941 253300',
    email: 'pharmacy.rajam@olmera.health',
    coords: {
      latitude: 18.4510,
      longitude: 83.6565,
      accuracy: 5,
      timestamp: Date.now()
    },
    rating: 4.9,
    reviewCount: 220,
    isOpen24x7: true,
    emergencyDepartment: false,
    icuAvailable: false,
    pharmacyServices: {
      homeDelivery: true,
      deliveryRadiusKm: 25,
      estimatedDeliveryMins: 30,
      genericMedicines: true
    },
    geofenceRadiusMeters: 100
  },
  {
    id: 'pharmacy-vizag-healthcity',
    name: 'Olmera Express Pharmacy Arilova',
    type: 'pharmacy',
    category: 'retail_pharmacy',
    address: 'Shop 4, OIMS Campus, Health City, Arilova, Visakhapatnam',
    city: 'Visakhapatnam',
    district: 'Visakhapatnam',
    pincode: '530040',
    phone: '+91 891 2897555',
    email: 'pharmacy.arilova@olmera.health',
    coords: {
      latitude: 17.7600,
      longitude: 83.3360,
      accuracy: 5,
      timestamp: Date.now()
    },
    rating: 4.8,
    reviewCount: 460,
    isOpen24x7: true,
    emergencyDepartment: false,
    icuAvailable: false,
    pharmacyServices: {
      homeDelivery: true,
      deliveryRadiusKm: 30,
      estimatedDeliveryMins: 25,
      genericMedicines: true
    },
    geofenceRadiusMeters: 120
  },
  {
    id: 'pharmacy-vizag-mvp',
    name: 'MedPlus Express 24x7 MVP Colony',
    type: 'pharmacy',
    category: 'retail_pharmacy',
    address: 'Sector 3, Beside Rythu Bazar, MVP Colony, Visakhapatnam',
    city: 'Visakhapatnam',
    district: 'Visakhapatnam',
    pincode: '530017',
    phone: '+91 891 2704321',
    email: 'medplus.mvp@olmera.health',
    coords: {
      latitude: 17.7350,
      longitude: 83.3160,
      accuracy: 6,
      timestamp: Date.now()
    },
    rating: 4.7,
    reviewCount: 380,
    isOpen24x7: true,
    emergencyDepartment: false,
    icuAvailable: false,
    pharmacyServices: {
      homeDelivery: true,
      deliveryRadiusKm: 20,
      estimatedDeliveryMins: 20,
      genericMedicines: true
    },
    geofenceRadiusMeters: 100
  },
  {
    id: 'pharmacy-srikakulam-central',
    name: 'Care Pharmacy 24/7 Srikakulam Main',
    type: 'pharmacy',
    category: 'retail_pharmacy',
    address: '7 Roads Junction, Main Road, Srikakulam',
    city: 'Srikakulam',
    district: 'Srikakulam',
    pincode: '532001',
    phone: '+91 8942 278500',
    email: 'pharmacy.sklm@olmera.health',
    coords: {
      latitude: 18.2970,
      longitude: 83.8970,
      accuracy: 8,
      timestamp: Date.now()
    },
    rating: 4.8,
    reviewCount: 190,
    isOpen24x7: true,
    emergencyDepartment: false,
    icuAvailable: false,
    pharmacyServices: {
      homeDelivery: true,
      deliveryRadiusKm: 22,
      estimatedDeliveryMins: 35,
      genericMedicines: true
    },
    geofenceRadiusMeters: 100
  },

  // ==================== DIAGNOSTIC LABS ====================
  {
    id: 'lab-rajam-vijaya',
    name: 'Vijaya Clinical Diagnostic Lab Rajam',
    type: 'diagnostic_lab',
    category: 'diagnostic_center',
    address: 'Near Old Bus Stand, Court Road, Rajam',
    city: 'Rajam',
    district: 'Vizianagaram',
    pincode: '532127',
    phone: '+91 8941 254800',
    email: 'diagnostics.rajam@olmera.health',
    coords: {
      latitude: 18.4495,
      longitude: 83.6545,
      accuracy: 6,
      timestamp: Date.now()
    },
    rating: 4.8,
    reviewCount: 290,
    isOpen24x7: true,
    emergencyDepartment: false,
    icuAvailable: false,
    diagnosticServices: ['Complete Blood Picture (CBP)', 'Fasting Blood Glucose', 'Lipid Profile', 'Thyroid Profile (T3, T4, TSH)', 'Digital X-Ray', 'Ultrasound 2D/3D', 'ECG 12-Lead'],
    geofenceRadiusMeters: 150
  },
  {
    id: 'lab-vizag-lucid',
    name: 'Lucid Medical Diagnostics & MRI Center',
    type: 'diagnostic_lab',
    category: 'diagnostic_center',
    address: 'D.No 10-50-84, Siripuram Towers, Siripuram, Visakhapatnam',
    city: 'Visakhapatnam',
    district: 'Visakhapatnam',
    pincode: '530003',
    phone: '+91 891 2508800',
    email: 'lucid.siripuram@olmera.health',
    coords: {
      latitude: 17.7220,
      longitude: 83.3110,
      accuracy: 5,
      timestamp: Date.now()
    },
    rating: 4.9,
    reviewCount: 650,
    isOpen24x7: true,
    emergencyDepartment: false,
    icuAvailable: false,
    diagnosticServices: ['3T MRI Neuro & Musculoskeletal', '128-Slice CT Angiography', 'Automated Biochemistry & Immunology', 'Biomarker Requisition Panel', '2D Echocardiography', 'Mammography'],
    geofenceRadiusMeters: 200
  },
  {
    id: 'lab-srikakulam-suraksha',
    name: 'Suraksha Advanced Diagnostic Center Srikakulam',
    type: 'diagnostic_lab',
    category: 'diagnostic_center',
    address: 'Near RTC Complex, Palakonda Road, Srikakulam',
    city: 'Srikakulam',
    district: 'Srikakulam',
    pincode: '532001',
    phone: '+91 8942 284100',
    email: 'suraksha.sklm@olmera.health',
    coords: {
      latitude: 18.2990,
      longitude: 83.8990,
      accuracy: 6,
      timestamp: Date.now()
    },
    rating: 4.7,
    reviewCount: 230,
    isOpen24x7: true,
    emergencyDepartment: false,
    icuAvailable: false,
    diagnosticServices: ['Serum Creatinine & Electrolytes', 'HbA1c Glycated Hemoglobin', 'Liver Function Test (LFT)', 'Computed Radiography', 'ECG Telemetry', 'Microbiology Culture'],
    geofenceRadiusMeters: 150
  }
];

export const REGIONAL_CENTERS = {
  rajam: {
    name: 'Rajam',
    coords: { latitude: 18.4503, longitude: 83.6558, accuracy: 10, timestamp: Date.now() },
    label: 'Rajam Anchor Hub (Vizianagaram / Srikakulam Border)'
  },
  vizag: {
    name: 'Visakhapatnam',
    coords: { latitude: 17.6868, longitude: 83.2185, accuracy: 10, timestamp: Date.now() },
    label: 'Visakhapatnam Tertiary Care Center'
  },
  srikakulam: {
    name: 'Srikakulam',
    coords: { latitude: 18.2969, longitude: 83.8967, accuracy: 10, timestamp: Date.now() },
    label: 'Srikakulam Regional Network'
  }
};
