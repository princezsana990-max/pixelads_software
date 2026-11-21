import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  Moon,
  Sun,
  Globe,
  Database,
  Plus,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useDateRange, PresetRange } from '../../context/DateRangeContext';
import { useSupabase } from '../../context/SupabaseContext';
import { useCompanySettings } from '../../context/CompanySettingsContext';
import { Button } from '../ui/Button';

export const TopNavbar: React.FC<{ onMenuToggle: () => void }> = ({ onMenuToggle }) => {
  const { theme, toggleTheme } = useTheme();
  const { dateRange, setPreset } = useDateRange();
  const { isConnected, isChecking } = useSupabase();
  const { settings } = useCompanySettings();
  const navigate = useNavigate();

  const presets: PresetRange[] = [
    'Today',
    'Yesterday',
    'Last 7 Days',
    'Last 30 Days',
    'This Month',
    'Last Month',
  ];

  return (
    <header className="sticky top-0 z-30 h-16 bg-bg-surface/90 backdrop-blur-md border-b border-border flex items-center justify-between px-4 sm:px-6 transition-colors">
      {/* Left side: Hamburger on mobile & Timezone Pill */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary lg:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Timezone Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-secondary border border-border text-xs text-fg-secondary">
          <Globe className="w-3.5 h-3.5 text-brand-500" />
          <span className="font-medium text-fg-primary">{settings.timezone || 'Asia/Karachi'}</span>
        </div>
      </div>

      {/* Right side: Date Filter, DB Health, Theme Toggle, Add Order Button */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Date Filter Dropdown */}
        <div className="flex items-center gap-1.5 bg-bg-secondary border border-border rounded-lg px-2.5 py-1 text-xs">
          <Calendar className="w-3.5 h-3.5 text-fg-muted" />
          <select
            value={dateRange.preset}
            onChange={(e) => setPreset(e.target.value as PresetRange)}
            className="bg-transparent text-xs font-medium text-fg-primary focus:outline-none cursor-pointer pr-1"
            aria-label="Date range filter"
          >
            {presets.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Supabase Connection Status Pill */}
        <Link
          to="/settings/backup"
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${
            isConnected
              ? 'bg-status-success/10 text-status-success border-status-success/20 hover:bg-status-success/20'
              : 'bg-status-warning/10 text-status-warning border-status-warning/20 hover:bg-status-warning/20'
          }`}
          title={isConnected ? 'Connected to Supabase PostgreSQL' : 'Supabase Setup Required'}
        >
          <Database className="w-3.5 h-3.5" />
          <span>{isConnected ? 'PostgreSQL Active' : 'Setup Required'}</span>
        </Link>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary transition-colors"
          aria-label={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Quick Add Order CTA */}
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/orders/add')}
          icon={<Plus className="w-4 h-4" />}
          className="shadow-sm"
        >
          <span className="hidden sm:inline">Add Order</span>
        </Button>
      </div>
    </header>
  );
};
