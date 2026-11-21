import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const routeNameMap: Record<string, string> = {
    dashboard: 'Dashboard',
    orders: 'Work Management',
    add: 'Add Order',
    'bulk-import': 'Bulk Import',
    employees: 'Employee Management',
    finance: 'Finance',
    payments: 'Payments',
    invoices: 'Invoice Management',
    new: 'New Invoice',
    attendance: 'Attendance',
    daily: 'Daily Attendance',
    monthly: 'Monthly Attendance',
    reports: 'Attendance Reports',
    analytics: 'Analytics & Reports',
    'order-takers': 'Order Taker Summary',
    editors: 'Editor Summary',
    'day-wise': 'Day-wise Report',
    performance: 'Employee Performance',
    averages: 'Average Performance Engine',
    mistakes: 'Mistake Analytics',
    settings: 'Settings',
    backup: 'Backup & Restore',
  };

  return (
    <nav className="flex items-center text-xs text-fg-muted mb-4 space-x-1.5" aria-label="Breadcrumb">
      <Link
        to="/dashboard"
        className="flex items-center text-fg-muted hover:text-brand-500 transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>
      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const displayName = routeNameMap[name] || decodeURIComponent(name);

        return (
          <React.Fragment key={routeTo}>
            <ChevronRight className="w-3 h-3 text-fg-muted/60 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-fg-primary">{displayName}</span>
            ) : (
              <Link to={routeTo} className="hover:text-brand-500 transition-colors">
                {displayName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
