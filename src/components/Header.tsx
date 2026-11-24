import React, { useState, useEffect } from 'react';
import { Bell, Search, Settings, Menu, Sun, Moon, Compass, User as UserIcon } from 'lucide-react';
import { OlmeraWordmark } from './brand/OlmeraWordmark';

interface HeaderProps {
  role: 'admin' | 'doctor' | 'patient';
  user: any;
  onToggleSidebar: () => void;
  setView?: (view: any) => void;
}

export function Header({ role, user, onToggleSidebar, setView }: HeaderProps) {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('olmera-theme');
      if (savedTheme) return savedTheme === 'dark';
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('olmera-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('olmera-theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'admin': return 'Hospital Admin';
      case 'doctor': return 'Clinical Specialist';
      case 'patient': return 'Patient Portal';
      default: return 'Olmera';
    }
  };

  const handleNavigateNotifications = () => {
    if (!setView) return;
    if (role === 'admin') {
      setView('admin-notifications');
    } else if (role === 'doctor') {
      setView('doctor-notifications');
    } else {
      setView('patient-notifications');
    }
  };

  const handleNavigateSettings = () => {
    if (!setView) return;
    if (role === 'doctor') {
      setView('doctor-settings');
    } else {
      setView('settings');
    }
  };

  const handleNavigateProfile = () => {
    if (!setView) return;
    if (role === 'patient') {
      setView('patient-profile');
    } else if (role === 'doctor') {
      setView('doctor-profile');
    } else {
      setView('admin-users');
    }
  };

  const handleNavigateLocationMap = () => {
    if (!setView) return;
    setView('patient-location-map');
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!setView) return;
    if (role === 'patient') {
      setView('patient-find-doctor');
    } else if (role === 'doctor') {
      setView('doctor-patients');
    } else {
      setView('admin-patients');
    }
  };

  return (
    <header className="h-20 lg:h-22 bg-[var(--color-surface)]/90 border-b border-[var(--color-line)] flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-40 backdrop-blur-md transition-all duration-300 pt-[var(--safe-area-inset-top)]">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2.5 hover:bg-[var(--color-surface-subtle)] rounded-xl text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center z-50 relative"
          aria-label="Toggle navigation menu"
          title="Toggle Navigation Menu"
        >
          <Menu size={22} />
        </button>

        {/* Brand Wordmark in Header */}
        <div 
          className="flex items-center gap-4 cursor-pointer"
          onClick={() => setView?.('dashboard')}
          title="Go to Dashboard Overview"
        >
          <OlmeraWordmark className="h-7 w-auto" />
          <div className="hidden sm:block h-5 w-[1px] bg-[var(--color-line)]"></div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--color-muted)] font-sans">
              {getRoleLabel()}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] opacity-80"></span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
        {/* Search Input Bar */}
        <form 
          onSubmit={handleSearchSubmit}
          className="hidden md:flex items-center gap-2 bg-[var(--color-surface-subtle)] border border-[var(--color-line)] px-3 py-1.5 rounded-xl focus-within:border-[var(--color-primary)] transition-all min-h-[40px]"
        >
          <button
            type="submit"
            className="text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors p-1"
            title="Search"
            aria-label="Submit search"
          >
            <Search size={16} />
          </button>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={role === 'doctor' ? "Search patient records..." : "Search doctors, hospitals..."}
            className="bg-transparent border-none outline-none text-xs w-36 lg:w-48 xl:w-56 placeholder:text-[var(--color-muted)] text-[var(--color-ink)] font-ui"
          />
        </form>

        {/* Healthcare GPS Map Shortcut (Patients) */}
        {role === 'patient' && (
          <button
            type="button"
            onClick={handleNavigateLocationMap}
            className="p-2.5 rounded-xl border border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-subtle)] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Healthcare GPS Map & Facilities"
            aria-label="Healthcare GPS Map & Facilities"
          >
            <Compass size={18} />
          </button>
        )}

        {/* Theme Mode Toggle (Sun/Moon) */}
        <button 
          type="button"
          onClick={toggleDarkMode}
          className="p-2.5 rounded-xl border border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
          title={isDarkMode ? "Switch to Light Theme" : "Switch to Dark Theme"}
          aria-label={isDarkMode ? "Switch to Light Theme" : "Switch to Dark Theme"}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications Icon Button */}
        <button 
          type="button"
          onClick={handleNavigateNotifications}
          className="p-2.5 hover:bg-[var(--color-surface-subtle)] rounded-xl border border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-all relative min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Clinical & System Notifications"
          aria-label="Clinical & System Notifications"
        >
          <Bell size={18} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[var(--color-accent)] rounded-full"></span>
        </button>

        {/* Settings Icon Button */}
        <button 
          type="button"
          onClick={handleNavigateSettings}
          className="p-2.5 hover:bg-[var(--color-surface-subtle)] rounded-xl border border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Account & Portal Settings"
          aria-label="Account & Portal Settings"
        >
          <Settings size={18} />
        </button>

        {/* User Profile Button */}
        <button
          type="button"
          onClick={handleNavigateProfile}
          className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-[var(--color-line)] hover:opacity-80 transition-opacity min-h-[44px] text-left"
          title="View User Profile"
          aria-label="View User Profile"
        >
          <div className="hidden sm:block text-right">
            <p className="text-xs font-semibold text-[var(--color-ink)] leading-none capitalize truncate max-w-[120px]">
              {user?.displayName || user?.email?.split('@')[0] || 'Patient'}
            </p>
            <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider mt-1 font-medium">
              Verified {role}
            </p>
          </div>
          <div className="w-9 h-9 bg-[var(--color-mist)] text-[var(--color-primary)] rounded-xl flex items-center justify-center font-bold text-xs border border-[var(--color-line)] shadow-inner">
            {(user?.displayName?.[0] || user?.email?.[0] || 'O').toUpperCase()}
          </div>
        </button>
      </div>
    </header>
  );
}
