import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSupabase } from './context/SupabaseContext';
import { AppLayout } from './components/layout/AppLayout';
import { SetupRequired } from './pages/SetupRequired';
import { NotFound } from './pages/NotFound';

// Pages
import { Dashboard } from './pages/Dashboard';
import { EmployeesList } from './pages/employees/EmployeesList';
import { OrdersList } from './pages/orders/OrdersList';
import { AddOrder } from './pages/orders/AddOrder';
import { BulkImport } from './pages/orders/BulkImport';
import { PaymentsList } from './pages/finance/PaymentsList';
import { BulkImportPayments } from './pages/finance/BulkImportPayments';
import { InvoiceGenerator } from './pages/finance/InvoiceGenerator';
import { InvoiceHistory } from './pages/finance/InvoiceHistory';
import { DailyAttendance } from './pages/attendance/DailyAttendance';
import { MonthlyAttendance } from './pages/attendance/MonthlyAttendance';
import { AttendanceReports } from './pages/attendance/AttendanceReports';
import { BulkImportAttendance } from './pages/attendance/BulkImportAttendance';
import { MainAnalytics } from './pages/analytics/MainAnalytics';
import { OrderTakerSummary } from './pages/analytics/OrderTakerSummary';
import { EditorSummary } from './pages/analytics/EditorSummary';
import { DayWiseReport } from './pages/analytics/DayWiseReport';
import { EmployeePerformance } from './pages/analytics/EmployeePerformance';
import { AveragePerformance } from './pages/analytics/AveragePerformance';
import { MistakeAnalytics } from './pages/analytics/MistakeAnalytics';
import { PaymentReports } from './pages/analytics/PaymentReports';
import { GlobalSettings } from './pages/settings/GlobalSettings';
import { BackupRestore } from './pages/settings/BackupRestore';

export const App: React.FC = () => {
  const { isConfigured, isConnected, isChecking } = useSupabase();

  // If Supabase credentials are missing or invalid, show the mandatory Setup Required screen
  if (!isChecking && (!isConfigured || !isConnected)) {
    return <SetupRequired />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Work Management */}
        <Route path="/orders" element={<OrdersList />} />
        <Route path="/orders/add" element={<AddOrder />} />
        <Route path="/orders/bulk-import" element={<BulkImport />} />

        {/* Employees */}
        <Route path="/employees" element={<EmployeesList />} />

        {/* Finance */}
        <Route path="/finance/payments" element={<PaymentsList />} />
        <Route path="/finance/payments/bulk-import" element={<BulkImportPayments />} />
        <Route path="/finance/invoices" element={<InvoiceHistory />} />
        <Route path="/finance/invoices/new" element={<InvoiceGenerator />} />

        {/* Attendance */}
        <Route path="/attendance/daily" element={<DailyAttendance />} />
        <Route path="/attendance/monthly" element={<MonthlyAttendance />} />
        <Route path="/attendance/reports" element={<AttendanceReports />} />
        <Route path="/attendance/bulk-import" element={<BulkImportAttendance />} />

        {/* Analytics & Reports */}
        <Route path="/analytics" element={<MainAnalytics />} />
        <Route path="/analytics/order-takers" element={<OrderTakerSummary />} />
        <Route path="/analytics/editors" element={<EditorSummary />} />
        <Route path="/analytics/day-wise" element={<DayWiseReport />} />
        <Route path="/analytics/performance" element={<EmployeePerformance />} />
        <Route path="/analytics/averages" element={<AveragePerformance />} />
        <Route path="/analytics/mistakes" element={<MistakeAnalytics />} />
        <Route path="/analytics/payments" element={<PaymentReports />} />

        {/* System Settings */}
        <Route path="/settings" element={<GlobalSettings />} />
        <Route path="/settings/backup" element={<BackupRestore />} />

        {/* 404 Protection */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};
export default App;
