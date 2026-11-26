import React from 'react';
import {
  OlmeraPulseIcon,
  OlmeraCalendarIcon,
  OlmeraConsultIcon,
  OlmeraShieldIcon,
  OlmeraHospitalIcon,
} from '../icons/OlmeraIcons';
import { usePlatformDesign } from '../../hooks/usePlatformDesign';

interface MobileBottomNavProps {
  currentView: string;
  setView: (view: any) => void;
  role: 'admin' | 'doctor' | 'patient';
}

function NavHomeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3.5 10.5L12 3.8l8.5 6.7V19a1.8 1.8 0 0 1-1.8 1.8H5.3A1.8 1.8 0 0 1 3.5 19v-8.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.5 20.8v-5.5h5v5.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function NavAlertIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 8.5a6 6 0 1 0-12 0c0 6.5-2.5 8-2.5 8h17S18 15 18 8.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10.3 20a1.9 1.9 0 0 0 3.4 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function NavChatIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.5 6.5A2.5 2.5 0 0 1 7 4h10a2.5 2.5 0 0 1 2.5 2.5v7.5A2.5 2.5 0 0 1 17 16.5H9.5L5 20v-3.5A2.5 2.5 0 0 1 4.5 14V6.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NavPlusIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Platform-adaptive mobile bottom navigation bar:
 * - iOS (Human Interface Guidelines): Translucent frosted tab bar with crisp hairline border and subtle active tint.
 * - Android (Material Design 3): Tonal surface navigation bar with rounded active pill indicator.
 */
export function MobileBottomNav({ currentView, setView, role }: MobileBottomNavProps) {
  const { isIOS, triggerTabHaptic, triggerActionHaptic } = usePlatformDesign();

  const getNavItems = () => {
    if (role === 'doctor') {
      return [
        { id: 'doctor-portal', label: 'Home', icon: NavHomeIcon },
        { id: 'doctor-appointments', label: 'Schedule', icon: OlmeraCalendarIcon },
        { id: 'doctor-notifications', label: 'Alerts', icon: NavAlertIcon },
        { id: 'doctor-profile', label: 'Profile', icon: OlmeraConsultIcon },
      ];
    }
    if (role === 'admin') {
      return [
        { id: 'admin-portal', label: 'Overview', icon: OlmeraPulseIcon },
        { id: 'admin-medical-reports', label: 'Records', icon: OlmeraShieldIcon },
        { id: 'admin-users', label: 'Staff', icon: OlmeraHospitalIcon },
        { id: 'settings', label: 'Settings', icon: NavAlertIcon },
      ];
    }
    return [
      { id: 'dashboard', label: 'Home', icon: NavHomeIcon },
      { id: 'patient-appointments', label: 'Visits', icon: OlmeraCalendarIcon },
      { id: 'patient-support', label: 'Messages', icon: NavChatIcon },
      { id: 'patient-profile', label: 'Profile', icon: OlmeraConsultIcon },
    ];
  };

  const items = getNavItems();

  return (
    <nav
      aria-label="Mobile Primary Navigation"
      className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden safe-area-pb pointer-events-auto transition-colors ${
        isIOS
          ? 'bg-[var(--color-surface)]/85 backdrop-blur-xl border-t border-[var(--color-line)]/80 px-4 pt-2 pb-3'
          : 'bg-[var(--color-surface)] border-t border-[var(--color-line)] shadow-[0_-2px_12px_rgba(16,32,30,0.06)] px-3 pt-2 pb-2.5'
      }`}
    >
      <div className="flex justify-between items-center max-w-md mx-auto">
        {items.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                triggerTabHaptic();
                setView(item.id);
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] pointer-events-auto transition-all duration-200 ${
                isActive ? 'text-[var(--color-primary)] font-semibold' : 'text-[var(--color-muted)]'
              }`}
            >
              {/* Material Design 3 pill indicator on Android/Web; clean HIG icon on iOS */}
              <div
                className={`flex items-center justify-center transition-all duration-200 ${
                  !isIOS && isActive
                    ? 'bg-[var(--color-primary)]/12 px-4 py-1 rounded-full'
                    : 'px-2 py-0.5'
                }`}
              >
                <item.icon size={20} />
              </div>
              <span
                className={`text-[10px] tracking-tight font-ui ${
                  isActive ? 'opacity-100 font-semibold' : 'opacity-75 font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {role === 'patient' && (
        <button
          onClick={() => {
            triggerActionHaptic();
            setView('hospitals');
          }}
          className={`absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 bg-[var(--color-primary)] text-white shadow-lg flex items-center justify-center border-4 border-[var(--color-bg)] active:scale-95 transition-transform z-50 pointer-events-auto ${
            isIOS ? 'rounded-full' : 'rounded-2xl'
          }`}
          aria-label="Book Consultation"
        >
          <NavPlusIcon size={24} />
        </button>
      )}
    </nav>
  );
}
