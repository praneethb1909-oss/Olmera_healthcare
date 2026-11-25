import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function OlmeraPulseIcon({ size = 18, className = '', strokeWidth = 1.75 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 12h4.2l2.3-6.2 4 12.4 2.5-6.2H21"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9.5" cy="5.8" r="1.5" fill="var(--color-accent)" />
    </svg>
  );
}

export function OlmeraCalendarIcon({ size = 18, className = '', strokeWidth = 1.65 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M8 3.2v3.2M16 3.2v3.2M3.5 9.8h17" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle cx="12" cy="14.8" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function OlmeraConsultIcon({ size = 18, className = '', strokeWidth = 1.65 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="9.5" cy="8.5" r="3.2" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M4 19.2c.6-3.1 2.9-4.7 5.5-4.7s4.9 1.6 5.5 4.7" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle cx="17.2" cy="9.5" r="2.2" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M16.5 14.8c2 .4 3.5 1.8 3.9 4.2" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function OlmeraSearchIcon({ size = 18, className = '', strokeWidth = 1.7 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M16 16l4.2 4.2" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function OlmeraHospitalIcon({ size = 18, className = '', strokeWidth = 1.65 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4.5 20.5V6.5A2 2 0 0 1 6.5 4.5h11a2 2 0 0 1 2 2v14" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M2.5 20.5h19M9 9.5h2M13 9.5h2M9 13.5h2M13 13.5h2M10.5 20.5v-3.5h3v3.5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function OlmeraShieldIcon({ size = 18, className = '', strokeWidth = 1.65 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3.2L5 6.2v5.4c0 4.6 3 8.5 7 9.7 4-1.2 7-5.1 7-9.7V6.2l-7-3z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path d="M9.2 12.1l2 2 3.8-4" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function OlmeraArrowRightIcon({ size = 16, className = '', strokeWidth = 1.75 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4.5 12h14.5M13.5 6.5L19 12l-5.5 5.5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function OlmeraChevronRightIcon({ size = 14, className = '', strokeWidth = 1.8 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function OlmeraLockIcon({ size = 15, className = '', strokeWidth = 1.7 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function OlmeraSunIcon({ size = 18, className = '', strokeWidth = 1.65 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M12 2.8v2.2M12 19v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.8 12H5M19 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function OlmeraMoonIcon({ size = 18, className = '', strokeWidth = 1.65 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M20.2 14.6A8.5 8.5 0 0 1 9.4 3.8a8.5 8.5 0 1 0 10.8 10.8z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function OlmeraMenuIcon({ size = 20, className = '', strokeWidth = 1.75 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h11" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function OlmeraCloseIcon({ size = 20, className = '', strokeWidth = 1.75 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function OlmeraCheckIcon({ size = 16, className = '', strokeWidth = 1.85 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M8.5 12.3l2.4 2.4 4.6-5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function OlmeraVideoIcon({ size = 18, className = '', strokeWidth = 1.65 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="6.5" width="13" height="11" rx="2.5" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M16 10.2l4.8-2.7v9L16 13.8v-3.6z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
    </svg>
  );
}

export function OlmeraRecordIcon({ size = 18, className = '', strokeWidth = 1.65 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M7 3.5h7l4.5 4.5V19a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
      <path d="M14 3.5V8h4.5M8.5 12.5h7M8.5 16h5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function OlmeraBedIcon({ size = 18, className = '', strokeWidth = 1.65 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M3.5 19v-9.5M20.5 19v-5a2.5 2.5 0 0 0-2.5-2.5H3.5M3.5 15.5h17" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle cx="7.5" cy="9.2" r="1.7" stroke="currentColor" strokeWidth={strokeWidth} />
    </svg>
  );
}

export function OlmeraPhoneIcon({ size = 15, className = '', strokeWidth = 1.7 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M5.5 4.5h3.2l1.5 4-2 1.6a12.2 12.2 0 0 0 5.7 5.7l1.6-2 4 1.5v3.2a1.8 1.8 0 0 1-1.9 1.8C10.5 19.8 4.2 13.5 3.7 6.4a1.8 1.8 0 0 1 1.8-1.9z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function OlmeraSpecialistIcon({ size = 18, className = '', strokeWidth = 1.65 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="10.5" cy="8" r="3.4" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M4.5 19.5c.8-3.4 3.2-5 6-5s5.2 1.6 6 5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M16.5 11.2l1.4 1.4 2.8-2.8" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function OlmeraNeuroIcon({ size = 18, className = '', strokeWidth = 1.65 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="2.2" stroke="currentColor" strokeWidth={strokeWidth} />
      <circle cx="6.5" cy="7.5" r="1.6" stroke="currentColor" strokeWidth={strokeWidth} />
      <circle cx="17.5" cy="7.5" r="1.6" stroke="currentColor" strokeWidth={strokeWidth} />
      <circle cx="6.5" cy="16.5" r="1.6" stroke="currentColor" strokeWidth={strokeWidth} />
      <circle cx="17.5" cy="16.5" r="1.6" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M7.8 8.6l2.6 2.1M16.2 8.6l-2.6 2.1M7.8 15.4l2.6-2.1M16.2 15.4l-2.6-2.1" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function OlmeraOrthoIcon({ size = 18, className = '', strokeWidth = 1.65 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="8.5" y="4.5" width="7" height="3" rx="1.2" stroke="currentColor" strokeWidth={strokeWidth} />
      <rect x="8" y="10.5" width="8" height="3" rx="1.2" stroke="currentColor" strokeWidth={strokeWidth} />
      <rect x="8.5" y="16.5" width="7" height="3" rx="1.2" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M12 7.5v3M12 13.5v3" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function OlmeraCareRingIcon({ size = 18, className = '', strokeWidth = 1.65 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M18.4 7.8A7.5 7.5 0 1 0 19.5 12" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle cx="19" cy="10" r="1.8" fill="var(--color-accent)" />
    </svg>
  );
}
