import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Download,
  Calendar,
  PieChart as PieChartIcon,
  TrendingDown,
  Layers,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { getSupabaseClient } from '../../lib/supabase';
import { Order, OrderMistake, MistakeCategoryStat } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { DataTable, Column } from '../../components/ui/DataTable';
import { calculateMistakeAnalytics } from '../../lib/analyticsEngine';
import { useDateRange } from '../../context/DateRangeContext';
import { exportToExcel } from '../../lib/exportUtils';

const CHART_COLORS = [
  '#DB5360',
  '#E6A23C',
  '#7666C8',
  '#5087CD',
  '#249B69',
  '#8E44AD',
  '#D35400',
  '#16A085',
  '#2C3E50',
  '#7F8C8D',
];

export const MistakeAnalytics: React.FC = () => {
  const { dateRange } = useDateRange();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOrders = async () => {
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
          assigned_editor:employees!orders_assigned_editor_id_fkey(*),
          mistakes:order_mistakes(*)
        `)
        .gte('order_date', dateRange.startDate)
        .lte('order_date', dateRange.endDate);

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Failed to load orders for mistake analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [dateRange.startDate, dateRange.endDate]);

  const { categoryStats, top5, top10, totalMistakesCount, ordersWithMistakesCount } =
    calculateMistakeAnalytics(orders);

  const totalOrdersCount = orders.length;
  const overallMistakesPer100 =
    totalOrdersCount > 0 ? (totalMistakesCount / totalOrdersCount) * 100 : 0;
  const mostCommonMistake = top5[0]?.category || 'None';

  // Employee-wise mistake aggregations
  const otMistakeCounts: Record<string, { count: number; name: string }> = {};
  const edMistakeCounts: Record<string, { count: number; name: string }> = {};

  orders.forEach((o) => {
    const mistakesOnOrder = o.mistakes?.length || 0;
    if (mistakesOnOrder > 0) {
      if (o.order_taker) {
        if (!otMistakeCounts[o.order_taker.id]) {
          otMistakeCounts[o.order_taker.id] = { count: 0, name: o.order_taker.name };
        }
        otMistakeCounts[o.order_taker.id].count += mistakesOnOrder;
      }
      if (o.assigned_editor) {
        if (!edMistakeCounts[o.assigned_editor.id]) {
          edMistakeCounts[o.assigned_editor.id] = { count: 0, name: o.assigned_editor.name };
        }
        edMistakeCounts[o.assigned_editor.id].count += mistakesOnOrder;
      }
    }
  });

  const handleExportExcel = () => {
    const exportData = categoryStats.map((stat, idx) => ({
      Rank: idx + 1,
      'Mistake Category': stat.category,
      'Total Occurrences': stat.occurrences,
      'Affected Orders': stat.affectedOrdersCount,
      'Percentage of Total (%)': `${stat.percentageOfTotal}%`,
    }));
    exportToExcel(exportData, `Mistake_Analytics_${dateRange.preset}`, 'Mistakes');
  };

  const columns: Column<MistakeCategoryStat>[] = [
    {
      key: 'rank',
      header: 'Rank',
      render: (_, idx) => <span className="font-bold text-xs text-fg-muted">#{idx + 1}</span>,
    },
    {
      key: 'category',
      header: 'Mistake Category',
      render: (row) => (
        <span className="font-semibold text-fg-primary text-xs flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-status-danger" />
          {row.category}
        </span>
      ),
    },
    {
      key: 'occurrences',
      header: 'Total Incidents',
      render: (row) => (
        <span className="font-bold text-status-danger">{row.occurrences}</span>
      ),
    },
    {
      key: 'affectedOrdersCount',
      header: 'Affected Orders',
      render: (row) => (
        <span className="font-medium text-fg-primary">{row.affectedOrdersCount}</span>
      ),
    },
    {
      key: 'percentageOfTotal',
      header: '% of All Mistakes',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-fg-primary w-12">{row.percentageOfTotal}%</span>
          <div className="w-24 h-2 bg-bg-secondary rounded-full overflow-hidden border border-border">
            <div
              className="h-full bg-status-danger rounded-full"
              style={{ width: `${row.percentageOfTotal}%` }}
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-fg-primary">Mistake Analytics</h1>
          <p className="text-sm text-fg-secondary mt-0.5">
            Identify error frequency, recurring categories, affected workflows, and root causes.
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

      {/* Top Mistake KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted block mb-1">
            Total Mistakes
          </span>
          <div className="text-2xl font-bold text-status-danger">{totalMistakesCount}</div>
          <span className="text-[11px] text-fg-secondary mt-0.5 block">Recorded incidents</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted block mb-1">
            Mistakes / 100 Orders
          </span>
          <div className="text-2xl font-bold text-status-danger">
            {overallMistakesPer100.toFixed(1)}
          </div>
          <span className="text-[11px] text-fg-secondary mt-0.5 block">Per 100 orders rate</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted block mb-1">
            Affected Orders
          </span>
          <div className="text-2xl font-bold text-fg-primary">{ordersWithMistakesCount}</div>
          <span className="text-[11px] text-fg-secondary mt-0.5 block">
            Of {totalOrdersCount} total orders
          </span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted block mb-1">
            Most Common Mistake
          </span>
          <div className="text-lg font-bold text-fg-primary truncate" title={mostCommonMistake}>
            {mostCommonMistake}
          </div>
          <span className="text-[11px] text-fg-secondary mt-0.5 block">Highest occurrence</span>
        </div>
      </div>

      {/* Charts: Top Categories Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Mistake Categories</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {top5.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top5}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Bar dataKey="occurrences" fill="#DB5360" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-fg-muted">
                No mistakes recorded in this date range.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mistake Category Proportions</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            {top5.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={top5}
                    dataKey="occurrences"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {top5.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-fg-muted">No mistake distribution data.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full Top 10 Mistake Categories Table */}
      <div className="space-y-3">
        <h3 className="text-section-title text-fg-primary">Ranked Mistake Categories</h3>
        <DataTable
          columns={columns}
          data={categoryStats}
          keyExtractor={(c) => c.category}
          isLoading={isLoading}
          emptyTitle="No Mistakes Recorded"
          emptyDescription="Zero mistake incidents recorded for the selected date range."
        />
      </div>
    </div>
  );
};
