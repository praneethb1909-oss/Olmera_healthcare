import React, { useState, useEffect, lazy, Suspense } from 'react';
import { 
  Activity, ShieldCheck, Calendar, Clock, Video, 
  Phone, Search, Star, Award, Users, CheckCircle2, ArrowRight, 
  Building2, ChevronRight, Bed, FileText, Moon, Sun, Menu, X, 
  Shield, CheckCircle, Lock, UserCheck, Sparkles, HeartPulse
} from 'lucide-react';
import { OlmeraWordmark } from './brand/OlmeraWordmark';
import { TrustFallback } from './3d/SceneFallbacks';

const ClinicalTrustScene = lazy(() => import('./3d/ClinicalTrustScene'));

interface LandingPageProps {
  onOpenAuth: (role?: 'patient' | 'doctor' | 'admin') => void;
  onNavigateToView?: (view: string, data?: any) => void;
}

export function LandingPage({ onOpenAuth, onNavigateToView }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    }
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !document.documentElement.classList.contains('dark');
    if (nextDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('olmera_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('olmera_theme', 'light');
    }
    setIsDarkMode(nextDark);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');
  const [sosActive, setSosActive] = useState(false);

  const specialties = [
    {
      id: 'dept-1',
      name: 'Cardiology',
      icon: Activity,
      desc: 'Coronary wellness, preventive heart care, and diagnostic cardiovascular anatomy.',
      doctors: 8,
      accent: '#0E8FB0',
      accentBg: 'rgba(14, 143, 176, 0.08)',
      accentBorder: 'rgba(14, 143, 176, 0.25)',
      image: '/images/dept-cardiology.webp',
      srcSet: '/images/dept-cardiology-800.webp 800w, /images/dept-cardiology.webp 1600w',
      alt: 'Cardiovascular coronary anatomy and human heart structure'
    },
    {
      id: 'dept-2',
      name: 'Neurology',
      icon: ShieldCheck,
      desc: 'Stroke recovery, cognitive health, cranial neuro-imaging, and clinical rehabilitation.',
      doctors: 6,
      accent: '#6D5BD0',
      accentBg: 'rgba(109, 91, 208, 0.08)',
      accentBorder: 'rgba(109, 91, 208, 0.25)',
      image: '/images/dept-neurology.webp',
      srcSet: '/images/dept-neurology-800.webp 800w, /images/dept-neurology.webp 1600w',
      alt: 'Clinical cranial neuro-imaging and cerebral brain anatomy'
    },
    {
      id: 'dept-3',
      name: 'Pediatrics',
      icon: Users,
      desc: 'Childhood developmental wellness, neonatal monitoring, and pediatric cardiopulmonary care.',
      doctors: 10,
      accent: '#0E4F4A',
      accentBg: 'rgba(14, 79, 74, 0.08)',
      accentBorder: 'rgba(14, 79, 74, 0.25)',
      image: '/images/dept-pediatrics.webp',
      srcSet: '/images/dept-pediatrics-800.webp 800w, /images/dept-pediatrics.webp 1600w',
      alt: 'Pediatric clinical stethoscope examination and infant care'
    },
    {
      id: 'dept-4',
      name: 'Orthopedics & Spine',
      icon: Award,
      desc: 'Spinal column health, joint mobility, trauma rehabilitation, and bone structure care.',
      doctors: 7,
      accent: '#0E8FB0',
      accentBg: 'rgba(14, 143, 176, 0.08)',
      accentBorder: 'rgba(14, 143, 176, 0.25)',
      image: '/images/dept-orthopedics.webp',
      srcSet: '/images/dept-orthopedics-800.webp 800w, /images/dept-orthopedics.webp 1600w',
      alt: 'Human vertebral spinal column, skeletal joints, and bone structure'
    },
    {
      id: 'dept-14',
      name: 'Maternal & Women’s Health',
      icon: Shield,
      desc: 'Comprehensive prenatal obstetrics, fetal ultrasound monitoring, and maternal care.',
      doctors: 9,
      accent: '#FF7A59',
      accentBg: 'rgba(255, 122, 89, 0.08)',
      accentBorder: 'rgba(255, 122, 89, 0.25)',
      image: '/images/dept-maternal.webp',
      srcSet: '/images/dept-maternal-800.webp 800w, /images/dept-maternal.webp 1600w',
      alt: 'Obstetric prenatal ultrasound diagnostic screen showing fetal monitoring'
    },
    {
      id: 'dept-5',
      name: 'Internal Medicine',
      icon: UserCheck,
      desc: 'Evidence-based pulmonary diagnosis, vital organ assessment, and metabolic health.',
      doctors: 12,
      accent: '#0E4F4A',
      accentBg: 'rgba(14, 79, 74, 0.08)',
      accentBorder: 'rgba(14, 79, 74, 0.25)',
      image: '/images/dept-internal-medicine.webp',
      srcSet: '/images/dept-internal-medicine-800.webp 800w, /images/dept-internal-medicine.webp 1600w',
      alt: 'Thoracic chest radiograph displaying human lungs and internal vital organs'
    },
    {
      id: 'dept-11',
      name: 'Oncology & Diagnostics',
      icon: FileText,
      desc: 'Multi-disciplinary cellular screening, high-resolution oncology imaging, and therapies.',
      doctors: 5,
      accent: '#7B5CFF',
      accentBg: 'rgba(123, 92, 255, 0.08)',
      accentBorder: 'rgba(123, 92, 255, 0.25)',
      image: '/images/dept-oncology.webp',
      srcSet: '/images/dept-oncology-800.webp 800w, /images/dept-oncology.webp 1600w',
      alt: 'High-magnification microscopic cellular histopathology and oncology diagnostic scan'
    },
    {
      id: 'telemedicine',
      name: 'Telehealth (24/7)',
      icon: Video,
      desc: 'Private high-fidelity video consultations with certified specialists and live vital monitoring.',
      doctors: 15,
      accent: '#0E8FB0',
      accentBg: 'rgba(14, 143, 176, 0.08)',
      accentBorder: 'rgba(14, 143, 176, 0.25)',
      image: '/images/dept-telemedicine.webp',
      srcSet: '/images/dept-telemedicine-800.webp 800w, /images/dept-telemedicine.webp 1600w',
      alt: 'Clinical digital monitor with physician examining patient telemetry remotely'
    }
  ];

  const networkHospitals = [
    {
      name: 'GMR Varalakshmi Care Hospital',
      city: 'Rajam',
      beds: '150 Beds',
      icu: '24/7 Trauma & Critical Care',
      badge: 'Anchor Regional Hub',
      image: '/images/hospital-rajam.webp',
      srcSet: '/images/hospital-rajam-800.webp 800w, /images/hospital-rajam.webp 1600w',
      alt: 'GMR Varalakshmi Care Hospital medical center and outpatient pavilion in Rajam'
    },
    {
      name: 'Olmera Institute of Medical Sciences',
      city: 'Visakhapatnam',
      beds: '350 Beds',
      icu: 'Level 1 Trauma & Cardiac ICU',
      badge: 'Tertiary Hub',
      image: '/images/hospital-vizag.webp',
      srcSet: '/images/hospital-vizag-800.webp 800w, /images/hospital-vizag.webp 1600w',
      alt: 'Olmera Institute of Medical Sciences multispecialty facility in Visakhapatnam'
    },
    {
      name: 'Olmera Care Hospital',
      city: 'Srikakulam',
      beds: '200 Beds',
      icu: 'Emergency & Stroke Unit',
      badge: 'Regional Network Hub',
      image: '/images/hospital-srikakulam.webp',
      srcSet: '/images/hospital-srikakulam-800.webp 800w, /images/hospital-srikakulam.webp 1600w',
      alt: 'Olmera Care Hospital emergency care facility in Srikakulam'
    },
    {
      name: 'Olmera Specialty Institute',
      city: 'Visakhapatnam',
      beds: '300 Beds',
      icu: 'Accredited Excellence',
      badge: 'Specialty Center',
      image: '/images/hospital-institute.webp',
      srcSet: '/images/hospital-institute-800.webp 800w, /images/hospital-institute.webp 1600w',
      alt: 'Olmera Specialty Institute modern hospital ward in Visakhapatnam'
    }
  ];

  const testimonials = [
    {
      quote: "Scheduling my consultation in Vizag was completely calm and transparent. The digital prescription and diagnostic reports were available in my vault before I returned home to Rajam.",
      author: "Venkata Satyanarayana",
      role: "Verified Patient"
    },
    {
      quote: "When my father needed hospital admission in Srikakulam, Olmera's live bed availability tracker saved us critical hours. The interface is wonderfully quiet, minimal, and respectful.",
      author: "P. Radhika",
      role: "Family Caregiver"
    },
    {
      quote: "The telehealth experience eliminated the exhausting commute to Visakhapatnam for our elderly relatives. The clarity of the video and the doctor's undivided attention were exemplary.",
      author: "K. Murali Krishna",
      role: "Telehealth User"
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)] font-ui transition-colors duration-300">
      
      {/* 1. TOP EMERGENCY & HELPLINE STRIP - Continuous Marquee, No Scrollbar */}
      <aside aria-label="Emergency Notices and Helpline" className="bg-[#0A2220] text-white text-[11px] border-b border-[#123E3A] font-ui relative overflow-hidden h-9 flex items-center select-none">
        <div className="w-full max-w-[1536px] mx-auto flex items-center justify-between gap-3 px-3 sm:px-4">
          {/* Pinned Left: Emergency Indicator */}
          <div className="flex items-center gap-2 shrink-0 z-10 bg-[#0A2220] pr-2.5 py-1">
            <span className="w-2 h-2 rounded-full bg-[#FF7A59] animate-pulse"></span>
            <span className="font-semibold uppercase tracking-wider text-[10px] text-[#6EE7B7] hidden sm:inline">
              Emergency Response
            </span>
            <span className="text-white/20">|</span>
          </div>

          {/* Center: Seamless Infinite Marquee with edge gradient masks */}
          <div className="overflow-hidden flex-1 relative py-1">
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0A2220] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0A2220] to-transparent z-10 pointer-events-none" />

            <div className="flex w-max animate-marquee items-center text-slate-200">
              {/* Primary Group */}
              <div className="flex items-center gap-7 shrink-0 pr-7">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="text-slate-300">Helpline:</span>
                  <a href="tel:108" className="font-bold text-white hover:text-[#6EE7B7] underline transition-colors">
                    Dial 108 (24/7 Toll-Free)
                  </a>
                </span>
                <span className="text-white/25">•</span>
                <span className="inline-flex items-center gap-1.5 text-slate-300">
                  <Activity size={12} className="text-[#6EE7B7] shrink-0" />
                  Trauma & Ambulance Dispatch Active across Rajam, Vizag & Srikakulam
                </span>
                <span className="text-white/25">•</span>
                <span className="inline-flex items-center gap-1.5 text-slate-300">
                  <HeartPulse size={12} className="text-[#FF7A59] shrink-0" />
                  Live Hospital Telemetry: ICU & Critical Care Units Online
                </span>
                <span className="text-white/25">•</span>
                <span className="inline-flex items-center gap-1.5 text-slate-300">
                  <ShieldCheck size={12} className="text-[#6EE7B7] shrink-0" />
                  Casualty & Acute Care: Immediate 24/7 Walk-In Service
                </span>
              </div>

              {/* Duplicate Group for Seamless Infinite Loop */}
              <div className="flex items-center gap-7 shrink-0 pr-7" aria-hidden="true">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="text-slate-300">Helpline:</span>
                  <a href="tel:108" className="font-bold text-white hover:text-[#6EE7B7] underline transition-colors">
                    Dial 108 (24/7 Toll-Free)
                  </a>
                </span>
                <span className="text-white/25">•</span>
                <span className="inline-flex items-center gap-1.5 text-slate-300">
                  <Activity size={12} className="text-[#6EE7B7] shrink-0" />
                  Trauma & Ambulance Dispatch Active across Rajam, Vizag & Srikakulam
                </span>
                <span className="text-white/25">•</span>
                <span className="inline-flex items-center gap-1.5 text-slate-300">
                  <HeartPulse size={12} className="text-[#FF7A59] shrink-0" />
                  Live Hospital Telemetry: ICU & Critical Care Units Online
                </span>
                <span className="text-white/25">•</span>
                <span className="inline-flex items-center gap-1.5 text-slate-300">
                  <ShieldCheck size={12} className="text-[#6EE7B7] shrink-0" />
                  Casualty & Acute Care: Immediate 24/7 Walk-In Service
                </span>
              </div>
            </div>
          </div>

          {/* Pinned Right: Stationary SOS Action Button */}
          <div className="flex items-center shrink-0 z-10 bg-[#0A2220] pl-2.5 py-1">
            <button
              onClick={() => setSosActive(!sosActive)}
              aria-expanded={sosActive}
              aria-label={sosActive ? 'Close emergency assistance drawer' : 'Open emergency assistance drawer'}
              className="bg-[#0E4F4A] hover:bg-[#156E67] text-white px-3 py-1 rounded-full font-semibold uppercase tracking-wider text-[10px] transition-colors min-h-[28px] inline-flex items-center border border-[#2D6A64]"
            >
              {sosActive ? 'Close SOS' : 'Emergency Assistance'}
            </button>
          </div>
        </div>
      </aside>

      {/* SOS Drawer if expanded */}
      {sosActive && (
        <div className="bg-[var(--color-surface-subtle)] border-b border-[var(--color-line)] p-6 animate-fadeIn">
          <div className="w-full max-w-[1536px] mx-auto space-y-4">
            <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900/50 flex items-center gap-3 text-red-800 dark:text-red-200 text-xs">
              <HeartPulse size={18} className="shrink-0 text-red-600 animate-pulse" />
              <span><strong>Medical Emergency Protocol:</strong> If you or someone near you is experiencing chest pain, acute shortness of breath, severe trauma, or stroke symptoms, please call <strong>108</strong> immediately.</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="card p-5 bg-[var(--color-surface)] border-[var(--color-line)] shadow-sm">
                <div className="flex items-center gap-3 mb-2 text-[var(--color-primary)]">
                  <Bed size={22} />
                  <h4 className="font-display font-semibold text-base text-[var(--color-ink)]">Emergency Trauma Dispatch</h4>
                </div>
                <p className="text-xs text-[var(--color-muted)] mb-4">
                  Rapid ICU paramedic team coordinated through accredited regional trauma triage centers.
                </p>
                <a href="tel:108" className="btn-primary w-full text-center py-2.5 text-xs flex items-center justify-center gap-2 min-h-[44px]">
                  <Phone size={14} /> Call 108 Emergency Ambulance
                </a>
              </div>

              <div className="card p-5 bg-[var(--color-surface)] border-[var(--color-line)] shadow-sm">
                <div className="flex items-center gap-3 mb-2 text-[var(--color-primary)]">
                  <Activity size={22} />
                  <h4 className="font-display font-semibold text-base text-[var(--color-ink)]">ICU & Critical Beds</h4>
                </div>
                <p className="text-xs text-[var(--color-muted)] mb-4">
                  Real-time monitor of ventilator, ICU, and oxygen bed capacity across our 4 network facilities.
                </p>
                <button 
                  onClick={() => onNavigateToView ? onNavigateToView('hospitals') : onOpenAuth('patient')}
                  className="btn-outline w-full text-center py-2.5 text-xs flex items-center justify-center gap-2 min-h-[44px]"
                >
                  View Live Bed Status
                </button>
              </div>

              <div className="card p-5 bg-[var(--color-surface)] border-[var(--color-line)] shadow-sm">
                <div className="flex items-center gap-3 mb-2 text-[var(--color-primary)]">
                  <Video size={22} />
                  <h4 className="font-display font-semibold text-base text-[var(--color-ink)]">Immediate Doctor Triage</h4>
                </div>
                <p className="text-xs text-[var(--color-muted)] mb-4">
                  Consult with an on-call clinical physician via secure encrypted video link.
                </p>
                <button 
                  onClick={() => onOpenAuth('patient')}
                  className="btn-primary w-full text-center py-2.5 text-xs flex items-center justify-center gap-2 min-h-[44px]"
                >
                  Start Tele-Triage
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. PUBLIC HEADER & NAVIGATION */}
      <header className="sticky top-0 z-40 bg-[var(--color-surface)]/95 backdrop-blur-md border-b border-[var(--color-line)] transition-colors">
        <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Wordmark */}
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <OlmeraWordmark className="h-8 w-auto" />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-[var(--color-muted)]">
            <a href="#specialties" className="hover:text-[var(--color-primary)] transition-colors">
              Specialties
            </a>
            <a href="#hospitals" className="hover:text-[var(--color-primary)] transition-colors">
              Hospitals & Wards
            </a>
            <button 
              onClick={() => onNavigateToView ? onNavigateToView('doctors') : onOpenAuth('patient')}
              className="hover:text-[var(--color-primary)] transition-colors cursor-pointer"
            >
              Specialists
            </button>
            <a href="#features" className="hover:text-[var(--color-primary)] transition-colors">
              Care Architecture
            </a>
            <button 
              onClick={() => onNavigateToView ? onNavigateToView('about-us') : onOpenAuth('patient')}
              className="hover:text-[var(--color-primary)] transition-colors cursor-pointer"
            >
              About
            </button>
            <button 
              onClick={() => onNavigateToView ? onNavigateToView('services-contact') : onOpenAuth('patient')}
              className="hover:text-[var(--color-primary)] transition-colors cursor-pointer"
            >
              Services & Contact
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl border border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle mode"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              onClick={() => onOpenAuth()}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[var(--color-ink)] hover:text-[var(--color-primary)] border border-[var(--color-line)] rounded-xl transition-all hover:bg-[var(--color-surface-subtle)] min-h-[44px]"
            >
              <Lock size={13} /> Portal Sign In
            </button>

            {/* Coral Accent CTA */}
            <button
              onClick={() => onOpenAuth('patient')}
              className="btn-accent px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm min-h-[44px]"
            >
              <Calendar size={15} /> Book Consultation
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 rounded-xl border border-[var(--color-line)] text-[var(--color-muted)] min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[var(--color-line)] bg-[var(--color-surface)] p-6 space-y-4 animate-fadeIn">
            <nav className="flex flex-col gap-3 text-sm font-medium text-[var(--color-ink)]">
              <a href="#specialties" onClick={() => setMobileMenuOpen(false)} className="p-2.5 hover:bg-[var(--color-surface-subtle)] rounded-lg">
                Specialties & Clinical Care
              </a>
              <a href="#hospitals" onClick={() => setMobileMenuOpen(false)} className="p-2.5 hover:bg-[var(--color-surface-subtle)] rounded-lg">
                Hospitals & Bed Status
              </a>
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onNavigateToView) { onNavigateToView('doctors'); } else { onOpenAuth('patient'); }
                }}
                className="p-2.5 text-left hover:bg-[var(--color-surface-subtle)] rounded-lg"
              >
                Specialist Directory
              </button>
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="p-2.5 hover:bg-[var(--color-surface-subtle)] rounded-lg">
                Care Architecture
              </a>
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onNavigateToView) { onNavigateToView('about-us'); } else { onOpenAuth('patient'); }
                }}
                className="p-2.5 text-left hover:bg-[var(--color-surface-subtle)] rounded-lg"
              >
                About Olmera
              </button>
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onNavigateToView) { onNavigateToView('services-contact'); } else { onOpenAuth('patient'); }
                }}
                className="p-2.5 text-left hover:bg-[var(--color-surface-subtle)] rounded-lg"
              >
                Services & Contact
              </button>
            </nav>

            <div className="pt-4 border-t border-[var(--color-line)] flex flex-col gap-2.5">
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenAuth(); }}
                className="w-full btn-outline py-3 text-xs text-center font-semibold min-h-[44px]"
              >
                Sign In to Portal
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenAuth('patient'); }}
                className="w-full btn-accent py-3 text-xs text-center font-semibold min-h-[44px]"
              >
                Book Consultation Now
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Landmark */}
      <main id="main-content">

      {/* 3. HERO SECTION - Clean, Professional Clinical Healthcare Aesthetic */}
      <section 
        className="relative overflow-hidden pt-12 pb-16 lg:pt-16 lg:pb-24 border-b border-[var(--color-line)] bg-gradient-to-b from-[#F0F6F9] via-[#F7FAFB] to-[#FFFFFF] dark:from-[#07131A] dark:via-[#091D24] dark:to-[#07131A] transition-colors"
      >
        <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            
            {/* Left Column: Value Proposition & Clinical Trust */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E6F4F2] dark:bg-[#0E4F4A]/30 border border-[#BCE3DD] dark:border-[#0E4F4A] text-[var(--color-primary)] dark:text-[#6EE7B7] text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] dark:bg-[#6EE7B7] animate-pulse"></span>
                <span>Connecting Healthcare across Rajam, Vizag & Srikakulam</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-[var(--color-ink)] dark:text-white leading-[1.12]">
                Care, quietly <br className="hidden sm:inline" />
                <span className="text-[var(--color-primary)] dark:text-[#38BDF8] italic">connected.</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-ui font-normal">
                Olmera connects accredited hospitals, clinical specialists, diagnostic centers, and patients into a unified digital circle of care. Schedule verified consultations, access high-fidelity telemedicine, and manage health records with calm precision.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <button
                  onClick={() => onOpenAuth('patient')}
                  className="w-full sm:w-auto btn-primary px-7 py-3.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2.5 shadow-md shadow-[var(--color-primary)]/15 transition-all min-h-[44px]"
                >
                  <Calendar size={16} /> Book Consultation
                </button>
                <button
                  onClick={() => onNavigateToView ? onNavigateToView('doctors') : onOpenAuth('patient')}
                  className="w-full sm:w-auto border border-slate-300 dark:border-slate-700 hover:border-slate-400 text-[var(--color-ink)] dark:text-white bg-white/80 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 px-7 py-3.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2.5 transition-all min-h-[44px]"
                >
                  <Users size={16} /> Explore Specialists
                </button>
              </div>

              {/* Trust Indicators in clean clinical stat cards */}
              <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 shadow-xs">
                  <p className="font-display text-2xl sm:text-3xl font-semibold text-[var(--color-primary)] dark:text-[#38BDF8]">120+</p>
                  <p className="text-[11px] text-[var(--color-muted)] font-semibold uppercase tracking-wider mt-0.5 font-ui">Specialists</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 shadow-xs">
                  <p className="font-display text-2xl sm:text-3xl font-semibold text-emerald-700 dark:text-emerald-400">4</p>
                  <p className="text-[11px] text-[var(--color-muted)] font-semibold uppercase tracking-wider mt-0.5 font-ui">Regional Hubs</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 shadow-xs">
                  <p className="font-display text-2xl sm:text-3xl font-semibold text-[var(--color-ink)] dark:text-white">15k+</p>
                  <p className="text-[11px] text-[var(--color-muted)] font-semibold uppercase tracking-wider mt-0.5 font-ui">Patients Served</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 shadow-xs">
                  <p className="font-display text-2xl sm:text-3xl font-semibold text-[#0E8FB0] dark:text-[#22E3C8]">99.4%</p>
                  <p className="text-[11px] text-[var(--color-muted)] font-semibold uppercase tracking-wider mt-0.5 font-ui">Care Quality</p>
                </div>
              </div>

            </div>

            {/* Right Column: Balanced Clinical Search Gateway & Quick Portal Switcher */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Search Gateway Card */}
              <div className="card p-6 sm:p-7 bg-white dark:bg-slate-900 text-[var(--color-ink)] border border-slate-200/90 dark:border-slate-800 shadow-xl rounded-3xl space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-[var(--color-ink)]">Find Care Nearby</h3>
                    <p className="text-xs text-[var(--color-muted)]">Verified clinical practitioners in Andhra Pradesh</p>
                  </div>
                  <span className="p-2.5 bg-[var(--color-mist)] text-[var(--color-primary)] rounded-xl">
                    <Search size={18} />
                  </span>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider block mb-1.5 font-ui">
                      District Location
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['All', 'Visakhapatnam', 'Rajam', 'Srikakulam'].map((city) => (
                        <button
                          key={city}
                          onClick={() => setSelectedCity(city)}
                          className={`py-2 px-1 text-xs font-semibold rounded-xl border text-center transition-all truncate font-ui min-h-[38px] ${
                            selectedCity === city
                              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                          }`}
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider block mb-1.5 font-ui">
                      Doctor or Department
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={16} />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="e.g. Cardiology, Neurology, Pediatrics..."
                        className="input-field pl-10"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigateToView ? onNavigateToView('doctors') : onOpenAuth('patient')}
                    className="w-full btn-primary py-3.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm min-h-[44px]"
                  >
                    Search Specialists <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Quick Portal Switcher */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => onOpenAuth('patient')}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-[var(--color-primary)] hover:shadow-md transition-all text-center group min-h-[64px]"
                >
                  <Users className="mx-auto mb-1 text-[var(--color-primary)] group-hover:scale-105 transition-transform" size={18} />
                  <p className="font-semibold text-xs text-[var(--color-ink)] font-ui">Patient</p>
                  <p className="text-[10px] text-[var(--color-muted)] font-ui">Health Vault</p>
                </button>

                <button
                  onClick={() => onOpenAuth('doctor')}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-[var(--color-primary)] hover:shadow-md transition-all text-center group min-h-[64px]"
                >
                  <UserCheck className="mx-auto mb-1 text-[var(--color-primary)] group-hover:scale-105 transition-transform" size={18} />
                  <p className="font-semibold text-xs text-[var(--color-ink)] font-ui">Specialist</p>
                  <p className="text-[10px] text-[var(--color-muted)] font-ui">Clinical Notes</p>
                </button>

                <button
                  onClick={() => onOpenAuth('admin')}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-[var(--color-primary)] hover:shadow-md transition-all text-center group min-h-[64px]"
                >
                  <Building2 className="mx-auto mb-1 text-[var(--color-primary)] group-hover:scale-105 transition-transform" size={18} />
                  <p className="font-semibold text-xs text-[var(--color-ink)] font-ui">Admin</p>
                  <p className="text-[10px] text-[var(--color-muted)] font-ui">Hospital IDP</p>
                </button>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* 4. CLINICAL SPECIALTIES - Accurate Anatomical & Specialty Focus */}
      <section id="specialties" className="py-20 bg-[var(--color-surface)] border-y border-[var(--color-line)]">
        <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs font-semibold text-[var(--color-primary)] dark:text-[#6EE7B7] uppercase tracking-wider block mb-2 font-ui">
                Comprehensive Departments
              </span>
              <h2 className="font-display text-3xl sm:text-4xl text-[var(--color-ink)]">
                Centers of Clinical Excellence
              </h2>
              <p className="text-sm text-[var(--color-muted)] mt-2 max-w-xl font-ui">
                Accredited specialized healthcare departments — featuring dedicated medical diagnostics and specialized care pathways.
              </p>
            </div>

            <button
              onClick={() => onNavigateToView ? onNavigateToView('services') : onOpenAuth('patient')}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-primary)] hover:underline font-ui min-h-[44px]"
            >
              View All 14 Specialties <ArrowRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {specialties.map((spec) => {
              const IconComp = spec.icon;
              return (
                <div
                  key={spec.id}
                  onClick={() => onNavigateToView ? onNavigateToView('doctors', { department: spec.id }) : onOpenAuth('patient')}
                  className="card overflow-hidden bg-[var(--color-surface)] border border-[var(--color-line)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                  style={{ borderTop: `3px solid ${spec.accent}` }}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div 
                        className="w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105"
                        style={{ backgroundColor: spec.accentBg, color: spec.accent }}
                      >
                        <IconComp size={22} />
                      </div>
                      <span 
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-ui"
                        style={{ backgroundColor: spec.accentBg, color: spec.accent }}
                      >
                        {spec.doctors} Doctors
                      </span>
                    </div>

                    <div className="relative h-36 rounded-xl overflow-hidden mb-4 bg-slate-100 dark:bg-slate-800">
                      <img 
                        src={spec.image} 
                        srcSet={spec.srcSet}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        alt={spec.alt}
                        loading="lazy"
                        width={400}
                        height={240}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
                      <span className="absolute bottom-2 left-2.5 text-[10px] font-semibold text-white/95 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md">
                        {spec.name}
                      </span>
                    </div>

                    <h3 className="font-display text-base font-semibold text-[var(--color-ink)] mb-1.5 group-hover:text-[var(--color-primary)] transition-colors">
                      {spec.name}
                    </h3>
                    <p className="text-xs text-[var(--color-muted)] leading-relaxed font-ui">
                      {spec.desc}
                    </p>
                  </div>

                  <div className="p-4 pt-0 border-t border-[var(--color-line)]/50 flex items-center justify-between text-xs font-semibold text-[var(--color-muted)] group-hover:text-[var(--color-primary)] transition-colors font-ui">
                    <span>Accredited Faculty</span>
                    <span className="flex items-center gap-1">Consult <ChevronRight size={13} /></span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 5. REGIONAL HOSPITAL NETWORK - High Resolution WebP Imagery */}
      <section id="hospitals" className="py-20 bg-[var(--color-bg)]">
        <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <span className="text-xs font-semibold text-[#0E8FB0] uppercase tracking-wider block font-ui">
              Integrated Facilities
            </span>
            <h2 className="font-display text-3xl sm:text-4xl text-[var(--color-ink)]">
              Accredited Regional Centers
            </h2>
            <p className="text-sm text-[var(--color-muted)] font-ui">
              Olmera unites premier healthcare institutes across Visakhapatnam, Rajam, and Srikakulam with synchronized records.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {networkHospitals.map((hosp, idx) => (
              <div 
                key={idx}
                className="card bg-[var(--color-surface)] border border-[var(--color-line)] overflow-hidden flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
              >
                <div>
                  <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img 
                      src={hosp.image}
                      srcSet={hosp.srcSet}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      alt={hosp.alt}
                      loading="lazy"
                      width={800}
                      height={500}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-white text-[10px] font-semibold px-2.5 py-1 rounded-full font-ui">
                      {hosp.city}
                    </div>
                  </div>

                  <div className="p-5 space-y-2.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary)] font-ui">
                      {hosp.badge}
                    </span>
                    <h3 className="font-display text-base font-semibold text-[var(--color-ink)] leading-snug">
                      {hosp.name}
                    </h3>
                    <p className="text-xs text-[var(--color-muted)] flex items-center gap-1.5 font-ui">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]"></span>
                      <span>Accredited Regional Medical Center</span>
                    </p>

                    <div className="bg-[var(--color-surface-subtle)] p-3 rounded-xl space-y-1.5 text-xs font-ui">
                      <div className="flex justify-between">
                        <span className="text-[var(--color-muted)]">Capacity:</span>
                        <span className="font-semibold text-[var(--color-ink)]">{hosp.beds}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--color-muted)]">Status:</span>
                        <span className="font-semibold text-[var(--color-primary)]">{hosp.icu}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <button
                    onClick={() => onNavigateToView ? onNavigateToView('hospitals') : onOpenAuth('patient')}
                    className="w-full btn-outline py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    View Facility & Doctors <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 6. DIGITAL HEALTH INFRASTRUCTURE & 3D TRUST SECTION */}
      <section id="features" className="py-20 bg-[var(--color-surface)] border-t border-[var(--color-line)]">
        <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-semibold text-[var(--color-primary)] uppercase tracking-wider block font-ui">
                Care Architecture
              </span>
              <h2 className="font-display text-3xl sm:text-4xl text-[var(--color-ink)] leading-tight">
                Quiet healthcare, without the waiting room.
              </h2>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed font-ui">
                Olmera streamlines the fragmented clinical journey into an open, secure continuum — from the first symptom check to full recovery.
              </p>

              <div className="space-y-3.5 pt-2">
                {[
                  {
                    title: 'One-Click Specialist Consultations',
                    desc: 'Real-time slot availability, instant SMS/WhatsApp confirmation, and easy rescheduling.'
                  },
                  {
                    title: 'Encrypted Electronic Health Vault (EHR)',
                    desc: 'Diagnostic reports, discharge summaries, and case notes permanently organized in your patient portal.'
                  },
                  {
                    title: 'Digital Prescriptions & Direct Pharmacy Link',
                    desc: 'Doctors issue validated digital prescriptions instantly accessible to accredited pharmacies.'
                  },
                  {
                    title: 'Transparent Records & Care Coordination',
                    desc: 'Itemized clinical notes, telehealth links, and direct care line with hospital staff.'
                  }
                ].map((feat, i) => (
                  <div key={i} className="flex gap-3.5 p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-line)]/50">
                    <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-sm">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs text-[var(--color-ink)] font-ui">{feat.title}</h4>
                      <p className="text-xs text-[var(--color-muted)] mt-0.5 leading-relaxed font-ui">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side: Trust & Security Section */}
            <div className="lg:col-span-6 space-y-6">
              <div className="card p-8 bg-white dark:bg-[#07131A] text-[var(--color-ink)] dark:text-white rounded-3xl border border-slate-200/80 dark:border-[#1B363F] shadow-xl space-y-6 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Secondary 3D Scene */}
                  <div className="w-full sm:w-1/2 h-56 relative rounded-2xl overflow-hidden bg-slate-50 dark:bg-[#0D1E24]/80 border border-slate-200 dark:border-[#1B363F]">
                    <Suspense fallback={<TrustFallback className="w-full h-full" />}>
                      <ClinicalTrustScene className="w-full h-full" />
                    </Suspense>
                  </div>

                  <div className="w-full sm:w-1/2 space-y-3">
                    <span className="px-3 py-1 bg-[#E6F4F2] dark:bg-[#22E3C8]/10 text-[var(--color-primary)] dark:text-[#22E3C8] border border-[#BCE3DD] dark:border-[#22E3C8]/30 rounded-full text-[10px] font-semibold uppercase tracking-wider inline-block font-ui">
                      Privacy Charter & Security
                    </span>
                    <h3 className="font-display text-xl sm:text-2xl text-[var(--color-ink)] dark:text-white font-semibold">
                      Your medical records are strictly protected.
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-[#D3EEF0]/80 leading-relaxed font-ui">
                      Adhering to HIPAA and clinical NABH standards. All health data is encrypted at rest and in transit.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-white/10 text-xs text-slate-700 dark:text-[#D3EEF0] font-ui">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="text-[var(--color-primary)] dark:text-[#22E3C8]" size={16} />
                    <span>256-Bit SSL Encryption</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="text-[var(--color-primary)] dark:text-[#22E3C8]" size={16} />
                    <span>Clinical NABH Protocols</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="text-[var(--color-primary)] dark:text-[#22E3C8]" size={16} />
                    <span>Verified Doctor Credentials</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="text-[var(--color-primary)] dark:text-[#22E3C8]" size={16} />
                    <span>Automated Secure Backups</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => onOpenAuth('patient')}
                    className="w-full sm:w-auto btn-primary px-6 py-3 text-xs font-semibold rounded-xl min-h-[44px]"
                  >
                    Open Free Patient Account
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 7. PATIENT TESTIMONIALS */}
      <section className="py-20 bg-[var(--color-bg)]">
        <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-xl mx-auto mb-14 space-y-2">
            <span className="text-xs font-semibold text-[#E0457B] uppercase tracking-wider block font-ui">
              Patient Voices
            </span>
            <h2 className="font-display text-3xl sm:text-4xl text-[var(--color-ink)]">
              Quiet Clarity in Healthcare
            </h2>
            <p className="text-xs text-[var(--color-muted)] font-ui">
              Hear from families, caregivers, and doctors across Andhra Pradesh.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <div 
                key={idx} 
                className="card p-6 bg-[var(--color-surface)] border border-[var(--color-line)] flex flex-col justify-between shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex text-[#FF7A59] gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} fill="currentColor" />
                    ))}
                  </div>
                  <p className="text-xs text-[var(--color-ink)] leading-relaxed italic font-ui">
                    "{t.quote}"
                  </p>
                </div>

                <div className="pt-4 border-t border-[var(--color-line)] mt-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--color-mist)] text-[var(--color-primary)] font-bold flex items-center justify-center text-xs">
                    {t.author[0]}
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-[var(--color-ink)] font-ui">{t.author}</h4>
                    <p className="text-[10px] text-[var(--color-muted)] font-ui">{t.role} • Verified Clinical Care</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 8. CALL TO ACTION STRIP */}
      <section className="py-14 bg-[var(--color-primary)] text-white">
        <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="space-y-1.5 max-w-xl">
            <h2 className="font-display text-2xl sm:text-3xl text-white">
              Connect to calm, professional healthcare.
            </h2>
            <p className="text-xs text-[#D3EEF0] font-ui">
              Care, quietly connected. Serving Rajam, Visakhapatnam, and Srikakulam.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => onOpenAuth('patient')}
              className="btn-accent px-6 py-3 text-xs font-semibold min-h-[44px]"
            >
              Get Started as Patient
            </button>
            <button
              onClick={() => onOpenAuth('doctor')}
              className="btn-outline px-6 py-3 text-xs font-semibold text-white border-white/30 hover:bg-white/10 min-h-[44px]"
            >
              Specialist Portal
            </button>
          </div>
        </div>
      </section>
      </main>

      {/* 9. PUBLIC COMPREHENSIVE FOOTER */}
      <footer className="bg-[var(--color-surface)] text-[var(--color-muted)] text-xs border-t border-[var(--color-line)] font-ui">
        <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center gap-3">
                <OlmeraWordmark className="h-7 w-auto" />
              </div>
              <p className="text-[11px] font-semibold text-[#E0457B] uppercase tracking-wider">
                Care, quietly connected.
              </p>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed max-w-sm">
                Olmera is an accredited healthcare and telemetry platform connecting clinical facilities across Rajam, Visakhapatnam, and Srikakulam, Andhra Pradesh.
              </p>
              <div className="text-xs space-y-1.5 pt-1">
                <p>Care Concierge: <span className="font-semibold text-[var(--color-ink)]">Available via Authenticated Portal</span></p>
                <p>Emergency Ambulance: <a href="tel:108" className="font-semibold text-[#E0457B] hover:underline">Dial 108 (24/7 Toll-Free)</a></p>
                <p>Clinical Inquiries: <a href="mailto:care@olmera.health" className="hover:underline text-[var(--color-ink)]">care@olmera.health</a></p>
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink)]">For Patients</h4>
              <ul className="space-y-1.5 text-xs">
                <li><button onClick={() => onOpenAuth('patient')} className="hover:text-[var(--color-primary)] transition-colors min-h-[28px] inline-flex items-center">Book Consultation</button></li>
                <li><button onClick={() => onNavigateToView ? onNavigateToView('doctors') : onOpenAuth('patient')} className="hover:text-[var(--color-primary)] transition-colors min-h-[28px] inline-flex items-center">Specialist Directory</button></li>
                <li><button onClick={() => onOpenAuth('patient')} className="hover:text-[var(--color-primary)] transition-colors min-h-[28px] inline-flex items-center">Telehealth Visits</button></li>
                <li><button onClick={() => onOpenAuth('patient')} className="hover:text-[var(--color-primary)] transition-colors min-h-[28px] inline-flex items-center">Medical Records</button></li>
                <li><button onClick={() => onOpenAuth('patient')} className="hover:text-[var(--color-primary)] transition-colors min-h-[28px] inline-flex items-center">Prescriptions</button></li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink)]">Facilities</h4>
              <ul className="space-y-1.5 text-xs">
                <li><a href="#hospitals" className="hover:text-[var(--color-primary)] transition-colors min-h-[28px] inline-flex items-center">Olmera Health (Rajam)</a></li>
                <li><a href="#hospitals" className="hover:text-[var(--color-primary)] transition-colors min-h-[28px] inline-flex items-center">Olmera Coastal (Vizag)</a></li>
                <li><a href="#hospitals" className="hover:text-[var(--color-primary)] transition-colors min-h-[28px] inline-flex items-center">Olmera Regional (Srikakulam)</a></li>
                <li><a href="#hospitals" className="hover:text-[var(--color-primary)] transition-colors min-h-[28px] inline-flex items-center">Olmera Institute (Vizag)</a></li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink)]">Portal Gateway</h4>
              <ul className="space-y-1.5 text-xs">
                <li><button onClick={() => onOpenAuth('patient')} className="hover:text-[var(--color-primary)] transition-colors min-h-[28px] inline-flex items-center">Patient Sign In</button></li>
                <li><button onClick={() => onOpenAuth('doctor')} className="hover:text-[var(--color-primary)] transition-colors min-h-[28px] inline-flex items-center">Specialist Login</button></li>
                <li><button onClick={() => onOpenAuth('admin')} className="hover:text-[var(--color-primary)] transition-colors min-h-[28px] inline-flex items-center">Hospital Administrator</button></li>
                <li><button onClick={() => onNavigateToView ? onNavigateToView('about-us') : onOpenAuth('patient')} className="hover:text-[var(--color-primary)] transition-colors min-h-[28px] inline-flex items-center">About Olmera</button></li>
                <li><button onClick={() => onNavigateToView ? onNavigateToView('contact-us') : onOpenAuth('patient')} className="hover:text-[var(--color-primary)] transition-colors min-h-[28px] inline-flex items-center">Contact</button></li>
              </ul>
            </div>

          </div>

          <div className="pt-8 mt-8 border-t border-[var(--color-line)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--color-muted)]">
            <p>© {new Date().getFullYear()} Olmera Health. All rights reserved. Care, quietly connected.</p>
            <p className="text-[11px] font-semibold text-[#E0457B]">
              In an emergency, call your local emergency number (Dial 108) immediately.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
