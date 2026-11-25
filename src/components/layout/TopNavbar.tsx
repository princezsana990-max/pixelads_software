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
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useDateRange, PresetRange } from '../../context/DateRangeContext';
import { useSupabase } from '../../context/SupabaseContext';
import { useCompanySettings } from '../../context/CompanySettingsContext';
import { Button } from '../ui/Button';

export const TopNavbar: React.FC<{
  onMenuToggle: () => void;
  isSidebarCollapsed?: boolean;
}> = ({ onMenuToggle, isSidebarCollapsed = false }) => {
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
      {/* Left side: Sidebar Toggle (Mobile & Desktop) & Timezone */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary transition-all flex items-center gap-2 border border-border/50 hover:border-brand-500/40"
          title={isSidebarCollapsed ? 'Unhide Sidebar' : 'Hide Sidebar'}
          aria-label="Toggle navigation menu"
        >
          {isSidebarCollapsed ? (
            <PanelLeft className="w-5 h-5 text-brand-500" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
          <span className="hidden md:inline text-xs font-medium text-fg-secondary">
            {isSidebarCollapsed ? 'Show Menu' : 'Hide Menu'}
          </span>
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
            className="bg-transparent text-fg-primary font-medium focus:outline-none cursor-pointer"
            aria-label="Date Range Preset"
          >
            {presets.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Database Connection Status Badge */}
        <div
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isChecking
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
              : isConnected
              ? 'bg-status-success/10 border-status-success/20 text-status-success'
              : 'bg-status-danger/10 border-status-danger/20 text-status-danger'
          }`}
          title={
            isChecking
              ? 'Checking connection...'
              : isConnected
              ? 'Supabase PostgreSQL Connected'
              : 'Database Connection Lost'
          }
        >
          {isChecking ? (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          ) : isConnected ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5" />
          )}
          <span>{isChecking ? 'Checking...' : isConnected ? 'DB Live' : 'Offline'}</span>
        </div>

        {/* Dark/Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Quick Add Order CTA */}
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/orders/add')}
          icon={<Plus className="w-4 h-4" />}
          className="hidden sm:inline-flex shadow-sm"
        >
          New Order
        </Button>
      </div>
    </header>
  );
};
