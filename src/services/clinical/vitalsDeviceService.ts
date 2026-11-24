/**
 * Olmera Healthcare - Extended Vitals, Symptoms & Device Sync Service
 * Supports multidimensional vitals, activity/sleep tracking, and wearable synchronization.
 */

export interface VitalsEntry {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  pulseBpm?: number;
  spo2Percent?: number;
  weightKg?: number;
  bloodGlucoseFasting?: number; // mg/dL
  bloodGlucosePostPrandial?: number; // mg/dL
  dailySteps?: number;
  activeMinutes?: number;
  sleepHours?: number;
  sleepQualityScore?: number; // 0 - 100
  symptoms?: string[];
  recordedAt: string;
  source: 'manual' | 'apple_health' | 'health_connect' | 'device_bluetooth';
}

export interface WearableDeviceState {
  platform: 'apple_health' | 'google_health_connect' | 'fitbit';
  deviceName: string;
  isConnected: boolean;
  batteryLevel?: number;
  lastSyncTimestamp: string | null;
  syncMetrics: string[];
}

const STORAGE_VITALS_KEY = 'olmera_vitals_telemetry';
const STORAGE_DEVICES_KEY = 'olmera_wearable_devices';

export class VitalsDeviceService {
  getVitalsHistory(patientId: string): VitalsEntry[] {
    try {
      const data = localStorage.getItem(`${STORAGE_VITALS_KEY}_${patientId}`);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Vitals parsing warning:', e);
    }

    // Default historical telemetry for demo patient
    return [
      {
        bloodPressureSystolic: 122,
        bloodPressureDiastolic: 80,
        pulseBpm: 72,
        spo2Percent: 98,
        weightKg: 68.5,
        bloodGlucoseFasting: 96,
        bloodGlucosePostPrandial: 135,
        dailySteps: 7850,
        activeMinutes: 42,
        sleepHours: 7.4,
        sleepQualityScore: 88,
        symptoms: ['Mild evening fatigue'],
        recordedAt: new Date(Date.now() - 86400000).toISOString(),
        source: 'health_connect'
      },
      {
        bloodPressureSystolic: 128,
        bloodPressureDiastolic: 82,
        pulseBpm: 76,
        spo2Percent: 97,
        weightKg: 68.7,
        bloodGlucoseFasting: 104,
        bloodGlucosePostPrandial: 142,
        dailySteps: 6200,
        activeMinutes: 30,
        sleepHours: 6.8,
        sleepQualityScore: 78,
        symptoms: ['Morning eye strain'],
        recordedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        source: 'apple_health'
      },
      {
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 78,
        pulseBpm: 70,
        spo2Percent: 99,
        weightKg: 68.4,
        bloodGlucoseFasting: 92,
        bloodGlucosePostPrandial: 130,
        dailySteps: 9400,
        activeMinutes: 55,
        sleepHours: 8.0,
        sleepQualityScore: 92,
        symptoms: [],
        recordedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        source: 'manual'
      }
    ];
  }

  saveVitalsEntry(patientId: string, entry: Omit<VitalsEntry, 'recordedAt'>): VitalsEntry {
    const list = this.getVitalsHistory(patientId);
    const newEntry: VitalsEntry = {
      ...entry,
      recordedAt: new Date().toISOString()
    };

    list.unshift(newEntry);
    try {
      localStorage.setItem(`${STORAGE_VITALS_KEY}_${patientId}`, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save vitals entry', e);
    }
    return newEntry;
  }

  getConnectedDevices(patientId: string): WearableDeviceState[] {
    try {
      const data = localStorage.getItem(`${STORAGE_DEVICES_KEY}_${patientId}`);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Devices parsing warning:', e);
    }

    return [
      {
        platform: 'apple_health',
        deviceName: 'Apple Watch Series 9',
        isConnected: true,
        batteryLevel: 84,
        lastSyncTimestamp: new Date(Date.now() - 3600000).toISOString(),
        syncMetrics: ['Heart Rate', 'Blood Oxygen (SpO2)', 'Resting Energy', 'Daily Steps', 'Sleep Analysis']
      },
      {
        platform: 'google_health_connect',
        deviceName: 'Pixel Watch 2 / Health Connect',
        isConnected: false,
        lastSyncTimestamp: null,
        syncMetrics: ['Continuous Heart Rate', 'Skin Temperature', 'Blood Glucose', 'Daily Exercise']
      }
    ];
  }

  toggleDeviceConnection(patientId: string, platform: 'apple_health' | 'google_health_connect' | 'fitbit', connect: boolean): WearableDeviceState[] {
    const devices = this.getConnectedDevices(patientId);
    const dev = devices.find(d => d.platform === platform);
    if (dev) {
      dev.isConnected = connect;
      dev.lastSyncTimestamp = connect ? new Date().toISOString() : dev.lastSyncTimestamp;
      if (connect && !dev.batteryLevel) dev.batteryLevel = 90;
    }
    localStorage.setItem(`${STORAGE_DEVICES_KEY}_${patientId}`, JSON.stringify(devices));
    return devices;
  }

  recordManualVitals(patientId: string, params: {
    systolicBp?: number;
    bloodPressureSystolic?: number;
    diastolicBp?: number;
    bloodPressureDiastolic?: number;
    heartRate?: number;
    pulseBpm?: number;
    bloodGlucose?: number;
    bloodGlucoseFasting?: number;
    bloodGlucosePostPrandial?: number;
    sleepHours?: number;
    stepCount?: number;
    dailySteps?: number;
    symptoms?: string[];
  }): any {
    const systolic = params.systolicBp ?? params.bloodPressureSystolic ?? 120;
    const diastolic = params.diastolicBp ?? params.bloodPressureDiastolic ?? 80;
    const heartRate = params.heartRate ?? params.pulseBpm ?? 72;
    const glucose = params.bloodGlucose ?? params.bloodGlucoseFasting ?? 95;
    const flags: string[] = [];

    if (systolic >= 130 || diastolic >= 85) flags.push('High Blood Pressure');
    if (glucose > 140) flags.push('Elevated Blood Glucose');
    if (heartRate > 100) flags.push('Tachycardia');

    const entry: VitalsEntry = {
      bloodPressureSystolic: systolic,
      bloodPressureDiastolic: diastolic,
      pulseBpm: heartRate,
      bloodGlucoseFasting: glucose,
      sleepHours: params.sleepHours ?? 7,
      dailySteps: params.stepCount ?? params.dailySteps ?? 5000,
      symptoms: params.symptoms || [],
      source: 'manual',
      recordedAt: new Date().toISOString()
    };
    (entry as any).systolicBp = systolic;
    (entry as any).diastolicBp = diastolic;
    (entry as any).heartRate = heartRate;
    (entry as any).flags = flags;

    return this.saveVitalsEntry(patientId, entry);
  }

  syncWearableData(patientId: string, platform: 'apple_health' | 'google_health_connect' | string): any {
    const devices = this.getConnectedDevices(patientId);
    const dev = devices.find(d => d.platform === platform);
    if (dev) {
      dev.lastSyncTimestamp = new Date().toISOString();
      try {
        localStorage.setItem(`${STORAGE_DEVICES_KEY}_${patientId}`, JSON.stringify(devices));
      } catch (e) {
        console.warn('Wearable device persistence failed', e);
      }
    }

    // Generate synced telemetry
    const newEntry: VitalsEntry = {
      bloodPressureSystolic: 119 + Math.floor(Math.random() * 8),
      bloodPressureDiastolic: 78 + Math.floor(Math.random() * 6),
      pulseBpm: 68 + Math.floor(Math.random() * 10),
      spo2Percent: 98 + Math.floor(Math.random() * 2),
      weightKg: 68.5,
      bloodGlucoseFasting: 95 + Math.floor(Math.random() * 10),
      bloodGlucosePostPrandial: 132 + Math.floor(Math.random() * 15),
      dailySteps: 7500 + Math.floor(Math.random() * 2000),
      activeMinutes: 35 + Math.floor(Math.random() * 25),
      sleepHours: 7.2,
      sleepQualityScore: 85,
      symptoms: [],
      recordedAt: new Date().toISOString(),
      source: platform as any
    };

    const list = this.getVitalsHistory(patientId);
    list.unshift(newEntry);
    try {
      localStorage.setItem(`${STORAGE_VITALS_KEY}_${patientId}`, JSON.stringify(list));
    } catch (e) {
      console.warn('Vitals history persistence failed', e);
    }

    // Return hybrid response supporting both { latestEntry } and direct properties
    const res: any = {
      ...newEntry,
      syncedCount: 1,
      latestEntry: newEntry,
      stepCount: newEntry.dailySteps,
      heartRate: newEntry.pulseBpm,
      source: platform
    };
    return res;
  }
}

export const vitalsDeviceService = new VitalsDeviceService();
