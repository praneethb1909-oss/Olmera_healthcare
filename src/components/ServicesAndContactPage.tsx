import React, { useState } from 'react';
import {
  Activity, Calendar, Video, Pill, FileText, Receipt, Ambulance, Microscope,
  ShieldCheck, Clock, Building2, Users, Mail, MessageCircle, Send,
  CheckCircle2, Lock, ArrowDown
} from 'lucide-react';

const services = [
  {
    icon: Calendar,
    title: 'Appointment Booking',
    desc: 'Schedule in-person and tele-consultation appointments with specialists across cardiology, pediatrics, orthopedics, neurology, and more. Real-time slot availability with automated confirmation.',
    image: '/images/consultation-room-800.webp',
    alt: 'Outpatient consultation room for scheduled specialist appointments'
  },
  {
    icon: Video,
    title: 'Telemedicine',
    desc: 'Connect with doctors remotely through secure video consultations. Ideal for follow-ups, second opinions, and patients in regional areas around Rajam, Vizag, and Srikakulam.',
    image: '/images/telemedicine-doctor-800.webp',
    alt: 'Doctor consulting patient via high-fidelity video telehealth'
  },
  {
    icon: FileText,
    title: 'Medical Records Access',
    desc: 'View lab reports, imaging results, and clinical notes in one place. Records are encrypted at rest and accessible only to you and your authorized care team.',
    image: '/images/clinical-lab-800.webp',
    alt: 'Accredited clinical diagnostic laboratory equipment'
  },
  {
    icon: Pill,
    title: 'Digital Prescriptions',
    desc: 'Doctors issue verified digital prescriptions, instantly available in your patient portal with real OCR scanning and medication adherence reminders.',
    image: '/images/doctor-internal-medicine-800.webp',
    alt: 'Physician reviewing verified digital clinical prescriptions'
  },
  {
    icon: Receipt,
    title: 'Billing & Insurance',
    desc: 'Transparent billing with itemized invoices, insurance claim tracking, and secure online payments. Every cost is visible before you confirm.',
    image: '/images/hospital-institute-800.webp',
    alt: 'Hospital reception and billing concierges at Olmera Specialty Institute'
  },
  {
    icon: Ambulance,
    title: 'Emergency Dispatch',
    desc: 'One-tap SOS to coordinate emergency paramedic dispatch, or book an urgent consultation with an on-call specialist. Average response time under 12 minutes in serviced areas.',
    image: '/images/hospital-srikakulam-800.webp',
    alt: 'Emergency response and triage station in regional care hospital'
  },
  {
    icon: Microscope,
    title: 'Lab & Diagnostics',
    desc: 'Book lab tests and diagnostic scans through partner laboratories. Results are delivered directly to your medical records within 24–48 hours.',
    image: '/images/diagnostics-mri-800.webp',
    alt: 'Advanced MRI and diagnostic telemetry scanner'
  },
  {
    icon: Building2,
    title: 'Hospital & Bed Management',
    desc: 'Real-time bed availability across wards, ICU, and general rooms. Hospital administrators and doctors coordinate care workflows from a unified dashboard.',
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

export function ServicesAndContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [inquiryType, setInquiryType] = useState('General Support');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSubmitted(true);
    setName('');
    setEmail('');
    setMessage('');
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-14 animate-fadeIn relative pb-20 font-ui text-[var(--color-ink)]">
      {/* Header */}
      <div className="text-center space-y-5 pt-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[var(--color-surface-subtle)] rounded-full text-[var(--color-primary)] text-xs font-semibold uppercase tracking-widest border border-[var(--color-line)]">
          <Activity size={14} /> Clinical Services & Concierge Contact
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-semibold text-[var(--color-ink)] tracking-tight leading-[1.15]">
          Everything you need for <br className="hidden sm:inline" />
          <span className="text-[var(--color-primary)]">quietly connected care.</span>
        </h1>
        <p className="text-[var(--color-muted)] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Explore Olmera’s clinical services or reach our 24/7 care concierge team directly—all in one place.
        </p>

        {/* Quick Section Jumpers */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => scrollToSection('clinical-services-section')}
            className="px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-semibold inline-flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity min-h-[44px]"
          >
            <Activity size={14} /> Explore Clinical Services
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('contact-concierge-section')}
            className="px-4 py-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)] text-xs font-semibold inline-flex items-center gap-2 hover:bg-[var(--color-surface-subtle)] transition-colors min-h-[44px]"
          >
            <MessageCircle size={14} /> Contact & Support <ArrowDown size={13} />
          </button>
        </div>

        {/* Emergency Notice */}
        <div className="max-w-xl mx-auto p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl text-xs text-red-800 dark:text-red-200 font-semibold">
          In a medical emergency, call your local emergency number (<a href="tel:108" className="underline font-bold">Dial 108</a>) immediately.
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="card p-5 text-center bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl shadow-sm">
            <div className="w-11 h-11 bg-[var(--color-mist)] rounded-xl flex items-center justify-center text-[var(--color-primary)] mx-auto mb-3 border border-[var(--color-line)]">
              <stat.icon size={20} />
            </div>
            <p className="text-2xl font-display font-semibold text-[var(--color-ink)]">{stat.value}</p>
            <p className="text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* SECTION 1: CLINICAL SERVICES */}
      <section id="clinical-services-section" className="space-y-6 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[var(--color-line)] pb-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--color-ink)]">
              Clinical Services
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-1">
              Accredited inpatient, outpatient, and digital care across our network hospitals.
            </p>
          </div>
          <span className="text-xs font-semibold text-[var(--color-primary)]">8 Core Care Modules</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {services.map((service, i) => (
            <div
              key={i}
              className="group card overflow-hidden bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="relative h-40 overflow-hidden bg-[var(--color-surface-subtle)]">
                  <img
                    src={service.image}
                    alt={service.alt}
                    loading="lazy"
                    width={600}
                    height={320}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  <div className="absolute bottom-3 left-3 w-9 h-9 rounded-xl bg-[var(--color-primary)] flex items-center justify-center text-white shadow-md border border-white/20">
                    <service.icon size={18} />
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="font-display font-semibold text-lg text-[var(--color-ink)] mb-2">{service.title}</h3>
                  <p className="text-xs text-[var(--color-muted)] leading-relaxed">{service.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 2: CONTACT & CONCIERGE */}
      <section id="contact-concierge-section" className="pt-4 scroll-mt-24">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
          {/* Left: Contact Info Cards */}
          <div className="w-full lg:w-[390px] space-y-5 shrink-0">
            <div className="space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-primary)]">
                24/7 Concierge & Support
              </span>
              <h2 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--color-ink)]">
                Get in Touch
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
                Have questions about clinical consultations, hospital partnerships, or your portal account? Our team responds promptly.
              </p>
            </div>

            <div className="space-y-3.5">
              <a
                href="mailto:care@olmera.health"
                className="flex items-center gap-4 p-5 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-line)] shadow-sm hover:border-[var(--color-primary)] transition-all group"
              >
                <div className="w-11 h-11 bg-[var(--color-mist)] rounded-xl flex items-center justify-center text-[var(--color-primary)] group-hover:scale-105 transition-transform shrink-0">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-widest">Email Support</p>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">care@olmera.health</p>
                </div>
              </a>

              <div className="flex items-start gap-4 p-5 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-line)] shadow-sm">
                <div className="w-11 h-11 bg-[var(--color-mist)] rounded-xl flex items-center justify-center text-[var(--color-primary)] shrink-0">
                  <Lock size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-widest">Clinical Privacy</p>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">Authenticated Care Channel</p>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5 leading-relaxed">
                    Direct patient phone lines and location details are protected behind portal authentication.
                  </p>
                </div>
              </div>

              <a
                href="tel:108"
                className="flex items-center gap-4 p-5 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-line)] shadow-sm hover:border-rose-400 transition-all group"
              >
                <div className="w-11 h-11 bg-rose-50 dark:bg-rose-950/40 rounded-xl flex items-center justify-center text-rose-600 group-hover:scale-105 transition-transform shrink-0">
                  <Ambulance size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-widest">Emergency Assistance</p>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">Dial 108 Emergency Ambulance</p>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5">24/7 Toll-Free Immediate Medical Response</p>
                </div>
              </a>
            </div>
          </div>

          {/* Right: Contact Inquiry Form */}
          <div className="flex-1">
            <div className="card p-6 sm:p-8 lg:p-10 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-3xl shadow-sm">
              {submitted ? (
                <div className="py-12 text-center space-y-4 animate-fadeIn">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 size={28} />
                  </div>
                  <h3 className="text-xl font-display font-semibold text-[var(--color-ink)]">
                    Message Dispatched
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--color-muted)] max-w-md mx-auto">
                    Thank you for reaching out to Olmera Care Concierge. Our support team will respond to your inquiry shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="btn-outline px-5 py-2.5 text-xs font-semibold rounded-xl min-h-[44px]"
                  >
                    Send Another Inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="border-b border-[var(--color-line)] pb-4">
                    <h3 className="text-xl font-display font-semibold text-[var(--color-ink)]">
                      Send a Care Concierge Inquiry
                    </h3>
                    <p className="text-xs text-[var(--color-muted)] mt-1">
                      For non-emergency clinical coordination, partnership requests, or technical assistance.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="contact-name" className="text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                        Full Name
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-primary)]"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="contact-email" className="text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                        Email Address
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-primary)]"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="contact-type" className="text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                      Inquiry Type
                    </label>
                    <select
                      id="contact-type"
                      value={inquiryType}
                      onChange={(e) => setInquiryType(e.target.value)}
                      className="w-full p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-primary)]"
                    >
                      <option>General Support</option>
                      <option>Clinical Partnership</option>
                      <option>Technical Issue</option>
                      <option>Feedback</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="contact-message" className="text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="How can our clinical team assist you today?"
                      className="w-full p-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full btn-accent py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-sm min-h-[44px]"
                  >
                    <span>Dispatch Message</span>
                    <Send size={16} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
