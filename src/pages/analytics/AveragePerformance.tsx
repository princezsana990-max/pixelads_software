import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Award,
  TrendingUp,
  Percent,
  Calendar,
  Filter,
  Download,
  AlertTriangle,
  Clock,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { getSupabaseClient } from '../../lib/supabase';
import { Employee, Order, OrderTakerMetrics, EditorMetrics } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Tooltip } from '../../components/ui/Tooltip';
import {
  calculateOrderTakerMetrics,
  calculateEditorMetrics,
  getCalendarDays,
  FORMULA_TOOLTIPS,
} from '../../lib/analyticsEngine';
import { useDateRange } from '../../context/DateRangeContext';
import { exportToExcel } from '../../lib/exportUtils';

type RankingCriterion =
  | 'totalOrders'
  | 'avgDaily'
  | 'activeDayAvg'
  | 'completionRate'
  | 'lowestMistakes'
  | 'mostMistakes'
  | 'mostPending';

export const AveragePerformance: React.FC = () => {
  const navigate = useNavigate();
  const { dateRange } = useDateRange();

  const [activeTab, setActiveTab] = useState<'Order Takers' | 'Editors'>('Order Takers');
  const [rankingCriterion, setRankingCriterion] = useState<RankingCriterion>('totalOrders');

  const [orderTakers, setOrderTakers] = useState<Employee[]>([]);
  const [editors, setEditors] = useState<Employee[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: empData } = await client.from('employees').select('*');
      const allEmps = empData || [];
      setOrderTakers(allEmps.filter((e) => e.role === 'Order Taker'));
      setEditors(allEmps.filter((e) => e.role === 'Editor'));

      const { data: orderData, error } = await client
        .from('orders')
        .select(`
          *,
          order_taker:employees!orders_order_taker_id_fkey(*),
          assigned_editor:employees!orders_assigned_editor_id_fkey(*),
          mistakes:order_mistakes(*)
        `)
        .gte('order_date', dateRange.startDate)
        .lte('order_date', dateRange.endDate);

      if (error) throw error;
      setOrders(orderData || []);
    } catch (err) {
      console.error('Failed to load average performance data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange.startDate, dateRange.endDate]);

  const calendarDays = getCalendarDays(dateRange.startDate, dateRange.endDate);

  const otMetricsList = orderTakers.map((ot) =>
    calculateOrderTakerMetrics(ot, orders, calendarDays)
  );

  const edMetricsList = editors.map((ed) =>
    calculateEditorMetrics(ed, orders, calendarDays)
  );

  // Sorting based on ranking criterion
  const sortMetrics = <T extends OrderTakerMetrics | EditorMetrics>(list: T[]): T[] => {
    const copy = [...list];
    switch (rankingCriterion) {
      case 'totalOrders':
        return copy.sort(
          (a, b) =>
            ((b as any).totalOrders || (b as any).totalAssignedOrders || 0) -
            ((a as any).totalOrders || (a as any).totalAssignedOrders || 0)
        );
      case 'avgDaily':
        return copy.sort(
          (a, b) =>
            ((b as any).avgOrdersPerCalendarDay || (b as any).avgOrdersPerDay || 0) -
            ((a as any).avgOrdersPerCalendarDay || (a as any).avgOrdersPerDay || 0)
        );
      case 'activeDayAvg':
        return copy.sort(
          (a, b) =>
            ((b as any).avgOrdersPerActiveWorkingDay || (b as any).avgOrdersPerActiveDay || 0) -
            ((a as any).avgOrdersPerActiveWorkingDay || (a as any).avgOrdersPerActiveDay || 0)
        );
      case 'completionRate':
        return copy.sort((a, b) => b.completionRate - a.completionRate);
      case 'lowestMistakes':
        return copy.sort(
          (a, b) =>
            ((a as any).mistakesPer100Orders || (a as any).mistakesPer100AssignedOrders || 0) -
            ((b as any).mistakesPer100Orders || (b as any).mistakesPer100AssignedOrders || 0)
        );
      case 'mostMistakes':
        return copy.sort((a, b) => b.totalMistakes - a.totalMistakes);
      case 'mostPending':
        return copy.sort((a, b) => b.pendingOrders - a.pendingOrders);
      default:
        return copy;
    }
  };

  const rankedOTs = sortMetrics(otMetricsList);
  const rankedEds = sortMetrics(edMetricsList);

  // Prepare chart comparison data
  const chartData = (activeTab === 'Order Takers' ? rankedOTs : rankedEds).map((m: any) => ({
    name: m.employeeName || m.editorName,
    dailyAvg: Number(
      (m.avgOrdersPerCalendarDay || m.avgOrdersPerDay || 0).toFixed(1)
    ),
    activeAvg: Number(
      (m.avgOrdersPerActiveWorkingDay || m.avgOrdersPerActiveDay || 0).toFixed(1)
    ),
    completionRate: Number(m.completionRate.toFixed(1)),
    mistakesPer100: Number(
      (m.mistakesPer100Orders || m.mistakesPer100AssignedOrders || 0).toFixed(1)
    ),
  }));

  const handleExport = () => {
    if (activeTab === 'Order Takers') {
      const exportData = rankedOTs.map((m, idx) => ({
        Rank: idx + 1,
        'Order Taker': m.employeeName,
        'EMP ID': m.employeeCode,
        'Total Orders': m.totalOrders,
        'Avg Orders/Day (Calendar)': m.avgOrdersPerCalendarDay.toFixed(2),
        'Avg Orders/Day (Active)': m.avgOrdersPerActiveWorkingDay.toFixed(2),
        'Completed Orders': m.completedOrders,
        'Completion Rate (%)': `${m.completionRate.toFixed(1)}%`,
        'Total Mistakes': m.totalMistakes,
        'Mistakes/100 Orders': m.mistakesPer100Orders.toFixed(2),
      }));
      exportToExcel(exportData, `Order_Taker_Averages_${dateRange.preset}`, 'OrderTakers');
    } else {
      const exportData = rankedEds.map((m, idx) => ({
        Rank: idx + 1,
        Editor: m.editorName,
        'EMP ID': m.editorCode,
        'Total Assigned': m.totalAssignedOrders,
        'Avg Orders/Day (Calendar)': m.avgOrdersPerDay.toFixed(2),
        'Avg Orders/Day (Active)': m.avgOrdersPerActiveDay.toFixed(2),
        'Completed Orders': m.completedOrders,
        'Completion Rate (%)': `${m.completionRate.toFixed(1)}%`,
        'Total Mistakes': m.totalMistakes,
        'Mistakes/100 Orders': m.mistakesPer100AssignedOrders.toFixed(2),
        'Avg Completion Turnaround (Hours)': m.avgCompletionTimeHours
          ? m.avgCompletionTimeHours.toFixed(1)
          : '—',
      }));
      exportToExcel(exportData, `Editor_Averages_${dateRange.preset}`, 'Editors');
    }
  };

  const otColumns: Column<OrderTakerMetrics>[] = [
    {
      key: 'rank',
      header: 'Rank',
      render: (_, idx) => (
        <span
          className={`font-bold text-xs px-2 py-0.5 rounded-full ${
            idx === 0
              ? 'bg-amber-500/10 text-amber-600'
              : idx === 1
              ? 'bg-slate-400/10 text-slate-600'
              : idx === 2
              ? 'bg-amber-700/10 text-amber-700'
              : 'text-fg-muted'
          }`}
        >
          #{idx + 1}
        </span>
      ),
    },
    {
      key: 'employeeName',
      header: 'Order Taker',
      render: (row) => (
        <div>
          <button
            onClick={() => navigate(`/analytics/performance?empId=${row.employeeId}`)}
            className="font-semibold text-fg-primary hover:text-brand-500 hover:underline block text-left"
          >
            {row.employeeName}
          </button>
          <span className="font-mono text-[11px] text-brand-500">{row.employeeCode}</span>
        </div>
      ),
    },
    {
      key: 'totalOrders',
      header: 'Total Orders',
      render: (row) => <span className="font-bold text-fg-primary">{row.totalOrders}</span>,
    },
    {
      key: 'avgCalendarDay',
      header: 'Calendar Day Avg',
      render: (row) => (
        <span className="font-semibold text-brand-600 dark:text-brand-400">
          {row.avgOrdersPerCalendarDay.toFixed(1)}
        </span>
      ),
    },
    {
      key: 'avgActiveDay',
      header: 'Active Day Avg',
      render: (row) => (
        <span className="font-semibold text-brand-600 dark:text-brand-400">
          {row.avgOrdersPerActiveWorkingDay.toFixed(1)}
        </span>
      ),
    },
    {
      key: 'completionRate',
      header: 'Completion Rate',
      render: (row) => (
        <span className="font-semibold text-status-success">{row.completionRate.toFixed(1)}%</span>
      ),
    },
    {
      key: 'totalMistakes',
      header: 'Total Mistakes',
      render: (row) => (
        <span
          className={`font-semibold ${
            row.totalMistakes > 0 ? 'text-status-danger' : 'text-fg-muted'
          }`}
        >
          {row.totalMistakes}
        </span>
      ),
    },
    {
      key: 'mistakesPer100',
      header: 'Mistakes / 100',
      render: (row) => (
        <span
          className={`font-semibold ${
            row.mistakesPer100Orders > 0 ? 'text-status-danger' : 'text-fg-muted'
          }`}
        >
          {row.mistakesPer100Orders.toFixed(1)}
        </span>
      ),
    },
  ];

  const edColumns: Column<EditorMetrics>[] = [
    {
      key: 'rank',
      header: 'Rank',
      render: (_, idx) => (
        <span
          className={`font-bold text-xs px-2 py-0.5 rounded-full ${
            idx === 0
              ? 'bg-amber-500/10 text-amber-600'
              : idx === 1
              ? 'bg-slate-400/10 text-slate-600'
              : idx === 2
              ? 'bg-amber-700/10 text-amber-700'
              : 'text-fg-muted'
          }`}
        >
          #{idx + 1}
        </span>
      ),
    },
    {
      key: 'editorName',
      header: 'Editor',
      render: (row) => (
        <div>
          <button
            onClick={() => navigate(`/analytics/performance?empId=${row.editorId}`)}
            className="font-semibold text-fg-primary hover:text-brand-500 hover:underline block text-left"
          >
            {row.editorName}
          </button>
          <span className="font-mono text-[11px] text-brand-500">{row.editorCode}</span>
        </div>
      ),
    },
    {
      key: 'totalAssignedOrders',
      header: 'Total Assigned',
      render: (row) => <span className="font-bold text-fg-primary">{row.totalAssignedOrders}</span>,
    },
    {
      key: 'avgCalendarDay',
      header: 'Calendar Day Avg',
      render: (row) => (
        <span className="font-semibold text-brand-600 dark:text-brand-400">
          {row.avgOrdersPerDay.toFixed(1)}
        </span>
      ),
    },
    {
      key: 'avgActiveDay',
      header: 'Active Day Avg',
      render: (row) => (
        <span className="font-semibold text-brand-600 dark:text-brand-400">
          {row.avgOrdersPerActiveDay.toFixed(1)}
        </span>
      ),
    },
    {
      key: 'completionRate',
      header: 'Completion Rate',
      render: (row) => (
        <span className="font-semibold text-status-success">{row.completionRate.toFixed(1)}%</span>
      ),
    },
    {
      key: 'turnaround',
      header: 'Avg Turnaround',
      render: (row) => (
        <span className="font-medium text-xs text-fg-primary">
          {row.avgCompletionTimeHours ? `${row.avgCompletionTimeHours.toFixed(1)} hrs` : '—'}
        </span>
      ),
    },
    {
      key: 'mistakesPer100',
      header: 'Mistakes / 100',
      render: (row) => (
        <span
          className={`font-semibold ${
            row.mistakesPer100AssignedOrders > 0 ? 'text-status-danger' : 'text-fg-muted'
          }`}
        >
          {row.mistakesPer100AssignedOrders.toFixed(1)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-fg-primary">
            Average & Performance Analytics Engine
          </h1>
          <p className="text-sm text-fg-secondary mt-0.5">
            Exact mathematical performance formulas with calendar day vs active day normalization.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExport} icon={<Download className="w-4 h-4" />}>
            Export Ranked Report
          </Button>
        </div>
      </div>

      {/* Role Switcher & Ranking Selector Toolbar */}
      <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Role Tabs */}
        <div className="flex items-center gap-2">
          {(['Order Takers', 'Editors'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === tab
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary'
              }`}
            >
              {tab} Analytics
            </button>
          ))}
        </div>

        {/* Ranking Criteria Dropdown */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-semibold text-fg-muted uppercase tracking-wider shrink-0">
            Rank By:
          </span>
          <Select
            value={rankingCriterion}
            onChange={(e) => setRankingCriterion(e.target.value as RankingCriterion)}
            options={[
              { value: 'totalOrders', label: 'Highest Total Orders' },
              { value: 'avgDaily', label: 'Highest Calendar Day Average' },
              { value: 'activeDayAvg', label: 'Highest Active Day Average' },
              { value: 'completionRate', label: 'Highest Completion Rate' },
              { value: 'lowestMistakes', label: 'Lowest Mistake Rate (Per 100)' },
              { value: 'mostMistakes', label: 'Most Recorded Mistakes' },
              { value: 'mostPending', label: 'Most Pending Orders' },
            ]}
          />
        </div>
      </div>

      {/* Comparison Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Comparative Velocity Chart ({activeTab})</CardTitle>
          <p className="text-xs text-fg-secondary mt-0.5">
            Visual comparison of daily order averages and completion percentages across staff.
          </p>
        </CardHeader>
        <CardContent className="h-72">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="dailyAvg" name="Daily Avg (Calendar)" fill="#7666C8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="activeAvg" name="Active Day Avg" fill="#5087CD" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completionRate" name="Completion Rate (%)" fill="#249B69" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-fg-muted">
              No performance records available for this date range.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ranked Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-section-title text-fg-primary">Ranked Performance Table</h3>
          <span className="text-xs text-fg-secondary">
            Scope: {calendarDays} Calendar Days ({dateRange.preset})
          </span>
        </div>

        {activeTab === 'Order Takers' ? (
          <DataTable
            columns={otColumns}
            data={rankedOTs}
            keyExtractor={(m) => m.employeeId}
            isLoading={isLoading}
            emptyTitle="No Order Takers Recorded"
            emptyDescription="Create Order Taker accounts and add orders to calculate performance metrics."
          />
        ) : (
          <DataTable
            columns={edColumns}
            data={rankedEds}
            keyExtractor={(m) => m.editorId}
            isLoading={isLoading}
            emptyTitle="No Editors Recorded"
            emptyDescription="Create Editor accounts and assign orders to calculate performance metrics."
          />
        )}
      </div>
    </div>
  );
};
