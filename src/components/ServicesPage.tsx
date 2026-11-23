import React from 'react';
import { Activity, Calendar, Video, Pill, FileText, Receipt, Ambulance, Microscope, ShieldCheck, Clock, Building2, Users, ArrowRight } from 'lucide-react';

const services = [
  {
    icon: Calendar,
    title: 'Appointment Booking',
    desc: 'Schedule in-person and tele-consultation appointments with specialists across cardiology, pediatrics, orthopedics, neurology, and more. Real-time slot availability with automated confirmation.',
    accent: '#E0457B',
    accentBg: 'rgba(224, 69, 123, 0.08)',
    image: '/images/consultation-room-800.webp',
    alt: 'Outpatient consultation room for scheduled specialist appointments'
  },
  {
    icon: Video,
    title: 'Telemedicine',
    desc: 'Connect with doctors remotely through secure video consultations. Ideal for follow-ups, second opinions, and patients in regional areas around Rajam, Vizag, and Srikakulam.',
    accent: '#0E8FB0',
    accentBg: 'rgba(14, 143, 176, 0.08)',
    image: '/images/telemedicine-doctor-800.webp',
    alt: 'Doctor consulting patient via high-fidelity video telehealth'
  },
  {
    icon: FileText,
    title: 'Medical Records Access',
    desc: 'View lab reports, imaging results, and clinical notes in one place. Records are encrypted at rest and accessible only to you and your authorized care team.',
    accent: '#6D5BD0',
    accentBg: 'rgba(109, 91, 208, 0.08)',
    image: '/images/clinical-lab-800.webp',
    alt: 'Accredited clinical diagnostic laboratory equipment'
  },
  {
    icon: Pill,
    title: 'Digital Prescriptions',
    desc: 'Doctors issue prescriptions digitally, which are instantly available in your patient portal. Track medication history and set dosage reminders.',
    accent: '#0E4F4A',
    accentBg: 'rgba(14, 79, 74, 0.08)',
    image: '/images/doctor-internal-medicine-800.webp',
    alt: 'Physician reviewing verified digital clinical prescriptions'
  },
  {
    icon: Receipt,
    title: 'Billing & Insurance',
    desc: 'Transparent billing with itemized invoices, insurance claim tracking, and secure online payments. No surprise charges — every cost is visible before you pay.',
    accent: '#FF7A59',
    accentBg: 'rgba(255, 122, 89, 0.08)',
    image: '/images/hospital-institute-800.webp',
    alt: 'Hospital reception and billing concierges at Olmera Specialty Institute'
  },
  {
    icon: Ambulance,
    title: 'Emergency Dispatch',
    desc: 'One-tap SOS to coordinate emergency paramedic dispatch, or book an urgent consultation with an on-call specialist. Average response time under 12 minutes in serviced areas.',
    accent: '#E0457B',
    accentBg: 'rgba(224, 69, 123, 0.08)',
    image: '/images/hospital-srikakulam-800.webp',
    alt: 'Emergency response and triage station in regional care hospital'
  },
  {
    icon: Microscope,
    title: 'Lab & Diagnostics',
    desc: 'Book lab tests and diagnostic scans through partner laboratories. Results are delivered directly to your medical records within 24–48 hours.',
    accent: '#7B5CFF',
    accentBg: 'rgba(123, 92, 255, 0.08)',
    image: '/images/diagnostics-mri-800.webp',
    alt: 'Advanced MRI and diagnostic telemetry scanner'
  },
  {
    icon: Building2,
    title: 'Hospital & Bed Management',
    desc: 'Real-time bed availability across wards, ICU, and general rooms. Hospital administrators can manage occupancy, staff allocation, and department workflows from a single dashboard.',
    accent: '#22E3C8',
    accentBg: 'rgba(34, 227, 200, 0.08)',
    image: '/images/hospital-vizag-800.webp',
    alt: 'Olmera Institute of Medical Sciences inpatient wards'
  },
];

const stats = [
  { icon: Users, value: '50+', label: 'Specialists' },
  { icon: Building2, value: '4', label: 'Network Hospitals' },
  { icon: Clock, value: '24/7', label: 'Availability' },
  { icon: ShieldCheck, value: 'AES-256', label: 'Encryption' },
];

export function ServicesPage() {
  return (
    <div className="space-y-12 animate-fadeIn relative pb-20 font-ui text-[var(--color-ink)]">
      {/* Header */}
      <div className="text-center space-y-6 pt-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-surface-subtle)] rounded-full text-[var(--color-primary)] text-xs font-semibold uppercase tracking-widest border border-[var(--color-line)]">
          <Activity size={14} /> Clinical Services
        </div>
        <h1 className="text-4xl lg:text-6xl font-display font-semibold text-[var(--color-ink)] tracking-tight leading-[1.15]">
          Everything you need for <br />
          <span className="text-[var(--color-primary)]">quietly connected care.</span>
        </h1>
        <p className="text-[var(--color-muted)] text-base sm:text-lg font-normal max-w-2xl mx-auto leading-relaxed">
          From booking your initial consultation to accessing digital prescriptions, Olmera unifies your complete healthcare journey into a serene digital experience.
        </p>

        {/* Emergency Notice */}
        <div className="max-w-xl mx-auto p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl text-xs text-red-800 dark:text-red-200 font-semibold">
          In an emergency, call your local emergency number (Dial 108) immediately.
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="card p-6 text-center bg-[var(--color-surface)] border border-[var(--color-line)] shadow-sm">
            <div className="w-12 h-12 bg-[var(--color-surface-subtle)] rounded-2xl flex items-center justify-center text-[var(--color-primary)] mx-auto mb-3 border border-[var(--color-line)]">
              <stat.icon size={22} />
            </div>
            <p className="text-2xl font-display font-semibold text-[var(--color-ink)]">{stat.value}</p>
            <p className="text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Services Grid with Real Photos & Accent Colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {services.map((service, i) => (
          <div 
            key={i} 
            className="card overflow-hidden bg-[var(--color-surface)] border border-[var(--color-line)] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
            style={{ borderTop: `3px solid ${service.accent}` }}
          >
            <div>
              <div className="relative h-40 overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img 
                  src={service.image} 
                  alt={service.alt}
                  loading="lazy"
                  width={600}
                  height={320}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div 
                  className="absolute bottom-3 left-3 w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md"
                  style={{ backgroundColor: service.accent }}
                >
                  <service.icon size={18} />
                </div>
              </div>

              <div className="p-5">
                <h3 className="font-display font-semibold text-lg text-[var(--color-ink)] mb-2">{service.title}</h3>
                <p className="text-xs text-[var(--color-muted)] leading-relaxed">{service.desc}</p>
              </div>
            </div>

            <div className="p-5 pt-0">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] hover:underline">
                Learn more <ArrowRight size={13} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
