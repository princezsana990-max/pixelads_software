import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  FileSpreadsheet,
  Upload,
  Users,
  UserCheck,
  Scissors,
  Shield,
  CreditCard,
  FileText,
  History,
  CalendarCheck,
  CalendarDays,
  BarChart3,
  TrendingUp,
  Award,
  AlertTriangle,
  Settings,
  Database,
  ChevronDown,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface NavSection {
  title: string;
  items: {
    label: string;
    path: string;
    icon: React.ElementType;
    badge?: string;
  }[];
}

const NAVIGATION_SECTIONS: NavSection[] = [
  {
    title: 'DASHBOARD',
    items: [
      {
        label: 'Dashboard Overview',
        path: '/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: 'WORK MANAGEMENT',
    items: [
      {
        label: 'Add Order',
        path: '/orders/add',
        icon: PlusCircle,
      },
      {
        label: 'All Orders',
        path: '/orders',
        icon: FileSpreadsheet,
      },
      {
        label: 'Bulk Import',
        path: '/orders/bulk-import',
        icon: Upload,
      },
    ],
  },
  {
    title: 'EMPLOYEES',
    items: [
      {
        label: 'All Employees',
        path: '/employees',
        icon: Users,
      },
      {
        label: 'Order Takers',
        path: '/employees?role=Order+Taker',
        icon: UserCheck,
      },
      {
        label: 'Editors',
        path: '/employees?role=Editor',
        icon: Scissors,
      },
      {
        label: 'Managers',
        path: '/employees?role=Manager',
        icon: Shield,
      },
    ],
  },
  {
    title: 'FINANCE',
    items: [
      {
        label: 'Payments',
        path: '/finance/payments',
        icon: CreditCard,
      },
      {
        label: 'Invoice Generator',
        path: '/finance/invoices/new',
        icon: FileText,
      },
      {
        label: 'Invoice History',
        path: '/finance/invoices',
        icon: History,
      },
    ],
  },
  {
    title: 'ATTENDANCE',
    items: [
      {
        label: 'Daily Attendance',
        path: '/attendance/daily',
        icon: CalendarCheck,
      },
      {
        label: 'Monthly Attendance',
        path: '/attendance/monthly',
        icon: CalendarDays,
      },
      {
        label: 'Attendance Reports',
        path: '/attendance/reports',
        icon: BarChart3,
      },
    ],
  },
  {
    title: 'ANALYTICS & REPORTS',
    items: [
      {
        label: 'Main Analytics',
        path: '/analytics',
        icon: TrendingUp,
      },
      {
        label: 'Order Taker Summary',
        path: '/analytics/order-takers',
        icon: UserCheck,
      },
      {
        label: 'Editor Summary',
        path: '/analytics/editors',
        icon: Scissors,
      },
      {
        label: 'Day-wise Report',
        path: '/analytics/day-wise',
        icon: CalendarDays,
      },
      {
        label: 'Employee Performance',
        path: '/analytics/performance',
        icon: Award,
      },
      {
        label: 'Average Performance',
        path: '/analytics/averages',
        icon: BarChart3,
      },
      {
        label: 'Mistake Analytics',
        path: '/analytics/mistakes',
        icon: AlertTriangle,
      },
      {
        label: 'Payment Reports',
        path: '/analytics/payments',
        icon: CreditCard,
      },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      {
        label: 'Settings',
        path: '/settings',
        icon: Settings,
      },
      {
        label: 'Backup & Restore',
        path: '/settings/backup',
        icon: Database,
      },
    ],
  },
];

export const Sidebar: React.FC<{ isOpen: boolean; onClose?: () => void }> = ({
  isOpen,
  onClose,
}) => {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={twMerge(
          'fixed top-0 bottom-0 left-0 z-40 w-64 bg-bg-surface border-r border-border transition-transform duration-200 ease-in-out flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-border bg-bg-surface shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-fg-primary tracking-tight">
                OrderFlow<span className="text-brand-500 font-extrabold ml-0.5">PRO</span>
              </span>
              <span className="block text-[10px] uppercase font-semibold text-fg-muted tracking-widest -mt-0.5">
                Enterprise Suite
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {NAVIGATION_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <h4 className="px-3 text-[11px] font-bold tracking-wider text-fg-muted uppercase">
                {section.title}
              </h4>
              <div className="space-y-0.5 pt-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        twMerge(
                          'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors group',
                          isActive
                            ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold shadow-xs'
                            : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary'
                        )
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-500/10 text-brand-500 font-bold">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer with system status */}
        <div className="p-3 border-t border-border bg-bg-secondary/40 shrink-0">
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-surface border border-border/60">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
              <span className="text-xs font-medium text-fg-secondary">System Online</span>
            </div>
            <span className="text-[11px] font-mono text-fg-muted">v1.0 Pro</span>
          </div>
        </div>
      </aside>
    </>
  );
};
