import React, { useEffect, useState } from 'react';

interface ClinicalTrustSceneProps {
  className?: string;
}

/**
 * Architectural open-ring emblem in Olmera's Deep Fern, Mist, and Signal Coral palette.
 * Zero external 3D dependencies; respects prefers-reduced-motion.
 */
export default function ClinicalTrustScene({ className = '' }: ClinicalTrustSceneProps) {
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setIsReducedMotion(mediaQuery.matches);
    }
  }, []);

  return (
    <div
      className={`flex items-center justify-center relative select-none ${className}`}
      aria-label="Olmera care security emblem"
    >
      <svg
        viewBox="0 0 220 220"
        className="w-40 h-40 sm:w-44 sm:h-44"
        fill="none"
        role="img"
        aria-label="Olmera Open Ring Emblem"
      >
        {/* Soft Mist Orbit */}
        <circle
          cx="110"
          cy="110"
          r="84"
          stroke="var(--color-mist)"
          strokeWidth="2"
          strokeDasharray="6 6"
          className={isReducedMotion ? '' : 'origin-center animate-[spin_28s_linear_infinite]'}
        />

        {/* Inner Calm Ring */}
        <circle
          cx="110"
          cy="110"
          r="66"
          stroke="var(--color-line)"
          strokeWidth="1.5"
        />

        {/* Primary Deep Fern Open Ring */}
        <path
          d="M 164 82 A 60 60 0 1 0 168 124"
          stroke="var(--color-primary)"
          strokeWidth="11"
          strokeLinecap="round"
        />

        {/* Signal Coral Care Node at the gap */}
        <circle
          cx="169"
          cy="103"
          r="8.5"
          fill="var(--color-accent)"
        />

        {/* Center Shield Mark */}
        <path
          d="M110 88L93 95.5v13.5c0 11.5 7.2 21.2 17 24.2 9.8-3 17-12.7 17-24.2V95.5L110 88z"
          stroke="var(--color-primary)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M103 110.5l5 5 9.5-10"
          stroke="var(--color-primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
