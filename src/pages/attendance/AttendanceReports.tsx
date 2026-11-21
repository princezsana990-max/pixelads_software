import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Download,
  Search,
  Users,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';
import {
  format,
  getDaysInMonth,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from 'date-fns';
import { getSupabaseClient } from '../../lib/supabase';
import { Employee, Attendance } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { DataTable, Column } from '../../components/ui/DataTable';
import { exportToExcel, generateAttendancePDF } from '../../lib/exportUtils';
import { useCompanySettings } from '../../context/CompanySettingsContext';

interface EmployeeAttendanceRow {
  employee: Employee;
  presentDays: number;
  absentDays: number;
  calendarDays: number;
  percentage: string;
}

export const AttendanceReports: React.FC = () => {
  const { settings } = useCompanySettings();

  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const daysInCurrentMonth = getDaysInMonth(currentMonthDate);
  const monthYearDisplay = format(currentMonthDate, 'MMMM yyyy');

  const fetchData = async () => {
    setIsLoading(true);
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: empData } = await client.from('employees').select('*').order('name');
      setEmployees(empData || []);

      const startStr = format(startOfMonth(currentMonthDate), 'yyyy-MM-dd');
      const endStr = format(endOfMonth(currentMonthDate), 'yyyy-MM-dd');

      const { data: attData, error } = await client
        .from('attendance')
        .select('*')
        .gte('attendance_date', startStr)
        .lte('attendance_date', endStr);

      if (error) throw error;
      setAttendanceRecords(attData || []);
    } catch (err) {
      console.error('Failed to load attendance report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentMonthDate]);

  // Aggregate monthly row per employee
  const reportRows: EmployeeAttendanceRow[] = employees.map((emp) => {
    const records = attendanceRecords.filter((r) => r.employee_id === emp.id);
    const presentCount = records.filter((r) => r.is_present).length;
    const absentCount = daysInCurrentMonth - presentCount;
    const pct =
      daysInCurrentMonth > 0 ? ((presentCount / daysInCurrentMonth) * 100).toFixed(1) : '0.0';

    return {
      employee: emp,
      presentDays: presentCount,
      absentDays: absentCount,
      calendarDays: daysInCurrentMonth,
      percentage: pct,
    };
  });

  const filteredRows = reportRows.filter((r) => {
    const matchesRole = roleFilter === 'All' || r.employee.role === roleFilter;
    const matchesSearch =
      r.employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.employee.employee_code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const handleExportExcel = () => {
    const exportData = filteredRows.map((r) => ({
      'Employee Code': r.employee.employee_code,
      'Employee Name': r.employee.name,
      Role: r.employee.role,
      Month: monthYearDisplay,
      'Calendar Days': r.calendarDays,
      'Present Days': r.presentDays,
      'Absent Days': r.absentDays,
      'Attendance Percentage': `${r.percentage}%`,
    }));
    exportToExcel(
      exportData,
      `Attendance_Report_${monthYearDisplay.replace(' ', '_')}`,
      'Attendance'
    );
  };

  const columns: Column<EmployeeAttendanceRow>[] = [
    {
      key: 'code',
      header: 'EMP ID',
      render: (row) => (
        <span className="font-mono font-semibold text-brand-600 dark:text-brand-400">
          {row.employee.employee_code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Employee Name',
      render: (row) => (
        <span className="font-semibold text-fg-primary">{row.employee.name}</span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => <Badge variant="role">{row.employee.role}</Badge>,
    },
    {
      key: 'calendarDays',
      header: 'Calendar Days',
      render: (row) => <span className="text-xs text-fg-secondary">{row.calendarDays}</span>,
    },
    {
      key: 'presentDays',
      header: 'Present Days',
      render: (row) => (
        <span className="font-bold text-status-success">{row.presentDays}</span>
      ),
    },
    {
      key: 'absentDays',
      header: 'Absent Days',
      render: (row) => (
        <span className="font-semibold text-status-danger">{row.absentDays}</span>
      ),
    },
    {
      key: 'percentage',
      header: 'Attendance %',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-fg-primary text-xs w-12">{row.percentage}%</span>
          <div className="w-24 h-2 bg-bg-secondary rounded-full overflow-hidden border border-border">
            <div
              className="h-full bg-brand-500 rounded-full"
              style={{ width: `${row.percentage}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'pdf',
      header: 'Individual PDF',
      className: 'text-right',
      headerClassName: 'text-right',
      render: (row) => {
        const empRecords = attendanceRecords.filter((r) => r.employee_id === row.employee.id);
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              generateAttendancePDF(
                row.employee,
                monthYearDisplay,
                daysInCurrentMonth,
                empRecords,
                settings
              )
            }
            icon={<Download className="w-3.5 h-3.5" />}
          >
            PDF
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-fg-primary">Monthly Attendance Reports</h1>
          <p className="text-sm text-fg-secondary mt-0.5">
            Team-wide presence summary, monthly percentages, and individual or combined exports.
          </p>
        </div>

        {/* Month Navigator & Export */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-bg-surface border border-border rounded-xl p-1 shadow-card">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonthDate((prev) => subMonths(prev, 1))}
              icon={<ChevronLeft className="w-4 h-4" />}
            />
            <span className="font-semibold text-xs px-3 min-w-[130px] text-center text-fg-primary">
              {monthYearDisplay}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonthDate((prev) => addMonths(prev, 1))}
              icon={<ChevronRight className="w-4 h-4" />}
            />
          </div>

          <Button
            variant="outline"
            onClick={handleExportExcel}
            icon={<Download className="w-4 h-4" />}
          >
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="w-full sm:w-48">
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: 'All', label: 'All Roles' },
              { value: 'Order Taker', label: 'Order Takers' },
              { value: 'Editor', label: 'Editors' },
              { value: 'Manager', label: 'Managers' },
            ]}
          />
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredRows}
        keyExtractor={(r) => r.employee.id}
        isLoading={isLoading}
        emptyTitle="No Attendance Records"
        emptyDescription="No attendance logs found for the selected month."
      />
    </div>
  );
};
