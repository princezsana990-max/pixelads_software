import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Award,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  User,
  Users,
  Search,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { getSupabaseClient } from '../../lib/supabase';
import { Employee, Order, Payment } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Tooltip } from '../../components/ui/Tooltip';
import {
  calculateOrderTakerMetrics,
  calculateEditorMetrics,
  getCalendarDays,
  FORMULA_TOOLTIPS,
} from '../../lib/analyticsEngine';
import { useDateRange } from '../../context/DateRangeContext';
import { useCompanySettings } from '../../context/CompanySettingsContext';

export const EmployeePerformance: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const empIdParam = searchParams.get('empId');

  const { dateRange } = useDateRange();
  const { settings } = useCompanySettings();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>(empIdParam || '');
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const client = getSupabaseClient();
    if (!client) return;

    const { data } = await client.from('employees').select('*').order('name');
    if (data && data.length > 0) {
      setEmployees(data);
      if (!selectedEmpId) {
        setSelectedEmpId(data[0].id);
      }
    }
  };

  useEffect(() => {
    if (selectedEmpId) {
      fetchEmployeeData(selectedEmpId);
    }
  }, [selectedEmpId, dateRange.startDate, dateRange.endDate]);

  const fetchEmployeeData = async (empId: string) => {
    setIsLoading(true);
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    try {
      // 1. Fetch orders for this employee (either as order taker or as assigned editor)
      const { data: orderData, error } = await client
        .from('orders')
        .select(`
          *,
          order_taker:employees!orders_order_taker_id_fkey(*),
          assigned_editor:employees!orders_assigned_editor_id_fkey(*),
          mistakes:order_mistakes(*)
        `)
        .or(`order_taker_id.eq.${empId},assigned_editor_id.eq.${empId}`)
        .gte('order_date', dateRange.startDate)
        .lte('order_date', dateRange.endDate)
        .order('order_date', { ascending: false });

      if (error) throw error;
      setOrders(orderData || []);

      // 2. Fetch payments for this employee
      const { data: payData } = await client
        .from('payments')
        .select('*')
        .eq('employee_id', empId);
      setPayments(payData || []);
    } catch (err) {
      console.error('Failed to load employee details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const currentEmployee = employees.find((e) => e.id === selectedEmpId);
  const calendarDays = getCalendarDays(dateRange.startDate, dateRange.endDate);

  // Determine role-specific analytics
  const isOrderTaker = currentEmployee?.role === 'Order Taker';
  const isEditor = currentEmployee?.role === 'Editor';

  const otMetrics = currentEmployee && isOrderTaker
    ? calculateOrderTakerMetrics(currentEmployee, orders, calendarDays)
    : null;

  const edMetrics = currentEmployee && isEditor
    ? calculateEditorMetrics(currentEmployee, orders, calendarDays)
    : null;

  // Total payments received by this employee
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  // Compute mistake category counts
  const mistakeCategoryFreq: Record<string, number> = {};
  orders.forEach((o) => {
    o.mistakes?.forEach((m) => {
      mistakeCategoryFreq[m.category_name] = (mistakeCategoryFreq[m.category_name] || 0) + 1;
    });
  });
  const mostCommonMistake = Object.entries(mistakeCategoryFreq).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] || 'None Recorded';

  // Daily trend data for chart
  const dailyDateCounts: Record<string, number> = {};
  orders.forEach((o) => {
    try {
      const d = format(parseISO(o.order_date), 'MMM dd');
      dailyDateCounts[d] = (dailyDateCounts[d] || 0) + 1;
    } catch {
      // ignore
    }
  });

  const chartData = Object.entries(dailyDateCounts).map(([date, count]) => ({
    date,
    orders: count,
  }));

  const orderColumns: Column<Order>[] = [
    {
      key: 'order_number',
      header: 'Order ID',
      render: (row) => (
        <span className="font-mono font-semibold text-brand-600 dark:text-brand-400">
          {row.order_number}
        </span>
      ),
    },
    {
      key: 'order_date',
      header: 'Order Date',
      render: (row) => (
        <span className="text-xs text-fg-secondary">
          {format(parseISO(row.order_date), 'MMM dd, yyyy')}
        </span>
      ),
    },
    {
      key: 'project_name',
      header: 'Project Name',
      render: (row) => (
        <span className="font-medium text-fg-primary max-w-xs truncate block">
          {row.project_name}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const variantMap: any = {
          Pending: 'pending',
          'In Progress': 'in-progress',
          Completed: 'completed',
          Issue: 'issue',
        };
        return <Badge variant={variantMap[row.status]}>{row.status}</Badge>;
      },
    },
    {
      key: 'mistakes',
      header: 'Mistakes',
      render: (row) => {
        const count = row.mistakes?.length || 0;
        return count > 0 ? (
          <span className="text-xs font-semibold text-status-danger bg-status-danger/10 px-2 py-0.5 rounded-full">
            {count}
          </span>
        ) : (
          <span className="text-xs text-fg-muted">0</span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-fg-primary">Employee Performance Report</h1>
          <p className="text-sm text-fg-secondary mt-0.5">
            Individual performance evaluation, exact formula metrics, and detailed order history.
          </p>
        </div>

        {/* Employee Picker */}
        <div className="flex items-center gap-3">
          <Select
            value={selectedEmpId}
            onChange={(e) => {
              setSelectedEmpId(e.target.value);
              setSearchParams({ empId: e.target.value });
            }}
            className="w-64"
            options={employees.map((e) => ({
              value: e.id,
              label: `${e.name} (${e.role})`,
            }))}
          />
        </div>
      </div>

      {currentEmployee && (
        <>
          {/* Employee Profile Header Card */}
          <div className="p-6 rounded-2xl bg-bg-surface border border-border shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white flex items-center justify-center font-bold text-2xl shadow-sm">
                {currentEmployee.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-fg-primary">{currentEmployee.name}</h2>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-bg-secondary text-brand-500 border border-border">
                    {currentEmployee.employee_code}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-fg-secondary">
                  <Badge variant="role">{currentEmployee.role}</Badge>
                  <span>Joined: {currentEmployee.joining_date}</span>
                  {currentEmployee.contact_number && <span>• {currentEmployee.contact_number}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 sm:border-l sm:border-border sm:pl-6 text-xs">
              <div>
                <span className="text-fg-muted block uppercase tracking-wider font-semibold">
                  Disbursed Salary / Pay
                </span>
                <span className="text-lg font-bold text-fg-primary mt-0.5 block">
                  {settings.currency || 'PKR'} {totalPaid.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-fg-muted block uppercase tracking-wider font-semibold">
                  Date Scope
                </span>
                <span className="font-medium text-fg-primary mt-0.5 block">
                  {calendarDays} Calendar Days
                </span>
              </div>
            </div>
          </div>

          {/* Performance Analytical KPI Cards (Exact Formulas) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
              <div className="flex items-center justify-between text-xs text-fg-muted mb-1">
                <span>Total Orders</span>
              </div>
              <div className="text-xl font-bold text-fg-primary">{orders.length}</div>
              <span className="text-[11px] text-fg-muted mt-0.5 block">In active scope</span>
            </div>

            <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
              <div className="flex items-center justify-between text-xs text-fg-muted mb-1">
                <span>Avg Orders / Day</span>
                <Tooltip content={FORMULA_TOOLTIPS.avgOrdersPerCalendarDay} />
              </div>
              <div className="text-xl font-bold text-brand-600 dark:text-brand-400">
                {otMetrics
                  ? otMetrics.avgOrdersPerCalendarDay.toFixed(1)
                  : edMetrics
                  ? edMetrics.avgOrdersPerDay.toFixed(1)
                  : (orders.length / calendarDays).toFixed(1)}
              </div>
              <span className="text-[11px] text-fg-muted mt-0.5 block">Per calendar day</span>
            </div>

            <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
              <div className="flex items-center justify-between text-xs text-fg-muted mb-1">
                <span>Active Day Avg</span>
                <Tooltip content={FORMULA_TOOLTIPS.avgOrdersPerActiveWorkingDay} />
              </div>
              <div className="text-xl font-bold text-brand-600 dark:text-brand-400">
                {otMetrics
                  ? otMetrics.avgOrdersPerActiveWorkingDay.toFixed(1)
                  : edMetrics
                  ? edMetrics.avgOrdersPerActiveDay.toFixed(1)
                  : '—'}
              </div>
              <span className="text-[11px] text-fg-muted mt-0.5 block">On active days</span>
            </div>

            <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
              <div className="flex items-center justify-between text-xs text-fg-muted mb-1">
                <span>Completion Rate</span>
                <Tooltip content={FORMULA_TOOLTIPS.completionRate} />
              </div>
              <div className="text-xl font-bold text-status-success">
                {otMetrics
                  ? `${otMetrics.completionRate.toFixed(1)}%`
                  : edMetrics
                  ? `${edMetrics.completionRate.toFixed(1)}%`
                  : '0.0%'}
              </div>
              <span className="text-[11px] text-fg-muted mt-0.5 block">Completed ÷ Total</span>
            </div>

            <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
              <div className="flex items-center justify-between text-xs text-fg-muted mb-1">
                <span>Total Mistakes</span>
              </div>
              <div className="text-xl font-bold text-status-danger">
                {otMetrics ? otMetrics.totalMistakes : edMetrics ? edMetrics.totalMistakes : 0}
              </div>
              <span className="text-[11px] text-fg-muted mt-0.5 block">Recorded incidents</span>
            </div>

            <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
              <div className="flex items-center justify-between text-xs text-fg-muted mb-1">
                <span>Mistakes / 100</span>
                <Tooltip content={FORMULA_TOOLTIPS.mistakesPer100Orders} />
              </div>
              <div className="text-xl font-bold text-status-danger">
                {otMetrics
                  ? otMetrics.mistakesPer100Orders.toFixed(1)
                  : edMetrics
                  ? edMetrics.mistakesPer100AssignedOrders.toFixed(1)
                  : '0.0'}
              </div>
              <span className="text-[11px] text-fg-muted mt-0.5 block">Per 100 orders</span>
            </div>
          </div>

          {/* Chart & Qualitative Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Daily Order Activity Trend</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip />
                      <Bar dataKey="orders" fill="#7666C8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-fg-muted">
                    No order activity recorded in this date range.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mistake & Quality Diagnostics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div>
                  <span className="text-fg-muted block uppercase tracking-wider font-semibold">
                    Most Common Mistake
                  </span>
                  <span className="text-sm font-bold text-status-danger block mt-1">
                    {mostCommonMistake}
                  </span>
                </div>

                {isEditor && edMetrics && (
                  <div>
                    <span className="text-fg-muted block uppercase tracking-wider font-semibold">
                      Avg Turnaround Velocity
                    </span>
                    <span className="text-sm font-bold text-fg-primary block mt-1">
                      {edMetrics.avgCompletionTimeHours
                        ? `${edMetrics.avgCompletionTimeHours.toFixed(1)} Hours`
                        : '—'}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-border">
                  <span className="text-fg-muted block uppercase tracking-wider font-semibold mb-2">
                    Mistake Category Breakdown
                  </span>
                  {Object.keys(mistakeCategoryFreq).length > 0 ? (
                    <div className="space-y-1.5">
                      {Object.entries(mistakeCategoryFreq).map(([cat, count]) => (
                        <div key={cat} className="flex justify-between items-center">
                          <span className="text-fg-primary">{cat}</span>
                          <span className="font-semibold text-status-danger">{count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-fg-muted italic">Zero mistakes recorded.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Orders Table for this employee */}
          <div className="space-y-3">
            <h3 className="text-section-title text-fg-primary">Orders Handled</h3>
            <DataTable
              columns={orderColumns}
              data={orders}
              keyExtractor={(o) => o.id}
              isLoading={isLoading}
              emptyTitle="No Orders Found"
              emptyDescription="This employee has not handled orders within the selected scope."
            />
          </div>
        </>
      )}
    </div>
  );
};
