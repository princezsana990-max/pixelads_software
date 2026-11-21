import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Scissors,
  Download,
  Search,
  Calendar,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';
import { Employee, Order, EditorMetrics } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { DataTable, Column } from '../../components/ui/DataTable';
import {
  calculateEditorMetrics,
  getCalendarDays,
  FORMULA_TOOLTIPS,
} from '../../lib/analyticsEngine';
import { useDateRange } from '../../context/DateRangeContext';
import { exportToExcel } from '../../lib/exportUtils';

export const EditorSummary: React.FC = () => {
  const navigate = useNavigate();
  const { dateRange } = useDateRange();

  const [editors, setEditors] = useState<Employee[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    try {
      // 1. Fetch Editors
      const { data: empData } = await client
        .from('employees')
        .select('*')
        .eq('role', 'Editor');
      setEditors(empData || []);

      // 2. Fetch orders within active date range
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
      console.error('Failed to load editor summary data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange.startDate, dateRange.endDate]);

  const calendarDays = getCalendarDays(dateRange.startDate, dateRange.endDate);

  // Calculate metrics for each editor using actual assignment records
  const metricsList: EditorMetrics[] = editors.map((ed) =>
    calculateEditorMetrics(ed, orders, calendarDays)
  );

  const filteredMetrics = metricsList.filter(
    (m) =>
      m.editorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.editorCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportExcel = () => {
    const exportData = filteredMetrics.map((m) => ({
      'Editor Code': m.editorCode,
      Editor: m.editorName,
      'Total Assigned': m.totalAssignedOrders,
      Completed: m.completedOrders,
      Pending: m.pendingOrders,
      'In Progress': m.inProgressOrders,
      Issues: m.issueOrders,
      Mistakes: m.totalMistakes,
      'Completion Rate (%)': `${m.completionRate.toFixed(1)}%`,
      'Avg Orders/Day': m.avgOrdersPerDay.toFixed(1),
      'Mistakes/100 Orders': m.mistakesPer100AssignedOrders.toFixed(1),
      'Avg Turnaround (Hours)': m.avgCompletionTimeHours ? m.avgCompletionTimeHours.toFixed(1) : '—',
      'Order Taker Assignment Breakdown': Object.entries(m.orderTakerAssignments)
        .map(([ot, count]) => `${ot}: ${count}`)
        .join(' | ') || 'None',
    }));
    exportToExcel(exportData, `Editor_Summary_${dateRange.preset}`, 'EditorSummary');
  };

  const columns: Column<EditorMetrics>[] = [
    {
      key: 'editorName',
      header: 'Editor',
      render: (row) => (
        <div>
          <button
            onClick={() => navigate(`/analytics/performance?empId=${row.editorId}`)}
            className="font-semibold text-fg-primary hover:text-brand-500 hover:underline text-left block"
            title="View detailed performance report"
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
      key: 'completedOrders',
      header: 'Completed',
      render: (row) => (
        <span className="font-semibold text-status-success">{row.completedOrders}</span>
      ),
    },
    {
      key: 'pendingOrders',
      header: 'Pending',
      render: (row) => (
        <span className="font-medium text-status-warning">{row.pendingOrders}</span>
      ),
    },
    {
      key: 'inProgressOrders',
      header: 'In Progress',
      render: (row) => (
        <span className="font-medium text-status-info">{row.inProgressOrders}</span>
      ),
    },
    {
      key: 'issueOrders',
      header: 'Issues',
      render: (row) => (
        <span
          className={`font-semibold ${
            row.issueOrders > 0 ? 'text-status-danger' : 'text-fg-muted'
          }`}
        >
          {row.issueOrders}
        </span>
      ),
    },
    {
      key: 'totalMistakes',
      header: 'Mistakes',
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
      key: 'avgCompletionTimeHours',
      header: 'Avg Turnaround',
      render: (row) => {
        if (!row.avgCompletionTimeHours) return <span className="text-xs text-fg-muted">—</span>;
        return (
          <span className="font-medium text-xs text-fg-primary flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-brand-500" />
            {row.avgCompletionTimeHours.toFixed(1)} hrs
          </span>
        );
      },
    },
    {
      key: 'mistakeDetails',
      header: 'Mistake Details',
      render: (row) => {
        if (row.mistakeDetails.length === 0) {
          return <span className="text-xs text-fg-muted italic">None recorded</span>;
        }
        return (
          <div className="max-w-[180px] text-xs text-fg-secondary truncate" title={row.mistakeDetails.join(', ')}>
            {row.mistakeDetails.join(', ')}
          </div>
        );
      },
    },
    {
      key: 'orderTakerAssignments',
      header: 'Employee-wise Assignment',
      render: (row) => {
        const entries = Object.entries(row.orderTakerAssignments);
        if (entries.length === 0) {
          return <span className="text-xs text-fg-muted italic">No assignments</span>;
        }
        const formatted = entries.map(([name, count]) => `${name}: ${count}`).join(' | ');
        return (
          <div className="font-mono text-xs text-fg-primary max-w-xs truncate" title={formatted}>
            {formatted}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-fg-primary">Editor-wise Summary</h1>
          <p className="text-sm text-fg-secondary mt-0.5">
            Workload distribution, turnaround velocity, mistakes, and Order Taker sourcing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            icon={<Download className="w-4 h-4" />}
          >
            Export Excel
          </Button>
        </div>
      </div>

      {/* Date Range & Search Toolbar */}
      <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search Editor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-fg-secondary">
          <Calendar className="w-3.5 h-3.5 text-brand-500" />
          <span>
            Active Date Scope: <strong className="text-fg-primary">{dateRange.formattedLabel}</strong>
          </span>
        </div>
      </div>

      {/* Summary Table */}
      <DataTable
        columns={columns}
        data={filteredMetrics}
        keyExtractor={(m) => m.editorId}
        isLoading={isLoading}
        emptyTitle="No Editor Records Found"
        emptyDescription="Create Editor accounts and assign orders to view performance workload."
      />
    </div>
  );
};
