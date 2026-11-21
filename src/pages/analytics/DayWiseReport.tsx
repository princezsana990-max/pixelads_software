import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Download,
  Search,
  Filter,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getSupabaseClient } from '../../lib/supabase';
import { Order, Employee } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { DataTable, Column } from '../../components/ui/DataTable';
import { useDateRange } from '../../context/DateRangeContext';
import { exportToExcel } from '../../lib/exportUtils';

interface DayAggregateRow {
  dateKey: string;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  inProgressOrders: number;
  issueOrders: number;
  totalMistakes: number;
  activeEmployeesCount: number;
  dailyAverage: number;
}

export const DayWiseReport: React.FC = () => {
  const { dateRange } = useDateRange();

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
      const { data, error } = await client
        .from('orders')
        .select(`
          *,
          order_taker:employees!orders_order_taker_id_fkey(*),
          mistakes:order_mistakes(*)
        `)
        .gte('order_date', dateRange.startDate)
        .lte('order_date', dateRange.endDate)
        .order('order_date', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Failed to load day-wise report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange.startDate, dateRange.endDate]);

  // Aggregate by Date Key (YYYY-MM-DD)
  const dateMap = new Map<
    string,
    {
      total: number;
      completed: number;
      pending: number;
      inProgress: number;
      issues: number;
      mistakes: number;
      employeeIds: Set<string>;
    }
  >();

  orders.forEach((o) => {
    let dKey = o.order_date.substring(0, 10);
    try {
      dKey = format(parseISO(o.order_date), 'yyyy-MM-dd');
    } catch {
      // fallback
    }

    if (!dateMap.has(dKey)) {
      dateMap.set(dKey, {
        total: 0,
        completed: 0,
        pending: 0,
        inProgress: 0,
        issues: 0,
        mistakes: 0,
        employeeIds: new Set(),
      });
    }

    const curr = dateMap.get(dKey)!;
    curr.total += 1;
    if (o.status === 'Completed') curr.completed += 1;
    if (o.status === 'Pending') curr.pending += 1;
    if (o.status === 'In Progress') curr.inProgress += 1;
    if (o.status === 'Issue') curr.issues += 1;
    curr.mistakes += o.mistakes?.length || 0;
    if (o.order_taker_id) curr.employeeIds.add(o.order_taker_id);
  });

  const aggregateRows: DayAggregateRow[] = Array.from(dateMap.entries()).map(
    ([dateKey, data]) => {
      const activeEmps = data.employeeIds.size;
      const dailyAverage = activeEmps > 0 ? data.total / activeEmps : data.total;
      return {
        dateKey,
        totalOrders: data.total,
        completedOrders: data.completed,
        pendingOrders: data.pending,
        inProgressOrders: data.inProgress,
        issueOrders: data.issues,
        totalMistakes: data.mistakes,
        activeEmployeesCount: activeEmps,
        dailyAverage: Number(dailyAverage.toFixed(1)),
      };
    }
  );

  // Sort descending by date
  aggregateRows.sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  const filteredRows = aggregateRows.filter((r) => r.dateKey.includes(searchQuery));

  const handleExportExcel = () => {
    const exportData = filteredRows.map((r) => ({
      Date: r.dateKey,
      'Total Orders': r.totalOrders,
      'Completed Orders': r.completedOrders,
      'Pending Orders': r.pendingOrders,
      'In Progress Orders': r.inProgressOrders,
      'Issue Orders': r.issueOrders,
      'Total Mistakes': r.totalMistakes,
      'Active Order Takers': r.activeEmployeesCount,
      'Daily Avg per Employee': r.dailyAverage,
    }));
    exportToExcel(exportData, `DayWise_Report_${dateRange.preset}`, 'DayWise');
  };

  const columns: Column<DayAggregateRow>[] = [
    {
      key: 'dateKey',
      header: 'Date',
      render: (row) => (
        <span className="font-semibold text-fg-primary text-xs">
          {format(new Date(row.dateKey), 'MMMM dd, yyyy')}
        </span>
      ),
    },
    {
      key: 'totalOrders',
      header: 'Total Orders',
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
      key: 'activeEmployeesCount',
      header: 'Active Staff',
      render: (row) => (
        <span className="text-xs font-medium text-fg-secondary">
          {row.activeEmployeesCount} staff
        </span>
      ),
    },
    {
      key: 'dailyAverage',
      header: 'Daily Avg / Staff',
      render: (row) => (
        <span className="font-semibold text-brand-600 dark:text-brand-400">
          {row.dailyAverage}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-fg-primary">Day-wise Order Report</h1>
          <p className="text-sm text-fg-secondary mt-0.5">
            Aggregated operational velocity and volume transitions grouped by calendar date.
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

      {/* Date Scope & Filter */}
      <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search date (e.g. 2026-02)..."
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

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredRows}
        keyExtractor={(r) => r.dateKey}
        isLoading={isLoading}
        emptyTitle="No Daily Records"
        emptyDescription="There are no order records recorded for the selected date range."
      />
    </div>
  );
};
