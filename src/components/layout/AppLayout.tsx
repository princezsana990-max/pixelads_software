import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { Breadcrumbs } from './Breadcrumbs';
import { MobileBottomNav } from './MobileBottomNav';
import { twMerge } from 'tailwind-merge';

export const AppLayout: React.FC = () => {
  // Mobile drawer open state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Desktop sidebar collapse/hide state (persisted)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('orderflow_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => {
        const next = !prev;
        localStorage.setItem('orderflow_sidebar_collapsed', String(next));
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-bg-app flex">
      {/* Global Sidebar */}
      <Sidebar
        isMobileOpen={isMobileOpen}
        isCollapsed={isCollapsed}
        onCloseMobile={() => setIsMobileOpen(false)}
        onToggleCollapse={toggleSidebar}
      />

      {/* Main App Container: automatically adjusts padding when sidebar is collapsed/hidden */}
      <div
        className={twMerge(
          'flex-1 flex flex-col min-h-screen w-full transition-all duration-300 ease-in-out',
          isCollapsed ? 'lg:pl-0' : 'lg:pl-64'
        )}
      >
        {/* Global Top Navbar */}
        <TopNavbar
          onMenuToggle={toggleSidebar}
          isSidebarCollapsed={isCollapsed}
        />

        {/* Dynamic Route Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto animate-fadeIn">
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>

      {/* Mobile Native-like Bottom Navigation */}
      <MobileBottomNav onOpenMenu={() => setIsMobileOpen(true)} />
    </div>
  );
};
