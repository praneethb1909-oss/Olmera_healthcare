import React from 'react';

export interface SceneFallbackProps {
  className?: string;
}

/**
 * Static SVG fallback for the Hero DNA Helix
 * Displayed when WebGL is unavailable, fails, or user prefers reduced motion.
 */
export function HelixFallback({ className = '' }: SceneFallbackProps) {
  return (
    <div 
      className={`w-full h-full flex items-center justify-center select-none pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <svg 
        viewBox="0 0 400 400" 
        className="w-72 sm:w-96 h-72 sm:h-96 max-w-full drop-shadow-[0_0_35px_rgba(34,227,200,0.25)]" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="neonDnaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22E3C8" />
            <stop offset="50%" stopColor="#7B5CFF" />
            <stop offset="100%" stopColor="#FF5C8A" />
          </linearGradient>
          <radialGradient id="ringGlow" cx="50%" cy="50%" r="50%">
            <stop offset="85%" stopColor="#0E8FB0" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#22E3C8" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Neon Orbital Rings */}
        <ellipse cx="200" cy="200" rx="170" ry="85" stroke="#22E3C8" strokeWidth="1" strokeDasharray="4 6" opacity="0.4" transform="rotate(-25 200 200)" />
        <ellipse cx="200" cy="200" rx="160" ry="90" stroke="#7B5CFF" strokeWidth="1.2" opacity="0.35" transform="rotate(35 200 200)" />

        {/* DNA Strands */}
        <path 
          d="M 120,60 Q 200,120 280,180 T 120,300 T 280,360" 
          stroke="url(#neonDnaGrad)" 
          strokeWidth="3.5" 
          strokeLinecap="round" 
          opacity="0.85" 
        />
        <path 
          d="M 280,60 Q 200,120 120,180 T 280,300 T 120,360" 
          stroke="url(#neonDnaGrad)" 
          strokeWidth="3.5" 
          strokeLinecap="round" 
          opacity="0.85" 
        />

        {/* Base Pair Horizontal Links */}
        {[80, 110, 140, 170, 200, 230, 260, 290, 320, 345].map((y, idx) => {
          const xOffset = Math.sin(idx * 0.7) * 60;
          return (
            <line 
              key={idx} 
              x1={200 - xOffset} 
              y1={y} 
              x2={200 + xOffset} 
              y2={y} 
              stroke={idx % 2 === 0 ? "#22E3C8" : "#7B5CFF"} 
              strokeWidth="2" 
              strokeOpacity="0.6" 
            />
          );
        })}

        {/* Glowing Node Spheres */}
        {[
          { x: 130, y: 70, c: "#22E3C8", r: 4.5 },
          { x: 270, y: 70, c: "#FF5C8A", r: 4.5 },
          { x: 200, y: 130, c: "#7B5CFF", r: 5 },
          { x: 135, y: 190, c: "#22E3C8", r: 5 },
          { x: 265, y: 190, c: "#FF5C8A", r: 5 },
          { x: 200, y: 250, c: "#7B5CFF", r: 5.5 },
          { x: 140, y: 310, c: "#22E3C8", r: 4.5 },
          { x: 260, y: 310, c: "#FF5C8A", r: 4.5 }
        ].map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r={pt.r} fill={pt.c} />
        ))}
      </svg>
    </div>
  );
}

/**
 * Static SVG fallback for the Trust / Privacy Section 3D Element
 */
export function TrustFallback({ className = '' }: SceneFallbackProps) {
  return (
    <div 
      className={`w-full h-full flex items-center justify-center select-none pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <svg 
        viewBox="0 0 300 300" 
        className="w-48 sm:w-64 h-48 sm:h-64 drop-shadow-[0_0_30px_rgba(123,92,255,0.3)]" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="shieldNeonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22E3C8" />
            <stop offset="50%" stopColor="#7B5CFF" />
            <stop offset="100%" stopColor="#0E8FB0" />
          </linearGradient>
        </defs>
        
        {/* Neon Concentric Pulse Rings */}
        <circle cx="150" cy="150" r="115" stroke="#7B5CFF" strokeWidth="1.2" strokeDasharray="3 5" opacity="0.4" />
        <circle cx="150" cy="150" r="95" stroke="#22E3C8" strokeWidth="1.5" opacity="0.3" />

        {/* Protective Geometric Shield & Vital Pulse Heart Contour */}
        <path 
          d="M 150,55 L 225,95 C 225,185 150,235 150,235 C 150,235 75,185 75,95 Z" 
          stroke="url(#shieldNeonGrad)" 
          strokeWidth="2.5" 
          fill="rgba(7, 19, 26, 0.4)" 
        />
        
        {/* ECG Rhythm Trace in Core */}
        <path 
          d="M 105,150 L 125,150 L 135,165 L 145,120 L 155,180 L 165,140 L 175,150 L 195,150" 
          stroke="#22E3C8" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        <circle cx="145" cy="120" r="3.5" fill="#FF5C8A" />
      </svg>
    </div>
  );
}
