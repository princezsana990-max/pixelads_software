import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  PanelLeftClose,
  X,
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavSection {
  title: string;
  icon: React.ElementType;
  defaultPath?: string;
  items: NavItem[];
}

const NAVIGATION_SECTIONS: NavSection[] = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      {
        label: 'Dashboard Overview',
        path: '/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: 'Work Management',
    icon: Layers,
    items: [
      {
        label: 'All Orders',
        path: '/orders',
        icon: FileSpreadsheet,
      },
      {
        label: 'Add Order',
        path: '/orders/add',
        icon: PlusCircle,
      },
      {
        label: 'Bulk Import',
        path: '/orders/bulk-import',
        icon: Upload,
      },
    ],
  },
  {
    title: 'Employees',
    icon: Users,
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
    title: 'Finance',
    icon: CreditCard,
    items: [
      {
        label: 'Payments List',
        path: '/finance/payments',
        icon: CreditCard,
      },
      {
        label: 'Bulk Import Payments',
        path: '/finance/payments/bulk-import',
        icon: Upload,
        badge: 'Old & New',
      },
      {
        label: 'Invoice History',
        path: '/finance/invoices',
        icon: History,
      },
      {
        label: 'Invoice Generator',
        path: '/finance/invoices/new',
        icon: FileText,
      },
    ],
  },
  {
    title: 'Attendance',
    icon: CalendarCheck,
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
      {
        label: 'Bulk Import Attendance',
        path: '/attendance/bulk-import',
        icon: Upload,
        badge: 'Old & New',
      },
    ],
  },
  {
    title: 'Analytics & Reports',
    icon: TrendingUp,
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
    title: 'System',
    icon: Settings,
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

interface SidebarProps {
  isMobileOpen: boolean;
  isCollapsed: boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  isCollapsed,
  onCloseMobile,
  onToggleCollapse,
}) => {
  const location = useLocation();

  // State to track which dropdown sections are open
  // Automatically open section matching current location
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {
      'Work Management': false,
      Finance: false,
      Attendance: false,
      Employees: false,
      'Analytics & Reports': false,
      System: false,
    };

    NAVIGATION_SECTIONS.forEach((sec) => {
      if (sec.items.some((item) => location.pathname.startsWith(item.path.split('?')[0]))) {
        initial[sec.title] = true;
      }
    });

    return initial;
  });

  // Keep active section open when route changes
  useEffect(() => {
    NAVIGATION_SECTIONS.forEach((sec) => {
      if (sec.items.some((item) => location.pathname.startsWith(item.path.split('?')[0]))) {
        setOpenSections((prev) => ({
          ...prev,
          [sec.title]: true,
        }));
      }
    });
  }, [location.pathname]);

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        className={twMerge(
          'fixed top-0 bottom-0 left-0 z-40 w-64 bg-bg-surface border-r border-border flex flex-col transition-all duration-300 ease-in-out shadow-sm',
          // Mobile state
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop state
          isCollapsed ? 'lg:-translate-x-full' : 'lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-border bg-bg-surface shrink-0">
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

          {/* Close/Collapse Button in header */}
          <button
            onClick={window.innerWidth < 1024 ? onCloseMobile : onToggleCollapse}
            className="p-1.5 rounded-lg text-fg-muted hover:text-fg-primary hover:bg-bg-secondary transition-colors"
            title={window.innerWidth < 1024 ? 'Close Menu' : 'Collapse Sidebar'}
            aria-label="Collapse Sidebar"
          >
            {window.innerWidth < 1024 ? (
              <X className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Scrollable Accordion/Dropdown Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 scrollbar-thin">
          {NAVIGATION_SECTIONS.map((section) => {
            const SectionIcon = section.icon;
            const isSingle = section.items.length === 1;
            const isSectionActive = section.items.some((item) =>
              location.pathname.startsWith(item.path.split('?')[0])
            );
            const isOpen = openSections[section.title] ?? false;

            // Single item (Dashboard)
            if (isSingle) {
              const singleItem = section.items[0];
              const ItemIcon = singleItem.icon;
              return (
                <NavLink
                  key={singleItem.path}
                  to={singleItem.path}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    twMerge(
                      'flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group',
                      isActive
                        ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold border border-brand-500/20 shadow-xs'
                        : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary'
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <ItemIcon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                    <span>{singleItem.label}</span>
                  </div>
                </NavLink>
              );
            }

            // Dropdown Group for multi-page sections (Work Management, Finance, Attendance, etc.)
            return (
              <div
                key={section.title}
                className={twMerge(
                  'rounded-xl border transition-colors overflow-hidden',
                  isSectionActive
                    ? 'border-brand-500/20 bg-brand-500/[0.02]'
                    : 'border-transparent hover:border-border/60'
                )}
              >
                {/* Dropdown Header Trigger */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.title)}
                  className={twMerge(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none',
                    isSectionActive
                      ? 'text-brand-600 dark:text-brand-400 font-bold'
                      : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary'
                  )}
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-2.5">
                    <SectionIcon className="w-4 h-4 shrink-0" />
                    <span className="tracking-tight">{section.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-bg-secondary font-mono text-fg-muted border border-border/60">
                      {section.items.length}
                    </span>
                    {isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-fg-muted transition-transform" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-fg-muted transition-transform" />
                    )}
                  </div>
                </button>

                {/* Dropdown Child Items */}
                {isOpen && (
                  <div className="pl-6 pr-2 py-1 space-y-0.5 border-l-2 border-brand-500/20 ml-4 my-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={onCloseMobile}
                          className={({ isActive }) =>
                            twMerge(
                              'flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors group',
                              isActive
                                ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400 font-bold shadow-xs'
                                : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary'
                            )
                          }
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-105" />
                            <span className="truncate">{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-500/10 text-brand-500 font-bold">
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer with system status */}
        <div className="p-3 border-t border-border bg-bg-secondary/40 shrink-0">
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-surface border border-border/60">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
              <span className="text-xs font-medium text-fg-secondary">System Online</span>
            </div>
            <span className="text-[11px] font-mono text-fg-muted">v1.2 Pro</span>
          </div>
        </div>
      </aside>
    </>
  );
};
