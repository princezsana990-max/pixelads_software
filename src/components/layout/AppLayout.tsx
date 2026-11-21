import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { Breadcrumbs } from './Breadcrumbs';

export const AppLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg-app flex">
      {/* Global Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main App Container */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen w-full transition-all duration-200">
        {/* Global Top Navbar */}
        <TopNavbar onMenuToggle={() => setIsSidebarOpen((prev) => !prev)} />

        {/* Dynamic Route Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fadeIn">
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>
    </div>
  );
};
