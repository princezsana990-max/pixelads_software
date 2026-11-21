import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  PieChart as PieIcon,
  Download,
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
import { getSupabaseClient } from '../../lib/supabase';
import { Order, Payment } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { useDateRange } from '../../context/DateRangeContext';
import { useCompanySettings } from '../../context/CompanySettingsContext';

const STATUS_COLORS: Record<string, string> = {
  Completed: '#249B69',
  'In Progress': '#5087CD',
  Pending: '#E6A23C',
  Issue: '#DB5360',
};

export const MainAnalytics: React.FC = () => {
  const { dateRange } = useDateRange();
  const { settings } = useCompanySettings();

  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: orderData, error: orderError } = await client
        .from('orders')
        .select(`
          *,
          order_taker:employees!orders_order_taker_id_fkey(*),
          assigned_editor:employees!orders_assigned_editor_id_fkey(*),
          mistakes:order_mistakes(*)
        `)
        .gte('order_date', dateRange.startDate)
        .lte('order_date', dateRange.endDate);

      if (orderError) throw orderError;
      setOrders(orderData || []);

      const { data: payData } = await client
        .from('payments')
        .select('*')
        .gte('payment_date', dateRange.startDate.substring(0, 10))
        .lte('payment_date', dateRange.endDate.substring(0, 10));

      setPayments(payData || []);
    } catch (err) {
      console.error('Failed to load main analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange.startDate, dateRange.endDate]);

  // Aggregate Status Distribution
  const statusCounts: Record<string, number> = {
    Completed: 0,
    'In Progress': 0,
    Pending: 0,
    Issue: 0,
  };
  orders.forEach((o) => {
    if (statusCounts[o.status] !== undefined) {
      statusCounts[o.status] += 1;
    }
  });

  const statusPieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status,
    value: count,
  }));

  // Daily Order Trend
  const dailyMap: Record<string, number> = {};
  orders.forEach((o) => {
    try {
      const key = format(parseISO(o.order_date), 'MMM dd');
      dailyMap[key] = (dailyMap[key] || 0) + 1;
    } catch {
      // ignore
    }
  });
  const dailyTrendData = Object.entries(dailyMap).map(([date, count]) => ({
    date,
    orders: count,
  }));

  // Total Metrics
  const totalOrders = orders.length;
  const completedOrders = statusCounts['Completed'] || 0;
  const completionRate = totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : '0.0';
  const totalMistakes = orders.reduce((sum, o) => sum + (o.mistakes?.length || 0), 0);
  const mistakesPer100 = totalOrders > 0 ? ((totalMistakes / totalOrders) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-fg-primary">Executive Analytics Dashboard</h1>
          <p className="text-sm text-fg-secondary mt-0.5">
            Operational pipeline health, velocity curves, and volume breakdowns.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-fg-secondary bg-bg-surface border border-border px-3 py-1.5 rounded-lg">
          <Calendar className="w-3.5 h-3.5 text-brand-500" />
          <span>{dateRange.formattedLabel}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted block mb-1">
            Total Orders in Scope
          </span>
          <div className="text-2xl font-bold text-fg-primary">{totalOrders}</div>
          <span className="text-[11px] text-fg-secondary mt-0.5 block">Pipeline intake</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted block mb-1">
            Overall Completion Rate
          </span>
          <div className="text-2xl font-bold text-status-success">{completionRate}%</div>
          <span className="text-[11px] text-fg-secondary mt-0.5 block">
            {completedOrders} completed
          </span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted block mb-1">
            Total Mistake Incidents
          </span>
          <div className="text-2xl font-bold text-status-danger">{totalMistakes}</div>
          <span className="text-[11px] text-fg-secondary mt-0.5 block">Logged in scope</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted block mb-1">
            Mistakes / 100 Orders
          </span>
          <div className="text-2xl font-bold text-status-warning">{mistakesPer100}</div>
          <span className="text-[11px] text-fg-secondary mt-0.5 block">Quality density</span>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Order Trend Curve */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily Order Volume Curve</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {dailyTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrendData}>
                  <defs>
                    <linearGradient id="orderColor" x1="0" y1="0" x2="0" y2="1">
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
                    fill="url(#orderColor)"
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

        {/* Status Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-72 flex flex-col items-center justify-center">
            {totalOrders > 0 ? (
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
              <div className="text-xs text-fg-muted">No status data to display.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
