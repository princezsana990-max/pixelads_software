import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Calendar,
  Search,
  CheckCircle2,
  XCircle,
  Users,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { getSupabaseClient } from '../../lib/supabase';
import { Employee, Attendance } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { DataTable, Column } from '../../components/ui/DataTable';

export const DailyAttendance: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const fetchData = async (dateStr: string) => {
    setIsLoading(true);
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    try {
      // 1. Fetch all active employees
      const { data: empData } = await client
        .from('employees')
        .select('*')
        .order('name', { ascending: true });
      setEmployees(empData || []);

      // 2. Fetch attendance records for selectedDate
      const { data: attData, error } = await client
        .from('attendance')
        .select('*')
        .eq('attendance_date', dateStr);

      if (error) throw error;
      setAttendanceRecords(attData || []);
    } catch (err) {
      console.error('Failed to load daily attendance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);

  // Idempotent Toggle Handler
  const handleToggleAttendance = async (employeeId: string, currentStatus: boolean | undefined) => {
    setIsToggling(employeeId);
    const client = getSupabaseClient();
    if (!client) {
      setIsToggling(null);
      return;
    }

    const nextStatus = !currentStatus; // ON (true) or OFF (false)

    try {
      // Upsert into attendance with unique constraint (employee_id, attendance_date)
      const { data, error } = await client
        .from('attendance')
        .upsert(
          [
            {
              employee_id: employeeId,
              attendance_date: selectedDate,
              is_present: nextStatus,
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'employee_id,attendance_date' }
        )
        .select();

      if (error) throw error;

      // Update local state idempotently
      setAttendanceRecords((prev) => {
        const filtered = prev.filter((r) => r.employee_id !== employeeId);
        if (data && data[0]) {
          return [...filtered, data[0]];
        }
        return filtered;
      });
    } catch (err: any) {
      alert(`Attendance toggle error: ${err.message}`);
    } finally {
      setIsToggling(null);
    }
  };

  // Bulk mark all visible employees
  const handleBulkMark = async (status: boolean) => {
    const client = getSupabaseClient();
    if (!client) return;

    setIsLoading(true);
    try {
      const payloads = employees
        .filter((e) => e.is_active)
        .map((e) => ({
          employee_id: e.id,
          attendance_date: selectedDate,
          is_present: status,
          updated_at: new Date().toISOString(),
        }));

      const { data, error } = await client
        .from('attendance')
        .upsert(payloads, { onConflict: 'employee_id,attendance_date' })
        .select();

      if (error) throw error;
      if (data) setAttendanceRecords(data);
    } catch (err: any) {
      alert(`Bulk update error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const attendanceMap = new Map<string, boolean>();
  attendanceRecords.forEach((r) => attendanceMap.set(r.employee_id, r.is_present));

  const filteredEmployees = employees.filter((emp) => {
    const matchesRole = roleFilter === 'All' || emp.role === roleFilter;
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const presentCount = employees.filter((e) => attendanceMap.get(e.id) === true).length;
  const absentCount = employees.filter(
    (e) => attendanceMap.get(e.id) === false || !attendanceMap.has(e.id)
  ).length;

  const columns: Column<Employee>[] = [
    {
      key: 'employee_code',
      header: 'ID',
      render: (row) => (
        <span className="font-mono font-semibold text-brand-600 dark:text-brand-400">
          {row.employee_code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Employee Name',
      render: (row) => (
        <div>
          <span className="font-medium text-fg-primary block">{row.name}</span>
          <span className="text-[11px] text-fg-muted">{row.email || row.contact_number || '—'}</span>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => <Badge variant="role">{row.role}</Badge>,
    },
    {
      key: 'status',
      header: 'Attendance Status',
      render: (row) => {
        const isPresent = attendanceMap.get(row.id);
        if (isPresent === true) {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-status-success/10 text-status-success border border-status-success/20">
              <Check className="w-3.5 h-3.5" />
              PRESENT (ON)
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-status-danger/10 text-status-danger border border-status-danger/20">
            <X className="w-3.5 h-3.5" />
            ABSENT (OFF)
          </span>
        );
      },
    },
    {
      key: 'toggle',
      header: 'Daily ON/OFF Control',
      className: 'text-right',
      headerClassName: 'text-right',
      render: (row) => {
        const isPresent = attendanceMap.get(row.id) === true;
        const isThisToggling = isToggling === row.id;

        return (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => handleToggleAttendance(row.id, isPresent)}
              disabled={isThisToggling}
              className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50 ${
                isPresent ? 'bg-status-success' : 'bg-status-danger/60'
              }`}
              role="switch"
              aria-checked={isPresent}
              title={`Switch ${isPresent ? 'OFF (Absent)' : 'ON (Present)'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isPresent ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-xs font-semibold w-10 text-right">
              {isPresent ? (
                <span className="text-status-success">ON</span>
              ) : (
                <span className="text-status-danger">OFF</span>
              )}
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-fg-primary">Daily Attendance</h1>
          <p className="text-sm text-fg-secondary mt-0.5">
            Idempotent daily presence controls. Repeated clicks never double count.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-44"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-bg-surface border border-border shadow-card">
          <div className="flex items-center justify-between text-fg-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Present Today</span>
            <CheckCircle2 className="w-5 h-5 text-status-success" />
          </div>
          <div className="text-kpi text-status-success">{presentCount}</div>
          <span className="text-xs text-fg-secondary mt-1 block">Staff members marked ON</span>
        </div>

        <div className="p-5 rounded-xl bg-bg-surface border border-border shadow-card">
          <div className="flex items-center justify-between text-fg-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Absent / Unmarked</span>
            <XCircle className="w-5 h-5 text-status-danger" />
          </div>
          <div className="text-kpi text-status-danger">{absentCount}</div>
          <span className="text-xs text-fg-secondary mt-1 block">Staff members marked OFF</span>
        </div>

        <div className="p-5 rounded-xl bg-bg-surface border border-border shadow-card">
          <div className="flex items-center justify-between text-fg-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Attendance Rate</span>
            <Users className="w-5 h-5 text-brand-500" />
          </div>
          <div className="text-kpi text-fg-primary">
            {employees.length > 0
              ? `${((presentCount / employees.length) * 100).toFixed(1)}%`
              : '0.0%'}
          </div>
          <span className="text-xs text-fg-secondary mt-1 block">
            Of {employees.length} total staff members
          </span>
        </div>
      </div>

      {/* Filter & Bulk Action Toolbar */}
      <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

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

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkMark(true)}
            icon={<Check className="w-3.5 h-3.5 text-status-success" />}
          >
            Mark All Present
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkMark(false)}
            icon={<X className="w-3.5 h-3.5 text-status-danger" />}
          >
            Mark All Absent
          </Button>
        </div>
      </div>

      {/* Attendance Table */}
      <DataTable
        columns={columns}
        data={filteredEmployees}
        keyExtractor={(e) => e.id}
        isLoading={isLoading}
        emptyTitle="No Employees Available"
        emptyDescription="Create employees first before taking attendance."
      />
    </div>
  );
};
