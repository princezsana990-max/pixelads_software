import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  CreditCard,
  Users,
  TrendingUp,
  Percent,
  Calendar,
  Layers,
  ArrowRight,
  Plus,
  RefreshCw,
  Award,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { getSupabaseClient } from '../lib/supabase';
import { Order, Employee, Payment } from '../lib/types';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Tooltip } from '../components/ui/Tooltip';
import { EmptyState } from '../components/ui/EmptyState';
import { PageLoadingScreen } from '../components/ui/LoadingAnimation';
import {
  calculateOrderTakerMetrics,
  calculateEditorMetrics,
  calculateMistakeAnalytics,
  getCalendarDays,
  FORMULA_TOOLTIPS,
} from '../lib/analyticsEngine';
import { useDateRange } from '../context/DateRangeContext';
import { useCompanySettings } from '../context/CompanySettingsContext';

const STATUS_COLORS: Record<string, string> = {
  Completed: '#249B69',
  'In Progress': '#5087CD',
  Pending: '#E6A23C',
  Issue: '#DB5360',
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { dateRange, setPreset } = useDateRange();
  const { settings } = useCompanySettings();

  const [orders, setOrders] = useState<Order[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Performer Ranking Criterion
  const [rankingCriterion, setRankingCriterion] = useState<
    'totalOrders' | 'avgDaily' | 'completed' | 'completionRate' | 'lowestMistakes'
  >('totalOrders');

  const fetchDashboardData = async () => {
    setIsLoading(true);
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    try {
      // 1. Employees
      const { data: empData } = await client.from('employees').select('*');
      setEmployees(empData || []);

      // 2. Orders in Date Range
      const { data: orderData, error: orderError } = await client
        .from('orders')
        .select(`
          *,
          order_taker:employees!orders_order_taker_id_fkey(*),
          assigned_editor:employees!orders_assigned_editor_id_fkey(*),
          mistakes:order_mistakes(*)
        `)
        .gte('order_date', dateRange.startDate)
        .lte('order_date', dateRange.endDate)
        .order('order_date', { ascending: false });

      if (orderError) throw orderError;
      setOrders(orderData || []);

      // 3. Payments in Date Range
      const { data: payData } = await client
        .from('payments')
        .select('*')
        .gte('payment_date', dateRange.startDate.substring(0, 10))
        .lte('payment_date', dateRange.endDate.substring(0, 10));

      setPayments(payData || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange.startDate, dateRange.endDate]);

  const calendarDays = getCalendarDays(dateRange.startDate, dateRange.endDate);

  // --------------------------------------------------------------------------
  // TOP 8 KPI CARDS CALCULATIONS
  // --------------------------------------------------------------------------
  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => o.status === 'Completed').length;
  const pendingOrders = orders.filter((o) => o.status === 'Pending').length;
  const inProgressOrders = orders.filter((o) => o.status === 'In Progress').length;
  const issueOrders = orders.filter((o) => o.status === 'Issue').length;
  const totalMistakes = orders.reduce((sum, o) => sum + (o.mistakes?.length || 0), 0);
  const totalPaymentsAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const activeEmployeesCount = employees.filter((e) => e.is_active).length;

  // --------------------------------------------------------------------------
  // ADDITIONAL 6 ANALYTICAL KPI CARDS (Section 4 & 11)
  // --------------------------------------------------------------------------
  // Distinct calendar dates on which at least one order was created
  const distinctActiveDates = new Set(
    orders.map((o) => o.order_date.substring(0, 10))
  );
  const activeWorkingDaysCount = distinctActiveDates.size;

  // 9. Avg Orders Per Day (Calendar)
  const avgOrdersPerDay = calendarDays > 0 ? (totalOrders / calendarDays).toFixed(1) : '0.0';
  // 10. Avg Orders Per Active Working Day
  const avgOrdersPerActiveDay =
    activeWorkingDaysCount > 0 ? (totalOrders / activeWorkingDaysCount).toFixed(1) : '0.0';
  // 11. Avg Completed Orders Per Day
  const avgCompletedPerDay =
    calendarDays > 0 ? (completedOrders / calendarDays).toFixed(1) : '0.0';
  // 12. Overall Completion Rate (%)
  const overallCompletionRate =
    totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : '0.0';
  // 13. Mistakes Per 100 Orders
  const mistakesPer100 =
    totalOrders > 0 ? ((totalMistakes / totalOrders) * 100).toFixed(1) : '0.0';

  // 14. Average Order Completion Time (Turnaround in hours)
  let totalCompletionHours = 0;
  let completedCountWithDates = 0;
  orders.forEach((o) => {
    if (o.status === 'Completed' && o.completed_at && o.order_date) {
      try {
        const start = parseISO(o.order_date).getTime();
        const finish = parseISO(o.completed_at).getTime();
        const diff = (finish - start) / (1000 * 60 * 60);
        if (diff >= 0) {
          totalCompletionHours += diff;
          completedCountWithDates += 1;
        }
      } catch {
        // ignore
      }
    }
  });
  const avgCompletionTimeStr =
    completedCountWithDates > 0
      ? `${(totalCompletionHours / completedCountWithDates).toFixed(1)} hrs`
      : '—';

  // --------------------------------------------------------------------------
  // CHARTS DATA
  // --------------------------------------------------------------------------
  // Status Distribution
  const statusPieData = [
    { name: 'Completed', value: completedOrders },
    { name: 'In Progress', value: inProgressOrders },
    { name: 'Pending', value: pendingOrders },
    { name: 'Issue', value: issueOrders },
  ].filter((d) => d.value > 0);

  // Daily Order Trend
  const dailyDateCounts: Record<string, number> = {};
  orders.forEach((o) => {
    try {
      const d = format(parseISO(o.order_date), 'MMM dd');
      dailyDateCounts[d] = (dailyDateCounts[d] || 0) + 1;
    } catch {
      // ignore
    }
  });
  const dailyChartData = Object.entries(dailyDateCounts).map(([date, count]) => ({
    date,
    orders: count,
  }));

  // Mistake Analytics
  const { top5: top5Mistakes } = calculateMistakeAnalytics(orders);

  // --------------------------------------------------------------------------
  // TOP PERFORMING EMPLOYEES & EMPLOYEES REQUIRING IMPROVEMENT
  // --------------------------------------------------------------------------
  const orderTakersList = employees.filter((e) => e.role === 'Order Taker');
  const otMetrics = orderTakersList.map((ot) =>
    calculateOrderTakerMetrics(ot, orders, calendarDays)
  );

  // Sort top performers by criterion
  const sortedTopPerformers = [...otMetrics].sort((a, b) => {
    switch (rankingCriterion) {
      case 'totalOrders':
        return b.totalOrders - a.totalOrders;
      case 'avgDaily':
        return b.avgOrdersPerCalendarDay - a.avgOrdersPerCalendarDay;
      case 'completed':
        return b.completedOrders - a.completedOrders;
      case 'completionRate':
        return b.completionRate - a.completionRate;
      case 'lowestMistakes':
        return a.mistakesPer100Orders - b.mistakesPer100Orders;
      default:
        return b.totalOrders - a.totalOrders;
    }
  });

  // Employees Requiring Improvement:
  // Must have at least 1 order to compare fairly, sorted by highest mistake rate or most pending
  const employeesRequiringImprovement = otMetrics
    .filter((m) => m.totalOrders > 0)
    .sort((a, b) => {
      // Prioritize highest mistakes per 100 orders or most pending
      return b.mistakesPer100Orders - a.mistakesPer100Orders || b.pendingOrders - a.pendingOrders;
    })
    .slice(0, 5);

  if (isLoading && orders.length === 0) {
    return (
      <PageLoadingScreen
        message="Loading Operations Dashboard..."
        submessage="Preparing 3D analytics & live order pipeline"
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-fg-primary tracking-tight">Operations Dashboard</h1>
          <p className="text-sm text-fg-secondary mt-0.5">
            Real-time order pipeline, team performance velocity, and quality control metrics.
          </p>
        </div>

        {/* Quick Date Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Last Month'] as const).map(
            (p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  dateRange.preset === p
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-bg-surface text-fg-secondary hover:text-fg-primary border border-border'
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* TOP 8 CORE KPI CARDS                                                    */}
      {/* ---------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3.5">
        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted block mb-1">
            Total Orders
          </span>
          <div className="text-2xl font-bold text-fg-primary">{totalOrders}</div>
          <span className="text-[10px] text-fg-muted mt-0.5 block">In active range</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted block mb-1">
            Completed
          </span>
          <div className="text-2xl font-bold text-status-success">{completedOrders}</div>
          <span className="text-[10px] text-fg-muted mt-0.5 block">Delivered</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted block mb-1">
            Pending
          </span>
          <div className="text-2xl font-bold text-status-warning">{pendingOrders}</div>
          <span className="text-[10px] text-fg-muted mt-0.5 block">Awaiting start</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted block mb-1">
            In Progress
          </span>
          <div className="text-2xl font-bold text-status-info">{inProgressOrders}</div>
          <span className="text-[10px] text-fg-muted mt-0.5 block">Being edited</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted block mb-1">
            Issues
          </span>
          <div className="text-2xl font-bold text-status-danger">{issueOrders}</div>
          <span className="text-[10px] text-fg-muted mt-0.5 block">Requires attention</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted block mb-1">
            Mistakes
          </span>
          <div className="text-2xl font-bold text-status-danger">{totalMistakes}</div>
          <span className="text-[10px] text-fg-muted mt-0.5 block">Incidents</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted block mb-1">
            Disbursements
          </span>
          <div className="text-lg font-bold text-fg-primary truncate">
            {settings.currency || 'PKR'} {totalPaymentsAmount > 1000 ? `${(totalPaymentsAmount / 1000).toFixed(0)}k` : totalPaymentsAmount}
          </div>
          <span className="text-[10px] text-fg-muted mt-0.5 block">Paid in scope</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted block mb-1">
            Active Staff
          </span>
          <div className="text-2xl font-bold text-brand-600 dark:text-brand-400">
            {activeEmployeesCount}
          </div>
          <span className="text-[10px] text-fg-muted mt-0.5 block">Team members</span>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* ADDITIONAL 6 ADVANCED ANALYTICAL KPIS                                  */}
      {/* ---------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <div className="flex items-center justify-between text-[11px] text-fg-muted mb-1 font-semibold uppercase">
            <span>Avg / Cal Day</span>
            <Tooltip content={FORMULA_TOOLTIPS.avgOrdersPerCalendarDay} />
          </div>
          <div className="text-xl font-bold text-brand-600 dark:text-brand-400">
            {avgOrdersPerDay}
          </div>
          <span className="text-[10px] text-fg-muted mt-0.5 block">
            Over {calendarDays} calendar days
          </span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <div className="flex items-center justify-between text-[11px] text-fg-muted mb-1 font-semibold uppercase">
            <span>Active Day Avg</span>
            <Tooltip content={FORMULA_TOOLTIPS.avgOrdersPerActiveWorkingDay} />
          </div>
          <div className="text-xl font-bold text-brand-600 dark:text-brand-400">
            {avgOrdersPerActiveDay}
          </div>
          <span className="text-[10px] text-fg-muted mt-0.5 block">
            Over {activeWorkingDaysCount} active days
          </span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <div className="flex items-center justify-between text-[11px] text-fg-muted mb-1 font-semibold uppercase">
            <span>Avg Completed</span>
            <Tooltip content={FORMULA_TOOLTIPS.avgCompletedOrdersPerDay} />
          </div>
          <div className="text-xl font-bold text-status-success">{avgCompletedPerDay}</div>
          <span className="text-[10px] text-fg-muted mt-0.5 block">Completed / day</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <div className="flex items-center justify-between text-[11px] text-fg-muted mb-1 font-semibold uppercase">
            <span>Completion %</span>
            <Tooltip content={FORMULA_TOOLTIPS.completionRate} />
          </div>
          <div className="text-xl font-bold text-status-success">{overallCompletionRate}%</div>
          <span className="text-[10px] text-fg-muted mt-0.5 block">Delivered ratio</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <div className="flex items-center justify-between text-[11px] text-fg-muted mb-1 font-semibold uppercase">
            <span>Mistakes / 100</span>
            <Tooltip content={FORMULA_TOOLTIPS.mistakesPer100Orders} />
          </div>
          <div className="text-xl font-bold text-status-danger">{mistakesPer100}</div>
          <span className="text-[10px] text-fg-muted mt-0.5 block">Per 100 orders</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <div className="flex items-center justify-between text-[11px] text-fg-muted mb-1 font-semibold uppercase">
            <span>Turnaround</span>
            <Tooltip content={FORMULA_TOOLTIPS.editorTurnaround} />
          </div>
          <div className="text-xl font-bold text-fg-primary">{avgCompletionTimeStr}</div>
          <span className="text-[10px] text-fg-muted mt-0.5 block">Order to completion</span>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* MAIN CHARTS GRID                                                       */}
      {/* ---------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Trend Curve */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Daily Order Pipeline Trend</CardTitle>
            <span className="text-xs text-fg-secondary">
              Scope: {dateRange.formattedLabel}
            </span>
          </CardHeader>
          <CardContent className="h-64">
            {dailyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyChartData}>
                  <defs>
                    <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7666C8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#7666C8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    stroke="#7666C8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#orderGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-fg-muted">
                No orders recorded for this date range.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Breakdown Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex flex-col items-center justify-center">
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {statusPieData.map((entry) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={STATUS_COLORS[entry.name] || '#7666C8'}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-fg-muted">Zero active orders.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* ANALYTICAL COMPARISON SECTIONS                                          */}
      {/* ---------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Performing Employees */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Top Performing Employees</CardTitle>
              <p className="text-xs text-fg-secondary mt-0.5">
                Switch ranking criterion to evaluate productivity and quality.
              </p>
            </div>
            <select
              value={rankingCriterion}
              onChange={(e) => setRankingCriterion(e.target.value as any)}
              className="px-2.5 py-1 text-xs rounded-lg border border-border bg-bg-surface text-fg-primary font-medium"
            >
              <option value="totalOrders">Rank: Total Orders</option>
              <option value="avgDaily">Rank: Daily Average</option>
              <option value="completed">Rank: Completed Orders</option>
              <option value="completionRate">Rank: Completion Rate (%)</option>
              <option value="lowestMistakes">Rank: Lowest Mistake Rate</option>
            </select>
          </CardHeader>
          <CardContent>
            {sortedTopPerformers.length > 0 ? (
              <div className="divide-y divide-border">
                {sortedTopPerformers.slice(0, 5).map((performer, idx) => (
                  <div
                    key={performer.employeeId}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-bg-secondary/40 px-2 rounded-lg transition-colors cursor-pointer"
                    onClick={() => navigate(`/analytics/performance?empId=${performer.employeeId}`)}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          idx === 0
                            ? 'bg-amber-500/20 text-amber-600'
                            : idx === 1
                            ? 'bg-slate-400/20 text-slate-600'
                            : idx === 2
                            ? 'bg-amber-700/20 text-amber-700'
                            : 'text-fg-muted'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <div>
                        <span className="font-semibold text-fg-primary text-xs block">
                          {performer.employeeName}
                        </span>
                        <span className="font-mono text-[10px] text-brand-500">
                          {performer.employeeCode}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-right">
                        <span className="font-bold text-fg-primary block">
                          {performer.totalOrders} Orders
                        </span>
                        <span className="text-[10px] text-fg-muted">
                          {performer.avgOrdersPerCalendarDay.toFixed(1)} / day
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-status-success block">
                          {performer.completionRate.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-fg-muted">Completed</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-fg-muted">
                No performance data recorded for this date range.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most Common Mistakes */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Mistake Categories</CardTitle>
            <p className="text-xs text-fg-secondary mt-0.5">Most recurring operational errors.</p>
          </CardHeader>
          <CardContent>
            {top5Mistakes.length > 0 ? (
              <div className="space-y-3">
                {top5Mistakes.map((m: any, idx: number) => (
                  <div key={m.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-fg-primary flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-status-danger" />
                        {m.category}
                      </span>
                      <span className="font-bold text-status-danger">
                        {m.occurrences} incidents ({m.percentageOfTotal}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-status-danger rounded-full"
                        style={{ width: `${m.percentageOfTotal}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-fg-muted">
                Zero mistake incidents recorded.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Employees Requiring Improvement */}
      <Card>
        <CardHeader>
          <CardTitle>Employees Requiring Quality Focus & Improvement</CardTitle>
          <p className="text-xs text-fg-secondary mt-0.5">
            Normalized evaluation of employees with higher mistake density or backlog delays.
          </p>
        </CardHeader>
        <CardContent>
          {employeesRequiringImprovement.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {employeesRequiringImprovement.map((emp) => (
                <div
                  key={emp.employeeId}
                  className="p-4 rounded-xl border border-border bg-bg-secondary/40 space-y-2 cursor-pointer hover:border-brand-500/40 transition-colors"
                  onClick={() => navigate(`/analytics/performance?empId=${emp.employeeId}`)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-fg-primary text-xs">{emp.employeeName}</span>
                    <Badge variant="issue">{emp.mistakesPer100Orders.toFixed(1)} Mistakes / 100</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-fg-secondary pt-1 border-t border-border">
                    <div>
                      <span>Pending Orders:</span>{' '}
                      <strong className="text-fg-primary">{emp.pendingOrders}</strong>
                    </div>
                    <div>
                      <span>Completion:</span>{' '}
                      <strong className="text-fg-primary">{emp.completionRate.toFixed(1)}%</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-fg-muted">
              All active staff members maintain zero or minimal recorded mistakes.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
