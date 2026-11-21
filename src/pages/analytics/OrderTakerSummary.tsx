import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  Download,
  Search,
  Filter,
  Info,
  AlertTriangle,
  FileSpreadsheet,
  Calendar,
} from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';
import { Employee, Order, OrderTakerMetrics } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Tooltip } from '../../components/ui/Tooltip';
import {
  calculateOrderTakerMetrics,
  getCalendarDays,
  FORMULA_TOOLTIPS,
} from '../../lib/analyticsEngine';
import { useDateRange } from '../../context/DateRangeContext';
import { exportToExcel } from '../../lib/exportUtils';

export const OrderTakerSummary: React.FC = () => {
  const navigate = useNavigate();
  const { dateRange } = useDateRange();

  const [orderTakers, setOrderTakers] = useState<Employee[]>([]);
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
      // 1. Fetch Order Takers
      const { data: empData } = await client
        .from('employees')
        .select('*')
        .eq('role', 'Order Taker');
      setOrderTakers(empData || []);

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
      console.error('Failed to load order taker summary data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange.startDate, dateRange.endDate]);

  const calendarDays = getCalendarDays(dateRange.startDate, dateRange.endDate);

  // Calculate metrics for each order taker
  const metricsList: OrderTakerMetrics[] = orderTakers.map((ot) =>
    calculateOrderTakerMetrics(ot, orders, calendarDays)
  );

  const filteredMetrics = metricsList.filter(
    (m) =>
      m.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportExcel = () => {
    const exportData = filteredMetrics.map((m) => ({
      'Employee Code': m.employeeCode,
      'Order Taker': m.employeeName,
      Total: m.totalOrders,
      Completed: m.completedOrders,
      Pending: m.pendingOrders,
      'In Progress': m.inProgressOrders,
      Issues: m.issueOrders,
      Mistakes: m.totalMistakes,
      'Completion Rate (%)': `${m.completionRate.toFixed(1)}%`,
      'Avg Orders/Day': m.avgOrdersPerCalendarDay.toFixed(1),
      'Mistakes/100 Orders': m.mistakesPer100Orders.toFixed(1),
      'Editor Assignment Breakdown': Object.entries(m.editorAssignments)
        .map(([ed, count]) => `${ed}: ${count}`)
        .join(' | ') || 'None',
    }));
    exportToExcel(exportData, `Order_Taker_Summary_${dateRange.preset}`, 'OrderTakerSummary');
  };

  const columns: Column<OrderTakerMetrics>[] = [
    {
      key: 'employeeName',
      header: 'Order Taker',
      render: (row) => (
        <div>
          <button
            onClick={() => navigate(`/analytics/performance?empId=${row.employeeId}`)}
            className="font-semibold text-fg-primary hover:text-brand-500 hover:underline text-left block"
            title="View detailed performance report"
          >
            {row.employeeName}
          </button>
          <span className="font-mono text-[11px] text-brand-500">{row.employeeCode}</span>
        </div>
      ),
    },
    {
      key: 'totalOrders',
      header: 'Total',
      render: (row) => <span className="font-bold text-fg-primary">{row.totalOrders}</span>,
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
      key: 'mistakeDetails',
      header: 'Mistake Details',
      render: (row) => {
        if (row.mistakeDetails.length === 0) {
          return <span className="text-xs text-fg-muted italic">None recorded</span>;
        }
        return (
          <div className="max-w-[200px] text-xs text-fg-secondary truncate" title={row.mistakeDetails.join(', ')}>
            {row.mistakeDetails.join(', ')}
          </div>
        );
      },
    },
    {
      key: 'editorAssignments',
      header: 'Editor-wise Assignment',
      render: (row) => {
        const entries = Object.entries(row.editorAssignments);
        if (entries.length === 0) {
          return <span className="text-xs text-fg-muted italic">No assignments</span>;
        }
        // Format: Nimra: 7 | Misbah: 2 | Sana: 18
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
          <h1 className="text-page-title text-fg-primary">Order Taker-wise Summary</h1>
          <p className="text-sm text-fg-secondary mt-0.5">
            Breakdown of order volumes, completed counts, mistake details, and assigned editors.
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
            placeholder="Search Order Taker..."
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
        keyExtractor={(m) => m.employeeId}
        isLoading={isLoading}
        emptyTitle="No Order Taker Records Found"
        emptyDescription="Create Order Takers and record orders to view performance summaries."
      />
    </div>
  );
};
