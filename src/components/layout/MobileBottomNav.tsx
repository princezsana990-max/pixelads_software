import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileSpreadsheet,
  CreditCard,
  CalendarCheck,
  Menu,
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface MobileBottomNavProps {
  onOpenMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenMenu }) => {
  const navItems = [
    { label: 'Home', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Orders', path: '/orders', icon: FileSpreadsheet },
    { label: 'Payments', path: '/finance/payments', icon: CreditCard },
    { label: 'Attendance', path: '/attendance/daily', icon: CalendarCheck },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-bg-surface/90 backdrop-blur-xl border-t border-border/80 px-2 py-1.5 shadow-[0_-8px_24px_-4px_rgba(0,0,0,0.08)]"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                twMerge(
                  'flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all duration-200',
                  isActive
                    ? 'text-brand-600 dark:text-brand-400 bg-brand-500/10 scale-105 shadow-xs'
                    : 'text-fg-muted hover:text-fg-primary active:scale-95'
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold text-fg-muted hover:text-fg-primary active:scale-95 transition-all"
        >
          <Menu className="w-5 h-5" />
          <span>Menu</span>
        </button>
      </div>
    </nav>
  );
};
