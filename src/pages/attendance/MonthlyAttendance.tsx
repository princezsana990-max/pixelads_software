import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  Percent,
  Calendar,
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
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { generateAttendancePDF } from '../../lib/exportUtils';
import { useCompanySettings } from '../../context/CompanySettingsContext';

export const MonthlyAttendance: React.FC = () => {
  const { settings } = useCompanySettings();

  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingDay, setIsTogglingDay] = useState<number | null>(null);

  const daysInCurrentMonth = getDaysInMonth(currentMonthDate);
  const monthYearDisplay = format(currentMonthDate, 'MMMM yyyy');
  const monthPrefix = format(currentMonthDate, 'yyyy-MM');

  const fetchMonthlyData = async () => {
    setIsLoading(true);
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    try {
      // 1. Fetch employees
      const { data: empData } = await client.from('employees').select('*').order('name');
      setEmployees(empData || []);

      if (empData && empData.length > 0 && !selectedEmployeeId) {
        setSelectedEmployeeId(empData[0].id);
      }

      // 2. Fetch monthly attendance for this month range
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
      console.error('Failed to load monthly attendance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyData();
  }, [currentMonthDate]);

  const handlePrevMonth = () => setCurrentMonthDate((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonthDate((prev) => addMonths(prev, 1));

  // Toggle single day ON/OFF idempotently
  const handleToggleDay = async (dayNumber: number) => {
    if (!selectedEmployeeId) return;
    setIsTogglingDay(dayNumber);

    const client = getSupabaseClient();
    if (!client) {
      setIsTogglingDay(null);
      return;
    }

    const dayStr = dayNumber < 10 ? `0${dayNumber}` : `${dayNumber}`;
    const dateStr = `${monthPrefix}-${dayStr}`;

    const existingRecord = attendanceRecords.find(
      (r) => r.employee_id === selectedEmployeeId && r.attendance_date === dateStr
    );
    const nextStatus = !existingRecord?.is_present;

    try {
      const { data, error } = await client
        .from('attendance')
        .upsert(
          [
            {
              employee_id: selectedEmployeeId,
              attendance_date: dateStr,
              is_present: nextStatus,
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'employee_id,attendance_date' }
        )
        .select();

      if (error) throw error;

      // Update state without affecting other days
      setAttendanceRecords((prev) => {
        const remaining = prev.filter(
          (r) => !(r.employee_id === selectedEmployeeId && r.attendance_date === dateStr)
        );
        if (data && data[0]) {
          return [...remaining, data[0]];
        }
        return remaining;
      });
    } catch (err: any) {
      alert(`Toggle error: ${err.message}`);
    } finally {
      setIsTogglingDay(null);
    }
  };

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  // Filter records for the currently selected employee in this month
  const empMonthlyRecords = attendanceRecords.filter(
    (r) => r.employee_id === selectedEmployeeId
  );
  const dayPresenceMap = new Map<number, boolean>();
  empMonthlyRecords.forEach((r) => {
    const day = parseInt(r.attendance_date.split('-')[2], 10);
    dayPresenceMap.set(day, r.is_present);
  });

  // Calculate monthly stats for selected employee
  const presentDaysCount = Array.from(dayPresenceMap.values()).filter((v) => v === true).length;
  const absentDaysCount = daysInCurrentMonth - presentDaysCount;
  const attendancePercentage =
    daysInCurrentMonth > 0 ? ((presentDaysCount / daysInCurrentMonth) * 100).toFixed(1) : '0.0';

  const handleDownloadEmployeePDF = () => {
    if (!selectedEmployee) return;
    generateAttendancePDF(
      selectedEmployee,
      monthYearDisplay,
      daysInCurrentMonth,
      empMonthlyRecords,
      settings
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-fg-primary">Monthly Attendance Calendar</h1>
          <p className="text-sm text-fg-secondary mt-0.5">
            Interactive 31-day presence controls per employee with individual PDF generation.
          </p>
        </div>

        {/* Month Navigator */}
        <div className="flex items-center gap-2 bg-bg-surface border border-border rounded-xl p-1 shadow-card">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevMonth}
            icon={<ChevronLeft className="w-4 h-4" />}
          />
          <span className="font-semibold text-xs px-3 min-w-[130px] text-center text-fg-primary">
            {monthYearDisplay}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextMonth}
            icon={<ChevronRight className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Employee Selector Bar */}
      <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-semibold text-fg-muted uppercase tracking-wider shrink-0">
            Select Employee:
          </span>
          <Select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="w-full sm:w-72"
            options={employees.map((e) => ({
              value: e.id,
              label: `${e.name} (${e.role} - ${e.employee_code})`,
            }))}
          />
        </div>

        {selectedEmployee && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadEmployeePDF}
            icon={<Download className="w-4 h-4" />}
          >
            Export Monthly Attendance PDF
          </Button>
        )}
      </div>

      {/* Monthly Statistics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted block mb-1">
            Present Days
          </span>
          <div className="text-2xl font-bold text-status-success">{presentDaysCount} Days</div>
          <span className="text-[11px] text-fg-secondary mt-0.5 block">Marked ON</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted block mb-1">
            Absent Days
          </span>
          <div className="text-2xl font-bold text-status-danger">{absentDaysCount} Days</div>
          <span className="text-[11px] text-fg-secondary mt-0.5 block">Marked OFF / Unmarked</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted block mb-1">
            Calendar Days
          </span>
          <div className="text-2xl font-bold text-fg-primary">{daysInCurrentMonth} Days</div>
          <span className="text-[11px] text-fg-secondary mt-0.5 block">Total days in month</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted block mb-1">
            Attendance Rate
          </span>
          <div className="text-2xl font-bold text-brand-600 dark:text-brand-400">
            {attendancePercentage}%
          </div>
          <span className="text-[11px] text-fg-secondary mt-0.5 block">Monthly adherence</span>
        </div>
      </div>

      {/* Daily Calendar Grid (1 to daysInCurrentMonth) */}
      <Card>
        <CardHeader>
          <CardTitle>Daily ON/OFF Controls ({monthYearDisplay})</CardTitle>
          <p className="text-xs text-fg-secondary mt-0.5">
            Click any day to toggle between Present (ON) and Absent (OFF). Changes take effect instantly and idempotently.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1).map((day) => {
              const isPresent = dayPresenceMap.get(day) === true;
              const isBusy = isTogglingDay === day;

              return (
                <button
                  key={day}
                  onClick={() => handleToggleDay(day)}
                  disabled={isBusy}
                  className={`p-3.5 rounded-xl border flex flex-col items-center justify-between gap-2 transition-all cursor-pointer select-none active:scale-95 ${
                    isPresent
                      ? 'bg-status-success/10 border-status-success/30 hover:border-status-success shadow-xs'
                      : 'bg-bg-secondary border-border hover:border-fg-muted/40'
                  }`}
                  title={`Day ${day}: Click to toggle`}
                >
                  <span className="text-xs font-semibold text-fg-secondary">Day {day}</span>
                  <span
                    className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${
                      isPresent
                        ? 'bg-status-success text-white'
                        : 'bg-status-danger/20 text-status-danger'
                    }`}
                  >
                    {isPresent ? 'ON' : 'OFF'}
                  </span>
                  <span className="text-[10px] text-fg-muted font-medium">
                    {isPresent ? 'Present' : 'Absent'}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
